// Copia shared/* para cada jogo e gera os zips para o itch.io (index.html na raiz, caminhos relativos):
//   dist/<jogo>.zip           cada jogo avulso
//   dist/biodiversigames.zip  catálogo (index.html da raiz) + os três jogos
// Uso: node tools/package.mjs         → sincroniza e empacota
//      node tools/package.mjs --sync  → só sincroniza (para testar localmente)
// A cópia para o Bichodex (public/jogos/) é feita por scripts/copiar-jogos.mjs, antes do dev e do build.
import { copyFile, cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { ROOT_DIR } from './lib.mjs';

const GAMES = ['parentes', 'conexoes-selvagens', 'onde-vive'];
const SHARED = join(ROOT_DIR, 'shared');
const DIST = join(ROOT_DIR, 'dist');
const args = process.argv.slice(2);
const syncOnly = args.includes('--sync');

const exists = (p) => stat(p).then(() => true, () => false);

function zipDir(dir, zip) {
  // Compress-Archive do PowerShell (Windows) ou zip (Linux/macOS).
  if (process.platform === 'win32') {
    execFileSync('powershell', ['-NoProfile', '-Command', `Compress-Archive -Path '${dir}\\*' -DestinationPath '${zip}'`], { stdio: 'inherit' });
  } else {
    execFileSync('zip', ['-qr', zip, '.'], { cwd: dir, stdio: 'inherit' });
  }
}

async function report(zip) {
  const { size } = await stat(zip);
  console.log(`✔ ${zip.slice(ROOT_DIR.length + 1)} (${(size / 1024).toFixed(0)} KB)`);
}

// 1. Sincroniza shared/ em cada jogo e confere se os dados existem.
const sharedFiles = await readdir(SHARED);
for (const game of GAMES) {
  const dir = join(ROOT_DIR, game);
  if (!(await exists(join(dir, 'index.html')))) throw new Error(`${game}/index.html não existe`);
  if (!(await exists(join(dir, 'data.js')))) throw new Error(`${game}/data.js não existe. Rode antes: node tools/build-${game}.mjs`);
  for (const f of sharedFiles) await copyFile(join(SHARED, f), join(dir, f));
  console.log(`✔ ${game}: shared sincronizado`);
}
if (syncOnly) process.exit(0);

// 2. Zips avulsos.
await mkdir(DIST, { recursive: true });
for (const game of GAMES) {
  const zip = join(DIST, `${game}.zip`);
  await rm(zip, { force: true });
  zipDir(join(ROOT_DIR, game), zip);
  await report(zip);
}

// 3. Zip do catálogo: index.html + shared/ + jogos.
const stage = join(DIST, '_catalogo');
await rm(stage, { recursive: true, force: true });
await mkdir(stage, { recursive: true });
await copyFile(join(ROOT_DIR, 'index.html'), join(stage, 'index.html'));
await cp(SHARED, join(stage, 'shared'), { recursive: true });
for (const game of GAMES) await cp(join(ROOT_DIR, game), join(stage, game), { recursive: true });
const catalogZip = join(DIST, 'biodiversigames.zip');
await rm(catalogZip, { force: true });
zipDir(stage, catalogZip);
await rm(stage, { recursive: true, force: true });
await report(catalogZip);
