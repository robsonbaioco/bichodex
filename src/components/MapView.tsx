import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'
import { fetchRecentSightings, type Place } from '../api'
import { categoryOf } from '../categories'
import { displayName, formatNumber } from '../format'

interface Props {
  place: Place
  radius: number
  onOpen: (id: number) => void
}

const formatDate = (iso?: string) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR') : '')

/** Cor da categoria; as que seguem o tema (var(--brand)) não valem para o desenho do mapa. */
const markerColor = (color: string) => (color.startsWith('var(') ? '#0f7a4d' : color)

/** Mapa da área de busca com os registros mais recentes; tocar em um ponto leva à ficha da espécie. */
export default function MapView({ place, radius, onOpen }: Props) {
  const node = useRef<HTMLDivElement>(null)
  const openRef = useRef(onOpen)
  openRef.current = onOpen
  const [status, setStatus] = useState<'loading' | 'error' | number>('loading')

  useEffect(() => {
    if (!node.current) return
    const center: L.LatLngTuple = [place.lat, place.lng]
    // o círculo só sabe os próprios limites depois que o mapa tem uma vista definida
    const map = L.map(node.current, { zoomControl: true }).setView(center, 11)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)
    const area = L.circle(center, { radius: radius * 1000, color: '#0f7a4d', weight: 2, dashArray: '6 6', fillOpacity: 0.04 })
    area.addTo(map)
    map.fitBounds(area.getBounds())
    L.circleMarker(center, { radius: 5, color: '#fff', weight: 2, fillColor: '#14201b', fillOpacity: 1 })
      .addTo(map)
      .bindTooltip('Você está aqui')

    const controller = new AbortController()
    setStatus('loading')
    fetchRecentSightings(place, radius, controller.signal)
      .then((sightings) => {
        for (const sighting of sightings) {
          const category = categoryOf(sighting.taxon)
          const popup = document.createElement('div')
          popup.className = 'map-popup'
          const title = document.createElement('b')
          title.textContent = `${category.emoji} ${displayName(sighting.taxon)}`
          const date = document.createElement('span')
          date.textContent = formatDate(sighting.observedOn)
          const button = document.createElement('button')
          button.className = 'btn'
          button.textContent = 'Ver ficha'
          button.onclick = () => openRef.current(sighting.taxon.id)
          popup.append(title, date, button)
          L.circleMarker([sighting.lat, sighting.lng], {
            radius: 7,
            color: '#fff',
            weight: 1.5,
            fillColor: markerColor(category.color),
            fillOpacity: 0.9,
          })
            .addTo(map)
            .bindPopup(popup)
        }
        setStatus(sightings.length)
      })
      .catch((error) => error.name !== 'AbortError' && setStatus('error'))

    return () => {
      controller.abort()
      map.remove()
    }
  }, [place, radius])

  return (
    <>
      <header className="page-head">
        <h2>Mapa</h2>
        <p aria-live="polite">
          {status === 'loading'
            ? 'Buscando os registros mais recentes…'
            : status === 'error'
              ? 'Não foi possível carregar os registros. Verifique sua conexão.'
              : `${formatNumber(status)} registros mais recentes em até ${radius} km de ${place.label}. Toque em um ponto para ver a espécie.`}
        </p>
      </header>
      <div ref={node} className="map" />
      <p className="fineprint map-note">
        A posição de espécies ameaçadas é embaralhada pelo iNaturalist, para protegê-las.
      </p>
    </>
  )
}
