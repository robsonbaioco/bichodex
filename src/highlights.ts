// Lógica dos destaques do dia: o "bicho do dia" sorteado na região e as datas comemorativas de animais.
// Usada por components/Highlights.tsx. Os calendários ficam em specialDays.ts (dias de um animal),
// associatedDays.ts (datas que não são sobre animais, mas foram associadas a um) e reminders.ts (só lembrete em texto).
// O bicho do dia vem do iNaturalist (fetchDailyCandidates) e fica em cache em 'bichodex:daily'.
// dayKey() também é usada por missions.ts.

import { fetchDailyCandidates, type Place, type Taxon } from './api'
import { ASSOCIATED_DAYS } from './associatedDays'
import { REMINDERS } from './reminders'
import { SPECIAL_DAYS, type SpecialDay } from './specialDays'
import { load, save } from './storage'

/** Data local no formato AAAA-MM-DD. */
export function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Hash FNV-1a de 32 bits: transforma a data num número estável, igual em todo aparelho. */
function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** O que fica salvo em 'daily': a chave "dia|lat,lng|raio" e o animal sorteado. */
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
  // o hash usa só a data: no mesmo lugar (mesma lista de candidatos) todos caem no mesmo animal
  const taxon = candidates[hash(today) % candidates.length]
  save('daily', { key, taxon } satisfies DailyCache)
  return taxon
}

/** Domingo de Páscoa do ano, pelo algoritmo gregoriano anônimo (Meeus/Jones/Butcher). */
function easterOf(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const h = (19 * a + b - Math.floor(b / 4) - Math.floor((b - Math.floor((b + 8) / 25) + 1) / 3) + 15) % 30
  const l = (32 + 2 * (b % 4) + 2 * Math.floor(c / 4) - h - (c % 4)) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

/** Datas comemorativas com animal (as de animais primeiro) que caem no dia informado. */
export function specialDaysOn(date: Date): SpecialDay[] {
  // uma data pode ser: a Páscoa (móvel), um dia fixo do mês, ou "a enésima/última <dia da semana> do mês"
  const month = date.getMonth() + 1
  return [...SPECIAL_DAYS, ...ASSOCIATED_DAYS].filter((day) => {
    if (day.easter) return dayKey(easterOf(date.getFullYear())) === dayKey(date)
    if (day.month !== month) return false
    if (day.day != null) return day.day === date.getDate()
    if (day.weekday == null || day.nth == null || date.getDay() !== day.weekday) return false
    // nth > 0: enésima ocorrência do dia da semana no mês; -1: a última
    if (day.nth > 0) return Math.ceil(date.getDate() / 7) === day.nth
    // dia 0 do mês seguinte = último dia deste mês; é a última ocorrência se daqui a 7 dias já virou o mês
    const daysInMonth = new Date(date.getFullYear(), month, 0).getDate()
    return date.getDate() + 7 > daysInMonth
  })
}

/** Demais datas comemorativas do dia, mostradas só como lembrete (REMINDERS é indexado por "MM-DD"). */
export function remindersOn(date: Date): string[] {
  return REMINDERS[dayKey(date).slice(5)] ?? []
}
