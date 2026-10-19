// Gera onde-vive/data.js a partir de tools/puzzles/onde-vive.mjs.
// Fontes: GBIF (ocorrências, continente, país), iNaturalist (fotos), Wikipédia (resumo).
// Uso: node tools/build-onde-vive.mjs
import species from './puzzles/onde-vive.mjs';
import { fetchJSON, gbifMatch, inatTaxon, wikiSummary, writeDataJs } from './lib.mjs';

const GBIF = 'https://api.gbif.org/v1/occurrence/search';
// Sem LIVING_SPECIMEN (zoológicos, jardins botânicos).
const BASIS = ['HUMAN_OBSERVATION', 'PRESERVED_SPECIMEN', 'MACHINE_OBSERVATION', 'OCCURRENCE', 'MATERIAL_SAMPLE', 'OBSERVATION'];
const NOT_WILD = /managed|introduced|invasive|naturalised|cultivated|captive|released/i;
const PAGE = 300;
const MAX_POINTS = 400;

function baseQuery(taxonKey) {
  const q = new URLSearchParams({ taxonKey, hasCoordinate: 'true', hasGeospatialIssue: 'false', occurrenceStatus: 'PRESENT' });
  for (const b of BASIS) q.append('basisOfRecord', b);
  return q;
}

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function occurrences(taxonKey) {
  const facets = await fetchJSON(`${GBIF}?${baseQuery(taxonKey)}&limit=0&facet=continent&facet=country&facetLimit=5`);
  const total = facets.count;
  const facet = (name) => facets.facets.find((f) => f.field === name)?.counts || [];

  // Amostra uma página de cada faixa de anos (offsets altos no GBIF são muito lentos).
  const raw = [];
  for (const years of ['1000,1999', '2000,2017', '2018,2100']) {
    const page = await fetchJSON(`${GBIF}?${baseQuery(taxonKey)}&limit=${PAGE}&year=${years}`);
    raw.push(...page.results);
  }

  // Descarta registros não silvestres e agrupa em células de ~0,2° para reduzir duplicatas.
  const cells = new Map();
  for (const r of raw) {
    if ([r.establishmentMeans, r.degreeOfEstablishment].some((v) => v && NOT_WILD.test(v))) continue;
    if (r.decimalLatitude === 0 && r.decimalLongitude === 0) continue;
    const key = `${Math.round(r.decimalLatitude * 5)},${Math.round(r.decimalLongitude * 5)}`;
    if (!cells.has(key)) cells.set(key, [+r.decimalLatitude.toFixed(3), +r.decimalLongitude.toFixed(3)]);
  }
  let points = [...cells.values()];

  // Remove pontos isolados (provável erro ou animal em cativeiro): exige 1 vizinho a até 500 km.
  if (points.length > 8) {
    points = points.filter((p) => points.some((q) => q !== p && haversineKm(p, q) < 500));
  }
  if (points.length > MAX_POINTS) points = points.filter((_, i) => i % Math.ceil(points.length / MAX_POINTS) === 0);

  return {
    total,
    points,
    continent: facet('CONTINENT')[0]?.name || null,
    country: facet('COUNTRY')[0]?.name || null,
  };
}

const out = [];
for (const [common, sci, wikiTitle] of species) {
  const m = await gbifMatch(sci);
  const occ = await occurrences(m.usageKey);
  const pic = await inatTaxon(sci);
  const wiki = (await wikiSummary(wikiTitle || sci)) || (await wikiSummary(common));
  console.log(`${occ.points.length < 3 ? '✖' : '✔'} ${common}: ${occ.points.length} pontos (de ${occ.total}), ${occ.continent}/${occ.country}${wiki ? '' : ', sem Wikipédia'}`);
  if (occ.points.length < 3) {
    console.error('  Poucos pontos — escolha outra espécie.');
    process.exitCode = 1;
  }
  out.push({
    common,
    sci,
    gbifKey: m.usageKey,
    group: m.class || m.phylum || m.kingdom,
    kingdom: m.kingdom,
    continent: occ.continent,
    country: occ.country,
    records: occ.total,
    points: occ.points,
    photo: pic.photo,
    credit: pic.credit,
    inatUrl: pic.inatUrl,
    wiki: wiki ? { extract: wiki.extract, url: wiki.url } : null,
  });
}

if (!process.exitCode) await writeDataJs('onde-vive', 'ONDE_VIVE_DATA', { species: out });
