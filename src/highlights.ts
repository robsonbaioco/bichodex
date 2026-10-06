// Lógica dos destaques do dia: o "bicho do dia" sorteado na região e as datas comemorativas de animais.

import { fetchDailyCandidates, type Place, type Taxon } from './api'
import { SPECIAL_DAYS, type SpecialDay } from './specialDays'
import { load, save } from './storage'

/** Data local no formato AAAA-MM-DD. */
export function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

interface DailyCache {
  key: string
  taxon: Taxon
}

/**
 * Bicho do dia: um animal da região, sorteado pela data, de modo que todos no mesmo lugar vejam o mesmo.
 * O sorteio fica guardado até o dia (ou o local) mudar, para não trocar se a lista da região variar.
 */
export async function dailyAnimal(place: Place, radiusKm: number, signal?: AbortSignal): Promise<Taxon | null> {
  const today = dayKey(new Date())
  const key = `${today}|${place.lat},${place.lng}|${radiusKm}`
  const cached = load<DailyCache | null>('daily', null)
  if (cached?.key === key) return cached.taxon

  const candidates = await fetchDailyCandidates(place, radiusKm, signal)
  if (!candidates.length) return null
  const taxon = candidates[hash(today) % candidates.length]
  save('daily', { key, taxon } satisfies DailyCache)
  return taxon
}

/** Datas comemorativas que caem no dia informado. */
export function specialDaysOn(date: Date): SpecialDay[] {
  const month = date.getMonth() + 1
  return SPECIAL_DAYS.filter((day) => {
    if (day.month !== month) return false
    if (day.day != null) return day.day === date.getDate()
    if (day.weekday == null || day.nth == null || date.getDay() !== day.weekday) return false
    // nth > 0: enésima ocorrência do dia da semana no mês; -1: a última
    if (day.nth > 0) return Math.ceil(date.getDate() / 7) === day.nth
    const daysInMonth = new Date(date.getFullYear(), month, 0).getDate()
    return date.getDate() + 7 > daysInMonth
  })
}
