# Funcionalidades

Como cada parte funciona por dentro. Detalhes de cada função estão nos comentários do próprio arquivo.

## Ficha da espécie (`SpeciesDetail.tsx`)

- Abre em modal pela rota `#/especie/<id>`. Mostra na hora o que já veio da lista e completa quando chega o `fetchTaxon` (a busca anterior é cancelada se a espécie mudar).
- Até 6 fotos com miniaturas, raridade, risco de extinção, resumo da Wikipédia e classificação (`RANKS` traduz os níveis taxonômicos).
- A barra de frequência usa escala logarítmica contra a espécie mais registrada da lista (`maxCount`), com mínimo de 4%.
- Os botões de compartilhar e colorir só aparecem depois de marcar a espécie; compartilhar também exige local definido.
- Fecha com Esc, ✕ ou toque fora.

## Cartão de conquista (`ShareAchievement.tsx` + `shareCard.ts`)

1. Busca as fotos reutilizáveis da espécie e sorteia uma ("Sortear outra foto" troca). A pessoa também pode enviar uma foto dela.
2. A cada mudança de foto, formato (feed 1080×1350 ou stories 1080×1920), local ou data, redesenha: `loadImage` carrega a foto e `./icon.svg`, `drawCard` desenha com as cores do tema (`card` em `themes.ts`, porque o canvas não lê CSS) e `toBlob` gera um JPEG (qualidade 0,92). Desenhos antigos que terminem depois de uma troca são descartados.
3. Compartilhar usa `navigator.share` com o arquivo e o link da ficha (só aparece se `canShare({files})` funcionar). Baixar está sempre disponível.

O layout tem posições fixas para 1080 px de largura. O nome ocupa até 2 linhas (fonte de 84 a 48 px); o crédito da foto vai no rodapé. No cartão vai só o dia do avistamento, sem a hora.

## Página de colorir (`Coloring.tsx` + `lineArt.ts`)

`makeLineArt` transforma a foto em contorno:

1. reduz a no máximo 900 px de lado e calcula a luminância;
2. aplica 3 borrões de caixa (aproximam um gaussiano);
3. calcula as bordas com o operador Sobel;
4. escolhe o limiar por percentil, para que 5%, 8% ou 12% dos pixels virem traço (níveis Simples, Médio e Detalhado);
5. remove manchinhas soltas (componentes menores que (largura + altura) × 0,06);
6. engrossa o traço em 1 px.

Na tela são dois canvas empilhados: pintura embaixo e traços em cima (`mix-blend-mode: multiply`, sem receber toques). O balde (`floodFill`) para na máscara dos traços (tolerância 60). "Desfazer" guarda até 20 cópias da pintura. Imprimir monta uma folha num portal, põe a classe `printing` no body e chama `window.print()`. Há dois downloads em PNG: a pintura e o desenho em branco.

A página abre pela ficha ou pela aba Jogos (`ColoringPicker`, que escolhe o bicho).

## Baralho (`Deck.tsx`)

Mostra uma espécie da região ainda não avistada por vez; a fila é fixada quando o baralho abre. Responde-se arrastando o cartão (90 px ou mais), pelos botões ou pelas setas ←/→; Esc fecha. "Já vi" marca como avistada na natureza. No fim mostra quantas foram marcadas.

## Trilha (`Trail.tsx`)

O App cria e salva um `TrailState` (`start`, `place`, `found`). Tocar numa espécie a inclui ou tira da trilha e marca como avistada. O filtro ignora acentos e mostra até 80 itens. O relógio é calculado a partir de `start`, então continua contando com o app fechado. "Encerrar" mostra o resumo (compartilhar ou copiar); fechar o resumo descarta a trilha.

## Mapa (`MapView.tsx`)

- Leaflet com tiles do OpenStreetMap, círculo da área e o ponto "Você está aqui". O mapa é recriado quando o local ou o raio mudam.
- Um ponto por registro recente (`fetchRecentSightings`, até 200), na cor da categoria. Cores escritas como `var(--…)` viram `#0f7a4d`, porque o canvas do mapa não lê CSS.
- Categoria e "em risco" são filtrados no servidor; nome e raridade no cliente. A raridade precisa do total de cada espécie e faz uma segunda chamada (`fetchCountsForTaxa`) só quando o filtro está ligado.
- Os popups são DOM puro (o Leaflet não aceita JSX); por isso as props entram por refs (`openRef`, `seenRef`, `toggleRef`).
- Embaixo, a lista de espécies ordenável por "mais perto" (haversine, `distanceKm`) ou "mais registros", de 30 em 30. Tocar numa espécie filtra o mapa nos pontos dela.

## Minha dex (`Dex.tsx`)

O App guarda só os ids; a dex baixa os dados em lotes (`fetchTaxaByIds`, pedindo só os que faltam), com cartões "esqueleto" enquanto carrega. Barra de progresso por categoria com total = `max(espécies do grupo na região, avistadas)`. Mostra 12 sugestões de espécies da região que faltam e o `Backup` no fim.

