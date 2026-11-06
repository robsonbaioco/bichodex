// Missões do dia, sequência de dias e medalhas. Tudo fica salvo só no aparelho.
// Funções puras sobre o objeto Progress: o App.tsx carrega com loadProgress() ao abrir, atualiza
// com withOpened/withSighting/withoutSighting e grava em localStorage ('bichodex:progress').
// A tela que mostra tudo isso é components/Missions.tsx.

import type { Taxon } from './api'
import { CATEGORIES, type Category } from './categories'
import { dayKey } from './highlights'
import { load } from './storage'

/** Progresso salvo no aparelho: missões do dia em curso e a sequência de dias. */
export interface Progress {
  /** Dia (AAAA-MM-DD) a que `opened` e `sightings` se referem. */
  day: string
  /** Fichas abertas no dia. */
  opened: number[]
  /** Espécies marcadas como avistadas no dia. */
  sightings: { id: number; iconic: string | null }[]
  /** Dias seguidos abrindo o app, contando hoje. */
  streak: number
  /** Maior sequência já alcançada (base das medalhas de sequência). */
  best: number
}

/** Dia anterior a uma data AAAA-MM-DD (o meio-dia evita erro de fuso e de horário de verão). */
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
  // a última visita foi ontem: a sequência continua; foi antes (ou nunca): recomeça em 1.
  // Só roda ao abrir o app, então quem deixa o app aberto depois da meia-noite só vira o dia ao recarregar.
  const streak = stored?.day === previousDay(today) ? stored.streak + 1 : 1
  return { day: today, opened: [], sightings: [], streak, best: Math.max(streak, stored?.best ?? 0) }
}

/** Registra que a ficha `id` foi aberta hoje; devolve o mesmo objeto se ela já constava. */
export function withOpened(progress: Progress, id: number): Progress {
  return progress.opened.includes(id) ? progress : { ...progress, opened: [...progress.opened, id] }
}

/** Registra um avistamento de hoje, guardando o grupo icônico para a missão da categoria do dia. */
export function withSighting(progress: Progress, taxon: Taxon): Progress {
  if (progress.sightings.some((s) => s.id === taxon.id)) return progress
  return { ...progress, sightings: [...progress.sightings, { id: taxon.id, iconic: taxon.iconic_taxon_name ?? null }] }
}

/** Desfaz um avistamento de hoje (ao desmarcar), para a missão não contar uma marcação desfeita. */
export function withoutSighting(progress: Progress, id: number): Progress {
  return { ...progress, sightings: progress.sightings.filter((s) => s.id !== id) }
}

/** Ids de categorias (de categories.ts) que se revezam na missão "aviste 1 espécie de …". */
const DAILY_GROUPS = ['birds', 'insects', 'plants', 'mammals', 'reptiles', 'arachnids', 'fungi', 'amphibians']

/** Categoria da missão do dia: a mesma para todo mundo, trocando a cada dia. */
export function dailyCategory(now = new Date()): Category {
  // dia do ano (1 = 1º de janeiro); o rodízio recomeça a cada ano, por isso 31/12 e 1/1 podem não seguir a ordem
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000)
  const id = DAILY_GROUPS[dayOfYear % DAILY_GROUPS.length]
  return CATEGORIES.find((c) => c.id === id)!
}

/** Uma missão do dia: `value` é o progresso (já limitado a `goal`). */
export interface Quest {
  id: string
  label: string
  value: number
  goal: number
}

/** As três missões do dia, calculadas do progresso de hoje e da categoria do dia. */
export function questsFor(progress: Progress, category: Category): Quest[] {
  const inCategory = progress.sightings.filter((s) => s.iconic === category.iconic).length
  return [
    { id: 'seen', label: 'Aviste 1 espécie', value: Math.min(progress.sightings.length, 1), goal: 1 },
    { id: 'open', label: 'Abra 3 fichas', value: Math.min(progress.opened.length, 3), goal: 3 },
    { id: 'group', label: `Aviste 1 espécie de ${category.label.toLowerCase()}`, value: Math.min(inCategory, 1), goal: 1 },
  ]
}

/** Uma medalha, com o texto do que é preciso para ganhá-la. */
export interface Medal {
  id: string
  emoji: string
  label: string
  hint: string
  earned: boolean
}

/** Medalhas por total de espécies avistadas: [meta, emoji, nome]. */
const SEEN_MEDALS: [number, string, string][] = [
  [1, '🔎', 'Primeiro avistamento'],
  [5, '🥉', 'Curioso'],
  [10, '🥈', 'Observador'],
  [25, '🥇', 'Naturalista'],
  [50, '🏆', 'Especialista'],
  [100, '👑', 'Lenda'],
]

/** Medalhas por dias seguidos no app: [meta, emoji, nome]. */
const STREAK_MEDALS: [number, string, string][] = [
  [3, '🔥', 'Três dias seguidos'],
  [7, '⚡', 'Uma semana'],
  [30, '🌙', 'Um mês'],
]

/**
 * Todas as medalhas, com `earned` calculado na hora (nada é salvo). As de avistamento usam o total
 * atual, então podem sumir se a pessoa desmarcar espécies; as de sequência usam a melhor sequência e ficam.
 */
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
