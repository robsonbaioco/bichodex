# Biodiversigames

Três jogos diários em HTML + JS puro (sem build, sem React), em `biodiversigames/`. O app mostra os jogos na aba Jogos, num iframe. O [README da pasta](../biodiversigames/README.md) explica o gerador de conteúdo, as APIs usadas no build e as licenças; aqui está o funcionamento dos jogos em si.

## Do conteúdo ao app

```
tools/puzzles/<jogo>.mjs   (você edita: espécies, grupos)
        │  node tools/build-<jogo>.mjs   (consulta APIs; cache em tools/.cache/)
        ▼
<jogo>/data.js             (gerado, vai para o git; define window.X = {...})
        │  npm run dev / npm run build  →  scripts/copiar-jogos.mjs
        ▼
public/jogos/<jogo>/       (gerado, fora do git)  →  iframe da aba Jogos
```

`copiar-jogos.mjs` também copia `shared/common.js` e `shared/base.css` para dentro de cada pasta de jogo antes de copiar para `public/jogos/`. **Edite sempre em `shared/`**; as cópias nas pastas dos jogos são sobrescritas. Para sincronizar à mão: `node tools/package.mjs --sync` (de dentro de `biodiversigames/`).

## Arquivos de cada jogo

| Arquivo | Papel |
|---|---|
| `index.html` | Estrutura da tela; carrega `data.js`, `common.js` e `game.js` |
| `data.js` | Puzzles gerados (não editar à mão) |
| `common.js` | Cópia de `shared/common.js` |
| `base.css` / `style.css` | Estilo comum / estilo do jogo |
| `game.js` | Lógica e desenho da tela do jogo |

O `biodiversigames/index.html` (catálogo) só é usado no zip do itch.io ou ao abrir a pasta localmente; não vai para o Bichodex.

## `shared/common.js` (objeto global `window.BG`)

| Função | O que faz |
|---|---|
| `todayNumber()` | Número do desafio de hoje: dia 1 = `EPOCH` (01/10/2026), à meia-noite local |
| `dailyIndex(n, count)` | Qual puzzle cai no dia `n`: ordem embaralhada fixa com semente `'ordem-' + count` |
| `rng(seed)` / `shuffle(arr, seed?)` | Aleatório com semente (mulberry32) e embaralhamento Fisher-Yates |
| `load(key, fallback)` / `save(key, value)` | JSON no `localStorage`, engolindo erros |
| `recordResult(game, day, won, score, maxScore)` | Grava estatísticas e sequência (ignora dia já registrado) |
| `getStats(game)` | Lê as estatísticas; zera a sequência se a pessoa pulou um dia |
| `el(tag, attrs, ...filhos)` | Cria elementos (`class`, `text`, `html`, `on*`) |
| `toast`, `modal`, `closeModal` | Avisos e janela (uma por vez; fecha no ✕, fora ou Esc) |
| `statsPanel`, `countdown`, `lossScreen` | Painel de estatísticas, contagem até o próximo desafio, tela de derrota |
| `share(text)` | Copia o resultado (área de transferência → `execCommand` → modal com o texto) |
| `bichodexUrl(id)` | `https://robsonbaioco.github.io/bichodex/#/jogos/<id>` (link do texto compartilhado) |

## Regras

Comum aos três: o **treino** (🎲) sorteia outro puzzle, sem salvar nem contar estatística. Ao perder, a resposta fica escondida até a pessoa tocar em "Mostrar resultado".

| Jogo | Regras | Vitória | Faixa da estatística |
|---|---|---|---|
| **Parentes** | Ordenar 5 espécies da mais à menos aparentada com o alvo, em 4 tentativas. 🟩 = posição certa; ⬆️/⬇️ indicam para onde ir. A ordem certa vem do build (tamanho do clado do ancestral comum mais recente, Open Tree of Life). | 5 posições certas | nº da tentativa − 1 |
| **Conexões Selvagens** | 16 itens em 4 grupos de 4, até 4 erros. Aviso "Falta só um!" com 3 de 4 certos. Tentativa repetida não conta. 🟨🟩🟦🟪 = níveis 0 a 3. | 4 grupos achados | nº de erros |
| **Onde Vive?** | 6 palpites no mapa; cada um mostra a distância e a direção até o registro mais próximo da espécie. Dicas: continente no 2º palpite, país no 4º. | Palpite a até 250 km (`WIN_KM`) de um registro | nº do palpite − 1 |

A direção do Onde Vive? é o rumo pelo caminho mais curto no globo (8 setas), não a reta do mapa plano; em distâncias longas pode parecer "errada".

## Integração com o Bichodex

- **Não há troca de mensagens** (sem `postMessage`, sem tema sincronizado). `Games.tsx` só aponta o iframe para `jogos/<id>/index.html`.
- Como o iframe é da mesma origem, os jogos gravam no `localStorage` do Bichodex, com chaves próprias.
- `?catalogo=1` na URL (posto pelo catálogo do itch.io) faz aparecer o botão "← Jogos". No Bichodex não aparece.

## Armazenamento e recursos externos

- Chaves: `<jogo>:day:<n>` (partida do dia), `<jogo>:stats`, `<jogo>:seen-help`, com `<jogo>` = `parentes`, **`conexoes`** (não `conexoes-selvagens`) ou `onde-vive`. Só no Conexões: `conexoes:photos`.
- Externos em tempo de execução: fonte Nunito (Google Fonts), fotos do iNaturalist. No Onde Vive?: Leaflet 1.9.4 (cdnjs), mapa-base `tile.gbif.org`, camada de densidade e busca de ocorrências do GBIF, galeria pela API do iNaturalist. Sem internet, o Onde Vive? não funciona.

## Cuidados

- **Mudar a quantidade de puzzles muda o puzzle de todos os dias seguintes** (a semente da ordem depende da quantidade). Acrescente conteúdo em lotes.
- A partida salva (`<jogo>:day:<n>`) não guarda qual era o puzzle. Se o `data.js` mudar de tamanho no meio do dia, a partida de quem já jogou passa a apontar para outro puzzle e pode quebrar a tela.
- O vetor de distribuição das estatísticas é criado no primeiro resultado com o `maxScore` daquele momento; mudar `MAX_*` depois não o redimensiona.
- O dia é pelo fuso local: pessoas em fusos diferentes podem ver puzzles diferentes no mesmo instante.
- No Parentes, o `gap = 8` do arrastar em `game.js` precisa bater com o `gap` de `.options` em `parentes/style.css`.