## Missões, sequência e medalhas (`missions.ts` + `Missions.tsx`)

- `loadProgress` roda ao abrir o app: se a última visita foi ontem, sequência +1; se foi antes, volta a 1. Zera as missões do dia e guarda o recorde em `best`.
- Missões do dia: avistar 1 espécie, abrir 3 fichas, avistar 1 espécie da categoria do dia.
- Categoria do dia (`dailyCategory`): dia do ano % 8 sobre `DAILY_GROUPS` (aves, insetos, plantas, mamíferos, répteis, aracnídeos, fungos, anfíbios), igual para todo mundo.
- Medalhas não são salvas, são calculadas na hora: de avistamento (1, 5, 10, 25, 50, 100, pelo total atual) e de sequência (3, 7, 30, pelo `best`).
- A virada do dia só acontece ao abrir ou recarregar o app.

## Destaques (`highlights.ts` + `Highlights.tsx`)

- **Bicho do dia**: `fetchDailyCandidates` traz animais com foto e nome popular da região; o escolhido é `hash(data) % candidatos` (FNV-1a), então todos no mesmo lugar veem o mesmo bicho. Fica em cache (`bichodex:daily`) para não mudar durante o dia.
- **Datas comemorativas** (`specialDaysOn`): juntam `SPECIAL_DAYS` (datas sobre animais) e `ASSOCIATED_DAYS` (datas de outro assunto, com um animal e um `reason`). Regras de data: dia fixo, "enésimo/último dia da semana do mês" ou Páscoa (algoritmo de Meeus/Jones/Butcher). Cada cartão conta as espécies do grupo na região (`countSpeciesInArea`) e oferece "Ver as N espécies da sua região" (filtra o Explorar pelo táxon).
- **Lembretes** (`remindersOn`): datas só em texto, de `REMINDERS['MM-DD']`, na linha "📅 Hoje também é".
- Para testar outro dia, abra o app com `?data=AAAA-MM-DD` (não afeta o bicho do dia).

## Aba Jogos (`Games.tsx`)

A lista `GAMES` tem o Bicho 2048, o Colorir e os três jogos do Biodiversigames. O jogo aberto fica em `#/jogos/<id>`. Os do Biodiversigames abrem num `<iframe src="jogos/<id>/index.html">`, servido de `public/jogos/` (gerado por `scripts/copiar-jogos.mjs`). Detalhes em [Biodiversigames](biodiversigames.md).

## Bicho 2048 (`game2048.ts` + `Game2048.tsx`)

- Tabuleiro 4×4 imutável. `paths(dir)` gera os caminhos a partir da borda para onde os blocos vão, então a mesma rotina serve para as 4 direções. Cada par se funde uma vez por jogada; o bloco da frente dobra e mantém o `id`.
- Depois de cada jogada válida nasce um 2 (90%) ou um 4 (10%). Pontos = soma dos valores fundidos.
- Modo normal trava em 2048 e oferece "Continuar no infinito".
- Cada valor tem um animal da região (2 → 1º, …, 2048 → 11º), pré-carregado antes de liberar o jogo.
- O `id` estável de cada bloco + `top`/`left` em `calc()` deixam o CSS animar o deslize.
- Controles: setas/WASD, deslize de 24 px ou mais, ou o direcional na tela. A partida não é salva; só o recorde.

## Temas e tamanho da letra (`themes.ts` + CSS)

- `applyTheme(id, intensity)` põe `data-theme` e `data-intensity` no `<html>`, troca a `meta theme-color` e salva a escolha.
- Os tokens (`--bg`, `--surface`, `--ink`, `--muted`, `--line`, `--brand`, `--accent*`, `--topbar-*`, `--radius*`, `--font-display`, `--bg-image`...) ficam em `:root` de `styles.css`, com claro/escuro por `prefers-color-scheme`. Esse é o tema **Original**.
- Cada tema redefine os tokens em `:root[data-theme='<id>']`: Élfico e Jogo em `themes.css` (com variante escura); Graffiti (`grafite`), Cordel, Naturalista (`campo`), Terminal, Noturno, Colecionável (`carta`) e Parque em `themes-ousados.css` (com `color-scheme` fixo). Ajustes por tela ficam no fim de `views.css`.
- **Forte** é o padrão. **Suave** é um bloco em `views.css` sob `:root[data-intensity='suave']` que desliga com `!important` imagens de fundo, sombras, rotações e os `::before`/`::after` decorativos. Ficam só cores e fontes.
- Tamanho da letra: `--text-scale` (1 / 1,15 / 1,3) multiplica o `font-size` do `html`; o CSS usa `rem`.

Passo a passo para criar um tema em [Manutenção](manutencao.md#tema-novo).
