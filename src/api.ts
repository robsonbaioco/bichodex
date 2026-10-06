import type { Category } from './categories'

const INAT = 'https://api.inaturalist.org/v1'
export const PER_PAGE = 48

export interface Place {
  lat: number
  lng: number
  label: string
}

export interface Photo {
  square_url?: string
  medium_url?: string
  attribution?: string
  /** Licença Creative Commons (ex.: 'cc-by-nc'); nula quando todos os direitos são reservados. */
  license_code?: string | null
}

export interface Taxon {
  id: number
  name: string
  rank: string
  preferred_common_name?: string
  iconic_taxon_name?: string | null
  ancestor_ids?: number[]
  default_photo?: Photo | null
  observations_count?: number
}

export interface TaxonDetail extends Taxon {
  wikipedia_summary?: string | null
  taxon_photos?: { photo: Photo }[]
  ancestors?: Taxon[]
  conservation_status?: { status?: string; status_name?: string; authority?: string } | null
}

export interface SpeciesCount {
  count: number
  taxon: Taxon
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json() as Promise<T>
}

function areaParams(place: Place, radiusKm: number): URLSearchParams {
  return new URLSearchParams({
    lat: String(place.lat),
    lng: String(place.lng),
    radius: String(radiusKm),
    verifiable: 'true',
    locale: 'pt-BR',
  })
}

export async function fetchSpecies(
  opts: {
    place: Place
    radiusKm: number
    category: Category
    page: number
    perPage?: number
    /** Ordem pela quantidade de registros; 'desc' (mais registradas primeiro) é o padrão. */
    order?: 'asc' | 'desc'
  },
  signal?: AbortSignal,
): Promise<{ total: number; results: SpeciesCount[] }> {
  const params = areaParams(opts.place, opts.radiusKm)
  params.set('per_page', String(opts.perPage ?? PER_PAGE))
  params.set('page', String(opts.page))
  if (opts.order === 'asc') params.set('order', 'asc')
  if (opts.category.iconic) params.set('iconic_taxa', opts.category.iconic)
  if (opts.category.taxonId) params.set('taxon_id', String(opts.category.taxonId))
  const data = await getJson<{ total_results: number; results: SpeciesCount[] }>(
    `${INAT}/observations/species_counts?${params}`,
    signal,
  )
  return { total: data.total_results, results: data.results }
}

/** Número de espécies por grupo icônico (ex.: { Aves: 309 }) na área. */
export async function fetchCategoryCounts(
  place: Place,
  radiusKm: number,
  signal?: AbortSignal,
): Promise<Record<string, number>> {
  const data = await getJson<{ results: { count: number; taxon: { name: string } }[] }>(
    `${INAT}/observations/iconic_taxa_species_counts?${areaParams(place, radiusKm)}`,
    signal,
  )
  return Object.fromEntries(data.results.map((r) => [r.taxon.name, r.count]))
}

export async function fetchTaxon(id: number, signal?: AbortSignal): Promise<TaxonDetail> {
  const data = await getJson<{ results: TaxonDetail[] }>(`${INAT}/taxa/${id}?locale=pt-BR`, signal)
  if (!data.results[0]) throw new Error('Espécie não encontrada')
  return data.results[0]
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const data = await getJson<{ locality?: string; city?: string; principalSubdivision?: string }>(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=pt`,
  )
  const parts = [data.locality || data.city, data.principalSubdivision].filter(Boolean)
  return parts.length ? [...new Set(parts)].join(', ') : null
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({ name: query, language: 'pt', count: '6' })
  const data = await getJson<{
    results?: { name: string; admin1?: string; country?: string; latitude: number; longitude: number }[]
  }>(`https://geocoding-api.open-meteo.com/v1/search?${params}`, signal)
  return (data.results ?? []).map((r) => ({
    lat: r.latitude,
    lng: r.longitude,
    label: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
  }))
}
