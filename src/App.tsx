import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  PER_PAGE,
  fetchCategoryCounts,
  fetchSpecies,
  searchWorldSpecies,
  type Place,
  type SpeciesCount,
  type Taxon,
} from './api'
import { CATEGORIES, type Category } from './categories'
import { Highlights } from './components/Highlights'
import { LocationPicker } from './components/LocationPicker'
import { ShareAchievement } from './components/ShareAchievement'
import { SpeciesCard } from './components/SpeciesCard'
import { SpeciesDetail } from './components/SpeciesDetail'
import { ThemePicker } from './components/ThemePicker'
import { RARITIES, formatNumber, type Rarity, type SeenWhere } from './format'
import type { SpecialDay } from './specialDays'
import { load, save } from './storage'
import { applyTheme, loadTheme, type ThemeId } from './themes'

const RADII = [5, 10, 25, 50, 100]

interface ListState {
  items: SpeciesCount[]
  total: number
  page: number
  status: 'loading' | 'done' | 'error' | 'more' | 'moreError'
}

const EMPTY_LIST: ListState = { items: [], total: 0, page: 0, status: 'loading' }

function selectedFromHash(): number | null {
  const match = location.hash.match(/^#\/especie\/(\d+)$/)
  return match ? Number(match[1]) : null
}

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

function rarityRange(rarity: Rarity): string {
  if (rarity.max === Infinity) return `${rarity.min} registros ou mais`
  if (rarity.min <= 1) return `até ${rarity.max} registros`
  return `${rarity.min} a ${rarity.max} registros`
}

function Logo() {
  return <img className="logo" src="./icon.svg" alt="" width="36" height="36" />
}

export default function App() {
  const [place, setPlace] = useState<Place | null>(() => load('place', null))
  const [radius, setRadius] = useState<number>(() => load('radius', 10))
  const [seen, setSeen] = useState<number[]>(() => load('seen', []))
  /** Entre as avistadas, as que foram vistas no zoológico (as demais, na natureza). */
  const [zooIds, setZooIds] = useState<number[]>(() => load('zoo', []))
  /** Grupo de uma data comemorativa usado como filtro, no lugar de uma categoria fixa. */
  const [special, setSpecial] = useState<Category | null>(null)
  const [worldResults, setWorldResults] = useState<Taxon[]>([])
  const [categoryId, setCategoryId] = useState('all')
  const [query, setQuery] = useState('')
  const [changingPlace, setChangingPlace] = useState(false)
  const [list, setList] = useState<ListState>(EMPTY_LIST)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [selectedId, setSelectedId] = useState(selectedFromHash)
  const [reloadKey, setReloadKey] = useState(0)
  const [sharing, setSharing] = useState<Taxon | null>(null)
  const [rarityId, setRarityId] = useState('all')
  const [threatened, setThreatened] = useState(false)
  /** Páginas grandes, ligadas na primeira busca por nome, que percorre o catálogo inteiro da área. */
  const [bulk, setBulk] = useState(false)
  const [topCount, setTopCount] = useState(1)
  const [theme, setTheme] = useState<ThemeId>(loadTheme)
  const [pickingTheme, setPickingTheme] = useState(false)

  const request = useRef(0)
  const openedHere = useRef(false)
  const sentinel = useRef<HTMLDivElement>(null)

  const category: Category = special ?? CATEGORIES.find((c) => c.id === categoryId) ?? CATEGORIES[0]
  const seenSet = useMemo(() => new Set(seen), [seen])

  // Com filtro de raridade as páginas são maiores, para atravessar rápido as espécies fora da faixa;
  // as raras ficam no fim da lista, então são pedidas em ordem crescente.
  const rarity = RARITIES.find((r) => r.id === rarityId) ?? null
  const order = rarity?.id === 'rare' ? 'asc' : 'desc'
  const perPage = bulk ? 500 : rarity ? 200 : PER_PAGE

  /** Posição da espécie no ranking regional (1 = mais registrada), qualquer que seja a ordem carregada. */
  const numberAt = useCallback(
    (index: number) => (order === 'asc' ? list.total - index : index + 1),
    [order, list.total],
  )

  useEffect(() => save('place', place), [place])
  useEffect(() => save('radius', radius), [radius])
  useEffect(() => save('seen', seen), [seen])
  useEffect(() => save('zoo', zooIds), [zooIds])
  useEffect(() => applyTheme(theme), [theme])

  useEffect(() => {
    const onHashChange = () => setSelectedId(selectedFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (!place) return
    const controller = new AbortController()
    setCounts({})
    fetchCategoryCounts(place, radius, threatened, controller.signal)
      .then(setCounts)
      .catch(() => {}) // contagens são um complemento; a lista funciona sem elas
    return () => controller.abort()
  }, [place, radius, threatened])

  useEffect(() => {
    if (!place) return
    const controller = new AbortController()
    const id = ++request.current
    setList(EMPTY_LIST)
    fetchSpecies({ place, radiusKm: radius, category, threatened, page: 1, perPage, order }, controller.signal)
      .then((data) => {
        if (id !== request.current) return
        setList({ items: data.results, total: data.total, page: 1, status: 'done' })
        if (order === 'desc') setTopCount(data.results[0]?.count ?? 1)
      })
      .catch((error) => {
        if (error.name !== 'AbortError' && id === request.current) setList({ ...EMPTY_LIST, status: 'error' })
      })
    // na ordem crescente a lista não traz a espécie mais registrada, usada como escala do medidor da ficha
    if (order === 'asc') {
      fetchSpecies({ place, radiusKm: radius, category, threatened, page: 1, perPage: 1 }, controller.signal)
        .then((data) => id === request.current && setTopCount(data.results[0]?.count ?? 1))
        .catch(() => {})
    }
    return () => controller.abort()
  }, [place, radius, category, threatened, perPage, order, reloadKey])

  // A lista vem ordenada por registros: passada a faixa da raridade escolhida, não há mais o que buscar.
  const lastCount = list.items[list.items.length - 1]?.count
  const pastRarity =
    !!rarity && lastCount != null && (order === 'asc' ? lastCount > rarity.max : lastCount < rarity.min)
  const hasMore = list.items.length < list.total && !pastRarity

  const loadMore = useCallback(() => {
    if (!place || !hasMore || (list.status !== 'done' && list.status !== 'moreError')) return
    const id = request.current
    const page = list.page + 1
    setList((current) => ({ ...current, status: 'more' }))
    fetchSpecies({ place, radiusKm: radius, category, threatened, page, perPage, order })
      .then((data) => {
        if (id !== request.current) return
        setList((current) => {
          const known = new Set(current.items.map((item) => item.taxon.id))
          const fresh = data.results.filter((item) => !known.has(item.taxon.id))
          const items = [...current.items, ...fresh]
          // página vazia: o servidor não tem mais nada, mesmo que o total diga o contrário
          return { items, total: data.results.length ? data.total : items.length, page, status: 'done' }
        })
      })
      .catch(() => {
        if (id === request.current) setList((current) => ({ ...current, status: 'moreError' }))
      })
  }, [place, radius, category, threatened, perPage, order, hasMore, list.status, list.page])

  const filtering = query.trim().length > 0
  const riskNote = threatened ? ' · em risco de extinção' : ''

  // A busca por nome vale para todas as espécies da área, não só as já carregadas: com um termo digitado
  // (e uma pausa na digitação), as páginas restantes são baixadas em sequência, sem depender da rolagem.
  const [searchAll, setSearchAll] = useState(false)
  useEffect(() => {
    if (!query.trim()) return setSearchAll(false)
    const timer = setTimeout(() => {
      setSearchAll(true)
      setBulk(true)
    }, 350)
    return () => clearTimeout(timer)
  }, [query])

  // A mesma busca também consulta o catálogo mundial, para achar espécies sem registro na área
  // (vistas no zoológico ou em viagem, por exemplo).
  useEffect(() => {
    const term = query.trim()
    setWorldResults([])
    if (term.length < 3) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      searchWorldSpecies(term, controller.signal)
        .then(setWorldResults)
        .catch(() => {})
    }, 500)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  useEffect(() => {
    if (searchAll && hasMore && list.status === 'done') loadMore()
  }, [searchAll, hasMore, list.status, loadMore])

  // Rolagem infinita; durante a busca por nome quem carrega é o efeito acima.
  useEffect(() => {
    const node = sentinel.current
    if (!node || filtering || list.status !== 'done' || !hasMore) return
    const observer = new IntersectionObserver((entries) => entries[0].isIntersecting && loadMore(), {
      rootMargin: '600px',
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [filtering, list.status, hasMore, loadMore])

  const visible = useMemo(() => {
    const term = normalize(query.trim())
    return list.items
      .map((entry, index) => ({ entry, number: numberAt(index) }))
      .filter(
        ({ entry }) =>
          (!rarity || (entry.count >= rarity.min && entry.count <= rarity.max)) &&
          (!term || normalize(`${entry.taxon.preferred_common_name ?? ''} ${entry.taxon.name}`).includes(term)),
      )
  }, [list.items, query, rarity, numberAt])

  function setWhere(id: number, where: SeenWhere) {
    setZooIds((current) => {
      const others = current.filter((x) => x !== id)
      return where === 'zoo' ? [...others, id] : others
    })
  }

  // Marcar abre o cartão de conquista; desmarcar apenas remove.
  function toggleSeen(taxon: Taxon, where: SeenWhere = 'wild') {
    if (seenSet.has(taxon.id)) {
      setSeen((current) => current.filter((id) => id !== taxon.id))
      setWhere(taxon.id, 'wild')
    } else {
      setSeen((current) => [...current, taxon.id])
      setWhere(taxon.id, where)
      if (place) setSharing(taxon)
    }
  }

  function openSpecies(id: number) {
    openedHere.current = true
    location.hash = `#/especie/${id}`
  }

  function exploreGroup(day: SpecialDay) {
    setSpecial({ id: 'special', label: day.group, emoji: day.emoji, color: 'var(--brand)', taxonId: day.taxonId })
    setQuery('')
  }

  const closeSharing = useCallback(() => setSharing(null), [])

  const closeDetail = useCallback(() => {
    if (openedHere.current) {
      openedHere.current = false
      history.back()
    } else {
      history.replaceState(null, '', location.pathname + location.search)
      setSelectedId(null)
    }
  }, [])

  function pickPlace(next: Place) {
    setPlace(next)
    setChangingPlace(false)
    setQuery('')
  }

  // só depois de a busca regional terminar, para uma espécie não aparecer aqui e depois "mudar" para a lista
  const worldOnly = useMemo(() => {
    if (hasMore || list.status !== 'done') return []
    const regional = new Set(list.items.map((item) => item.taxon.id))
    return worldResults.filter((taxon) => !regional.has(taxon.id))
  }, [worldResults, list.items, list.status, hasMore])

  const selectedIndex = selectedId == null ? -1 : list.items.findIndex((item) => item.taxon.id === selectedId)

  // Fora do retorno principal porque um link de espécie compartilhado abre a ficha mesmo antes de haver local.
  const detail = selectedId != null && (
    <SpeciesDetail
      id={selectedId}
      entry={list.items[selectedIndex]}
      number={selectedIndex >= 0 ? numberAt(selectedIndex) : undefined}
      maxCount={topCount}
      seen={seenSet.has(selectedId)}
      where={zooIds.includes(selectedId) ? 'zoo' : 'wild'}
      onToggleSeen={toggleSeen}
      onShare={place ? setSharing : undefined}
      onClose={closeDetail}
    />
  )

  const themePicker = pickingTheme && (
    <ThemePicker current={theme} onPick={setTheme} onClose={() => setPickingTheme(false)} />
  )

  if (!place) {
    return (
      <>
        <main className="welcome">
          <div className="welcome-card">
            <div className="radar" aria-hidden="true">
              <Logo />
            </div>
            <h1>Bichodex</h1>
            <p>
              O catálogo dos seres vivos ao seu redor. Informe onde você está para ver os animais, plantas, fungos e
              outros organismos já registrados na região.
            </p>
            <LocationPicker onPick={pickPlace} />
            <p className="fineprint">
              Sua localização é arredondada (~1 km) e usada apenas para consultar as espécies da área.
            </p>
            <button className="link-btn theme-link" onClick={() => setPickingTheme(true)}>
              🎨 Mudar o tema
            </button>
          </div>
        </main>
        {detail}
        {themePicker}
      </>
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="./">
            <Logo />
            <span>Bichodex</span>
          </a>
          <button className="place-pill" onClick={() => setChangingPlace(true)} title="Trocar local">
            <span aria-hidden="true">📍</span>
            <span className="place-name">{place.label}</span>
          </button>
          <span className="seen-counter" title="Espécies que você marcou como avistadas">
            ✓ {formatNumber(seen.length)}
          </span>
          <button className="theme-btn" onClick={() => setPickingTheme(true)} aria-label="Escolher tema" title="Tema">
            <span aria-hidden="true">🎨</span>
          </button>
        </div>
      </header>

      <div className="layout">
        <nav className="categories" aria-label="Categorias">
          {special && (
            <button
              className="chip is-active"
              style={{ '--c': special.color } as CSSProperties}
              onClick={() => setSpecial(null)}
              title="Remover este filtro"
            >
              <span aria-hidden="true">{special.emoji}</span>
              <span className="chip-label">{special.label}</span>
              <span className="chip-count">✕</span>
            </button>
          )}
          {CATEGORIES.map((c) => {
            const count = c.id === category.id && list.page > 0 ? list.total : c.iconic ? counts[c.iconic] : undefined
            return (
              <button
                key={c.id}
                className={`chip${c.id === category.id ? ' is-active' : ''}`}
                style={{ '--c': c.color } as CSSProperties}
                onClick={() => {
                  setCategoryId(c.id)
                  setSpecial(null)
                  setQuery('')
                  window.scrollTo({ top: 0 })
                }}
                aria-pressed={c.id === category.id}
              >
                <span aria-hidden="true">{c.emoji}</span>
                <span className="chip-label">{c.label}</span>
                {count != null && <span className="chip-count">{formatNumber(count)}</span>}
              </button>
            )
          })}
        </nav>

        <main className="content">
          {!filtering && !special && (
            <Highlights
              place={place}
              radius={radius}
              seen={seenSet}
              onOpen={openSpecies}
              onMarkSeen={toggleSeen}
              onShare={setSharing}
              onExploreGroup={exploreGroup}
            />
          )}

          <div className="toolbar">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrar por nome…"
              aria-label="Filtrar por nome"
            />
            <label className="radius">
              <span>Raio</span>
              <select value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
                {RADII.map((km) => (
                  <option key={km} value={km}>
                    {km} km
                  </option>
                ))}
              </select>
            </label>
            <label className="radius">
              <span>Raridade</span>
              <select value={rarityId} onChange={(e) => setRarityId(e.target.value)}>
                <option value="all">Todas</option>
                {RARITIES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="toggle" title="Espécies classificadas de quase ameaçadas a criticamente em perigo">
              <input type="checkbox" checked={threatened} onChange={(e) => setThreatened(e.target.checked)} />
              <span>⚠ Em risco de extinção</span>
            </label>
          </div>

          <p className="summary-line" aria-live="polite">
            {list.status === 'loading'
              ? 'Consultando espécies da região…'
              : list.status === 'error'
                ? ''
                : filtering
                  ? hasMore && list.status !== 'moreError'
                    ? `${formatNumber(visible.length)} encontradas · buscando em todas as espécies da área… (${formatNumber(list.items.length)} de ${formatNumber(list.total)})`
                    : `${formatNumber(visible.length)} encontradas · ${category.label}${rarity ? ` · ${rarity.label}` : ''}${riskNote}`
                  : rarity
                    ? `${formatNumber(visible.length)}${hasMore ? '+' : ''} espécies · ${category.label} · ${rarity.label} (${rarityRange(rarity)} na região)${riskNote}`
                    : `${formatNumber(list.total)} espécies · ${category.label}${riskNote} · mais registradas primeiro`}
          </p>

          {list.status === 'error' && (
            <div className="notice notice-error" role="alert">
              Não foi possível consultar as espécies. Verifique sua conexão.{' '}
              <button className="btn" onClick={() => setReloadKey((k) => k + 1)}>
                Tentar de novo
              </button>
            </div>
          )}

          {list.status === 'done' && visible.length === 0 && !hasMore && (
            <p className="notice">
              {filtering && list.items.length > 0
                ? `Nenhuma espécie com "${query.trim()}" no nome nesta categoria dentro de ${radius} km.`
                : rarity && list.items.length > 0
                ? `Nenhuma espécie na faixa "${rarity.label}" nesta categoria dentro de ${radius} km.`
                : threatened
                  ? `Nenhuma espécie em risco de extinção registrada nesta categoria dentro de ${radius} km. Experimente aumentar o raio.`
                  : `Nenhuma espécie registrada nesta categoria dentro de ${radius} km. Experimente aumentar o raio.`}
            </p>
          )}

          <div className="grid">
            {visible.map(({ entry, number }) => (
              <SpeciesCard
                key={entry.taxon.id}
                entry={entry}
                number={number}
                seen={seenSet.has(entry.taxon.id)}
                onOpen={() => (openedHere.current = true)}
                onToggleSeen={() => toggleSeen(entry.taxon)}
              />
            ))}
            {(list.status === 'loading' || (list.status === 'more' && !filtering)) &&
              Array.from({ length: 8 }, (_, i) => <div key={i} className="card skeleton" aria-hidden="true" />)}
          </div>

          <div ref={sentinel} className="more">
            {hasMore && (list.status === 'moreError' || (list.status === 'done' && !filtering)) && (
              <button className="btn" onClick={loadMore}>
                {list.status === 'moreError' ? 'Falhou. Tentar de novo' : 'Carregar mais espécies'}
              </button>
            )}
          </div>

          {filtering && worldOnly.length > 0 && (
            <section className="world">
              <h2>Fora da sua região</h2>
              <p>Espécies sem registro na área. Viu uma no zoológico ou em uma viagem? Marque como avistada.</p>
              <div className="grid">
                {worldOnly.map((taxon) => (
                  <SpeciesCard
                    key={taxon.id}
                    entry={{ taxon }}
                    seen={seenSet.has(taxon.id)}
                    onOpen={() => (openedHere.current = true)}
                    onToggleSeen={() => toggleSeen(taxon, 'zoo')}
                  />
                ))}
              </div>
            </section>
          )}

          <footer className="footer">
            Dados e fotos:{' '}
            <a href="https://www.inaturalist.org" target="_blank" rel="noreferrer">
              iNaturalist
            </a>{' '}
            (registros de ciência cidadã). A lista mostra o que já foi observado na área, não tudo o que existe nela.
          </footer>
        </main>
      </div>

      {detail}

      {sharing && (
        <ShareAchievement
          taxon={sharing}
          place={place.label}
          ordinal={seen.indexOf(sharing.id) + 1 || seen.length}
          where={zooIds.includes(sharing.id) ? 'zoo' : 'wild'}
          onWhereChange={(where) => setWhere(sharing.id, where)}
          onClose={closeSharing}
        />
      )}

      {themePicker}

      {changingPlace && (
        <div className="overlay" onClick={() => setChangingPlace(false)}>
          <section className="sheet sheet-small" role="dialog" aria-modal="true" aria-label="Trocar local" onClick={(e) => e.stopPropagation()}>
            <header className="detail-bar">
              <span className="detail-number">Trocar local</span>
              <button className="icon-btn" onClick={() => setChangingPlace(false)} aria-label="Fechar">
                ✕
              </button>
            </header>
            <div className="sheet-pad">
              <LocationPicker onPick={pickPlace} />
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
