// Gera parentes/data.js a partir de tools/puzzles/parentes.mjs.
// Fontes: Open Tree of Life (filogenia sintética) e iNaturalist (fotos).
// Uso: node tools/build-parentes.mjs
import puzzles from './puzzles/parentes.mjs';
import { fetchJSON, inatTaxon, writeDataJs } from './lib.mjs';
import { cladePt } from './clades-pt.mjs';

const OT = 'https://api.opentreeoflife.org/v3';

async function ottIds(names) {
  const res = await fetchJSON(`${OT}/tnrs/match_names`, { method: 'POST', body: { names, do_approximate_matching: false } });
  const ids = {};
  for (const r of res.results) {
    const m = r.matches[0];
    ids[r.name] = m.taxon.ott_id;
    if (m.taxon.name !== r.name) console.warn(`  ! Open Tree: "${r.name}" → "${m.taxon.name}"`);
  }
  const missing = names.filter((n) => !ids[n]);
  if (missing.length) throw new Error(`Open Tree: nomes não encontrados: ${missing.join(', ')}`);
  return ids;
}

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
  options.sort((a, b) => a.tips - b.tips);

  const nodes = options.map((o) => o.nodeId);
  const tie = nodes.length !== new Set(nodes).size;
  const label = `#${i + 1} ${p.target[0]}`;
  console.log(`${tie ? '✖' : '✔'} ${label}: ${options.map((o) => `${o.common} (${o.clade}, ${o.tips})`).join(' < ')}`);
  if (tie) failed = true;

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

async function synthId() {
  const about = await fetchJSON(`${OT}/tree_of_life/about`, { method: 'POST', body: {} });
  return about.synth_id;
}
