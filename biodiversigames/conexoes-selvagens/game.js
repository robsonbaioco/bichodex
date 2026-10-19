(function () {
  'use strict';
  const { el } = BG;
  const GAME = 'conexoes';
  const MAX_MISTAKES = 4;
  const SHARE_URL = ''; // preencha com o link do jogo no itch.io para aparecer no texto compartilhado
  const EMOJI = ['🟨', '🟩', '🟦', '🟪'];
  const puzzles = window.CONEXOES_DATA.puzzles;
  const today = BG.todayNumber();

  const $ = (id) => document.getElementById(id);
  let puzzle, state, practice;
  let selected = new Set();

  // ---------- início ----------

  function startDaily() {
    practice = false;
    puzzle = puzzles[BG.dailyIndex(today, puzzles.length)];
    state = BG.load(`${GAME}:day:${today}`, null) || freshState(`dia-${today}`);
    selected = new Set();
    render();
  }

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

  function freshState(seed) {
    const names = puzzle.groups.flatMap((g) => g.items.map((i) => i.name));
    return { order: BG.shuffle(names, seed), solved: [], guesses: [], mistakes: 0, done: false, won: false };
  }

  function persist() {
    if (!practice) BG.save(`${GAME}:day:${today}`, state);
  }

  const itemByName = (name) => puzzle.groups.flatMap((g) => g.items).find((i) => i.name === name);
  const levelOf = (name) => puzzle.groups.find((g) => g.items.some((i) => i.name === name)).level;

  // ---------- renderização ----------

  function render() {
    $('day-label').textContent = practice ? 'treino' : `#${today}`;
    $('btn-practice').setAttribute('aria-pressed', String(practice));
    $('mode-banner').hidden = !practice;

    // Ao fim, mostra também os grupos que faltaram (na ordem de dificuldade).
    const shownLevels = state.done
      ? [...state.solved, ...puzzle.groups.map((g) => g.level).filter((l) => !state.solved.includes(l))]
      : state.solved;
    $('solved').replaceChildren(...shownLevels.map((lv) => {
      const g = puzzle.groups.find((x) => x.level === lv);
      return el('div', { class: `group lv${lv}` }, el('h3', { text: g.label }), el('p', { text: g.items.map((i) => i.name).join(', ') }));
    }));

    const remaining = state.order.filter((n) => !state.solved.includes(levelOf(n)));
    $('grid').hidden = state.done;
    $('grid').replaceChildren(...(state.done ? [] : remaining).map((name) => {
      const it = itemByName(name);
      return el('button', {
        class: 'tile',
        'aria-pressed': String(selected.has(name)),
        'data-name': name,
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
    if (state.done) renderResult();
  }

  function emojiGrid() {
    return state.guesses.map((g) => g.map((n) => EMOJI[levelOf(n)]).join('')).join('\n');
  }

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

  function toggle(name) {
    if (state.done) return;
    if (selected.has(name)) selected.delete(name);
    else if (selected.size < 4) selected.add(name);
    render();
  }

  function submit() {
    if (selected.size !== 4 || state.done) return;
    const guess = [...selected].sort();
    if (state.guesses.some((g) => g.slice().sort().join() === guess.join())) {
      BG.toast('Você já tentou esse grupo');
      return;
    }
    state.guesses.push([...selected]);
    const levels = guess.map(levelOf);
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
    setTimeout(render, best === 4 || state.done ? 0 : 380);
  }

  function shake() {
    document.querySelectorAll('.tile[aria-pressed="true"]').forEach((t) => {
      t.classList.remove('shake');
      void t.offsetWidth;
      t.classList.add('shake');
    });
  }

  function finish(won) {
    state.done = true;
    state.won = won;
    selected = new Set();
    if (!practice) {
      BG.recordResult(GAME, today, won, won ? state.mistakes : null, MAX_MISTAKES);
      setTimeout(showStats, 1500);
    }
  }

  function shareResult() {
    BG.share(`🧩 Conexões Selvagens #${today}\n${emojiGrid()}${SHARE_URL ? '\n' + SHARE_URL : ''}`);
  }

  // ---------- modais ----------

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

  function showStats() {
    BG.modal('Estatísticas', BG.statsPanel(BG.getStats(GAME, MAX_MISTAKES), ['0 erros', '1 erro', '2 erros', '3 erros']));
  }

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
  if (!BG.load(`${GAME}:seen-help`, false)) {
    BG.save(`${GAME}:seen-help`, true);
    showHelp();
  }
})();
