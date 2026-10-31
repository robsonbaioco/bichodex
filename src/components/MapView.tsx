import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { fetchCountsForTaxa, fetchRecentSightings, type Place, type Sighting, type Taxon } from '../api'
import { categoryOf, type Category } from '../categories'
import { displayName, formatNumber, frequencyLabel, type Rarity } from '../format'

interface Props {
  place: Place
  radius: number
  /** Os mesmos filtros da aba Explorar. */
  category: Category
  threatened: boolean
  rarity: Rarity | null
  query: string
  /** Controles dos filtros, mostrados acima do mapa. */
  filters: ReactNode
  seen: Set<number>
  onOpen: (id: number) => void
  onToggleSeen: (taxon: Taxon) => void
}

const formatDate = (iso?: string) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR') : '')

/** Cor da categoria; as que seguem o tema (var(--brand)) não valem para o desenho do mapa. */
const markerColor = (color: string) => (color.startsWith('var(') ? '#0f7a4d' : color)

/** Distância em linha reta, em km. */
function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(h))
}

/** A posição de referência tem ~1 km de precisão, então distâncias curtas viram "menos de 1 km". */
const formatKm = (km: number) => (km < 1 ? 'menos de 1 km' : `cerca de ${formatNumber(Math.round(km))} km`)

/** Uma linha da lista abaixo do mapa: a espécie, o registro mais perto e quantos pontos ela tem no mapa. */
interface MapSpecies {
  taxon: Taxon
  records: number
  nearestKm: number
  lastDate?: string
}

type SortBy = 'near' | 'records'

