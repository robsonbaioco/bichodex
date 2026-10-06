// Temas visuais. As cores e formas de cada um ficam em styles.css, sob :root[data-theme='…'];
// aqui estão só o que a interface e o cartão de conquista (canvas, sem acesso ao CSS) precisam saber.

import { load, save } from './storage'

export type ThemeId = 'original' | 'grafite' | 'elfico' | 'jogo'

export interface Theme {
  id: ThemeId
  label: string
  emoji: string
  description: string
  /** Cor da barra do navegador / do sistema. */
  chrome: string
  /** Amostra exibida no seletor: fundo, cor principal e destaque. */
  swatch: [string, string, string]
  /** Fonte e peso dos títulos, também usados no cartão de conquista. */
  displayFont: string
  displayWeight: number
  card: { bg: string; deep: string; ink: string; accent: string; onAccent: string }
}

const SYSTEM_FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"

export const THEMES: Theme[] = [
  {
    id: 'original',
    label: 'Original',
    emoji: '🌿',
    description: 'O verde de sempre, claro ou escuro conforme o aparelho.',
    chrome: '#0f7a4d',
    swatch: ['#eef2ea', '#0f7a4d', '#f5c73d'],
    displayFont: SYSTEM_FONT,
    displayWeight: 800,
    card: { bg: '#0f7a4d', deep: '#0b5e3b', ink: '#fff', accent: '#f5c73d', onAccent: '#2b2100' },
  },
  {
    id: 'grafite',
    label: 'Grafite',
    emoji: '🎨',
    description: 'Arte de rua: muro escuro, spray neon e letras de marcador.',
    chrome: '#0d0d10',
    swatch: ['#17171b', '#ff2e88', '#d7ff2f'],
    displayFont: `'Permanent Marker', ${SYSTEM_FONT}`,
    displayWeight: 400,
    card: { bg: '#17171b', deep: '#b80f5a', ink: '#fff', accent: '#d7ff2f', onAccent: '#1a2000' },
  },
  {
    id: 'elfico',
    label: 'Élfico',
    emoji: '🍃',
    description: 'Natureza encantada: pergaminho, floresta e ouro velho.',
    chrome: '#1e4027',
    swatch: ['#f1ead7', '#2f5d3a', '#c9a24a'],
    displayFont: "'Cinzel', 'Palatino Linotype', Georgia, serif",
    displayWeight: 700,
    card: { bg: '#2f5d3a', deep: '#1e4027', ink: '#f6edcf', accent: '#d9b660', onAccent: '#2b2100' },
  },
  {
    id: 'jogo',
    label: 'Jogo',
    emoji: '🎮',
    description: 'Dex de bolso: vermelho, pixels e cara de videogame.',
    chrome: '#dc0a2d',
    swatch: ['#e9edf2', '#dc0a2d', '#ffcb05'],
    displayFont: "'Press Start 2P', ui-monospace, Consolas, monospace",
    displayWeight: 400,
    card: { bg: '#dc0a2d', deep: '#8b0a1e', ink: '#fff', accent: '#ffcb05', onAccent: '#1b1b2f' },
  },
]

export function themeById(id: string | undefined): Theme {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0]
}

export function loadTheme(): ThemeId {
  return themeById(load<string>('theme', 'original')).id
}

/** Tema em uso no documento. */
export function currentTheme(): Theme {
  return themeById(document.documentElement.dataset.theme)
}

export function applyTheme(id: ThemeId): void {
  const theme = themeById(id)
  document.documentElement.dataset.theme = theme.id
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.chrome)
  save('theme', theme.id)
}
