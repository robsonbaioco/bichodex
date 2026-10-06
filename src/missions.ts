// Missões do dia, sequência de dias e medalhas. Tudo fica salvo só no aparelho.

import type { Taxon } from './api'
import { CATEGORIES, type Category } from './categories'
import { dayKey } from './highlights'
import { load } from './storage'

export interface Progress {
  /** Dia (AAAA-MM-DD) a que `opened` e `sightings` se referem. */
  day: string
  /** Fichas abertas no dia. */
  opened: number[]
  /** Espécies marcadas como avistadas no dia. */
  sightings: { id: number; iconic: string | null }[]
  /** Dias seguidos abrindo o app, contando hoje. */
  streak: number
  best: number
}

function previousDay(key: string): string {
  const date = new Date(`${key}T12:00:00`)
  date.setDate(date.getDate() - 1)
  return dayKey(date)
}

/** Progresso salvo, já virado para o dia de hoje: zera as missões e atualiza a sequência. */
export function loadProgress(now = new Date()): Progress {
  const today = dayKey(now)
  const stored = load<Progress | null>('progress', null)
  if (stored?.day === today) return stored
  const streak = stored?.day === previousDay(today) ? stored.streak + 1 : 1
  return { day: today, opened: [], sightings: [], streak, best: Math.max(streak, stored?.best ?? 0) }
}

export function withOpened(progress: Progress, id: number): Progress {
  return progress.opened.includes(id) ? progress : { ...progress, opened: [...progress.opened, id] }
}

export function withSighting(progress: Progress, taxon: Taxon): Progress {
  if (progress.sightings.some((s) => s.id === taxon.id)) return progress
  return { ...progress, sightings: [...progress.sightings, { id: taxon.id, iconic: taxon.iconic_taxon_name ?? null }] }
}

export function withoutSighting(progress: Progress, id: number): Progress {
  return { ...progress, sightings: progress.sightings.filter((s) => s.id !== id) }
}

const DAILY_GROUPS = ['birds', 'insects', 'plants', 'mammals', 'reptiles', 'arachnids', 'fungi', 'amphibians']

/** Categoria da missão do dia: a mesma para todo mundo, trocando a cada dia. */
export function dailyCategory(now = new Date()): Category {
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000)
  const id = DAILY_GROUPS[dayOfYear % DAILY_GROUPS.length]
  return CATEGORIES.find((c) => c.id === id)!
}

export interface Quest {
  id: string
  label: string
  value: number
  goal: number
}

export function questsFor(progress: Progress, category: Category): Quest[] {
  const inCategory = progress.sightings.filter((s) => s.iconic === category.iconic).length
  return [
    { id: 'seen', label: 'Aviste 1 espécie', value: Math.min(progress.sightings.length, 1), goal: 1 },
    { id: 'open', label: 'Abra 3 fichas', value: Math.min(progress.opened.length, 3), goal: 3 },
    { id: 'group', label: `Aviste 1 espécie de ${category.label.toLowerCase()}`, value: Math.min(inCategory, 1), goal: 1 },
  ]
}

export interface Medal {
  id: string
  emoji: string
  label: string
  hint: string
  earned: boolean
}

const SEEN_MEDALS: [number, string, string][] = [
  [1, '🔎', 'Primeiro avistamento'],
  [5, '🥉', 'Curioso'],
  [10, '🥈', 'Observador'],
  [25, '🥇', 'Naturalista'],
  [50, '🏆', 'Especialista'],
  [100, '👑', 'Lenda'],
]

const STREAK_MEDALS: [number, string, string][] = [
  [3, '🔥', 'Três dias seguidos'],
  [7, '⚡', 'Uma semana'],
  [30, '🌙', 'Um mês'],
]

export function medalsFor(seenCount: number, bestStreak: number): Medal[] {
  return [
    ...SEEN_MEDALS.map(([goal, emoji, label]) => ({
      id: `seen-${goal}`,
      emoji,
      label,
      hint: goal === 1 ? '1 espécie avistada' : `${goal} espécies avistadas`,
      earned: seenCount >= goal,
    })),
    ...STREAK_MEDALS.map(([goal, emoji, label]) => ({
      id: `streak-${goal}`,
      emoji,
      label,
      hint: `${goal} dias seguidos no app`,
      earned: bestStreak >= goal,
    })),
  ]
}
