# Manutenção

Receitas para as mudanças mais comuns e a lista de pontos frágeis conhecidos.

Antes de terminar qualquer mudança: `npm run build` (faz a checagem de tipos) e um teste em `npm run dev`. O `localStorage` do servidor local pode ter dados de teste; se for mexer neles, exporte um backup antes (aba Minha dex).

## Publicar (deploy)

```sh
npm run deploy
```

Gera o `dist/`, cria nele um repositório temporário na branch `gh-pages` e faz `push -f` para `github.com/robsonbaioco/bichodex`. O site fica em <https://robsonbaioco.github.io/bichodex/>. Quem está com o app aberto recebe a versão nova sozinho (ver [aviso de atualização](dados-e-apis.md)).

## Data comemorativa nova

Há três listas, conforme o tipo de data:

| A data é... | Onde | Formato |
|---|---|---|
| Sobre um animal/planta (Dia do Pinguim) | `src/specialDays.ts`, `SPECIAL_DAYS` | `{ name, group, emoji, taxonId, month, ... }` |
| De outro assunto, com um bicho associado (Dia do Farmacêutico → jararaca) | `src/associatedDays.ts`, `ASSOCIATED_DAYS` | mesmo formato + `reason` (frase explicando a ligação) |
| Só um lembrete em texto, sem bicho | `src/reminders.ts`, `REMINDERS` | `'MM-DD': ['Nome da data']` (dois dígitos) |

A regra de data é uma destas:

```ts
{ ..., month: 4, day: 25 }                       // dia fixo
{ ..., month: 2, weekday: SATURDAY, nth: 3 }     // 3º sábado de fevereiro
{ ..., month: 3, weekday: WEDNESDAY, nth: -1 }   // última quarta de março
{ ..., easter: true }                            // Páscoa
```

`taxonId` é o número do táxon no iNaturalist (o número no fim de `inaturalist.org/taxa/<número>`). Confira, porque um id errado abre a ficha de outro ser vivo. Se houver `day`, a regra móvel é ignorada. Para ver como fica, abra o app com `?data=AAAA-MM-DD`.

## Tema novo

1. Em `src/themes.ts`, acrescente o id em `ThemeId` e uma entrada em `THEMES` com `label`, `emoji`, descrição, `chrome` (cor da barra do navegador), `swatch` (amostra no seletor), `displayFont`/`displayWeight` e `card` (cores do cartão de conquista, que é canvas e não lê CSS).
2. No CSS (`themes.css` ou `themes-ousados.css`), crie `:root[data-theme='<id>'] { ... }` redefinindo os tokens de `:root` em `styles.css` (`--bg`, `--surface`, `--ink`, `--brand`, `--line`, `--font-display`...). Acrescente ajustes de forma se quiser.
3. Teste no modo **suave**: os enfeites novos (imagens de fundo, sombras, `::before`/`::after`) precisam cair nos seletores que o bloco suave de `views.css` já anula, ou ser acrescentados a ele.
4. Fonte nova: `npm install @fontsource/<fonte>` e importe em `src/main.tsx`.

## Categoria nova

Acrescente em `CATEGORIES` (`src/categories.ts`) com `id`, `label`, `emoji`, `color` e o filtro: `iconic` (nome do grupo icônico do iNaturalist, como `Aves`) ou `taxonId`. Confira também `categoryOf`, que decide a categoria de cada espécie, e os números da categoria, que vêm de `fetchCategoryCounts` (só cobre grupos icônicos). Se a categoria entrar no rodízio das missões, inclua o id em `DAILY_GROUPS` (`src/missions.ts`): **todo id de lá precisa existir em `CATEGORIES`**.

## Conteúdo dos jogos diários

