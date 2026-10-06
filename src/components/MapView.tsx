import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { fetchCountsForTaxa, fetchRecentSightings, type Place, type Sighting } from '../api'
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
  onOpen: (id: number) => void
}

const formatDate = (iso?: string) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR') : '')

/** Cor da categoria; as que seguem o tema (var(--brand)) não valem para o desenho do mapa. */
const markerColor = (color: string) => (color.startsWith('var(') ? '#0f7a4d' : color)

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/** Mapa da área de busca com os registros mais recentes; tocar em um ponto leva à ficha da espécie. */
export default function MapView({ place, radius, category, threatened, rarity, query, filters, onOpen }: Props) {
  const node = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const markers = useRef<L.LayerGroup | null>(null)
  const openRef = useRef(onOpen)
  openRef.current = onOpen
  const [sightings, setSightings] = useState<Sighting[] | null>(null)
  const [failed, setFailed] = useState(false)
  /** Registros de cada espécie na região; só é buscado quando há filtro de raridade. */
  const [counts, setCounts] = useState<Map<number, number> | null>(null)

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
    const area = L.circle(center, { radius: radius * 1000, color: '#0f7a4d', weight: 2, dashArray: '6 6', fillOpacity: 0.04 })
    area.addTo(instance)
    instance.fitBounds(area.getBounds())
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

  useEffect(() => {
    const layer = markers.current
    if (!layer) return
    layer.clearLayers()
    for (const sighting of visible ?? []) {
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
      button.textContent = 'Ver ficha'
      button.onclick = () => openRef.current(sighting.taxon.id)
      popup.append(title, detail, button)
      L.circleMarker([sighting.lat, sighting.lng], {
        radius: 7,
        color: '#fff',
        weight: 1.5,
        fillColor: markerColor(taxonCategory.color),
        fillOpacity: 0.9,
      })
        .addTo(layer)
        .bindPopup(popup)
    }
    // place e radius entram porque o mapa (e a camada de pontos) é recriado quando mudam
  }, [visible, counts, place, radius])

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
      <div ref={node} className="map" />
      <p className="fineprint map-note">
        O mapa mostra até 200 registros, os mais recentes. A posição de espécies ameaçadas é embaralhada pelo
        iNaturalist, para protegê-las.
      </p>
    </>
  )
}
