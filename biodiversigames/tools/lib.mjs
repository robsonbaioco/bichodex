// Utilitários compartilhados pelos scripts de build.
// Todas as respostas das APIs ficam em cache em tools/.cache para que os
// builds sejam reproduzíveis e não sobrecarreguem os serviços.
// Usado por build-parentes.mjs, build-conexoes-selvagens.mjs, build-onde-vive.mjs (APIs e writeDataJs)
// e package.mjs (só ROOT_DIR). Fala com iNaturalist, GBIF, Open Tree of Life e Wikipédia.
// O cache não expira: para buscar dados novos, apague tools/.cache/ (fica fora do git).
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Pasta tools/ (caminho absoluto, não depende de onde o script foi chamado). */
export const TOOLS_DIR = dirname(fileURLToPath(import.meta.url));
/** Pasta biodiversigames/, onde ficam as pastas dos jogos. */
export const ROOT_DIR = join(TOOLS_DIR, '..');
const CACHE_DIR = join(TOOLS_DIR, '.cache');
// User-Agent identificável, como pedem as regras de uso das APIs (Wikipédia e iNaturalist).
const UA = 'biodiversigames/1.0 (jogos educativos de biodiversidade)';

/** Promessa que resolve depois de `ms` milissegundos. */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Horário (Date.now) da última chamada feita a cada host.
const lastCall = {};
// Respeita um intervalo mínimo entre chamadas para cada host (em ms; hosts fora da lista: 200 ms).
// O iNaturalist pede no máximo ~1 requisição por segundo, por isso o valor maior.
const MIN_INTERVAL = {
  'api.inaturalist.org': 1100,
  'api.gbif.org': 150,
  'api.opentreeoflife.org': 250,
  'pt.wikipedia.org': 150,
};

/**
 * Busca um JSON com cache em disco, intervalo mínimo por host e novas tentativas.
 * - Cache: a chave é o SHA-1 de método + URL + corpo; se o arquivo existe em tools/.cache, nem chama a rede.
 * - Novas tentativas (até 4): em falha de rede, 429 ou 5xx, esperando 2 s, 4 s, 6 s...
 * - 404 devolve null (e não é guardado no cache); outros erros 4xx lançam exceção na hora.
 * @param {string} url
 * @param {{ method?: string, body?: object }} [opts] body é enviado como JSON (usado no POST do Open Tree).
 * @returns {Promise<any|null>} o JSON da resposta, ou null se a API respondeu 404.
 */
