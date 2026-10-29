(function () {
  'use strict';
  const { el } = BG;
  const GAME = 'onde-vive';
  const MAX_GUESSES = 6;
  const WIN_KM = 250; // acertou se o palpite estiver a até 250 km de um registro
  const SHARE_URL = BG.bichodexUrl('onde-vive'); // link direto para o jogo dentro do Bichodex, no fim do texto compartilhado
  const species = window.ONDE_VIVE_DATA.species;
  const today = BG.todayNumber();

  const CONTINENTS = {
    AFRICA: 'África', ANTARCTICA: 'Antártida', ASIA: 'Ásia', EUROPE: 'Europa',
    NORTH_AMERICA: 'América do Norte', OCEANIA: 'Oceania', SOUTH_AMERICA: 'América do Sul',
  };
  const COLORS = { hit: '#3d8b4f', near: '#d9a520', mid: '#e07b2e', far: '#b8513a' };
  const NEAREST_COLOR = '#1d4ed8';
  const GBIF_API = 'https://api.gbif.org/v1';
  const BASIS_PT = {
    HUMAN_OBSERVATION: 'observação', OBSERVATION: 'observação', MACHINE_OBSERVATION: 'registro automático',
    PRESERVED_SPECIMEN: 'espécime de museu', MATERIAL_SAMPLE: 'amostra', OCCURRENCE: 'registro',
  };
  const ARROWS = ['⬆️', '↗️', '➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️'];
  const INAT_API = 'https://api.inaturalist.org/v1';
  const PHOTO_LICENSES = 'cc0,cc-by,cc-by-sa,cc-by-nc,cc-by-nc-sa,cc-by-nd,cc-by-nc-nd';
  const GALLERY_PAGE = 30; // observações por página da galeria
  const INAT_MAX = 10000; // a API do iNaturalist não pagina além disso

  const $ = (id) => document.getElementById(id);
  let sp, state, practice;
  let map, pending, layer, worldLayer;
  let worldOn = false; // camada com todas as ocorrências do GBIF, depois do fim do jogo

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

  function nearest(lat, lng) {
    let best = null;
    for (const p of sp.points) {
      const d = distanceKm([lat, lng], p);
      if (!best || d < best.dist) best = { dist: d, to: p };
    }
    return best;
  }

  function evaluate(lat, lng) {
    const best = nearest(lat, lng);
    return { lat, lng, dist: best.dist, bearing: bearing([lat, lng], best.to) };
  }

  // Melhor palpite e o registro mais próximo dele (o ponto para onde a seta apontava).
  function closestHit() {
    const g = state.guesses.reduce((a, b) => (b.dist < a.dist ? b : a));
    return { guess: g, ...nearest(g.lat, g.lng) };
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
    worldOn = false;
    sp = species[BG.dailyIndex(today, species.length)];
    state = BG.load(`${GAME}:day:${today}`, null) || { guesses: [], done: false, won: false };
    render(true);
  }

  function startPractice() {
    practice = true;
    worldOn = false;
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
    drawWorld();
    if (state.done && !worldOn) {
      for (const p of sp.points) {
        L.circleMarker(p, { radius: 4, color: '#c2410c', weight: 1, fillColor: '#f97316', fillOpacity: 0.8 }).addTo(layer);
      }
      // Liga o melhor palpite ao registro mais próximo pelo caminho mais curto (mesmo cruzando o antimeridiano).
      const { guess: g, to } = closestHit();
      const lng = to[1] + (Math.abs(to[1] - g.lng) > 180 ? (g.lng > to[1] ? 360 : -360) : 0);
      L.polyline([[g.lat, g.lng], [to[0], lng]], { color: NEAREST_COLOR, weight: 2, dashArray: '6 6', interactive: false }).addTo(layer);
      L.circleMarker([to[0], lng], { radius: 8, color: NEAREST_COLOR, weight: 3, fillColor: '#fff', fillOpacity: 1 })
        .bindTooltip('Registro mais próximo do seu melhor palpite')
        .addTo(layer);
    }
    state.guesses.forEach((g, i) => {
      L.marker([g.lat, g.lng], { icon: pinIcon(i + 1, COLORS[tier(g.dist)]), keyboard: false })
        .bindTooltip(fmtKm(g.dist))
        .addTo(layer);
    });
    if (worldOn) {
      map.setView([15, 0], window.innerWidth < 500 ? 1 : 1.5);
    } else if (state.done) {
      const pts = [...sp.points, ...state.guesses.map((g) => [g.lat, g.lng])];
      map.fitBounds(L.latLngBounds(pts).pad(0.25), { maxZoom: 6 });
    } else if (resetView) {
      map.setView([15, 0], window.innerWidth < 500 ? 1 : 1.5);
    }
  }

  // Mapa de densidade do GBIF com todas as ocorrências da espécie, de qualquer origem.
  function drawWorld() {
    if (worldLayer && (!worldOn || worldLayer.taxonKey !== sp.gbifKey)) {
      worldLayer.remove();
      worldLayer = null;
    }
    if (!worldOn || worldLayer) return;
    const dpr = window.devicePixelRatio > 1 ? 2 : 1;
    worldLayer = L.tileLayer(`https://api.gbif.org/v2/map/occurrence/density/{z}/{x}/{y}@${dpr}x.png?srs=EPSG:3857&taxonKey=${sp.gbifKey}&bin=hex&hexPerTile=50&style=purpleYellow.poly`, {
      tileSize: 512, // os tiles do GBIF têm 512 px
      zoomOffset: -1,
      opacity: 0.85,
      attribution: 'Ocorrências: <a href="https://www.gbif.org" target="_blank">GBIF</a>',
    }).addTo(map);
    worldLayer.taxonKey = sp.gbifKey;
  }

  function toggleWorld() {
    worldOn = !worldOn;
    render(false);
    $('map').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ---------- GBIF ao vivo (só na tela de resultado; sem rede, o texto fica no resumo) ----------

  const apiCache = new Map();
  function gbif(path, params) {
    const url = `${GBIF_API}/${path}?${new URLSearchParams(params)}`;
    if (!apiCache.has(url)) apiCache.set(url, fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null));
    return apiCache.get(url);
  }

  // Troca o conteúdo do elemento quando a resposta chegar, se ele ainda estiver na tela.
  function fillLater(node, promise, format) {
    promise.then((data) => {
      const content = format(data);
      if (content && node.isConnected) node.replaceChildren(content);
    });
    return node;
  }

  function placeOf(r) {
    const parts = [r.municipality, r.stateProvince, r.countryCode && countryName(r.countryCode)].filter(Boolean);
    if (parts.length < 2 && r.locality) parts.unshift(r.locality.length > 60 ? r.locality.slice(0, 57) + '…' : r.locality);
    return [...new Set(parts)].join(', ');
  }

  function nearestRecordLine() {
    const { dist, to } = closestHit();
    const coords = `${to[0].toLocaleString('pt-BR')}, ${to[1].toLocaleString('pt-BR')}`;
    const record = gbif('occurrence/search', { taxonKey: sp.gbifKey, geoDistance: `${to[0]},${to[1]},2km`, limit: 1 })
      .then((d) => d?.results?.[0]);
    return el('p', { class: 'nearest' },
      el('i', { class: 'ring', style: `border-color:${NEAREST_COLOR}` }),
      `Seu melhor palpite ficou a ${fmtKm(dist)} de um registro `,
      fillLater(el('span', { text: `nas coordenadas ${coords}` }), record, (r) => {
        if (!r) return null;
        const about = [BASIS_PT[r.basisOfRecord], r.year && `de ${r.year}`].filter(Boolean).join(' ');
        return el('span', {},
          `em ${placeOf(r) || coords}${about ? ` (${about})` : ''} · `,
          el('a', { href: `https://www.gbif.org/occurrence/${r.key}`, target: '_blank', rel: 'noopener', text: 'ver o registro' }));
      }),
      '.');
  }

  function worldText() {
    const count = gbif('occurrence/search', { taxonKey: sp.gbifKey, limit: 0 });
    return el('div', { class: 'world-box' },
      el('p', {},
        fillLater(el('span', { text: 'Todos os registros' }), count, (d) => {
          if (!d) return null;
          const n = d.count.toLocaleString('pt-BR');
          return d.count < 100 ? `Só ${n} registros no mundo inteiro` : `${n} registros pelo mundo`;
        }),
        ` de ${sp.common} no GBIF. Quanto mais amarelo, mais registros no lugar.`),
      el('p', { class: 'photo-credit' },
        'Aqui entra tudo, não só a natureza: zoológicos, jardins botânicos, populações introduzidas e espécimes de museu. ',
        'Por isso a espécie pode aparecer bem longe de onde vive. ',
        el('a', { href: `https://www.gbif.org/species/${sp.gbifKey}`, target: '_blank', rel: 'noopener', text: 'Explorar no GBIF' })),
    );
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
      el('button', { class: 'species-photo', onclick: showGallery, title: 'Ver mais fotos', 'aria-label': `Ver mais fotos de ${sp.common}` },
        el('img', { src: sp.photo, alt: sp.common, width: 110, height: 110 }),
        el('span', { class: 'more-badge', text: '🖼️ +' }),
      ),
      el('div', {},
        el('div', { class: 'eyebrow', text: 'Onde vive esta espécie?' }),
        el('h2', { text: sp.common }),
        el('div', { class: 'sci', text: sp.sci }),
        el('button', { class: 'link-btn', onclick: showGallery, text: '🖼️ Ver mais fotos' }),
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
      ...(worldOn ? [worldText()] : [
        nearestRecordLine(),
        el('p', {}, `Os pontos laranja são ${sp.points.length} registros na natureza, selecionados entre `,
          el('strong', { text: sp.records.toLocaleString('pt-BR') }), ' registros no GBIF.'),
        el('div', { class: 'legend' },
          el('span', {}, el('i', { style: 'background:#f97316' }), 'registros da espécie'),
          el('span', {}, el('i', { class: 'ring', style: `border-color:${NEAREST_COLOR}` }), 'mais próximo'),
          ...Object.entries({ hit: 'até 250 km', near: '< 1.000 km', mid: '< 3.000 km', far: 'mais longe' })
            .map(([k, v]) => el('span', {}, el('i', { style: `background:${COLORS[k]}` }), v)),
        ),
      ]),
      el('div', { class: 'actions' },
        el('button', { class: 'btn world-btn', onclick: toggleWorld, text: worldOn ? '🎯 Voltar ao resultado' : '🌍 Veja todas as aparições no mundo' }),
      ),
      sp.wiki ? el('div', { class: 'wiki' }, sp.wiki.extract, ' ', el('a', { href: sp.wiki.url, target: '_blank', rel: 'noopener', text: '(Wikipédia)' })) : '',
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

  // ---------- galeria de fotos (iNaturalist ao vivo) ----------

  // Troca o tamanho na URL da foto do iNaturalist (square, small, medium, large, original).
  const photoSize = (url, size) => url.replace(/\/square\./, `/${size}.`);

  // Fotos de observações na natureza (grau de pesquisa, sem cativeiro, licença CC), das mais curtidas
  // para as menos. O lugar de cada foto só aparece com o jogo terminado, para não entregar a resposta.
  function showGallery() {
    const taxonId = sp.inatUrl.match(/taxa\/(\d+)/)?.[1];
    if (!taxonId) return;
    const viewer = el('figure', { class: 'gallery-viewer', hidden: true });
    const grid = el('div', { class: 'gallery-grid' });
    const status = el('p', { class: 'gallery-status', text: 'Carregando fotos…' });
    const more = el('button', { class: 'btn secondary', hidden: true, onclick: loadPage, text: 'Carregar mais fotos' });
    let page = 0;
    let shown = 0;

    BG.modal(`Fotos de ${sp.common}`,
      el('p', { class: 'photo-credit' },
        'Fotos de observações na natureza enviadas ao ',
        el('a', { href: `https://www.inaturalist.org/observations?taxon_id=${taxonId}&captive=false&quality_grade=research`, target: '_blank', rel: 'noopener', text: 'iNaturalist' }),
        '. Repare no ambiente: ele dá pistas de onde a espécie vive.',
        state.done ? '' : ' O lugar de cada foto aparece quando o jogo terminar.'),
      viewer, grid, status, el('div', { class: 'actions' }, more),
    ).classList.add('gallery-modal');
    loadPage();

    async function loadPage() {
      more.disabled = true;
      status.hidden = false;
      status.textContent = 'Carregando fotos…';
      const params = new URLSearchParams({
        taxon_id: taxonId, photos: 'true', quality_grade: 'research', captive: 'false',
        photo_license: PHOTO_LICENSES, order_by: 'votes', per_page: GALLERY_PAGE, page: page + 1, locale: 'pt-BR',
      });
      const data = await fetch(`${INAT_API}/observations?${params}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (!grid.isConnected) return; // modal fechado
      more.disabled = false;
      if (!data) {
        status.textContent = 'Não foi possível carregar as fotos. Verifique sua conexão.';
        more.textContent = 'Tentar de novo';
        more.hidden = false;
        return;
      }
      page++;
      for (const obs of data.results) {
        for (const photo of obs.photos) {
          if (!photo.license_code || !photo.url) continue;
          shown++;
          grid.append(el('button', { class: 'gallery-thumb', onclick: () => openPhoto(photo, obs), 'aria-label': `Ampliar foto ${shown}` },
            el('img', { src: photoSize(photo.url, 'small'), alt: '', loading: 'lazy' })));
        }
      }
      const total = Math.min(data.total_results, INAT_MAX);
      const n = data.total_results.toLocaleString('pt-BR');
      status.textContent = shown
        ? `${shown.toLocaleString('pt-BR')} fotos de ${n} observações${page * GALLERY_PAGE < total ? '' : ' (todas)'}`
        : 'Nenhuma foto com licença livre no iNaturalist.';
      more.textContent = 'Carregar mais fotos';
      more.hidden = page * GALLERY_PAGE >= total;
    }

    function openPhoto(photo, obs) {
      viewer.replaceChildren(
        el('img', { src: photoSize(photo.url, 'large'), alt: `Foto de ${sp.common}` }),
        el('figcaption', { class: 'photo-credit' },
          photo.attribution,
          ...(state.done ? [
            obs.place_guess ? ` · ${obs.place_guess}` : '',
            ' · ', el('a', { href: `https://www.inaturalist.org/observations/${obs.id}`, target: '_blank', rel: 'noopener', text: 'ver a observação' }),
          ] : [])),
      );
      viewer.hidden = false;
      viewer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
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
        el('li', { text: 'Toque na foto (ou em "Ver mais fotos") para ver as fotos da espécie no iNaturalist. O ambiente em volta pode ajudar.' }),
        el('li', { text: 'No fim, o mapa mostra o registro mais próximo do seu melhor palpite, e dá para ver todas as aparições da espécie no mundo.' }),
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
