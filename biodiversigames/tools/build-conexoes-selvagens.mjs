// Gera conexoes-selvagens/data.js a partir de tools/puzzles/conexoes-selvagens.mjs.
// Fontes: GBIF (checagem taxonômica dos grupos) e iNaturalist (fotos).
// Uso: node tools/build-conexoes-selvagens.mjs
import puzzles from './puzzles/conexoes-selvagens.mjs';
import { gbifMatch, inatTaxon, writeDataJs } from './lib.mjs';

let errors = 0;
const fail = (msg) => {
  errors++;
  console.error('  ✖ ' + msg);
};

const out = [];
for (const [i, p] of puzzles.entries()) {
  console.log(`#${i + 1}: ${p.groups.map((g) => g.label).join(' | ')}`);
  if (p.groups.length !== 4) fail('precisa ter 4 grupos');
  const levels = p.groups.map((g) => g.level).sort().join();
  if (levels !== '0,1,2,3') fail(`níveis devem ser 0,1,2,3 (são ${levels})`);
  const names = p.groups.flatMap((g) => g.items.map((it) => it[0]));
  if (names.length !== 16 || new Set(names).size !== 16) fail('precisa de 16 nomes diferentes');

  const groups = [];
  for (const g of p.groups) {
    if (g.items.length !== 4) fail(`"${g.label}" precisa ter 4 itens`);
    const items = [];
    for (const [name, sci] of g.items) {
      if (g.check) {
        const [rank, value] = g.check;
        const m = await gbifMatch(sci);
        if (m[rank] !== value) fail(`${name} (${sci}): ${rank} no GBIF é "${m[rank]}", esperado "${value}"`);
      }
      const t = await inatTaxon(sci);
      items.push({ name, sci, thumb: t.thumb, photo: t.photo, credit: t.credit, inatUrl: t.inatUrl });
    }
    groups.push({ level: g.level, label: g.label, items });
  }
  groups.sort((a, b) => a.level - b.level);
  out.push({ groups });
}

if (errors) {
  console.error(`\n${errors} problema(s). Corrija os puzzles e rode de novo.`);
  process.exit(1);
}
await writeDataJs('conexoes-selvagens', 'CONEXOES_DATA', { puzzles: out });
