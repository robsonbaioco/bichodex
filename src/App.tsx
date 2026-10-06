import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { fetchCategoryCounts, fetchSpecies, type Place, type SpeciesCount, type Taxon } from './api'
import { CATEGORIES } from './categories'
import { LocationPicker } from './components/LocationPicker'
import { ShareAchievement } from './components/ShareAchievement'
import { SpeciesCard } from './components/SpeciesCard'
import { SpeciesDetail } from './components/SpeciesDetail'
import { formatNumber } from './format'
import { load, save } from './storage'

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

function Logo() {
  return <img className="logo" src="./icon.svg" alt="" width="36" height="36" />
}

export default function App() {
  const [place, setPlace] = useState<Place | null>(() => load('place', null))
  const [radius, setRadius] = useState<number>(() => load('radius', 10))
  const [seen, setSeen] = useState<number[]>(() => load('seen', []))
  const [categoryId, setCategoryId] = useState('all')
  const [query, setQuery] = useState('')
  const [changingPlace, setChangingPlace] = useState(false)
  const [list, setList] = useState<ListState>(EMPTY_LIST)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [selectedId, setSelectedId] = useState(selectedFromHash)
  const [reloadKey, setReloadKey] = useState(0)
  const [sharing, setSharing] = useState<Taxon | null>(null)

  const request = useRef(0)
  const openedHere = useRef(false)
  const sentinel = useRef<HTMLDivElement>(null)

  const category = CATEGORIES.find((c) => c.id === categoryId) ?? CATEGORIES[0]
  const seenSet = useMemo(() => new Set(seen), [seen])

  useEffect(() => save('place', place), [place])
  useEffect(() => save('radius', radius), [radius])
  useEffect(() => save('seen', seen), [seen])

  useEffect(() => {
    const onHashChange = () => setSelectedId(selectedFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (!place) return
    const controller = new AbortController()
    setCounts({})
    fetchCategoryCounts(place, radius, controller.signal)
      .then(setCounts)
      .catch(() => {}) // contagens são um complemento; a lista funciona sem elas
    return () => controller.abort()
  }, [place, radius])

  useEffect(() => {
    if (!place) return
    const controller = new AbortController()
    const id = ++request.current
    setList(EMPTY_LIST)
    fetchSpecies({ place, radiusKm: radius, category, page: 1 }, controller.signal)
      .then((data) => {
        if (id !== request.current) return
        setList({ items: data.results, total: data.total, page: 1, status: 'done' })
      })
      .catch((error) => {
        if (error.name !== 'AbortError' && id === request.current) setList({ ...EMPTY_LIST, status: 'error' })
      })
    return () => controller.abort()
  }, [place, radius, category, reloadKey])

  const hasMore = list.items.length < list.total

  const loadMore = useCallback(() => {
    if (!place || !hasMore || (list.status !== 'done' && list.status !== 'moreError')) return
    const id = request.current
    const page = list.page + 1
    setList((current) => ({ ...current, status: 'more' }))
    fetchSpecies({ place, radiusKm: radius, category, page })
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
  }, [place, radius, category, hasMore, list.status, list.page])

  const filtering = query.trim().length > 0

  // Rolagem infinita. Com busca ativa fica manual, para não baixar o catálogo inteiro atrás de poucos resultados.
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
    const numbered = list.items.map((entry, index) => ({ entry, number: index + 1 }))
    const term = normalize(query.trim())
    if (!term) return numbered
    return numbered.filter(({ entry }) =>
      normalize(`${entry.taxon.preferred_common_name ?? ''} ${entry.taxon.name}`).includes(term),
    )
  }, [list.items, query])

  // Marcar abre o cartão de conquista; desmarcar apenas remove.
  function toggleSeen(taxon: Taxon) {
    if (seenSet.has(taxon.id)) {
      setSeen((current) => current.filter((id) => id !== taxon.id))
    } else {
      setSeen((current) => [...current, taxon.id])
      setSharing(taxon)
    }
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

  if (!place) {
    return (
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
        </div>
      </main>
    )
  }

  const selectedIndex = selectedId == null ? -1 : list.items.findIndex((item) => item.taxon.id === selectedId)

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
        </div>
      </header>

      <div className="layout">
        <nav className="categories" aria-label="Categorias">
          {CATEGORIES.map((c) => {
            const count = c.id === categoryId && list.page > 0 ? list.total : c.iconic ? counts[c.iconic] : undefined
            return (
              <button
                key={c.id}
                className={`chip${c.id === categoryId ? ' is-active' : ''}`}
                style={{ '--c': c.color } as CSSProperties}
                onClick={() => {
                  setCategoryId(c.id)
                  setQuery('')
                  window.scrollTo({ top: 0 })
                }}
                aria-pressed={c.id === categoryId}
              >
                <span aria-hidden="true">{c.emoji}</span>
                <span className="chip-label">{c.label}</span>
                {count != null && <span className="chip-count">{formatNumber(count)}</span>}
              </button>
            )
          })}
        </nav>

        <main className="content">
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
          </div>

          <p className="summary-line" aria-live="polite">
            {list.status === 'loading'
              ? 'Consultando espécies da região…'
              : list.status === 'error'
                ? ''
                : filtering
                  ? `${formatNumber(visible.length)} encontradas entre as ${formatNumber(list.items.length)} carregadas (de ${formatNumber(list.total)})`
                  : `${formatNumber(list.total)} espécies · ${category.label} · mais registradas primeiro`}
          </p>

          {list.status === 'error' && (
            <div className="notice notice-error" role="alert">
              Não foi possível consultar as espécies. Verifique sua conexão.{' '}
              <button className="btn" onClick={() => setReloadKey((k) => k + 1)}>
                Tentar de novo
              </button>
            </div>
          )}

          {list.status === 'done' && list.items.length === 0 && (
            <p className="notice">
              Nenhuma espécie registrada nesta categoria dentro de {radius} km. Experimente aumentar o raio.
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
            {(list.status === 'loading' || list.status === 'more') &&
              Array.from({ length: 8 }, (_, i) => <div key={i} className="card skeleton" aria-hidden="true" />)}
          </div>

          <div ref={sentinel} className="more">
            {hasMore && list.status !== 'loading' && list.status !== 'more' && (
              <button className="btn" onClick={loadMore}>
                {list.status === 'moreError' ? 'Falhou. Tentar de novo' : 'Carregar mais espécies'}
              </button>
            )}
          </div>

          <footer className="footer">
            Dados e fotos:{' '}
            <a href="https://www.inaturalist.org" target="_blank" rel="noreferrer">
              iNaturalist
            </a>{' '}
            (registros de ciência cidadã). A lista mostra o que já foi observado na área, não tudo o que existe nela.
          </footer>
        </main>
      </div>

      {selectedId != null && (
        <SpeciesDetail
          id={selectedId}
          entry={list.items[selectedIndex]}
          number={selectedIndex >= 0 ? selectedIndex + 1 : undefined}
          maxCount={list.items[0]?.count ?? 1}
          seen={seenSet.has(selectedId)}
          onToggleSeen={toggleSeen}
          onShare={setSharing}
          onClose={closeDetail}
        />
      )}

      {sharing && (
        <ShareAchievement
          taxon={sharing}
          place={place.label}
          ordinal={seen.indexOf(sharing.id) + 1 || seen.length}
          onClose={closeSharing}
        />
      )}

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
