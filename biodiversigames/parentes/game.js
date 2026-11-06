// Parentes: ordenar 5 espécies da mais à menos aparentada com a espécie-alvo do dia.
// Espera no HTML: #day-label, #btn-practice, #btn-stats, #btn-help, #mode-banner, #target, #options,
// #tries, #btn-submit e #result. Espera de data.js `window.PARENTES_DATA` = { source, puzzles: [{ target,
// answer (já na ordem certa, do mais próximo ao mais distante), fact }] }.
// Usa de common.js (BG): desafio do dia, shuffle com semente, load/save, estatísticas, el, toast,
// modal, share, statsPanel, lossScreen e bichodexUrl.
(function () {
  'use strict';
  const { el } = BG;
  const GAME = 'parentes'; // prefixo das chaves no localStorage (o catálogo usa o mesmo)
  const MAX_TRIES = 4;
  const SHARE_URL = BG.bichodexUrl('parentes'); // link direto para o jogo dentro do Bichodex, no fim do texto compartilhado
  const DATA = window.PARENTES_DATA;
  const puzzles = DATA.puzzles;
  const today = BG.todayNumber();

  const $ = (id) => document.getElementById(id);
  // puzzle: o puzzle em jogo; state: { order, history, done, won, revealed? }; practice: modo treino?
  let puzzle, state, practice;

  // ---------- início ----------

  /** Abre o desafio de hoje, retomando a partida salva no localStorage (`parentes:day:<n>`), se houver. */
  function startDaily() {
    practice = false;
    const idx = BG.dailyIndex(today, puzzles.length);
    puzzle = puzzles[idx];
    // Semente `dia-<n>`: a ordem inicial das opções é a mesma para todo mundo no dia.
    state = BG.load(`${GAME}:day:${today}`, null) || freshState(`dia-${today}`);
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
    render();
  }

  /** Partida nova: as 5 opções embaralhadas (com `seed`, ou ao acaso se não vier) e nenhuma tentativa. */
  function freshState(seed) {
    return { order: BG.shuffle(puzzle.answer.map((a) => a.sci), seed), history: [], done: false, won: false };
  }

  /** Salva a partida do dia no localStorage (no treino, não salva nada). */
  function persist() {
    if (!practice) BG.save(`${GAME}:day:${today}`, state);
  }

  // Perdeu e ainda não pediu para ver a resposta.
  const veiled = () => state.done && !state.won && !state.revealed;

  // ---------- renderização ----------

  /** Opção do puzzle pelo nome científico. */
  function byName(sci) {
    return puzzle.answer.find((a) => a.sci === sci);
  }

  /** Redesenha a tela inteira a partir de `puzzle` e `state`: alvo, opções, tentativas e resultado. */
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
    if (veiled()) $('result').replaceChildren(BG.lossScreen(reveal));
    else if (state.done) renderResult();
  }

  /** Última tentativa conferida ({ order, marks }) ou null. */
  function lastFeedback() {
    return state.history[state.history.length - 1] || null;
  }

  /**
   * Desenha a lista de opções (#options) na ordem atual, com ▲▼ e arrastar. No fim (sem véu),
   * mostra a ordem certa toda em verde.
   */
  function renderOptions() {
    const list = $('options');
    list.classList.toggle('locked', state.done);
    const fb = lastFeedback();
    const showAnswer = state.done && !veiled();
    const order = showAnswer ? puzzle.answer.map((a) => a.sci) : state.order;
    list.replaceChildren(...order.map((sci, i) => {
      const o = byName(sci);
      let cls = 'option';
      let hint = '';
      if (showAnswer) cls += ' good';
      // Só marca o cartão que continua na mesma posição em que foi conferido; ao mexer, a dica some.
      else if (fb && fb.order[i] === sci) {
        const right = puzzle.answer.findIndex((a) => a.sci === sci);
        if (right === i) cls += ' good';
        else {
          cls += ' bad';
          // ⬆️ = o lugar certo é mais acima (parente mais próximo); ⬇️ = mais abaixo.
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

  /** Linhas de 🟩/⬜ de cada tentativa e quantas tentativas restam (#tries). */
  function renderTries() {
    const lines = state.history.map((h) => h.marks.map((ok) => (ok ? '🟩' : '⬜')).join(''));
    const left = MAX_TRIES - state.history.length;
    $('tries').replaceChildren(
      ...lines.map((l) => el('div', { text: l })),
      state.done ? '' : el('span', { class: 'left', text: `${left} tentativa${left > 1 ? 's' : ''} restante${left > 1 ? 's' : ''}` }),
    );
  }

  /**
   * Tela de resultado (#result): título, curiosidade, a ordem certa com o ancestral comum de cada
   * opção (clado e nº de espécies descendentes, vindos do data.js), créditos e botões.
   */
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
            // exact = false: o ancestral é um nó sem nome na árvore; `clade` é o grupo com nome que o contém.
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

  /** Troca a opção da posição `i` com a vizinha (`dir` = -1 sobe, 1 desce) e salva. */
  function move(i, dir) {
    const j = i + dir;
    if (state.done || j < 0 || j >= state.order.length) return;
    [state.order[i], state.order[j]] = [state.order[j], state.order[i]];
    persist();
    renderOptions();
  }

  /**
   * Confere a ordem atual: cada posição certa vale um 🟩. Ganha com as 5 certas; perde ao gastar as
   * MAX_TRIES tentativas. No diário, grava o resultado (faixa = nº da tentativa - 1) e abre as estatísticas.
   */
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
      if (!practice && state.won) setTimeout(showStats, 1200);
    }
  }

  /** Depois da derrota, a pessoa pediu para ver a resposta: tira o véu (salvo em `state.revealed`). */
  function reveal() {
    state.revealed = true;
    persist();
    render();
    $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (!practice) setTimeout(showStats, 1500);
  }

  /** Copia o resultado em emoji (nº de tentativas, alvo e a grade 🟩/⬜) com o link do jogo no Bichodex. */
  function shareResult() {
    const score = state.won ? `${state.history.length}/${MAX_TRIES}` : `X/${MAX_TRIES}`;
    const grid = state.history.map((h) => h.marks.map((ok) => (ok ? '🟩' : '⬜')).join('')).join('\n');
    BG.share(`🌳 Parentes #${today} ${score}\n${puzzle.target.common}\n${grid}${SHARE_URL ? '\n' + SHARE_URL : ''}`);
  }

  // ---------- arrastar e soltar (mouse e toque) ----------

  let drag = null; // { li, startY, moved } enquanto um cartão está sendo arrastado

  /** Começa a arrastar um cartão (pointer events cobrem mouse e toque). Ignora os botões ▲▼ e o botão direito. */
  function startDrag(e) {
    if (e.target.closest('button') || e.button > 0) return;
    const li = e.currentTarget;
    drag = { li, startY: e.clientY, moved: false };
    li.setPointerCapture(e.pointerId);
    li.addEventListener('pointermove', onDrag);
    li.addEventListener('pointerup', endDrag);
    li.addEventListener('pointercancel', endDrag);
  }

  /**
   * Move o cartão com o dedo/mouse. Ao passar da metade do vizinho, troca de lugar com ele no DOM e
   * desloca `startY` pela altura dele, para o cartão continuar colado no ponteiro.
   */
  function onDrag(e) {
    const { li } = drag;
    let dy = e.clientY - drag.startY;
    if (!drag.moved && Math.abs(dy) < 4) return; // menos de 4 px conta como toque, não arraste
    drag.moved = true;
    li.classList.add('dragging');
    const gap = 8; // espaço entre os cartões (deve bater com o gap de .options no CSS)
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

  /** Solta o cartão: lê a nova ordem direto do DOM, salva e redesenha. */
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

  /** Modal "Como jogar" (abre sozinho na primeira visita). */
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

  /** Modal de estatísticas, com uma faixa por tentativa (1ª a 4ª). */
  function showStats() {
    BG.modal('Estatísticas', BG.statsPanel(BG.getStats(GAME, MAX_TRIES), ['1ª', '2ª', '3ª', '4ª']));
  }

  $('btn-submit').addEventListener('click', submit);
  $('btn-help').addEventListener('click', showHelp);
  $('btn-stats').addEventListener('click', showStats);
  $('btn-practice').addEventListener('click', () => (practice ? startDaily() : startPractice()));

  startDaily();
  // Na primeira visita, abre o "Como jogar" uma única vez.
  if (!BG.load(`${GAME}:seen-help`, false)) {
    BG.save(`${GAME}:seen-help`, true);
    showHelp();
  }
})();
