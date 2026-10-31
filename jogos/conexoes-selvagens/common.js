// Código compartilhado pelos jogos (desafio do dia, estatísticas, compartilhar, modais).
// Este arquivo é copiado para dentro de cada jogo por tools/sync-shared.mjs — edite só em shared/.
(function () {
  'use strict';

  // Dia 1 de todos os jogos.
  const EPOCH = new Date(2026, 9, 1); // 1º de outubro de 2026 (mês começa em 0)
  const DAY_MS = 86400000;

  function localMidnight(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /** Número do desafio de hoje (1, 2, 3, ...) no fuso do jogador. */
  function todayNumber(now = new Date()) {
    return Math.round((localMidnight(now) - EPOCH) / DAY_MS) + 1;
  }

  /** Puzzle do dia: percorre a lista em ordem embaralhada (fixa) e recomeça ao fim. */
  function dailyIndex(n, count) {
    const order = shuffle([...Array(count).keys()], 'ordem-' + count);
    return order[(((n - 1) % count) + count) % count];
  }

  // ---------- aleatoriedade com semente ----------

  function hashString(s) {
    let h = 1779033703 ^ s.length;
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
  }

  function rng(seed) {
    let a = typeof seed === 'number' ? seed : hashString(String(seed));
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Embaralha uma cópia do array; com a mesma semente o resultado é sempre igual. */
  function shuffle(arr, seed) {
    const r = seed === undefined ? Math.random : rng(seed);
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---------- armazenamento local (pode falhar em janelas anônimas) ----------

  function load(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }

  // ---------- estatísticas ----------

  function emptyStats(maxScore) {
    return { played: 0, wins: 0, streak: 0, best: 0, last: null, dist: Array(maxScore).fill(0) };
  }

  /**
   * Registra o resultado de um desafio diário.
   * `score` é o índice (0 = melhor) da faixa de distribuição; null quando perdeu.
   */
  function recordResult(game, dayNum, won, score, maxScore) {
    const key = game + ':stats';
    const s = load(key, emptyStats(maxScore));
    if (s.lastRecorded === dayNum) return s;
    s.played++;
    if (won) {
      s.wins++;
      s.streak = s.last === dayNum - 1 ? s.streak + 1 : 1;
      s.best = Math.max(s.best, s.streak);
      s.last = dayNum;
      if (score !== null) s.dist[score] = (s.dist[score] || 0) + 1;
    } else {
      s.streak = 0;
    }
    s.lastRecorded = dayNum;
    save(key, s);
    return s;
  }

  function getStats(game, maxScore) {
    const s = load(game + ':stats', emptyStats(maxScore));
    // A sequência quebra se o jogador pulou um dia.
    if (s.last !== null && s.last < todayNumber() - 1) s.streak = 0;
    return s;
  }

  // ---------- DOM ----------

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) {
      if (c === null || c === undefined || c === false) continue;
      node.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return node;
  }

  let toastTimer;
  function toast(msg, ms = 2200) {
    let t = document.getElementById('toast');
    if (!t) {
      t = el('div', { id: 'toast', role: 'status', 'aria-live': 'polite' });
      document.body.append(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }

  let openModalEl = null;
  function closeModal() {
    if (!openModalEl) return;
    openModalEl.remove();
    openModalEl = null;
  }

  function modal(title, ...content) {
    closeModal();
    const box = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      el('button', { class: 'modal-close icon-btn', 'aria-label': 'Fechar', onclick: closeModal, text: '✕' }),
      el('h2', { text: title }),
      ...content,
    );
    openModalEl = el('div', { class: 'backdrop', onclick: (e) => e.target === openModalEl && closeModal() }, box);
    document.body.append(openModalEl);
    box.querySelector('.modal-close').focus();
    return box;
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  /** Copia texto; usa um textarea como alternativa quando a API de clipboard é bloqueada (iframes). */
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = el('textarea', { readonly: true, style: 'position:fixed;opacity:0' });
      ta.value = text;
      document.body.append(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch {}
      ta.remove();
      return ok;
    }
  }

  async function share(text) {
    if (await copyText(text)) toast('Resultado copiado! Cole onde quiser.');
    else modal('Copie seu resultado', el('pre', { class: 'share-pre', text }));
  }

  function countdown() {
    const span = el('span', { class: 'countdown' });
    let shown = false;
    const tick = () => {
      if (span.isConnected) shown = true;
      else if (shown) return clearInterval(timer); // modal fechado
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const s = Math.max(0, Math.floor((next - now) / 1000));
      const p = (n) => String(n).padStart(2, '0');
      span.textContent = `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
    };
    const timer = setInterval(tick, 1000);
    tick();
    return span;
  }

  /** Painel de estatísticas padrão. `labels` nomeia cada faixa da distribuição. */
  function statsPanel(stats, labels) {
    const pct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
    const max = Math.max(1, ...stats.dist);
    return el('div', { class: 'stats' },
      el('div', { class: 'stat-row' },
        stat(stats.played, 'jogos'), stat(pct + '%', 'vitórias'),
        stat(stats.streak, 'sequência'), stat(stats.best, 'melhor seq.'),
      ),
      el('h3', { text: 'Distribuição' }),
      el('div', { class: 'dist' }, labels.map((label, i) =>
        el('div', { class: 'dist-row' },
          el('span', { class: 'dist-label', text: label }),
          el('span', { class: 'dist-bar', style: `width:${Math.max(8, (stats.dist[i] / max) * 100)}%`, text: stats.dist[i] || 0 }),
        ),
      )),
      el('p', { class: 'next' }, 'Próximo desafio em ', countdown()),
    );
    function stat(v, l) {
      return el('div', { class: 'stat' }, el('strong', { text: v }), el('small', { text: l }));
    }
  }

  /**
   * Tela de derrota: uma folha caindo e o aviso de que as chances acabaram, sem entregar a resposta.
   * A resposta só aparece quando a pessoa toca em "Mostrar resultado" (`onReveal`).
   * `extra` são botões opcionais (ex.: jogar um treino) mostrados ao lado.
   */
  function lossScreen(onReveal, ...extra) {
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const box = el('div', { class: 'loss-screen' + (reduce ? '' : ' animate') },
      el('div', { class: 'loss-art', 'aria-hidden': 'true' },
        el('span', { class: 'loss-leaf l1', text: '🍂' }),
        el('span', { class: 'loss-leaf l2', text: '🍁' }),
        el('span', { class: 'loss-leaf l3', text: '🍂' }),
        el('span', { class: 'loss-face', text: '🙈' }),
      ),
      el('h2', { text: 'Acabaram as chances!' }),
      el('p', { text: 'Quer ver a resposta? Ou feche e tente de novo amanhã.' }),
      el('div', { class: 'actions' },
        el('button', { class: 'btn btn-big', onclick: onReveal, text: '👀 Mostrar resultado' }),
        ...extra,
      ),
    );
    if (navigator.vibrate && !reduce) {
      try { navigator.vibrate([60, 40, 60]); } catch {}
    }
    return box;
  }

  // Aberto a partir do catálogo (index.html na raiz): mostra o botão de voltar.
  if (/[?&]catalogo\b/.test(location.search)) {
    document.addEventListener('DOMContentLoaded', () => {
      const bar = document.querySelector('.topbar');
      if (bar) bar.prepend(el('a', { class: 'icon-btn back-btn', href: '../index.html', title: 'Voltar ao catálogo', text: '← Jogos' }));
    });
  }

  // Link que abre o jogo direto na aba Jogos do Bichodex (#/jogos/<id>, mesmo id de src/components/Games.tsx).
  const bichodexUrl = (id) => `https://robsonbaioco.github.io/bichodex/#/jogos/${id}`;

  window.BG = { bichodexUrl, todayNumber, dailyIndex, shuffle, rng, load, save, recordResult, getStats, el, toast, modal, closeModal, share, statsPanel, countdown, lossScreen };
})();
