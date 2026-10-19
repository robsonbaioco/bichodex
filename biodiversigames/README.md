# Biodiversigames

Três jogos diários de biodiversidade em HTML5, prontos para o [itch.io](https://itch.io).
Ideias originais em [brainstorm-jogos.md](brainstorm-jogos.md).

| Jogo | Pasta | Formato | Dados |
|---|---|---|---|
| 🌳 **Parentes** | `parentes/` | Ordenar 5 espécies da mais à menos aparentada com a espécie-alvo | Open Tree of Life (filogenia), iNaturalist (fotos) |
| 🧩 **Conexões Selvagens** | `conexoes-selvagens/` | 16 seres vivos, 4 grupos escondidos (estilo Connections) | GBIF (checagem taxonômica), iNaturalist (fotos) |
| 🗺️ **Onde Vive?** | `onde-vive/` | Marcar no mapa onde a espécie vive (estilo Worldle) | GBIF (ocorrências e mapa-base), iNaturalist, Wikipédia |

Todos têm desafio do dia (o mesmo para todo mundo, troca à meia-noite local), sequência de dias,
estatísticas, resultado compartilhável em emoji e modo treino (🎲).

## Estrutura

```
shared/            código e CSS comuns (editar aqui; é copiado para cada jogo)
parentes/          jogo pronto (index.html, game.js, style.css, data.js gerado)
conexoes-selvagens/
onde-vive/
tools/
  puzzles/*.mjs    conteúdo editável de cada jogo (espécies, grupos)
  build-*.mjs      consulta as APIs e gera <jogo>/data.js
  package.mjs      copia shared/ para os jogos e gera dist/*.zip
  lib.mjs          acesso às APIs com cache em tools/.cache
dist/              zips para subir no itch.io
```

## Como gerar

Requer Node 18+ (usa `fetch` nativo). Nenhuma dependência npm.

```sh
node tools/build-parentes.mjs
node tools/build-conexoes-selvagens.mjs
node tools/build-onde-vive.mjs
node tools/package.mjs             # gera dist/biodiversigames.zip (catálogo) e um zip por jogo
node tools/package.mjs --sync      # só copia shared/ (para testar localmente)
```

Os comandos acima rodam de dentro de `biodiversigames/`.

O `index.html` da raiz é o catálogo: lista os jogos (e os "em breve"), mostra se o desafio de hoje
já foi jogado e a sequência de cada um. Aberto pelo catálogo, cada jogo ganha o botão "← Jogos".

Esta pasta mora dentro do **Bichodex** (até 19/10/2026 era o repositório separado
`robsonbaioco/biodiversigames`, hoje arquivado). Os jogos aparecem na aba Jogos (`src/components/Games.tsx`)
e abrem num iframe a partir de `public/jogos/`, que não vai para o git: `scripts/copiar-jogos.mjs` sincroniza
`shared/` e copia os jogos para lá sozinho antes de `npm run dev` e `npm run build` (ou à mão com
`npm run jogos`). Esta pasta é a única fonte: não edite `public/jogos/`.

As respostas das APIs ficam em cache em `tools/.cache/`. Apague essa pasta para buscar dados novos.
Para testar localmente, abra `<jogo>/index.html` no navegador; funciona até direto do disco.

### Adicionando conteúdo

- **Parentes**: acrescente um item em `tools/puzzles/parentes.mjs`. Você só escolhe as espécies, e a ordem
  correta é calculada pelo Open Tree of Life (tamanho do clado do ancestral comum mais recente). O build
  falha se duas opções tiverem o mesmo ancestral comum com o alvo (empate). Nesse caso, troque uma delas.
- **Conexões Selvagens**: acrescente um puzzle em `tools/puzzles/conexoes-selvagens.mjs`. Use `check` para
  o build confirmar no GBIF que os itens pertencem ao táxon do grupo. Garanta que a divisão em 4 grupos
  tenha solução única, ainda que existam itens-pegadinha.
- **Onde Vive?**: acrescente espécies em `tools/puzzles/onde-vive.mjs`. Prefira espécies de distribuição
  restrita. O build descarta registros de zoológicos e jardins botânicos (`LIVING_SPECIMEN`), populações
  introduzidas ou cultivadas e pontos isolados.

O desafio do dia percorre a lista numa ordem embaralhada fixa e recomeça ao chegar no fim.
O dia 1 é 01/10/2026 (`EPOCH` em `shared/common.js`). **Mudar a quantidade de puzzles muda a
sequência dos próximos dias**: acrescente conteúdo de uma vez, de preferência em lotes.

## Publicando no itch.io

1. `node tools/package.mjs` → `dist/biodiversigames.zip` (catálogo com os três jogos, um único projeto
   no itch.io) ou, se preferir projetos separados, `dist/parentes.zip`, `dist/conexoes-selvagens.zip` e
   `dist/onde-vive.zip`.
2. No itch.io: **Create new project** →
   - *Kind of project*: **HTML**
   - *Uploads*: envie o zip e marque **"This file will be played in the browser"**
   - *Embed options*: tamanho sugerido **800 × 900** (Onde Vive? fica melhor com **900 × 1000**),
     marque **Mobile friendly** (orientação *Portrait*), **Automatically start on page load** e **Fullscreen button**.
   - *Pricing*: **No payments** (veja licenças abaixo).
3. Depois de publicar, coloque o link do jogo em `SHARE_URL` no `game.js` de cada jogo, para o link
   aparecer no texto compartilhado, e reenvie o zip.

Os jogos carregam recursos externos em tempo de execução: as fotos (servidor do iNaturalist), a fonte
Nunito (Google Fonts) e, no Onde Vive?, o Leaflet (cdnjs) e os tiles do mapa-base do GBIF. O itch.io
permite isso; sem internet os jogos não carregam essas partes.

## Licenças dos dados

- **Fotos (iNaturalist)**: licenças Creative Commons, várias **NC (não comercial)**. Por isso publique os
  jogos **gratuitamente**. Para vender, filtre `photo_license` para `cc0,cc-by,cc-by-sa` em `tools/lib.mjs`.
  Os créditos de cada foto aparecem no jogo.
- **GBIF**: dados de ocorrência CC0 / CC BY / CC BY-NC, conforme cada conjunto de dados; o jogo
  credita o GBIF e aponta para a página da espécie. Mapa-base © OpenStreetMap e OpenMapTiles.
- **Open Tree of Life**: árvore sintética de uso aberto, com a versão (`synth_id`) registrada no `data.js`.
- **Wikipédia**: resumos CC BY-SA, com link para o artigo.