const LIST_PAGE = 30

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/** Mapa da área de busca com os registros mais recentes; tocar em um ponto leva à ficha da espécie. */
export default function MapView({
  place,
  radius,
  category,
  threatened,
  rarity,
  query,
  filters,
  seen,
  onOpen,
  onToggleSeen,
}: Props) {
  const node = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const markers = useRef<L.LayerGroup | null>(null)
  const area = useRef<L.Circle | null>(null)
  /** Se o mapa está aproximado numa espécie da lista. */
  const zoomedIn = useRef(false)
  const openRef = useRef(onOpen)
  openRef.current = onOpen
  // por referência, para marcar uma espécie não redesenhar todos os pontos
  const seenRef = useRef(seen)
  seenRef.current = seen
  const toggleRef = useRef(onToggleSeen)
  toggleRef.current = onToggleSeen
  const [sightings, setSightings] = useState<Sighting[] | null>(null)
  const [failed, setFailed] = useState(false)
  /** Registros de cada espécie na região; só é buscado quando há filtro de raridade. */
  const [counts, setCounts] = useState<Map<number, number> | null>(null)
  /** Espécie escolhida na lista: o mapa passa a mostrar só os pontos dela. */
  const [focusId, setFocusId] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState<SortBy>('near')
  /** Quantas linhas da lista aparecem; o resto fica atrás do botão "Mostrar mais". */
  const [shown, setShown] = useState(LIST_PAGE)

  // O mapa e o círculo da área: refeitos quando o local ou o raio mudam.
  useEffect(() => {
    if (!node.current) return
    const center: L.LatLngTuple = [place.lat, place.lng]
    // o círculo só sabe os próprios limites depois que o mapa tem uma vista definida
    const instance = L.map(node.current, { zoomControl: true }).setView(center, 11)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(instance)
    const circle = L.circle(center, { radius: radius * 1000, color: '#0f7a4d', weight: 2, dashArray: '6 6', fillOpacity: 0.04 })
    circle.addTo(instance)
    instance.fitBounds(circle.getBounds())
    area.current = circle
    zoomedIn.current = false
    L.circleMarker(center, { radius: 5, color: '#fff', weight: 2, fillColor: '#14201b', fillOpacity: 1 })
      .addTo(instance)
      .bindTooltip('Você está aqui')
    map.current = instance
    markers.current = L.layerGroup().addTo(instance)
    return () => {
      instance.remove()
      map.current = null
      markers.current = null
    }
  }, [place, radius])

  // Categoria e risco de extinção são filtrados pelo servidor.
  useEffect(() => {
    const controller = new AbortController()
    setSightings(null)
    setCounts(null)
    setFailed(false)
    setFocusId(null)
    setShown(LIST_PAGE)
    fetchRecentSightings(place, radius, { category, threatened }, controller.signal)
      .then(setSightings)
      .catch((error) => error.name !== 'AbortError' && setFailed(true))
    return () => controller.abort()
  }, [place, radius, category, threatened])

  const needCounts = !!rarity && !!sightings && !counts
  useEffect(() => {
    if (!needCounts || !sightings) return
    const controller = new AbortController()
    fetchCountsForTaxa(place, radius, [...new Set(sightings.map((s) => s.taxon.id))], controller.signal)
      .then(setCounts)
      .catch((error) => error.name !== 'AbortError' && setFailed(true))
    return () => controller.abort()
  }, [needCounts, sightings, place, radius])

  // Nome e raridade são filtrados aqui, sobre os registros já baixados.
  const visible = useMemo(() => {
    if (!sightings || (rarity && !counts)) return null
    const term = normalize(query.trim())
    return sightings.filter((s) => {
      if (term && !normalize(`${s.taxon.preferred_common_name ?? ''} ${s.taxon.name}`).includes(term)) return false
      if (!rarity) return true
      const count = counts!.get(s.taxon.id)
      return count != null && count >= rarity.min && count <= rarity.max
    })
  }, [sightings, counts, rarity, query])

  // Agrupa os pontos por espécie, para a lista abaixo do mapa.
  const species = useMemo(() => {
    const byId = new Map<number, MapSpecies>()
    for (const s of visible ?? []) {
      const km = distanceKm(place, s)
      const item = byId.get(s.taxon.id)
      if (!item) byId.set(s.taxon.id, { taxon: s.taxon, records: 1, nearestKm: km, lastDate: s.observedOn })
      else {
        item.records++
        item.nearestKm = Math.min(item.nearestKm, km)
        if (s.observedOn && (!item.lastDate || s.observedOn > item.lastDate)) item.lastDate = s.observedOn
      }
    }
    return [...byId.values()].sort((a, b) =>
      sortBy === 'near' ? a.nearestKm - b.nearestKm : b.records - a.records || a.nearestKm - b.nearestKm,
    )
  }, [visible, place, sortBy])

  // a espécie escolhida pode ter saído da lista ao mudar os filtros
  const focus = species.find((item) => item.taxon.id === focusId) ?? null
  const onMap = useMemo(
    () => (focus ? (visible ?? []).filter((s) => s.taxon.id === focus.taxon.id) : visible),
    [visible, focus],
  )

  useEffect(() => {
    const layer = markers.current
    if (!layer) return
    layer.clearLayers()
    for (const sighting of onMap ?? []) {
      const taxonCategory = categoryOf(sighting.taxon)
      const count = counts?.get(sighting.taxon.id)
      const popup = document.createElement('div')
      popup.className = 'map-popup'
      const title = document.createElement('b')
      title.textContent = `${taxonCategory.emoji} ${displayName(sighting.taxon)}`
      const detail = document.createElement('span')
      detail.textContent = [formatDate(sighting.observedOn), count != null ? frequencyLabel(count) : '']
        .filter(Boolean)
        .join(' · ')
      const button = document.createElement('button')
      button.className = 'btn'
      button.textContent = '📖 Ver ficha'
      button.onclick = () => openRef.current(sighting.taxon.id)
      const seenButton = document.createElement('button')
      const paintSeen = (isSeen: boolean) => {
        seenButton.className = `btn${isSeen ? ' is-seen' : ''}`
        seenButton.textContent = isSeen ? '✓ Avistado' : '👁️ Marcar como avistado'
        seenButton.setAttribute('aria-pressed', String(isSeen))
      }
      seenButton.onclick = () => {
        paintSeen(!seenRef.current.has(sighting.taxon.id))
        toggleRef.current(sighting.taxon)
      }
      const actions = document.createElement('div')
      actions.className = 'map-popup-actions'
      actions.append(seenButton, button)
      popup.append(title, detail, actions)
      L.circleMarker([sighting.lat, sighting.lng], {
        radius: 7,
        color: '#fff',
        weight: 1.5,
        fillColor: markerColor(taxonCategory.color),
        fillOpacity: 0.9,
      })
        .addTo(layer)
        .bindPopup(popup)
        // a marcação pode ter mudado em outro ponto da mesma espécie ou na ficha
        .on('popupopen', () => paintSeen(seenRef.current.has(sighting.taxon.id)))
    }
    // com uma espécie escolhida, aproxima nos pontos dela (e no ponto de referência)
    if (focus && map.current && onMap?.length) {
      const bounds = L.latLngBounds([[place.lat, place.lng], ...onMap.map((s): L.LatLngTuple => [s.lat, s.lng])])
      map.current.fitBounds(bounds.pad(0.2), { maxZoom: 15 })
      zoomedIn.current = true
    } else if (!focus && zoomedIn.current && map.current && area.current) {
      // voltou para todas: mostra a área inteira de novo
      map.current.fitBounds(area.current.getBounds())
      zoomedIn.current = false
    }
    // place e radius entram porque o mapa (e a camada de pontos) é recriado quando mudam
  }, [onMap, focus, counts, place, radius])

  function pick(id: number) {
    setFocusId((current) => (current === id ? null : id))
    node.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const filtered = !!rarity || query.trim().length > 0
  const notes = [category.id !== 'all' ? category.label : '', rarity?.label ?? '', threatened ? 'em risco de extinção' : '']
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <header className="page-head">
        <h2>Mapa</h2>
        <p aria-live="polite">
          {failed
            ? 'Não foi possível carregar os registros. Verifique sua conexão.'
            : !visible || !sightings
              ? 'Buscando os registros mais recentes…'
              : sightings.length === 0
                ? `Nenhum registro com esses filtros em até ${radius} km de ${place.label}.`
                : `${filtered ? `${formatNumber(visible.length)} de ${formatNumber(sightings.length)}` : formatNumber(sightings.length)} registros mais recentes em até ${radius} km de ${place.label}${notes ? ` · ${notes}` : ''}. Toque em um ponto para ver a espécie.`}
        </p>
      </header>
      {filters}
      {focus && (
        <div className="map-focus" role="status">
          <span>
            Mostrando só <b>{displayName(focus.taxon)}</b>
          </span>
          <button className="btn" onClick={() => setFocusId(null)}>
            ✕ Mostrar todas
          </button>
        </div>
      )}
      <div ref={node} className="map" />
      <p className="fineprint map-note">
        O mapa mostra até 200 registros, os mais recentes. A posição de espécies ameaçadas é embaralhada pelo
        iNaturalist, para protegê-las.
      </p>

      {species.length > 0 && (
        <section className="map-list" aria-label="Espécies no mapa">
          <header className="map-list-head">
            <h3>
              🐾 {formatNumber(species.length)} {species.length === 1 ? 'espécie' : 'espécies'} no mapa
            </h3>
            <div className="segmented" role="group" aria-label="Ordenar a lista">
              <button className={sortBy === 'near' ? 'is-active' : ''} onClick={() => setSortBy('near')}>
                📍 Mais perto
              </button>
              <button className={sortBy === 'records' ? 'is-active' : ''} onClick={() => setSortBy('records')}>
                🔢 Mais registros
              </button>
            </div>
          </header>
          <p className="fineprint">
            Toque numa espécie para ver só ela no mapa. A distância é aproximada: é medida a partir do ponto escolhido
            ({place.label}), que tem precisão de cerca de 1 km, ou é o centro da cidade quando o local foi buscado pelo
            nome.
          </p>
          <ul>
            {species.slice(0, shown).map((item) => {
              const isSeen = seen.has(item.taxon.id)
              const emoji = categoryOf(item.taxon).emoji
              const photo = item.taxon.default_photo?.square_url
              return (
                <li key={item.taxon.id} className={item.taxon.id === focusId ? 'is-active' : ''}>
                  <button
                    className="map-list-main"
                    onClick={() => pick(item.taxon.id)}
                    aria-pressed={item.taxon.id === focusId}
                  >
                    {photo ? <img src={photo} alt="" loading="lazy" width="56" height="56" /> : <span className="map-list-emoji">{emoji}</span>}
                    <span className="map-list-text">
                      <b>
                        {isSeen && <span title="Você já avistou">✓ </span>}
                        {displayName(item.taxon)}
                      </b>
                      <span>
                        📏 {formatKm(item.nearestKm)} de você · {item.records}{' '}
                        {item.records === 1 ? 'registro' : 'registros'}
                        {item.lastDate ? ` · último em ${formatDate(item.lastDate)}` : ''}
                      </span>
                    </span>
                  </button>
                  <button className="btn map-list-open" onClick={() => onOpen(item.taxon.id)}>
                    📖 Ficha
                  </button>
                </li>
              )
            })}
          </ul>
          {species.length > shown && (
            <button className="btn" onClick={() => setShown((n) => n + LIST_PAGE)}>
              ⬇️ Mostrar mais ({formatNumber(species.length - shown)} restantes)
            </button>
          )}
        </section>
      )}
    </>
  )
}
