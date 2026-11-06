# Arquitetura

> Nunca mexeu com TypeScript ou React? Leia antes [TypeScript e React](typescript-e-react.md).

PWA em **React 19 + TypeScript + Vite**, sem backend. Os dados de espécies vêm da API pública do iNaturalist; o que a pessoa marca fica no `localStorage` do aparelho. O app é publicado como site estático no GitHub Pages.

```
Navegador
├── App (React) ──── api.ts ──── iNaturalist / BigDataCloud / Open-Meteo
│     │
│     └── storage.ts ── localStorage (chaves "bichodex:*")
├── iframe jogos/<jogo>/ ── Biodiversigames (JS puro) ── localStorage (chaves "<jogo>:*")
└── sw.js (service worker) ── Cache Storage "bichodex-v1" (cópia offline do app)
```

## Pastas

```
index.html              página única; carrega src/main.tsx
src/
  main.tsx              ponto de entrada: fontes, CSS, tema, monta o App, registra o sw.js
  App.tsx               componente raiz: todo o estado e a navegação
  api.ts                todas as chamadas de rede e os tipos (Taxon, Place, Photo...)
  storage.ts            load/save no localStorage + backup (exportar/importar)
  categories.ts         categorias (Mamíferos, Aves...) e categoryOf(taxon)
  format.ts             formatação para a tela: números, nomes, risco, raridade, datas, busca sem acento, slug
  photos.ts             fotos reaproveitáveis (isReusable) e URL grande (largeUrl), do cartão e do colorir
  themes.ts             lista de temas, intensidade e tamanho de letra; applyTheme()
  missions.ts           missões diárias, sequência e medalhas (funções puras)
  highlights.ts         bicho do dia, datas comemorativas do dia, lembretes
  specialDays.ts        datas sobre animais (dados)
  associatedDays.ts     datas que não são sobre animais, com um animal associado (dados)
  reminders.ts          datas só em texto, sem animal (dados)
  game2048.ts           regras do Bicho 2048 (sem React)
  lineArt.ts            foto → desenho de contorno (página de colorir) + balde de tinta
  shareCard.ts          desenho do cartão de conquista em canvas
  updates.ts            detecta versão nova publicada
  components/           telas e peças de interface (ver tabela abaixo)
  styles.css            tokens do tema Original e estilos base
  views.css             estilos das telas + bloco da intensidade "suave"
  themes.css            temas Élfico e Jogo
  themes-ousados.css    Graffiti, Cordel, Naturalista, Terminal, Noturno, Colecionável, Parque
  assets/               imagens do tema Graffiti
public/                 copiado como está para dist/: ícones, manifest, sw.js
scripts/copiar-jogos.mjs  copia os jogos de biodiversigames/ para public/jogos/
biodiversigames/        os três jogos diários (fonte única) e seus geradores
pwa-assets.config.ts    geração dos ícones (npm run icons)
vite.config.ts          base './' (caminhos relativos), host: true
```

## Componentes

| Arquivo | O que é |
|---|---|
| `LocationPicker.tsx` | Escolha do local: GPS ou busca de cidade; arredonda para ~1 km |
| `Highlights.tsx` | Faixa do topo do Explorar: bicho do dia, datas comemorativas, lembretes |
| `SpeciesCard.tsx` | Cartão de espécie das grades (foto, nº, selo de risco, botão ✓) |
| `SpeciesDetail.tsx` | Ficha completa em modal (`#/especie/<id>`); exporta `SeenAtField` |
| `ShareAchievement.tsx` | Cartão de conquista: monta o JPEG e oferece compartilhar/baixar |
| `Coloring.tsx` | Página de colorir (pincel, balde, borracha, desfazer, imprimir) |
| `Deck.tsx` | Baralho de descobertas (arrastar para "Já vi"/"Ainda não") |
| `Trail.tsx` | Modo trilha (marcar várias em sequência, com relógio e resumo) |
| `MapView.tsx` | Aba Mapa (Leaflet) + lista das espécies por distância |
| `Dex.tsx` | Aba Minha dex: álbum, progresso por categoria, sugestões, backup |
| `Missions.tsx` | Aba Missões: sequência, missões do dia, medalhas |
| `Games.tsx` | Aba Jogos: lista e jogo aberto (`#/jogos/<id>`) |
| `Game2048.tsx` | Tela do Bicho 2048 |
| `ThemePicker.tsx` | Janela "Tema e letra" |
| `Backup.tsx` | Exportar/importar o arquivo de dados |
| `InstallPrompt.tsx` | Cartão "Instalar o app" (Chrome/Android) |
| `UpdatePrompt.tsx` | Recarrega ao detectar versão nova (nos jogos, pede confirmação) |