Veja "Adicionando conteúdo" no [README do Biodiversigames](../biodiversigames/README.md#adicionando-conteúdo). Resumo:

1. Edite `biodiversigames/tools/puzzles/<jogo>.mjs` (o cabeçalho de cada arquivo explica o formato).
2. De dentro de `biodiversigames/`, rode `node tools/build-<jogo>.mjs` e leia os avisos `!` no console (correções de nome feitas pelas APIs).
3. Confira o `data.js` gerado e rode `npm run dev` para jogar.

Acrescente **no fim e em lotes**: mudar a quantidade de puzzles reembaralha todos os dias seguintes. Para dados novos das APIs, apague `biodiversigames/tools/.cache/`.

## Jogo novo na aba Jogos

- **Jogo React** (como o 2048): crie o componente em `src/components/` e uma entrada em `GAMES` (`src/components/Games.tsx`).
- **Jogo do Biodiversigames** (HTML puro): crie a pasta em `biodiversigames/<id>/` seguindo o modelo dos outros (`index.html`, `game.js`, `style.css`, `data.js`) e acrescente o id em **três** lugares: `GAMES` de `scripts/copiar-jogos.mjs`, `GAMES` de `biodiversigames/tools/package.mjs` e `GAMES` de `Games.tsx` (com `src`). Use uma chave de `localStorage` própria (`<id>:...`).

## Ícones do app

`npm run icons` gera os PNGs a partir de `public/icon.svg` (config em `pwa-assets.config.ts`). Os nomes dos arquivos estão escritos à mão em `public/manifest.webmanifest` e no `index.html`; se mudarem, atualize os dois.

## Código compartilhado dos jogos

Edite só `biodiversigames/shared/` (`common.js`, `base.css`). As cópias em cada pasta de jogo são atualizadas por `npm run dev`/`build` ou por `node tools/package.mjs --sync`. `shared/` não pode ter subpastas.

## Pontos frágeis conhecidos

Coisas que funcionam hoje, mas quebram fácil ou têm comportamento que surpreende. O que está aqui não tem correção simples: depende de serviço externo, de decisão de produto ou de implementar um recurso novo (o motivo vai entre parênteses quando não é óbvio).

**Rede e imagens**
- Fotos em canvas dependem dos cabeçalhos CORS do CDN do iNaturalist (ver [Dados e APIs](dados-e-apis.md#fotos-em-canvas-cors)). Se mudarem, o cartão de conquista e o colorir quebram.
- `largeUrl` (troca `/medium.` ou `/square.` por `/large.` na URL da foto) depende do padrão de nomes do iNaturalist.
- O iNaturalist tem limite de requisições; a busca por nome dispara várias páginas seguidas.

**Código duplicado** (mudou num, mude no outro)
- A lista de jogos está em três lugares (ver "Jogo novo").

**Estado e dias**
- Sequência e missões só viram o dia ao abrir/recarregar o app (virar sozinho à meia-noite seria recurso novo).
- O rodízio da categoria do dia recomeça a cada ano (mudar a regra muda a categoria de todo mundo: decisão de produto).
- Medalhas de avistamento somem se a pessoa desmarcar espécies; as de sequência ficam (decisão de produto: guardar medalhas exigiria um dado novo salvo).
- Depois da primeira busca por nome, `bulk` não volta a falso: a lista segue em páginas de 500 até recarregar. É de propósito: voltar para páginas pequenas mudaria `perPage` e recarregaria a lista do começo.
- O bicho do dia guarda um único local no cache; trocar de local e voltar refaz a busca (só custa uma requisição).

**Bicho 2048**
- "Continuar no infinito" muda só `game.mode` (a etiqueta acompanha); "Novo jogo" recomeça no modo escolhido no início, que continua em `mode`.
- A partida não é salva (recurso novo).

**Mapa**
- Mostra no máximo os 200 registros mais recentes.

**Infra**
- Para limpar o cache do `sw.js` de todos, troque o nome `bichodex-v1`.
- `updates.ts` depende do padrão `assets/index-*.js` no HTML.
- O cartão de instalação não aparece no Safari/iOS (lá não existe `beforeinstallprompt`).
- No build dos jogos, um nome inexistente (`inatTaxon`, `gbifMatch`, `ottIds`) interrompe o build inteiro. (O `data.js` só é regravado quando o conteúdo muda, então a data do cabeçalho não gera diff sozinha.)
- No build dos jogos, só a busca em observações filtra licença de foto; a foto padrão e as do táxon aceitam qualquer CC, inclusive NC (ver licenças no README do Biodiversigames). Continua assim porque restringir é decisão de licenciamento (e muda as fotos dos puzzles já publicados).
