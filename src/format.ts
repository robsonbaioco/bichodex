// Formatação e rótulos de exibição usados no app todo: números, nomes de espécies, grau de ameaça (IUCN),
// faixas de raridade, trechos de texto e datas do avistamento. Funções puras, sem rede nem armazenamento.
import type { Taxon } from './api'

/** Número com separador de milhar brasileiro (1.234). */
export const formatNumber = (n: number) => n.toLocaleString('pt-BR')

/** Número da espécie no estilo pokédex ("Nº 007"). */
export const entryNumber = (n: number) => `Nº ${String(n).padStart(3, '0')}`

/** Nome popular em pt-BR (ou o científico, se não houver), com a inicial maiúscula. */
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

/** Faixa de raridade, definida pela quantidade de registros da espécie na área consultada. */
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

/** Rótulo da faixa de raridade em que uma quantidade de registros cai (depende de RARITIES estar da mais comum para a mais rara). */
export function frequencyLabel(count: number): string {
  return (RARITIES.find((rarity) => count >= rarity.min) ?? RARITIES[RARITIES.length - 1]).label
}

/** Texto puro de um trecho HTML (ex.: resumo da Wikipédia), sem executar nada: o DOMParser não roda scripts. */
export function htmlToText(html: string): string {
  return new DOMParser().parseFromString(html, 'text/html').body.textContent ?? ''
}

/** Primeiras frases de um texto, até o limite de caracteres. */
export function excerpt(text: string, max = 190): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  // corta no fim de uma frase se ela ocupar mais da metade do limite; senão, na última palavra inteira, com reticências
  const sentenceEnd = cut.lastIndexOf('. ')
  return sentenceEnd > max * 0.5 ? cut.slice(0, sentenceEnd + 1) : `${cut.slice(0, cut.lastIndexOf(' '))}…`
}

/** Onde a pessoa viu a espécie. */
export type SeenWhere = 'wild' | 'zoo'

/** Data e hora locais no formato do campo datetime-local (AAAA-MM-DDTHH:MM). */
export function localDateTime(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`
}

/** "12/10/2026 às 14:30", a partir do valor de localDateTime; só a data, se o valor não tiver hora. */
export function formatSeenAt(value: string): string {
  const [day, time] = value.split('T')
  const [y, m, d] = day.split('-')
  return time ? `${d}/${m}/${y} às ${time}` : `${d}/${m}/${y}`
}
