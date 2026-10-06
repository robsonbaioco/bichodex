// Temas visuais. As cores e formas de cada um ficam em styles.css, sob :root[data-theme='…'];
// aqui estão só o que a interface e o cartão de conquista (canvas, sem acesso ao CSS) precisam saber.

import { load, save } from './storage'

export type ThemeId =
  | 'original'
  | 'grafite'
  | 'elfico'
  | 'jogo'
  | 'cordel'
  | 'campo'
  | 'terminal'
  | 'noturno'
  | 'carta'
  | 'parque'

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
    description: 'Arte de rua: muro preto, spray neon e tinta escorrendo.',
    chrome: '#0a0a0d',
    swatch: ['#0c0c10', '#ff2e9a', '#c8ff1f'],
    displayFont: `'Rubik Wet Paint', 'Permanent Marker', ${SYSTEM_FONT}`,
    displayWeight: 400,
    card: { bg: '#0c0c10', deep: '#a80f5f', ink: '#fff', accent: '#c8ff1f', onAccent: '#141b00' },
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
  {
    id: 'cordel',
    label: 'Cordel',
    emoji: '📜',
    description: 'Xilogravura: papel kraft, tinta preta e folhetos no barbante.',
    chrome: '#dcbc8a',
    swatch: ['#dcbc8a', '#17110c', '#b3261a'],
    displayFont: "'Alfa Slab One', Rockwell, Georgia, serif",
    displayWeight: 400,
    card: { bg: '#dcbc8a', deep: '#c9a468', ink: '#17110c', accent: '#b3261a', onAccent: '#f6e6c8' },
  },
  {
    id: 'campo',
    label: 'Naturalista',
    emoji: '📓',
    description: 'Caderno de campo: papel quadriculado, polaroides e letra à mão.',
    chrome: '#f4efe1',
    swatch: ['#f4efe1', '#c0392b', '#2f4f9e'],
    displayFont: "'Caveat', 'Segoe Print', cursive",
    displayWeight: 700,
    card: { bg: '#f4efe1', deep: '#e6dcc0', ink: '#2b2a26', accent: '#c0392b', onAccent: '#fff' },
  },
  {
    id: 'terminal',
    label: 'Terminal',
    emoji: '📟',
    description: 'Monitor de fósforo verde: uma cor só e fonte de console.',
    chrome: '#010a03',
    swatch: ['#010a03', '#06200f', '#39ff7a'],
    displayFont: "'VT323', ui-monospace, Consolas, monospace",
    displayWeight: 400,
    card: { bg: '#010a03', deep: '#06200f', ink: '#39ff7a', accent: '#39ff7a', onAccent: '#010a03' },
  },
  {
    id: 'noturno',
    label: 'Noturno',
    emoji: '🌌',
    description: 'Floresta bioluminescente: roxo profundo com brilho neon.',
    chrome: '#07021a',
    swatch: ['#07021a', '#d926cc', '#22f5e0'],
    displayFont: `'Orbitron', ${SYSTEM_FONT}`,
    displayWeight: 800,
    card: { bg: '#07021a', deep: '#3b1470', ink: '#f3eaff', accent: '#22f5e0', onAccent: '#04121a' },
  },
  {
    id: 'carta',
    label: 'Colecionável',
    emoji: '🃏',
    description: 'Carta holográfica: moldura amarela e letra de gibi.',
    chrome: '#e3242b',
    swatch: ['#1c1470', '#e3242b', '#ffd400'],
    displayFont: "'Bangers', Impact, sans-serif",
    displayWeight: 400,
    card: { bg: '#1c1470', deep: '#e3242b', ink: '#fff', accent: '#ffd400', onAccent: '#1c1470' },
  },
  {
    id: 'parque',
    label: 'Parque',
    emoji: '🏞️',
    description: 'Cartaz vintage: pôr do sol, serra em camadas e letras de placa.',
    chrome: '#f4a261',
    swatch: ['#f3dfae', '#2a9d8f', '#cf4f33'],
    displayFont: "'Bebas Neue', 'Arial Narrow', Impact, sans-serif",
    displayWeight: 400,
    card: { bg: '#2a9d8f', deep: '#1d3557', ink: '#fbf3dc', accent: '#e9c46a', onAccent: '#1d3557' },
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
