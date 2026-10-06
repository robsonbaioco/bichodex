import type { Taxon } from './api'

export interface Category {
  id: string
  label: string
  emoji: string
  color: string
  /** Grupo "icônico" do iNaturalist usado como filtro. */
  iconic?: string
  /** Filtro por táxon, para grupos que não são icônicos no iNaturalist. */
  taxonId?: number
}

const BACTERIA_TAXON_ID = 67333

export const CATEGORIES: Category[] = [
  { id: 'all', label: 'Tudo', emoji: '🌎', color: 'var(--brand)' },
  { id: 'mammals', label: 'Mamíferos', emoji: '🦊', color: '#c2703d', iconic: 'Mammalia' },
  { id: 'birds', label: 'Aves', emoji: '🦜', color: '#3b82c4', iconic: 'Aves' },
  { id: 'reptiles', label: 'Répteis', emoji: '🦎', color: '#6f9a2e', iconic: 'Reptilia' },
  { id: 'amphibians', label: 'Anfíbios', emoji: '🐸', color: '#2f9e8f', iconic: 'Amphibia' },
  { id: 'fish', label: 'Peixes', emoji: '🐟', color: '#3f6fd8', iconic: 'Actinopterygii' },
  { id: 'insects', label: 'Insetos', emoji: '🦋', color: '#d9962b', iconic: 'Insecta' },
  { id: 'arachnids', label: 'Aracnídeos', emoji: '🕷️', color: '#7d5ba6', iconic: 'Arachnida' },
  { id: 'molluscs', label: 'Moluscos', emoji: '🐌', color: '#c7628f', iconic: 'Mollusca' },
  { id: 'animals', label: 'Outros animais', emoji: '🦀', color: '#d1583f', iconic: 'Animalia' },
  { id: 'plants', label: 'Plantas', emoji: '🌿', color: '#3d9a45', iconic: 'Plantae' },
  { id: 'fungi', label: 'Fungos', emoji: '🍄', color: '#b0553f', iconic: 'Fungi' },
  { id: 'protozoa', label: 'Protozoários', emoji: '🦠', color: '#8d7bd6', iconic: 'Protozoa' },
  { id: 'chromista', label: 'Algas e cromistas', emoji: '🌊', color: '#2b93a8', iconic: 'Chromista' },
  { id: 'bacteria', label: 'Bactérias', emoji: '🧫', color: '#7a8a3a', taxonId: BACTERIA_TAXON_ID },
]

const OTHER: Category = { id: 'other', label: 'Outros', emoji: '🧬', color: '#6b7a74' }

const BY_ICONIC = new Map(CATEGORIES.filter((c) => c.iconic).map((c) => [c.iconic!, c]))
const BACTERIA = CATEGORIES.find((c) => c.id === 'bacteria')!

export function categoryOf(taxon: Taxon): Category {
  const byIconic = taxon.iconic_taxon_name && BY_ICONIC.get(taxon.iconic_taxon_name)
  if (byIconic) return byIconic
  if (taxon.ancestor_ids?.includes(BACTERIA_TAXON_ID)) return BACTERIA
  return OTHER
}
