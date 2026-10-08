// Lógica do 2048 (baseada no jogo clássico de Gabriele Cirulli):
// tabuleiro 4×4; cada jogada desliza os blocos numa direção e funde pares iguais
// uma única vez por jogada; a seguir nasce um bloco 2 (90%) ou 4 (10%) numa célula vazia.

export type Direction = 'up' | 'down' | 'left' | 'right'
export type Mode = 'normal' | 'infinito'

export interface Tile {
  id: number
  value: number
  row: number
  col: number
  /** Nasceu nesta jogada (animação de entrada). */
  isNew?: boolean
  /** Resultado de uma fusão nesta jogada (animação de "pop"). */
  justMerged?: boolean
}

export interface GameState {
  tiles: Tile[]
  score: number
  over: boolean
  /** Alcançou 2048 no modo normal. */
  won: boolean
  mode: Mode
}

export const SIZE = 4
export const GOAL = 2048

let nextId = 1

function cell(tiles: Tile[], row: number, col: number): Tile | undefined {
  return tiles.find((t) => t.row === row && t.col === col)
}

function emptyCells(tiles: Tile[]): [number, number][] {
  const cells: [number, number][] = []
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) if (!cell(tiles, r, c)) cells.push([r, c])
  return cells
}

function spawn(tiles: Tile[]): Tile[] {
  const free = emptyCells(tiles)
  if (!free.length) return tiles
  const [row, col] = free[Math.floor(Math.random() * free.length)]
  const value = Math.random() < 0.9 ? 2 : 4
  return [...tiles, { id: nextId++, value, row, col, isNew: true }]
}

export function newGame(mode: Mode): GameState {
  const tiles = spawn(spawn([]))
  return { tiles, score: 0, over: false, won: false, mode }
}

/** Há algum movimento possível (célula vazia ou vizinhos iguais)? */
export function hasMoves(tiles: Tile[]): boolean {
  if (emptyCells(tiles).length > 0) return true
  return tiles.some((t) => {
    const right = t.col + 1 < SIZE ? cell(tiles, t.row, t.col + 1) : undefined
    const down = t.row + 1 < SIZE ? cell(tiles, t.row + 1, t.col) : undefined
    return right?.value === t.value || down?.value === t.value
  })
}

/** Linhas/caminhos percorridos nessa direção: listas de células na ordem em que os blocos deslizam. */
function paths(dir: Direction): [number, number][][] {
  const result: [number, number][][] = []
  for (let i = 0; i < SIZE; i++) {
    const path: [number, number][] = []
    for (let j = 0; j < SIZE; j++) {
      if (dir === 'left') path.push([i, j])
      if (dir === 'right') path.push([i, SIZE - 1 - j])
      if (dir === 'up') path.push([j, i])
      if (dir === 'down') path.push([SIZE - 1 - j, i])
    }
    result.push(path)
  }
  return result
}

/**
 * Aplica um movimento. Retorna o novo estado ou `null` se nada se moveu
 * (a jogada não vale e nenhum bloco novo nasce).
 */
export function applyMove(state: GameState, dir: Direction): GameState | null {
  const moved: Tile[] = []
  let changed = false
  let gained = 0

  for (const path of paths(dir)) {
    // blocos do caminho, na ordem em que deslizam
    const line = path.map(([r, c]) => cell(state.tiles, r, c)).filter((t): t is Tile => !!t)
    let target = 0 // próxima posição livre do caminho
    let skip = false // o bloco recém-fundido não pode fundir de novo nesta jogada
    for (const tile of line) {
      const last = moved[moved.length - 1]
      const lastInPath = last && path.some(([r, c]) => r === last.row && c === last.col)
      if (lastInPath && !skip && last.value === tile.value) {
        last.value *= 2
        last.justMerged = true
        gained += last.value
        skip = true
        changed = true
        continue
      }
      const [r, c] = path[target]
      if (r !== tile.row || c !== tile.col) changed = true
      moved.push({ ...tile, row: r, col: c, isNew: false, justMerged: false })
      target++
      skip = false
    }
  }

  if (!changed) return null

  const tiles = spawn(moved.map((t) => ({ ...t, isNew: false })))
  const won = state.won || (state.mode === 'normal' && tiles.some((t) => t.value >= GOAL))
  return { ...state, tiles, score: state.score + gained, won, over: !hasMoves(tiles) }
}
