// Conexões Selvagens: separar 16 seres vivos em 4 grupos escondidos de 4 (estilo Connections).
// Espera no HTML: #day-label, #btn-photos, #btn-practice, #btn-stats, #btn-help, #mode-banner, #solved,
// #grid, #mistakes, #controls (com #btn-shuffle, #btn-clear e #btn-submit) e #result. Espera de data.js
// `window.CONEXOES_DATA` = { puzzles: [{ groups: [{ level (0 = fácil … 3 = traiçoeiro), label, items:
// [{ name, sci, thumb, photo, credit, inatUrl }] }] }] }. Os nomes (`name`) precisam ser únicos no puzzle.
// Usa de common.js (BG): desafio do dia, shuffle, load/save, estatísticas, el, toast, modal, share,
// statsPanel, lossScreen e bichodexUrl.
(function () {
  'use strict';
  const { el } = BG;
  const GAME = 'conexoes'; // prefixo das chaves no localStorage: é "conexoes", não o nome da pasta
  const MAX_MISTAKES = 4;
  const SHARE_URL = BG.bichodexUrl('conexoes-selvagens'); // link direto para o jogo dentro do Bichodex, no fim do texto compartilhado
  const EMOJI = ['🟨', '🟩', '🟦', '🟪']; // cor de cada nível de dificuldade (índice = level)
  const puzzles = window.CONEXOES_DATA.puzzles;
  const today = BG.todayNumber();

  const $ = (id) => document.getElementById(id);
  // state: { order, solved (levels achados, na ordem), guesses (cada tentativa: 4 nomes), mistakes, done, won, revealed? }
  let puzzle, state, practice;
  let selected = new Set(); // nomes marcados agora (não é salvo)

  // ---------- início ----------

  /** Abre o desafio de hoje, retomando a partida salva (`conexoes:day:<n>`), se houver. */
  function startDaily() {
    practice = false;
    puzzle = puzzles[BG.dailyIndex(today, puzzles.length)];
    // Semente `dia-<n>`: a grade começa embaralhada igual para todo mundo no dia.
    state = BG.load(`${GAME}:day:${today}`, null) || freshState(`dia-${today}`);
    selected = new Set();
    render();
  }

  /** Modo treino: um puzzle sorteado (diferente do de hoje), que não é salvo nem conta nas estatísticas. */
  function startPractice() {
    practice = true;
    const daily = BG.dailyIndex(today, puzzles.length);
    let idx;
    do idx = Math.floor(Math.random() * puzzles.length);
    while (idx === daily && puzzles.length > 1);
    puzzle = puzzles[idx];
    state = freshState();
    selected = new Set();
    render();
  }

  /** Partida nova: os 16 nomes embaralhados (com `seed`, ou ao acaso se não vier), sem acertos nem erros. */
  function freshState(seed) {
    const names = puzzle.groups.flatMap((g) => g.items.map((i) => i.name));
    return { order: BG.shuffle(names, seed), solved: [], guesses: [], mistakes: 0, done: false, won: false };
  }

  /** Salva a partida do dia no localStorage (no treino, não salva nada). */
  function persist() {
    if (!practice) BG.save(`${GAME}:day:${today}`, state);
  }

  // Item do puzzle pelo nome e o nível (level) do grupo a que ele pertence.
  const itemByName = (name) => puzzle.groups.flatMap((g) => g.items).find((i) => i.name === name);
  const levelOf = (name) => puzzle.groups.find((g) => g.items.some((i) => i.name === name)).level;

  // Perdeu e ainda não pediu para ver a resposta.
  const veiled = () => state.done && !state.won && !state.revealed;

  // ---------- renderização ----------

  /** Redesenha a tela: grupos achados, grade dos itens que faltam, botões, erros restantes e resultado. */
  function render() {
    $('day-label').textContent = practice ? 'treino' : `#${today}`;
    $('btn-practice').setAttribute('aria-pressed', String(practice));
    $('mode-banner').hidden = !practice;

    // Ao fim, mostra também os grupos que faltaram (na ordem de dificuldade).
    const shownLevels = state.done && !veiled()
      ? [...state.solved, ...puzzle.groups.map((g) => g.level).filter((l) => !state.solved.includes(l))]
      : state.solved;
    $('solved').replaceChildren(...shownLevels.map((lv) => {
      const g = puzzle.groups.find((x) => x.level === lv);
      return el('div', { class: `group lv${lv}` }, el('h3', { text: g.label }), el('p', { text: g.items.map((i) => i.name).join(', ') }));
    }));

    const remaining = state.order.filter((n) => !state.solved.includes(levelOf(n)));
    $('grid').hidden = state.done && !veiled();
    $('grid').replaceChildren(...(state.done && !veiled() ? [] : remaining).map((name) => {
      const it = itemByName(name);
      return el('button', {
        class: 'tile',
        'aria-pressed': String(selected.has(name)),
        'data-name': name,
        disabled: state.done,
        onclick: () => toggle(name),
      }, el('img', { src: it.thumb, alt: '', width: 48, height: 48, loading: 'lazy' }), el('span', { text: name }));
    }));

    $('controls').hidden = state.done;
    $('btn-submit').disabled = selected.size !== 4;
    $('btn-clear').disabled = selected.size === 0;

    const left = MAX_MISTAKES - state.mistakes;
    $('mistakes').replaceChildren(
      state.done ? '' : 'Erros restantes: ',
      ...(state.done ? [] : Array.from({ length: MAX_MISTAKES }, (_, i) => el('span', { class: 'dot' + (i >= left ? ' used' : '') }))),
    );

    $('result').hidden = !state.done;
    if (veiled()) $('result').replaceChildren(BG.lossScreen(reveal));
    else if (state.done) renderResult();
  }

  /** Grade de emoji: uma linha por tentativa, cada item pintado com a cor do grupo a que ele pertence de verdade. */
  function emojiGrid() {
    return state.guesses.map((g) => g.map((n) => EMOJI[levelOf(n)]).join('')).join('\n');
  }

  /** Tela de resultado (#result): título, grade de emoji, botões e créditos das fotos. */
  function renderResult() {
    const title = state.won
      ? state.mistakes === 0 ? '🌟 Perfeito, sem erros!' : `🎉 Conseguiu com ${state.mistakes} erro${state.mistakes > 1 ? 's' : ''}!`
      : '🍂 Não foi dessa vez';
    const credits = puzzle.groups.flatMap((g) => g.items).map((it) =>
      el('li', {}, `${it.name} (`, el('em', { text: it.sci }), '): ', el('a', { href: it.inatUrl, target: '_blank', rel: 'noopener', text: it.credit })));
    $('result').replaceChildren(
      el('h2', { text: title }),
      el('div', { class: 'emoji-grid', text: emojiGrid() }),
      el('div', { class: 'actions' },
        practice ? '' : el('button', { class: 'btn', onclick: shareResult, text: 'Compartilhar' }),
        el('button', { class: 'btn secondary', onclick: startPractice, text: '🎲 Jogar um treino' }),
        practice ? el('button', { class: 'btn secondary', onclick: startDaily, text: 'Voltar ao desafio de hoje' }) : '',
      ),
      el('details', {}, el('summary', { text: 'Nomes científicos e créditos das fotos' }), el('ul', {}, credits)),
    );
  }

  // ---------- jogadas ----------

  /** Marca ou desmarca um item (no máximo 4 marcados). */
  function toggle(name) {
    if (state.done) return;
    if (selected.has(name)) selected.delete(name);
    else if (selected.size < 4) selected.add(name);
    render();
  }

  /**
   * Envia os 4 marcados. Os 4 do mesmo grupo = grupo achado; senão conta um erro (avisa "Falta só um!"
   * quando 3 eram do mesmo grupo). Repetir uma tentativa já feita não conta. Ganha com os 4 grupos;
   * perde no MAX_MISTAKES-ésimo erro.
   */
  function submit() {
    if (selected.size !== 4 || state.done) return;
    // Ordena só para comparar: a tentativa salva guarda a ordem em que os itens foram marcados.
    const guess = [...selected].sort();
    if (state.guesses.some((g) => g.slice().sort().join() === guess.join())) {
      BG.toast('Você já tentou esse grupo');
      return;
    }
    state.guesses.push([...selected]);
    const levels = guess.map(levelOf);
    // Quantos dos 4 caem em cada grupo; `best` é o maior desses números (4 = acertou, 3 = falta um).
    const counts = levels.reduce((m, l) => ((m[l] = (m[l] || 0) + 1), m), {});
    const best = Math.max(...Object.values(counts));

    if (best === 4) {
      state.solved.push(levels[0]);
      selected = new Set();
      if (state.solved.length === 4) finish(true);
    } else {
      state.mistakes++;
      shake();
      if (state.mistakes >= MAX_MISTAKES) finish(false);
      else BG.toast(best === 3 ? 'Falta só um!' : 'Não é um grupo');
    }
    persist();
    // Deixa a animação de erro aparecer antes de redesenhar.
    setTimeout(render, best === 4 ? 0 : 380);
  }

  /** Anima (tremida) os itens marcados depois de um erro. */
  function shake() {
    document.querySelectorAll('.tile[aria-pressed="true"]').forEach((t) => {
      t.classList.remove('shake');
      void t.offsetWidth; // força o reflow para a animação recomeçar mesmo se a classe já estava lá
      t.classList.add('shake');
    });
  }

  /** Encerra a partida; no diário, grava o resultado (faixa = nº de erros) e abre as estatísticas se ganhou. */
  function finish(won) {
    state.done = true;
    state.won = won;
    selected = new Set();
    if (!practice) {
      // MAX_MISTAKES faixas (0 a 3 erros): com 4 erros a partida já é derrota, que não entra na distribuição.
      BG.recordResult(GAME, today, won, won ? state.mistakes : null, MAX_MISTAKES);
      if (won) setTimeout(showStats, 1500);
    }
  }

  /** Depois da derrota, a pessoa pediu para ver a resposta: mostra todos os grupos (salvo em `state.revealed`). */
  function reveal() {
    state.revealed = true;
    persist();
    render();
    $('result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (!practice) setTimeout(showStats, 1500);
  }

  /** Copia o resultado (grade de emoji, sem nomes) com o link do jogo no Bichodex. */
  function shareResult() {
    BG.share(`🧩 Conexões Selvagens #${today}\n${emojiGrid()}${SHARE_URL ? '\n' + SHARE_URL : ''}`);
  }

  // ---------- modais ----------

  /** Modal "Como jogar" (abre sozinho na primeira visita). */
  function showHelp() {
    BG.modal('Como jogar',
      el('p', {}, 'Encontre ', el('strong', { text: '4 grupos de 4' }), ' seres vivos que têm algo em comum.'),
      el('ul', {},
        el('li', { text: 'Selecione 4 itens e toque em Enviar.' }),
        el('li', { text: `Você pode errar ${MAX_MISTAKES} vezes.` }),
        el('li', { text: 'Cuidado com as pegadinhas: alguns itens parecem caber em mais de um grupo, mas só existe uma divisão que funciona para todos.' }),
        el('li', { text: 'Os grupos podem ser taxonômicos (ex.: "moluscos"), ecológicos, de origem ou sobre o próprio nome.' }),
      ),
      el('p', {}, 'Dificuldade: ', ...EMOJI.map((e, i) => `${e} ${['fácil', 'médio', 'difícil', 'traiçoeiro'][i]}  `)),
      el('p', { class: 'photo-credit', text: 'Um novo desafio a cada dia, à meia-noite. O 🎲 abre puzzles de treino; o 📷 liga ou desliga as fotos.' }),
    );
  }

  /** Modal de estatísticas, com uma faixa por nº de erros (0 a 3). */
  function showStats() {
    BG.modal('Estatísticas', BG.statsPanel(BG.getStats(GAME, MAX_MISTAKES), ['0 erros', '1 erro', '2 erros', '3 erros']));
  }

  /** Liga/desliga as fotos dos itens (classe `no-photos` no body) e lembra a escolha em `conexoes:photos`. */
  function setPhotos(on) {
    document.body.classList.toggle('no-photos', !on);
    $('btn-photos').setAttribute('aria-pressed', String(on));
    BG.save(`${GAME}:photos`, on);
  }

  $('btn-submit').addEventListener('click', submit);
  $('btn-clear').addEventListener('click', () => {
    selected = new Set();
    render();
  });
  // Embaralhar: reordena ao acaso só os itens ainda na grade (os dos grupos achados ficam na frente).
  $('btn-shuffle').addEventListener('click', () => {
    const solvedNames = state.order.filter((n) => state.solved.includes(levelOf(n)));
    state.order = [...solvedNames, ...BG.shuffle(state.order.filter((n) => !solvedNames.includes(n)))];
    persist();
    render();
  });
  $('btn-help').addEventListener('click', showHelp);
  $('btn-stats').addEventListener('click', showStats);
  $('btn-practice').addEventListener('click', () => (practice ? startDaily() : startPractice()));
  $('btn-photos').addEventListener('click', () => setPhotos(document.body.classList.contains('no-photos')));

  setPhotos(BG.load(`${GAME}:photos`, true));
  startDaily();
  // Na primeira visita, abre o "Como jogar" uma única vez.
  if (!BG.load(`${GAME}:seen-help`, false)) {
    BG.save(`${GAME}:seen-help`, true);
    showHelp();
  }
})();
