// Escolha do local: pela geolocalização do navegador (com o nome achado pela BigDataCloud) ou buscando uma
// cidade no Open-Meteo. Usado pelo App na tela de boas-vindas e no painel "Trocar local"; entrega o Place
// por `onPick`, e quem guarda (localStorage `bichodex:place`) é o App.
import { useState, type FormEvent } from 'react'
import { reverseGeocode, searchPlaces, type Place } from '../api'

// ~1 km de precisão: suficiente para a busca por raio e evita enviar a posição exata às APIs.
const round = (n: number) => Math.round(n * 100) / 100

/** Mensagens pelos códigos de GeolocationPositionError (1 = negada, 2 = indisponível, 3 = tempo esgotado). */
const GEO_ERRORS: Record<number, string> = {
  1: 'Permissão de localização negada. Libere o acesso no navegador ou busque uma cidade abaixo.',
  2: 'Não foi possível determinar sua localização. Tente de novo ou busque uma cidade.',
  3: 'A localização demorou demais para responder. Tente de novo ou busque uma cidade.',
}

/** Botão "Usar minha localização" e busca de cidade; chama `onPick` com o lugar escolhido, já arredondado. */
export function LocationPicker({ onPick }: { onPick: (place: Place) => void }) {
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<Place[] | null>(null)

  /** Pede a posição ao navegador (abre o pedido de permissão) e dá nome a ela; sem nome, usa as coordenadas. */
  function locate() {
    if (!navigator.geolocation) {
      setError('Este navegador não oferece localização. Busque uma cidade abaixo.')
      return
    }
    setError(null)
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = round(position.coords.latitude)
        const lng = round(position.coords.longitude)
        // não volta `locating` para falso: ao escolher o local, o App desmonta este componente
        const label = await reverseGeocode(lat, lng).catch(() => null)
        onPick({ lat, lng, label: label ?? `${lat.toFixed(2)}, ${lng.toFixed(2)}` })
      },
      (geoError) => {
        setLocating(false)
        setError(GEO_ERRORS[geoError.code] ?? GEO_ERRORS[2])
      },
      { timeout: 15000, maximumAge: 5 * 60 * 1000 }, // aceita uma posição de até 5 min atrás, que responde mais rápido
    )
  }

  /** Envio do formulário: busca cidades com o termo digitado (mínimo de 2 letras) e mostra a lista. */
  async function search(event: FormEvent) {
    event.preventDefault()
    const term = query.trim()
    if (term.length < 2) return
    setError(null)
    setSearching(true)
    try {
      setResults(await searchPlaces(term))
    } catch {
      setError('Não foi possível buscar cidades agora. Verifique sua conexão.')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="picker">
      <button className="btn btn-primary btn-lg" onClick={locate} disabled={locating}>
        {locating ? 'Localizando…' : '📍 Usar minha localização'}
      </button>

      <div className="picker-or">ou</div>

      <form className="picker-search" onSubmit={search}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar cidade…"
          aria-label="Buscar cidade"
        />
        <button className="btn" disabled={searching}>
          {searching ? '…' : '🔍 Buscar'}
        </button>
      </form>

      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}

      {results &&
        (results.length ? (
          <ul className="picker-results">
            {results.map((place) => (
              <li key={`${place.lat},${place.lng}`}>
                <button onClick={() => onPick({ ...place, lat: round(place.lat), lng: round(place.lng) })}>
                  {place.label}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="notice">Nenhuma cidade encontrada com esse nome.</p>
        ))}
    </div>
  )
}
