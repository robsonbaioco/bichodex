(function () {
  'use strict';
  const { el } = BG;
  const GAME = 'onde-vive';
  const MAX_GUESSES = 6;
  const WIN_KM = 250; // acertou se o palpite estiver a até 250 km de um registro
  const SHARE_URL = ''; // preencha com o link do jogo no itch.io para aparecer no texto compartilhado
  const species = window.ONDE_VIVE_DATA.species;
  const today = BG.todayNumber();

  const CONTINENTS = {
    AFRICA: 'África', ANTARCTICA: 'Antártida', ASIA: 'Ásia', EUROPE: 'Europa',
    NORTH_AMERICA: 'América do Norte', OCEANIA: 'Oceania', SOUTH_AMERICA: 'América do Sul',
  };
  const COLORS = { hit: '#3d8b4f', near: '#d9a520', mid: '#e07b2e', far: '#b8513a' };
  const ARROWS = ['⬆️', '↗️', '➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️'];

  const $ = (id) => document.getElementById(id);
  let sp, state, practice;
  let map, pending, layer;

  // ---------- geometria ----------

  const toRad = (d) => (d * Math.PI) / 180;
  const wrapLng = (lng) => ((((lng + 180) % 360) + 360) % 360) - 180;

  function distanceKm(a, b) {
    const dLat = toRad(b[0] - a[0]);
    const dLon = toRad(b[1] - a[1]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function bearing(a, b) {
    const y = Math.sin(toRad(b[1] - a[1])) * Math.cos(toRad(b[0]));
    const x = Math.cos(toRad(a[0])) * Math.sin(toRad(b[0])) - Math.sin(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.cos(toRad(b[1] - a[1]));
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  }

  function evaluate(lat, lng) {
    let best = null;
    for (const p of sp.points) {
      const d = distanceKm([lat, lng], p);
      if (!best || d < best.dist) best = { dist: d, to: p };
    }
    return { lat, lng, dist: best.dist, bearing: bearing([lat, lng], best.to) };
  }

  function tier(d) {
    if (d <= WIN_KM) return 'hit';
    if (d < 1000) return 'near';
    if (d < 3000) return 'mid';
    return 'far';
  }
  const TIER_EMOJI = { hit: '🟩', near: '🟨', mid: '🟧', far: '🟥' };
  const arrowFor = (deg) => ARROWS[Math.round(deg / 45) % 8];
  const fmtKm = (d) => (d < 10 ? '< 10 km' : `${Math.round(d).toLocaleString('pt-BR')} km`);

  // ---------- início ----------

  function startDaily() {
    practice = false;
    sp = species[BG.dailyIndex(today, species.length)];
    state = BG.load(`${GAME}:day:${today}`, null) || { guesses: [], done: false, won: false };
    render(true);
  }

  function startPractice() {
    practice = true;
    const daily = BG.dailyIndex(today, species.length);
    let idx;
    do idx = Math.floor(Math.random() * species.length);
    while (idx === daily && species.length > 1);
    sp = species[idx];
    state = { guesses: [], done: false, won: false };
    render(true);
  }

  function persist() {
    if (!practice) BG.save(`${GAME}:day:${today}`, state);
  }

  // ---------- mapa ----------

  function initMap() {
    if (typeof L === 'undefined') {
      $('map').replaceChildren(el('p', { style: 'padding:16px', text: 'Não foi possível carregar o mapa. Verifique sua conexão e recarregue a página.' }));
      return;
    }
    map = L.map('map', { worldCopyJump: true, minZoom: 1, maxZoom: 12, zoomSnap: 0.5 });
    const dpr = window.devicePixelRatio > 1 ? 2 : 1;
    L.tileLayer(`https://tile.gbif.org/3857/omt/{z}/{x}/{y}@${dpr}x.png?style=gbif-natural`, {
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>, © OpenMapTiles, <a href="https://www.gbif.org" target="_blank">GBIF</a>',
      maxZoom: 14,
    }).addTo(map);
    layer = L.layerGroup().addTo(map);
    map.on('click', (e) => {
      if (state.done) return;
      const ll = e.latlng.wrap();
      if (pending) pending.setLatLng(e.latlng);
      else pending = L.marker(e.latlng, { icon: pinIcon('?', '#4a5844') }).addTo(map);
      pending.wrapped = [ll.lat, ll.lng];
      $('btn-guess').disabled = false;
      $('map-tip').hidden = true;
    });
  }

  function pinIcon(label, color) {
    return L.divIcon({ className: '', html: `<div class="guess-pin" style="background:${color}">${label}</div>`, iconSize: [26, 26], iconAnchor: [13, 13] });
  }

  function drawMap(resetView) {
    if (!map) return;
    layer.clearLayers();
    if (pending) {
      pending.remove();
      pending = null;
    }
    if (state.done) {
      for (const p of sp.points) {
        L.circleMarker(p, { radius: 4, color: '#c2410c', weight: 1, fillColor: '#f97316', fillOpacity: 0.8 }).addTo(layer);
      }
    }
    state.guesses.forEach((g, i) => {
      L.marker([g.lat, g.lng], { icon: pinIcon(i + 1, COLORS[tier(g.dist)]), keyboard: false })
        .bindTooltip(fmtKm(g.dist))
        .addTo(layer);
    });
    if (state.done) {
      const pts = [...sp.points, ...state.guesses.map((g) => [g.lat, g.lng])];
      map.fitBounds(L.latLngBounds(pts).pad(0.25), { maxZoom: 6 });
    } else if (resetView) {
      map.setView([15, 0], window.innerWidth < 500 ? 1 : 1.5);
    }
  }

  // ---------- renderização ----------

  function render(resetView) {
    $('day-label').textContent = practice ? 'treino' : `#${today}`;
    $('btn-practice').setAttribute('aria-pressed', String(practice));
    $('mode-banner').hidden = !practice;
    $('map-tip').hidden = state.done || state.guesses.length > 0;
    $('controls').hidden = state.done;
    $('btn-guess').disabled = true;

    $('species').replaceChildren(
      el('img', { src: sp.photo, alt: sp.common, width: 110, height: 110 }),
      el('div', {},
        el('div', { class: 'eyebrow', text: 'Onde vive esta espécie?' }),
        el('h2', { text: sp.common }),
        el('div', { class: 'sci', text: sp.sci }),
        el('div', { class: 'photo-credit' }, '📷 ', el('a', { href: sp.inatUrl, target: '_blank', rel: 'noopener', text: sp.credit })),
      ),
    );

    $('guesses').replaceChildren(...state.guesses.map((g, i) => {
      const t = tier(g.dist);
      const pct = Math.max(4, Math.round((1 - g.dist / 20000) * 100));
      return el('li', {},
        el('span', { class: 'n', text: i + 1 }),
        el('span', { class: 'bar', title: `${pct}% de proximidade` }, el('span', { style: `width:${pct}%;background:${COLORS[t]}` })),
        el('span', { class: 'dist', text: fmtKm(g.dist) }),
        el('span', { class: 'arrow', text: t === 'hit' ? '🎯' : arrowFor(g.bearing), title: 'Direção do registro mais próximo' }),
      );
    }));

    renderHints();
    drawMap(resetView);
    $('result').hidden = !state.done;
    if (state.done) renderResult();
  }

  function countryName(code) {
    try {
      return new Intl.DisplayNames(['pt-BR'], { type: 'region' }).of(code);
    } catch {
      return code;
    }
  }

  function renderHints() {
    const n = state.guesses.length;
    const hints = [];
    if (!state.done && n === 0) hints.push(`Você tem ${MAX_GUESSES} palpites. Acerta quem marcar a até ${WIN_KM} km de um registro da espécie.`);
    if (n >= 2 && sp.continent) hints.push(`💡 Dica 1: a maioria dos registros é da ${CONTINENTS[sp.continent] || sp.continent}.`);
    if (n >= 4 && sp.country) hints.push(`💡 Dica 2: o país com mais registros é ${countryName(sp.country)}.`);
    $('hints').replaceChildren(...hints.map((h) => el('div', { class: 'hint', text: h })));
  }

  function renderResult() {
    const n = state.guesses.length;
    $('result').replaceChildren(
      el('h2', { text: state.won ? (n === 1 ? '🌟 De primeira!' : `🎉 Achou em ${n} palpites!`) : '🍂 Não foi dessa vez' }),
      el('p', {}, `Os pontos laranja são ${sp.points.length} registros de ocorrência selecionados entre `,
        el('strong', { text: sp.records.toLocaleString('pt-BR') }), ' registros no GBIF. ',
        el('a', { href: `https://www.gbif.org/species/${sp.gbifKey}`, target: '_blank', rel: 'noopener', text: 'Ver mapa completo no GBIF' })),
      sp.wiki ? el('div', { class: 'wiki' }, sp.wiki.extract, ' ', el('a', { href: sp.wiki.url, target: '_blank', rel: 'noopener', text: '(Wikipédia)' })) : '',
      el('div', { class: 'legend' },
        el('span', {}, el('i', { style: 'background:#f97316' }), 'registros da espécie'),
        ...Object.entries({ hit: 'até 250 km', near: '< 1.000 km', mid: '< 3.000 km', far: 'mais longe' })
          .map(([k, v]) => el('span', {}, el('i', { style: `background:${COLORS[k]}` }), v)),
      ),
      el('div', { class: 'actions' },
        practice ? '' : el('button', { class: 'btn', onclick: shareResult, text: 'Compartilhar' }),
        el('button', { class: 'btn secondary', onclick: startPractice, text: '🎲 Jogar um treino' }),
        practice ? el('button', { class: 'btn secondary', onclick: startDaily, text: 'Voltar ao desafio de hoje' }) : '',
      ),
    );
  }

  // ---------- jogadas ----------

  function guess() {
    if (!pending || state.done) return;
    const [lat, lng] = pending.wrapped;
    const g = evaluate(lat, wrapLng(lng));
    state.guesses.push(g);
    const won = g.dist <= WIN_KM;
    if (won || state.guesses.length >= MAX_GUESSES) {
      state.done = true;
      state.won = won;
      if (!practice) {
        BG.recordResult(GAME, today, won, won ? state.guesses.length - 1 : null, MAX_GUESSES);
        setTimeout(showStats, 2200);
      }
    } else {
      BG.toast(`${fmtKm(g.dist)} ${arrowFor(g.bearing)}`);
    }
    persist();
    render(false);
    if (state.done) $('result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function shareResult() {
    const n = state.won ? `${state.guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
    const line = state.guesses.map((g) => TIER_EMOJI[tier(g.dist)]).join('');
    const arrows = state.guesses.map((g) => (tier(g.dist) === 'hit' ? '🎯' : arrowFor(g.bearing))).join('');
    BG.share(`🗺️ Onde Vive? #${today} ${n}\n${sp.common}\n${line}\n${arrows}${SHARE_URL ? '\n' + SHARE_URL : ''}`);
  }

  // ---------- modais ----------

  function showHelp() {
    BG.modal('Como jogar',
      el('p', {}, 'Todo dia aparece uma espécie. Marque no mapa ', el('strong', { text: 'onde ela vive na natureza' }), '.'),
      el('ul', {},
        el('li', { text: `Toque no mapa e depois em "Chutar aqui". São ${MAX_GUESSES} palpites.` }),
        el('li', { text: `Cada palpite mostra a distância até o registro mais próximo da espécie e a direção (⬆️↗️➡️…).` }),
        el('li', { text: `Ganha quem marcar a até ${WIN_KM} km de um registro.` }),
        el('li', { text: 'Depois do 2º e do 4º palpite aparecem dicas: continente e país.' }),
      ),
      el('p', { class: 'photo-credit', text: 'Os registros de ocorrência vêm do GBIF (Global Biodiversity Information Facility), sem registros de zoológicos, jardins botânicos e populações introduzidas.' }),
      el('p', { class: 'photo-credit', text: 'Um novo desafio a cada dia, à meia-noite. O 🎲 abre espécies de treino.' }),
    );
  }

  function showStats() {
    BG.modal('Estatísticas', BG.statsPanel(BG.getStats(GAME, MAX_GUESSES), ['1', '2', '3', '4', '5', '6'].map((s) => s + 'º palpite')));
  }

  $('btn-guess').addEventListener('click', guess);
  $('btn-help').addEventListener('click', showHelp);
  $('btn-stats').addEventListener('click', showStats);
  $('btn-practice').addEventListener('click', () => (practice ? startDaily() : startPractice()));

  initMap();
  startDaily();
  if (!BG.load(`${GAME}:seen-help`, false)) {
    BG.save(`${GAME}:seen-help`, true);
    showHelp();
  }
})();
