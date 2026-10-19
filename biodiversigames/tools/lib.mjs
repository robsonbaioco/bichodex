// Utilitários compartilhados pelos scripts de build.
// Todas as respostas das APIs ficam em cache em tools/.cache para que os
// builds sejam reproduzíveis e não sobrecarreguem os serviços.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const TOOLS_DIR = dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = join(TOOLS_DIR, '..');
const CACHE_DIR = join(TOOLS_DIR, '.cache');
const UA = 'biodiversigames/1.0 (jogos educativos de biodiversidade)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lastCall = {};
// Respeita um intervalo mínimo entre chamadas para cada host.
const MIN_INTERVAL = {
  'api.inaturalist.org': 1100,
  'api.gbif.org': 150,
  'api.opentreeoflife.org': 250,
  'pt.wikipedia.org': 150,
};

export async function fetchJSON(url, { method = 'GET', body } = {}) {
  const key = createHash('sha1').update(method + url + (body ? JSON.stringify(body) : '')).digest('hex');
  const file = join(CACHE_DIR, key + '.json');
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {}

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
    if (attempt >= 4 || (res.status < 500 && res.status !== 429)) {
      throw new Error(`${res.status} ${res.statusText} em ${url}\n${await res.text()}`);
    }
    await sleep(2000 * attempt);
  }
}

// ---------- iNaturalist ----------

const LICENSE_LABEL = {
  cc0: 'CC0', 'cc-by': 'CC BY', 'cc-by-sa': 'CC BY-SA', 'cc-by-nc': 'CC BY-NC',
  'cc-by-nc-sa': 'CC BY-NC-SA', 'cc-by-nd': 'CC BY-ND', 'cc-by-nc-nd': 'CC BY-NC-ND',
};

function photoInfo(photo, taxon) {
  const url = photo.medium_url || photo.url.replace('/square.', '/medium.');
  return {
    photo: url,
    thumb: photo.square_url || photo.url,
    credit: `${photo.attribution_name || photo.attribution} · ${LICENSE_LABEL[photo.license_code] || photo.license_code} · iNaturalist`,
    inatUrl: `https://www.inaturalist.org/taxa/${taxon.id}`,
  };
}

/** Busca o táxon no iNaturalist e devolve a primeira foto com licença Creative Commons. */
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

export async function gbifMatch(sciName) {
  const m = await fetchJSON(`https://api.gbif.org/v1/species/match?name=${encodeURIComponent(sciName)}&verbose=false`);
  if (!m || m.matchType === 'NONE') throw new Error(`GBIF: sem correspondência para ${sciName}`);
  if (m.matchType !== 'EXACT') console.warn(`  ! GBIF: "${sciName}" → "${m.scientificName}" (${m.matchType})`);
  return m;
}

// ---------- Wikipedia ----------

export async function wikiSummary(title, lang = 'pt') {
  const s = await fetchJSON(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`);
  if (!s || s.type !== 'standard') return null;
  return { title: s.title, extract: s.extract, url: s.content_urls?.desktop?.page };
}

// ---------- saída ----------

/** Grava os dados como `window.<name> = {...}` para funcionar até abrindo o HTML direto do disco. */
export async function writeDataJs(gameDir, varName, data) {
  const file = join(ROOT_DIR, gameDir, 'data.js');
  const header = `// Gerado por tools/build-${gameDir}.mjs em ${new Date().toISOString().slice(0, 10)} — não editar à mão.\n`;
  await writeFile(file, `${header}window.${varName} = ${JSON.stringify(data, null, 1)};\n`);
  console.log(`✔ ${file}`);
}
