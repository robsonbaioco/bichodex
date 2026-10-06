import type { Taxon } from './api'

export const formatNumber = (n: number) => n.toLocaleString('pt-BR')

export const entryNumber = (n: number) => `Nº ${String(n).padStart(3, '0')}`

export function displayName(taxon: Taxon): string {
  const name = taxon.preferred_common_name || taxon.name
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export function frequencyLabel(count: number): string {
  if (count >= 100) return 'Muito comum'
  if (count >= 25) return 'Comum'
  if (count >= 5) return 'Incomum'
  return 'Raro'
}
