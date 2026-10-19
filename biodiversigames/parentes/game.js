(function () {
  'use strict';
  const { el } = BG;
  const GAME = 'parentes';
  const MAX_TRIES = 4;
  const SHARE_URL = ''; // preencha com o link do jogo no itch.io para aparecer no texto compartilhado
  const DATA = window.PARENTES_DATA;
  const puzzles = DATA.puzzles;
  const today = BG.todayNumber();

  const $ = (id) => document.getElementById(id);
  let puzzle, state, practice;

  // ---------- início ----------

  function startDaily() {
    practice = false;
    const idx = BG.dailyIndex(today, puzzles.length);
    puzzle = puzzles[idx];
    state = BG.load(`${GAME}:day:${today}`, null) || freshState(`dia-${today}`);
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
    render();
  }

  function freshState(seed) {
    return { order: BG.shuffle(puzzle.answer.map((a) => a.sci), seed), history: [], done: false, won: false };
  }

  function persist() {
    if (!practice) BG.save(`${GAME}:day:${today}`, state);
  }

  // ---------- renderização ----------

  function byName(sci) {
    return puzzle.answer.find((a) => a.sci === sci);
  }

  function render() {
    $('day-label').textContent = practice ? 'treino' : `#${today}`;
    $('btn-practice').setAttribute('aria-pressed', String(practice));
    $('mode-banner').hidden = !practice;

    const t = puzzle.target;
    $('target').replaceChildren(
      el('img', { src: t.photo, alt: t.common, width: 120, height: 120 }),
      el('div', {},
        el('div', { class: 'eyebrow', text: 'Espécie-alvo' }),
        el('h2', { text: t.common }),
        el('div', { class: 'sci', text: t.sci }),
        el('div', { class: 'photo-credit', text: '📷 ' + t.credit }),
      ),
    );

    renderOptions();
    renderTries();
    $('btn-submit').hidden = state.done;
    $('result').hidden = !state.done;
    if (state.done) renderResult();
  }

  function lastFeedback() {
    return state.history[state.history.length - 1] || null;
  }

  function renderOptions() {
    const list = $('options');
    list.classList.toggle('locked', state.done);
    const fb = lastFeedback();
    const order = state.done ? puzzle.answer.map((a) => a.sci) : state.order;
    list.replaceChildren(...order.map((sci, i) => {
      const o = byName(sci);
      let cls = 'option';
      let hint = '';
      if (state.done) cls += ' good';
      else if (fb && fb.order[i] === sci) {
        const right = puzzle.answer.findIndex((a) => a.sci === sci);
        if (right === i) cls += ' good';
        else {
          cls += ' bad';
          hint = right < i ? '⬆️' : '⬇️';
        }
      }
      const li = el('li', { class: cls, 'data-sci': sci },
        el('span', { class: 'rank', text: i + 1 }),
        el('img', { src: o.thumb, alt: '', width: 52, height: 52, loading: 'lazy' }),
        el('div', { class: 'names' }, el('strong', { text: o.common }), el('em', { text: o.sci })),
        el('span', { class: 'hint', text: hint, title: hint === '⬆️' ? 'Mais próximo do que isso' : hint ? 'Mais distante do que isso' : '' }),
        el('div', { class: 'move' },
          el('button', { 'aria-label': `Subir ${o.common}`, onclick: () => move(i, -1), disabled: i === 0, text: '▲' }),
          el('button', { 'aria-label': `Descer ${o.common}`, onclick: () => move(i, 1), disabled: i === order.length - 1, text: '▼' }),
        ),
      );
      if (!state.done) li.addEventListener('pointerdown', startDrag);
      return li;
    }));
  }

  function renderTries() {
    const lines = state.history.map((h) => h.marks.map((ok) => (ok ? '🟩' : '⬜')).join(''));
    const left = MAX_TRIES - state.history.length;
    $('tries').replaceChildren(
      ...lines.map((l) => el('div', { text: l })),
      state.done ? '' : el('span', { class: 'left', text: `${left} tentativa${left > 1 ? 's' : ''} restante${left > 1 ? 's' : ''}` }),
    );
  }

  function renderResult() {
    const tries = state.history.length;
    const head = state.won
      ? el('h2', { text: tries === 1 ? '🌟 De primeira!' : `🎉 Acertou em ${tries} tentativas!` })
      : el('h2', { text: '🍂 Não foi dessa vez' });

    const ladder = el('ol', { class: 'ladder' }, puzzle.answer.map((a, i) =>
      el('li', {},
        el('img', { src: a.thumb, alt: '', width: 44, height: 44, loading: 'lazy' }),
        el('div', {},
          el('strong', { text: `${i + 1}. ${a.common}` }), ' ', el('em', { class: 'clade', text: a.sci }),
          el('div', { class: 'clade' },
            'Ancestral comum com o alvo: ',
            a.exact ? '' : 'um grupo sem nome dentro de ',
            el('b', { text: a.clade }),
            a.cladePt ? ` (${a.cladePt})` : '',
            ` · ${a.tips.toLocaleString('pt-BR')} espécies na árvore descendem dele`,
          ),
          el('div', { class: 'photo-credit' }, '📷 ', el('a', { href: a.inatUrl, target: '_blank', rel: 'noopener', text: a.credit })),
        ),
      ),
    ));

    $('result').replaceChildren(
      head,
      el('p', { class: 'fact', text: '💡 ' + puzzle.fact }),
      el('h3', { text: 'A ordem certa' }),
      ladder,
      el('p', { class: 'photo-credit', text: `Quanto menos espécies descendem do ancestral comum, mais recente ele é, e mais próximo o parentesco. Fonte: ${DATA.source}.` }),
      el('div', { class: 'actions' },
        practice ? '' : el('button', { class: 'btn', onclick: shareResult, text: 'Compartilhar' }),
        el('button', { class: 'btn secondary', onclick: startPractice, text: '🎲 Jogar um treino' }),
        practice ? el('button', { class: 'btn secondary', onclick: startDaily, text: 'Voltar ao desafio de hoje' }) : '',
      ),
    );
  }

  // ---------- jogadas ----------

  function move(i, dir) {
    const j = i + dir;
    if (state.done || j < 0 || j >= state.order.length) return;
    [state.order[i], state.order[j]] = [state.order[j], state.order[i]];
    persist();
    renderOptions();
  }

  function submit() {
    if (state.done) return;
    const marks = state.order.map((sci, i) => puzzle.answer[i].sci === sci);
    state.history.push({ order: state.order.slice(), marks });
    const won = marks.every(Boolean);
    if (won || state.history.length >= MAX_TRIES) {
      state.done = true;
      state.won = won;
      if (!practice) BG.recordResult(GAME, today, won, won ? state.history.length - 1 : null, MAX_TRIES);
    } else {
      const right = marks.filter(Boolean).length;
      BG.toast(right ? `${right} de 5 no lugar certo` : 'Nenhuma no lugar certo');
    }
    persist();
    render();
    if (state.done) {
      $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (!practice) setTimeout(showStats, 1200);
    }
  }

  function shareResult() {
    const score = state.won ? `${state.history.length}/${MAX_TRIES}` : `X/${MAX_TRIES}`;
    const grid = state.history.map((h) => h.marks.map((ok) => (ok ? '🟩' : '⬜')).join('')).join('\n');
    BG.share(`🌳 Parentes #${today} ${score}\n${puzzle.target.common}\n${grid}${SHARE_URL ? '\n' + SHARE_URL : ''}`);
  }

  // ---------- arrastar e soltar (mouse e toque) ----------

  let drag = null;

  function startDrag(e) {
    if (e.target.closest('button') || e.button > 0) return;
    const li = e.currentTarget;
    drag = { li, startY: e.clientY, moved: false };
    li.setPointerCapture(e.pointerId);
    li.addEventListener('pointermove', onDrag);
    li.addEventListener('pointerup', endDrag);
    li.addEventListener('pointercancel', endDrag);
  }

  function onDrag(e) {
    const { li } = drag;
    let dy = e.clientY - drag.startY;
    if (!drag.moved && Math.abs(dy) < 4) return;
    drag.moved = true;
    li.classList.add('dragging');
    const gap = 8;
    const next = li.nextElementSibling;
    const prev = li.previousElementSibling;
    if (next && dy > next.offsetHeight / 2 + gap) {
      next.after(li);
      drag.startY += next.offsetHeight + gap;
    } else if (prev && dy < -(prev.offsetHeight / 2 + gap)) {
      prev.before(li);
      drag.startY -= prev.offsetHeight + gap;
    }
    dy = e.clientY - drag.startY;
    li.style.transform = `translateY(${dy}px)`;
  }

  function endDrag() {
    const { li, moved } = drag;
    li.removeEventListener('pointermove', onDrag);
    li.removeEventListener('pointerup', endDrag);
    li.removeEventListener('pointercancel', endDrag);
    li.style.transform = '';
    li.classList.remove('dragging');
    drag = null;
    if (!moved) return;
    state.order = [...$('options').children].map((c) => c.dataset.sci);
    persist();
    renderOptions();
  }

  // ---------- modais ----------

  function showHelp() {
    BG.modal('Como jogar',
      el('p', {}, 'Todo dia há uma ', el('strong', { text: 'espécie-alvo' }), ' e cinco outras espécies. Ordene as cinco da mais aparentada à menos aparentada com o alvo.'),
      el('ul', {},
        el('li', { text: 'Arraste os cartões ou use ▲▼ para reordenar.' }),
        el('li', { text: `Você tem ${MAX_TRIES} tentativas. 🟩 = posição certa.` }),
        el('li', { text: '⬆️ indica que a espécie é mais próxima do que a posição em que está; ⬇️, que é mais distante.' }),
        el('li', { text: 'Parentesco é medido pelo ancestral comum mais recente na árvore da vida, não pela aparência!' }),
      ),
      el('p', { class: 'photo-credit' }, 'A árvore vem da síntese do ', el('a', { href: 'https://opentreeoflife.github.io/', target: '_blank', rel: 'noopener', text: 'Open Tree of Life' }), ', que combina milhares de estudos publicados. As fotos são do iNaturalist, com licença Creative Commons.'),
      el('p', { class: 'photo-credit', text: 'Um novo desafio a cada dia, à meia-noite. O 🎲 abre puzzles de treino.' }),
    );
  }

  function showStats() {
    BG.modal('Estatísticas', BG.statsPanel(BG.getStats(GAME, MAX_TRIES), ['1ª', '2ª', '3ª', '4ª']));
  }

  $('btn-submit').addEventListener('click', submit);
  $('btn-help').addEventListener('click', showHelp);
  $('btn-stats').addEventListener('click', showStats);
  $('btn-practice').addEventListener('click', () => (practice ? startDaily() : startPractice()));

  startDaily();
  if (!BG.load(`${GAME}:seen-help`, false)) {
    BG.save(`${GAME}:seen-help`, true);
    showHelp();
  }
})();
