// Gera parentes/data.js a partir de tools/puzzles/parentes.mjs.
// Fontes: Open Tree of Life (filogenia sintética) e iNaturalist (fotos).
// Uso: node tools/build-parentes.mjs
// Para cada puzzle, acha o ancestral comum mais recente (MRCA) entre o alvo e cada opção na árvore do
// Open Tree of Life e ordena as opções pelo tamanho desse clado: quanto menos espécies (tips) o clado
// tem, mais recente é o ancestral e mais aparentada é a opção. Empate (mesmo nó) faz o build falhar
// sem gravar o data.js. Os nomes dos clados vêm traduzidos de clades-pt.mjs quando houver tradução.
import puzzles from './puzzles/parentes.mjs';
import { fetchJSON, inatTaxon, writeDataJs } from './lib.mjs';
import { cladePt } from './clades-pt.mjs';

const OT = 'https://api.opentreeoflife.org/v3';

/**
 * Converte nomes científicos em IDs do Open Tree (ott_id) numa única chamada ao TNRS, sem casamento
 * aproximado. Avisa quando o Open Tree devolve outro nome (sinônimo) e lança erro se faltar algum.
 * @returns {Promise<Record<string, number>>} nome científico → ott_id
 */
async function ottIds(names) {
  const res = await fetchJSON(`${OT}/tnrs/match_names`, { method: 'POST', body: { names, do_approximate_matching: false } });
  const ids = {};
  for (const r of res.results) {
    // Usa a primeira correspondência. Nomes sem correspondência vêm em unmatched_names (fora de
    // res.results), ficam sem ID e são apontados pela checagem de `missing` abaixo.
    const m = r.matches[0];
    ids[r.name] = m.taxon.ott_id;
    if (m.taxon.name !== r.name) console.warn(`  ! Open Tree: "${r.name}" → "${m.taxon.name}"`);
  }
  const missing = names.filter((n) => !ids[n]);
  if (missing.length) throw new Error(`Open Tree: nomes não encontrados: ${missing.join(', ')}`);
  return ids;
}

/**
 * Ancestral comum mais recente de dois ott_id na árvore sintética.
 * @returns {Promise<{ nodeId: string, tips: number, clade: string, exact: boolean }>}
 *   nodeId identifica o nó (usado para detectar empates); tips = número de espécies abaixo do nó
 *   (critério de ordenação); clade = nome do nó ou, se o nó não tem nome, do táxon nomeado mais próximo.
 */
async function mrca(a, b) {
  const res = await fetchJSON(`${OT}/tree_of_life/mrca`, { method: 'POST', body: { ott_ids: [a, b] } });
  const named = res.mrca.taxon;
  return {
    nodeId: res.mrca.node_id,
    tips: res.mrca.num_tips,
    clade: (named || res.nearest_taxon).name,
    exact: Boolean(named), // false = nó sem nome dentro do clado indicado
  };
}

// Nomes únicos de todos os puzzles: cada espécie é resolvida e fotografada uma vez só.
const allNames = [...new Set(puzzles.flatMap((p) => [p.target[1], ...p.options.map((o) => o[1])]))];
console.log(`Open Tree: ${allNames.length} nomes`);
const ids = await ottIds(allNames);

console.log('iNaturalist: fotos');
const photos = {};
for (const name of allNames) photos[name] = await inatTaxon(name);

const out = [];
let failed = false;
for (const [i, p] of puzzles.entries()) {
  const [, targetSci] = p.target;
  const options = [];
  for (const [common, sci] of p.options) {
    const m = await mrca(ids[targetSci], ids[sci]);
    options.push({ common, sci, ...m });
  }
  // Clado menor = ancestral mais recente = parente mais próximo.
  options.sort((a, b) => a.tips - b.tips);

  // Duas opções com o mesmo MRCA são igualmente aparentadas com o alvo: não há ordem certa.
  const nodes = options.map((o) => o.nodeId);
  const tie = nodes.length !== new Set(nodes).size;
  const label = `#${i + 1} ${p.target[0]}`;
  console.log(`${tie ? '✖' : '✔'} ${label}: ${options.map((o) => `${o.common} (${o.clade}, ${o.tips})`).join(' < ')}`);
  if (tie) failed = true;

  /** Só os campos de foto que o jogo usa, a partir do resultado já buscado no iNaturalist. */
  const pic = (sci) => {
    const { photo, thumb, credit, inatUrl } = photos[sci];
    return { photo, thumb, credit, inatUrl };
  };
  out.push({
    target: { common: p.target[0], sci: targetSci, ...pic(targetSci) },
    // `answer` já está na ordem certa (mais próximo primeiro); o jogo embaralha.
    answer: options.map((o) => ({
      common: o.common,
      sci: o.sci,
      clade: o.clade,
      cladePt: cladePt(o.clade),
      exact: o.exact,
      tips: o.tips,
      ...pic(o.sci),
    })),
    fact: p.fact,
  });
}

if (failed) {
  console.error('\nHá puzzles com empate (mesmo ancestral comum). Troque as espécies e rode de novo.');
  process.exit(1);
}

await writeDataJs('parentes', 'PARENTES_DATA', { source: 'Open Tree of Life (synth ' + (await synthId()) + ')', puzzles: out });

/**
 * Versão da árvore sintética do Open Tree (ex.: "opentree16.1"), registrada no data.js como fonte.
 * Declarada no fim do arquivo, mas pode ser chamada antes: declarações de função são içadas (hoisting).
 */
async function synthId() {
  const about = await fetchJSON(`${OT}/tree_of_life/about`, { method: 'POST', body: {} });
  return about.synth_id;
}
