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
  conservation_status?: { status?: string; status_name?: string; authority?: string } | null
}

export interface TaxonDetail extends Taxon {
  wikipedia_summary?: string | null
  taxon_photos?: { photo: Photo }[]
  ancestors?: Taxon[]
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

function areaParams(place: Place, radiusKm: number, threatened = false): URLSearchParams {
  const params = new URLSearchParams({
    lat: String(place.lat),
    lng: String(place.lng),
    radius: String(radiusKm),
    verifiable: 'true',
    locale: 'pt-BR',
  })
  // inclui "quase ameaçada" em diante, em listas globais (IUCN) ou regionais
  if (threatened) params.set('threatened', 'true')
  return params
}

export async function fetchSpecies(
  opts: {
    place: Place
    radiusKm: number
    category: Category
    /** Só espécies com algum grau de ameaça de extinção. */
    threatened?: boolean
    page: number
    perPage?: number
    /** Ordem pela quantidade de registros; 'desc' (mais registradas primeiro) é o padrão. */
    order?: 'asc' | 'desc'
  },
  signal?: AbortSignal,
): Promise<{ total: number; results: SpeciesCount[] }> {
  const params = areaParams(opts.place, opts.radiusKm, opts.threatened)
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
  threatened: boolean,
  signal?: AbortSignal,
): Promise<Record<string, number>> {
  const data = await getJson<{ results: { count: number; taxon: { name: string } }[] }>(
    `${INAT}/observations/iconic_taxa_species_counts?${areaParams(place, radiusKm, threatened)}`,
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

const ANIMAL_GROUPS = 'Mammalia,Aves,Reptilia,Amphibia,Actinopterygii,Insecta,Arachnida,Mollusca,Animalia'

/**
 * Animais da área que servem de "bicho do dia": com foto, nome popular e registros suficientes
 * para haver chance real de encontrá-los.
 */
export async function fetchDailyCandidates(place: Place, radiusKm: number, signal?: AbortSignal): Promise<Taxon[]> {
  const params = areaParams(place, radiusKm)
  params.set('iconic_taxa', ANIMAL_GROUPS)
  params.set('per_page', '200')
  const data = await getJson<{ results: SpeciesCount[] }>(`${INAT}/observations/species_counts?${params}`, signal)
  const presentable = data.results.filter((r) => r.taxon.default_photo && r.taxon.preferred_common_name)
  const findable = presentable.filter((r) => r.count >= 5)
  return (findable.length ? findable : presentable).map((r) => r.taxon)
}

/** Quantas espécies de um grupo (táxon) têm registro na área. */
export async function countSpeciesInArea(
  place: Place,
  radiusKm: number,
  taxonId: number,
  signal?: AbortSignal,
): Promise<number> {
  const params = areaParams(place, radiusKm)
  params.set('taxon_id', String(taxonId))
  params.set('per_page', '0')
  const data = await getJson<{ total_results: number }>(`${INAT}/observations/species_counts?${params}`, signal)
  return data.total_results
}

/** Busca espécies pelo nome no catálogo mundial, sem restrição de área. */
export async function searchWorldSpecies(query: string, signal?: AbortSignal): Promise<Taxon[]> {
  const params = new URLSearchParams({ q: query, rank: 'species', is_active: 'true', per_page: '12', locale: 'pt-BR' })
  const data = await getJson<{ results: Taxon[] }>(`${INAT}/taxa?${params}`, signal)
  return data.results
}

/** Dados básicos de várias espécies de uma vez (a API aceita até 30 por chamada). */
export async function fetchTaxaByIds(ids: number[], signal?: AbortSignal): Promise<Taxon[]> {
  const chunks: number[][] = []
  for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30))
  const pages = await Promise.all(
    chunks.map((chunk) => getJson<{ results: Taxon[] }>(`${INAT}/taxa/${chunk.join(',')}?locale=pt-BR`, signal)),
  )
  return pages.flatMap((page) => page.results)
}

/** Um registro de observação com posição, para o mapa. */
export interface Sighting {
  id: number
  lat: number
  lng: number
  taxon: Taxon
  observedOn?: string
}

/** Registros mais recentes da área. Espécies ameaçadas vêm com a posição embaralhada pelo iNaturalist. */
export async function fetchRecentSightings(
  place: Place,
  radiusKm: number,
  filter: { category: Category; threatened: boolean },
  signal?: AbortSignal,
): Promise<Sighting[]> {
  const params = areaParams(place, radiusKm, filter.threatened)
  if (filter.category.iconic) params.set('iconic_taxa', filter.category.iconic)
  if (filter.category.taxonId) params.set('taxon_id', String(filter.category.taxonId))
  params.set('per_page', '200')
  params.set('order_by', 'observed_on')
  params.set('photos', 'true')
  const data = await getJson<{
    results: { id: number; location?: string | null; taxon?: Taxon | null; observed_on?: string }[]
  }>(`${INAT}/observations?${params}`, signal)
  return data.results.flatMap((r) => {
    const [lat, lng] = (r.location ?? '').split(',').map(Number)
    if (!r.taxon || !Number.isFinite(lat) || !Number.isFinite(lng)) return []
    return [{ id: r.id, lat, lng, taxon: r.taxon, observedOn: r.observed_on }]
  })
}

/** Quantos registros cada uma das espécies dadas tem na área (a base do filtro de raridade). */
export async function fetchCountsForTaxa(
  place: Place,
  radiusKm: number,
  ids: number[],
  signal?: AbortSignal,
): Promise<Map<number, number>> {
  if (!ids.length) return new Map()
  const params = areaParams(place, radiusKm)
  params.set('taxon_id', ids.join(','))
  params.set('per_page', '500')
  const data = await getJson<{ results: SpeciesCount[] }>(`${INAT}/observations/species_counts?${params}`, signal)
  return new Map(data.results.map((r) => [r.taxon.id, r.count]))
}