export async function fetchJSON(url, { method = 'GET', body } = {}) {
  const key = createHash('sha1').update(method + url + (body ? JSON.stringify(body) : '')).digest('hex');
  const file = join(CACHE_DIR, key + '.json');
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {} // sem cache (ou cache ilegível): segue para a rede

  const host = new URL(url).host;
  const wait = (lastCall[host] || 0) + (MIN_INTERVAL[host] || 200) - Date.now();
  if (wait > 0) await sleep(wait);

  for (let attempt = 1; ; attempt++) {
    lastCall[host] = Date.now();
    let res;
    try {
      res = await fetch(url, {
        method,
        headers: { 'User-Agent': UA, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(60000),
      });
    } catch (err) {
      // Falha de rede (conexão encerrada etc.): tenta de novo.
      if (attempt >= 4) throw err;
      await sleep(2000 * attempt);
      continue;
    }
    if (res.status === 404) return null;
    if (res.ok) {
      const json = await res.json();
      await mkdir(CACHE_DIR, { recursive: true });
      await writeFile(file, JSON.stringify(json));
      return json;
    }
    // Só vale tentar de novo em 429 (limite de taxa) e 5xx; os demais erros não mudam com o tempo.
    if (attempt >= 4 || (res.status < 500 && res.status !== 429)) {
      throw new Error(`${res.status} ${res.statusText} em ${url}\n${await res.text()}`);
    }
    await sleep(2000 * attempt);
  }
}

// ---------- iNaturalist ----------

// Código de licença do iNaturalist → rótulo mostrado no crédito da foto.
const LICENSE_LABEL = {
  cc0: 'CC0', 'cc-by': 'CC BY', 'cc-by-sa': 'CC BY-SA', 'cc-by-nc': 'CC BY-NC',
  'cc-by-nc-sa': 'CC BY-NC-SA', 'cc-by-nd': 'CC BY-ND', 'cc-by-nc-nd': 'CC BY-NC-ND',
};

/**
 * Monta os campos de foto usados nos data.js: foto média, miniatura quadrada, crédito
 * ("autor · licença · iNaturalist") e link para a página do táxon no iNaturalist.
 */
function photoInfo(photo, taxon) {
  const url = photo.medium_url || photo.url.replace('/square.', '/medium.');
  return {
    photo: url,
    thumb: photo.square_url || photo.url,
    credit: `${photo.attribution_name || photo.attribution} · ${LICENSE_LABEL[photo.license_code] || photo.license_code} · iNaturalist`,
    inatUrl: `https://www.inaturalist.org/taxa/${taxon.id}`,
  };
}

/**
 * Busca o táxon no iNaturalist e devolve a primeira foto com licença Creative Commons.
 * Prefere o nome científico exato; se não achar, usa o primeiro resultado e avisa no console.
 * A foto vem, nesta ordem, da foto padrão do táxon, das demais fotos do táxon ou da observação
 * de grau de pesquisa mais votada. Lança erro se nada tiver licença CC.
 * @returns {Promise<{inatId, inatName, commonName, observations, photo, thumb, credit, inatUrl}>}
 */
export async function inatTaxon(sciName) {
  const q = encodeURIComponent(sciName);
  const data = await fetchJSON(`https://api.inaturalist.org/v1/taxa?q=${q}&locale=pt-BR&per_page=10&is_active=true`);
  const lower = sciName.toLowerCase();
  const taxon = data.results.find((t) => t.name.toLowerCase() === lower) || data.results[0];
  if (!taxon) throw new Error(`iNaturalist: táxon não encontrado: ${sciName}`);
  if (taxon.name.toLowerCase() !== lower) console.warn(`  ! iNaturalist: "${sciName}" → "${taxon.name}"`);

  let photo = taxon.default_photo?.license_code ? taxon.default_photo : null;
  if (!photo) {
    const full = await fetchJSON(`https://api.inaturalist.org/v1/taxa/${taxon.id}?locale=pt-BR`);
    photo = full.results[0].taxon_photos.map((tp) => tp.photo).find((p) => p.license_code);
  }
  if (!photo) {
    // Alternativa: a observação com grau de pesquisa e licença CC mais votada.
    const obs = await fetchJSON(`https://api.inaturalist.org/v1/observations?taxon_id=${taxon.id}&quality_grade=research&photo_license=cc0,cc-by,cc-by-sa,cc-by-nc,cc-by-nc-sa&order_by=votes&per_page=5`);
    photo = obs.results.flatMap((o) => o.photos).find((p) => p.license_code);
  }
  if (!photo) throw new Error(`iNaturalist: nenhuma foto com licença CC para ${sciName}`);
  return {
    inatId: taxon.id,
    inatName: taxon.name,
    commonName: taxon.preferred_common_name || null,
    observations: taxon.observations_count,
    ...photoInfo(photo, taxon),
  };
}

// ---------- GBIF ----------

/**
 * Casa o nome científico com o backbone taxonômico do GBIF (/species/match).
 * Devolve o objeto do GBIF (usageKey, kingdom, phylum, class, order, family...). Lança erro se não
 * houver correspondência e avisa no console quando ela não é exata (FUZZY, HIGHERRANK).
 */
export async function gbifMatch(sciName) {
  const m = await fetchJSON(`https://api.gbif.org/v1/species/match?name=${encodeURIComponent(sciName)}&verbose=false`);
  if (!m || m.matchType === 'NONE') throw new Error(`GBIF: sem correspondência para ${sciName}`);
  if (m.matchType !== 'EXACT') console.warn(`  ! GBIF: "${sciName}" → "${m.scientificName}" (${m.matchType})`);
  return m;
}

// ---------- Wikipedia ----------

/**
 * Resumo de um artigo da Wikipédia (API REST /page/summary).
 * Devolve { title, extract, url }, ou null se o artigo não existe ou não é um artigo comum
 * (página de desambiguação, por exemplo).
 */
export async function wikiSummary(title, lang = 'pt') {
  const s = await fetchJSON(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`);
  if (!s || s.type !== 'standard') return null;
  return { title: s.title, extract: s.extract, url: s.content_urls?.desktop?.page };
}

// ---------- saída ----------

/**
 * Grava os dados como `window.<name> = {...}` para funcionar até abrindo o HTML direto do disco.
 * Sobrescreve <gameDir>/data.js inteiro, com um cabeçalho de "gerado em" (a data muda a cada build).
 * @param {string} gameDir pasta do jogo (ex.: 'parentes'), também usada no nome do build-*.mjs do cabeçalho.
 * @param {string} varName variável global que o game.js do jogo lê (ex.: 'PARENTES_DATA').
 */
export async function writeDataJs(gameDir, varName, data) {
  const file = join(ROOT_DIR, gameDir, 'data.js');
  const header = `// Gerado por tools/build-${gameDir}.mjs em ${new Date().toISOString().slice(0, 10)} — não editar à mão.\n`;
  await writeFile(file, `${header}window.${varName} = ${JSON.stringify(data, null, 1)};\n`);
  console.log(`✔ ${file}`);
}
