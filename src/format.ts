import type { Taxon } from './api'

export const formatNumber = (n: number) => n.toLocaleString('pt-BR')

export const entryNumber = (n: number) => `Nº ${String(n).padStart(3, '0')}`

export function displayName(taxon: Taxon): string {
  const name = taxon.preferred_common_name || taxon.name
  return name.charAt(0).toUpperCase() + name.slice(1)
}

/** Categorias da Lista Vermelha (IUCN). */
export const CONSERVATION: Record<string, string> = {
  LC: 'Pouco preocupante',
  NT: 'Quase ameaçada',
  VU: 'Vulnerável',
  EN: 'Em perigo',
  CR: 'Criticamente em perigo',
  EW: 'Extinta na natureza',
  EX: 'Extinta',
  DD: 'Dados insuficientes',
}

/** Versão curta, para caber nos blocos de atributos da ficha. */
export const RISK_SHORT: Record<string, string> = {
  LC: 'Baixo',
  NT: 'Quase ameaçada',
  VU: 'Vulnerável',
  EN: 'Em perigo',
  CR: 'Crítico',
  EW: 'Extinta na natureza',
  EX: 'Extinta',
  DD: 'Sem dados',
}

/** Rótulo do grau de ameaça, ou null quando a espécie não está em risco (ou o status não é da IUCN). */
export function riskLabel(taxon: Taxon): string | null {
  const status = taxon.conservation_status?.status?.toUpperCase()
  return status && status !== 'LC' && status !== 'DD' ? (CONSERVATION[status] ?? null) : null
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

export function htmlToText(html: string): string {
  return new DOMParser().parseFromString(html, 'text/html').body.textContent ?? ''
}

/** Primeiras frases de um texto, até o limite de caracteres. */
export function excerpt(text: string, max = 190): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const sentenceEnd = cut.lastIndexOf('. ')
  return sentenceEnd > max * 0.5 ? cut.slice(0, sentenceEnd + 1) : `${cut.slice(0, cut.lastIndexOf(' '))}…`
}

/** Onde a pessoa viu a espécie. */
export type SeenWhere = 'wild' | 'zoo'