## O App (`src/App.tsx`)

O `App` é o dono de todo o estado; os componentes recebem dados por props e avisam o App por callbacks (`onToggleSeen`, `onOpen`...).

**Estado salvo** (cada um tem um `useEffect` que chama `save` quando muda): `place`, `radius`, `seen`, `zooIds`, `seenAt`, `progress`, `trail`. Ver [Dados e APIs](dados-e-apis.md).

**Estado da sessão**: filtros (`categoryId` ou `special`, `query`, `rarityId`, `threatened`), a lista carregada (`list`), contagens por categoria, a aba (`view`), a ficha aberta (`selectedId`) e as camadas abertas por cima (`sharing`, `coloring`, `deckOpen`, `trailOpen`, `pickingTheme`, `changingPlace`, `justSeen`).

### Do local à lista

1. O `LocationPicker` chama `pickPlace` → `place` muda.
2. Um efeito chama `fetchCategoryCounts` (números das categorias); outro chama `fetchSpecies` na página 1.
3. O efeito da lista depende de local, raio, categoria, "em risco", tamanho da página, ordem e `reloadKey`. Usa `AbortController` e um contador (`request.current`) para descartar respostas atrasadas.
4. O raio passa por `radiusDraft` e só vale depois de 400 ms parado (evita uma busca por pixel do controle).
5. Próximas páginas: rolagem infinita (`IntersectionObserver` no `sentinel`); com busca por nome, as páginas vêm em sequência automática (`bulk`, 500 por vez).
6. Raridade e nome são filtrados no cliente (`visible`). Com filtro de raridade, a página passa a ter 200 itens; na faixa "Raro" a ordem é crescente.
7. Com 3 letras ou mais na busca, `searchWorldSpecies` busca também no mundo todo; a seção "Fora da sua região" aparece quando a lista regional acaba.

### Avistamento

`toggleSeen(id, feedback)` atualiza juntos `seen`, `zoo`, `seenAt` e `progress`. O retorno visual depende de onde a pessoa marcou:

- `'toast'` (padrão: grade, destaques, mapa, dex): aviso discreto de 6 s, sem bloquear a tela, para marcar várias em sequência;
- `'card'` (ficha): abre o cartão de conquista;
- `'none'` (baralho e trilha, que têm fluxo próprio).

A posição em `seen` (+1) é o "nº na sua dex". `setWhere` grava zoológico/natureza; `changeSeenAt` muda a data.

### Navegação

Por hash, lido em `viewFromHash` e `selectedFromHash`:

| Endereço | Tela |
|---|---|
| `#/explorar` (ou vazio) | Explorar |
| `#/mapa`, `#/dex`, `#/missoes`, `#/jogos` | Abas |
| `#/jogos/<id>` | Jogo aberto (`2048`, `colorir`, `parentes`, `conexoes-selvagens`, `onde-vive`) |
| `#/especie/<id>` | Ficha por cima da aba atual |

`closeDetail` usa `history.back()` quando a ficha foi aberta de dentro do app e `replaceState` quando veio de um link. A ficha funciona mesmo sem local definido (link compartilhado aberto por alguém novo). O mapa é carregado sob demanda (`lazy`).

## Inicialização (`src/main.tsx`)

Importa as fontes `@fontsource` e o CSS, aplica o tema salvo **antes** do primeiro render (para não piscar), monta `App`, `InstallPrompt` e `UpdatePrompt` e, só em produção, registra `./sw.js`.
