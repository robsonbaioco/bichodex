// Copia os jogos de biodiversigames/ para public/jogos/, de onde a aba Jogos os abre num iframe.
// Antes, sincroniza biodiversigames/shared/ em cada jogo (o mesmo que `node tools/package.mjs --sync`).
// Roda sozinho antes de `npm run dev` e `npm run build` (predev/prebuild); public/jogos/ não vai para o git.
import { copyFile, cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'biodiversigames');
const SHARED = join(SOURCE, 'shared');
const TARGET = join(ROOT, 'public', 'jogos');
const GAMES = ['parentes', 'conexoes-selvagens', 'onde-vive'];

const exists = (p) => stat(p).then(() => true, () => false);

const sharedFiles = await readdir(SHARED);
await rm(TARGET, { recursive: true, force: true });
await mkdir(TARGET, { recursive: true });
for (const game of GAMES) {
  const dir = join(SOURCE, game);
  if (!(await exists(join(dir, 'data.js')))) {
    throw new Error(`biodiversigames/${game}/data.js não existe. Rode antes: node biodiversigames/tools/build-${game}.mjs`);
  }
  for (const f of sharedFiles) await copyFile(join(SHARED, f), join(dir, f));
  await cp(dir, join(TARGET, game), { recursive: true });
}
console.log(`✔ jogos copiados para public/jogos (${GAMES.join(', ')})`);
