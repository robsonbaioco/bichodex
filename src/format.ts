import type { Taxon } from './api'

export const formatNumber = (n: number) => n.toLocaleString('pt-BR')

export const entryNumber = (n: number) => `Nº ${String(n).padStart(3, '0')}`

export function displayName(taxon: Taxon): string {
  const name = taxon.preferred_common_name || taxon.name
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export interface Rarity {
  id: string
  label: string
  /** Faixa de registros na região (inclusive). */
  min: number
  max: number
}

/** Da mais comum para a mais rara, pela quantidade de registros na região consultada. */
export const RARITIES: Rarity[] = [
  { id: 'very-common', label: 'Muito comum', min: 100, max: Infinity },
  { id: 'common', label: 'Comum', min: 25, max: 99 },
  { id: 'uncommon', label: 'Incomum', min: 5, max: 24 },
  { id: 'rare', label: 'Raro', min: 0, max: 4 },
]

export function frequencyLabel(count: number): string {
  return (RARITIES.find((rarity) => count >= rarity.min) ?? RARITIES[RARITIES.length - 1]).label
}
