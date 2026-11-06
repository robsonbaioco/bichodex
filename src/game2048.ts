// Lógica do 2048 (baseada no jogo clássico de Gabriele Cirulli):
// tabuleiro 4×4; cada jogada desliza os blocos numa direção e funde pares iguais
// uma única vez por jogada; a seguir nasce um bloco 2 (90%) ou 4 (10%) numa célula vazia.
// Só regras, sem React nem rede: quem desenha, lê o teclado/toque e guarda o recorde é components/Game2048.tsx.
// O estado é imutável: cada jogada devolve um GameState novo.

export type Direction = 'up' | 'down' | 'left' | 'right'
/** Normal: o jogo para ao chegar em 2048. Infinito: segue até travar. */
export type Mode = 'normal' | 'infinito'

/** Um bloco do tabuleiro. O `id` acompanha o bloco entre jogadas, para o React animar o deslize. */
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

/** Uma partida. Só as células ocupadas aparecem em `tiles`. */
export interface GameState {
  tiles: Tile[]
  /** Soma dos valores de todas as fusões, como no 2048 original. */
  score: number
  /** Sem movimentos possíveis. */
  over: boolean
  /** Alcançou 2048 no modo normal. */
  won: boolean
  mode: Mode
}

/** Lado do tabuleiro (4×4). */
export const SIZE = 4
/** Valor que vence o modo normal. */
export const GOAL = 2048

/** Contador de ids dos blocos; global ao módulo, só precisa nunca repetir. */
let nextId = 1

/** Bloco que está na célula (linha, coluna), se houver. */
function cell(tiles: Tile[], row: number, col: number): Tile | undefined {
  return tiles.find((t) => t.row === row && t.col === col)
}

/** Células vazias, como pares [linha, coluna]. */
function emptyCells(tiles: Tile[]): [number, number][] {
  const cells: [number, number][] = []
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) if (!cell(tiles, r, c)) cells.push([r, c])
  return cells
}

/** Põe um bloco novo (2 ou 4) numa célula vazia sorteada; com o tabuleiro cheio, devolve igual. */
function spawn(tiles: Tile[]): Tile[] {
  const free = emptyCells(tiles)
  if (!free.length) return tiles
  const [row, col] = free[Math.floor(Math.random() * free.length)]
  const value = Math.random() < 0.9 ? 2 : 4
  return [...tiles, { id: nextId++, value, row, col, isNew: true }]
}

/** Partida nova: tabuleiro com dois blocos sorteados e placar zerado. */
export function newGame(mode: Mode): GameState {
  const tiles = spawn(spawn([]))
  return { tiles, score: 0, over: false, won: false, mode }
}

/** Há algum movimento possível (célula vazia ou vizinhos iguais)? */
export function hasMoves(tiles: Tile[]): boolean {
  if (emptyCells(tiles).length > 0) return true
  // basta olhar o vizinho da direita e o de baixo: os outros dois pares são vistos a partir do outro bloco
  return tiles.some((t) => {
    const right = t.col + 1 < SIZE ? cell(tiles, t.row, t.col + 1) : undefined
    const down = t.row + 1 < SIZE ? cell(tiles, t.row + 1, t.col) : undefined
    return right?.value === t.value || down?.value === t.value
  })
}

/**
 * Linhas/caminhos percorridos nessa direção: listas de células na ordem em que os blocos deslizam.
 * Cada caminho começa na borda para onde os blocos vão (ex.: para a direita, da coluna 3 para a 0),
 * assim a mesma lógica de "encostar e fundir" serve para as quatro direções.
 */
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
      // `moved` junta os blocos de todos os caminhos; o último só conta se já foi posto neste caminho
      const last = moved[moved.length - 1]
      const lastInPath = last && path.some(([r, c]) => r === last.row && c === last.col)
      if (lastInPath && !skip && last.value === tile.value) {
        // funde: o bloco que já estava na frente dobra e fica com o id dele; este bloco some
        // (por isso ele não anima até o destino, simplesmente desaparece)
        last.value *= 2
        last.justMerged = true
        gained += last.value
        skip = true
        changed = true
        continue
      }
      // não fundiu: encosta na próxima posição livre do caminho
      const [r, c] = path[target]
      if (r !== tile.row || c !== tile.col) changed = true
      moved.push({ ...tile, row: r, col: c, isNew: false, justMerged: false })
      target++
      skip = false
    }
  }

  if (!changed) return null

  // `justMerged` fica para a animação de "pop"; o bloco que nasce agora é o único com `isNew`
  const tiles = spawn(moved.map((t) => ({ ...t, isNew: false })))
  // `won` nunca volta a falso: ao "continuar no infinito", o modo muda mas a vitória fica registrada
  const won = state.won || (state.mode === 'normal' && tiles.some((t) => t.value >= GOAL))
  return { ...state, tiles, score: state.score + gained, won, over: !hasMoves(tiles) }
}
