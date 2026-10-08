import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchDailyCandidates, type Place, type Taxon } from '../api'
import { displayName } from '../format'
import { applyMove, newGame, SIZE, GOAL, type Direction, type Mode, type GameState } from '../game2048'
import { load, save } from '../storage'

interface Best {
  score: number
  maxTile: number
}

const DIRS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
  W: 'up',
  S: 'down',
  A: 'left',
  D: 'right',
}

/** Cor do bloco conforme o valor, do mais calmo ao mais vibrante. */
const TILE_COLORS: Record<number, string> = {
  2: '#eee4da',
  4: '#ede0c8',
  8: '#f2b179',
  16: '#f59563',
  32: '#f67c5f',
  64: '#f65e3b',
  128: '#edcf72',
  256: '#edcc61',
  512: '#edc850',
  1024: '#edc53f',
  2048: '#edc22e',
}

function tileColor(value: number): string {
  return TILE_COLORS[value] ?? '#3c3a32'
}

export function Game2048({ place, radius }: { place: Place; radius: number }) {
  const [mode, setMode] = useState<Mode | null>(null)
  const [game, setGame] = useState<GameState | null>(null)
  const [animals, setAnimals] = useState<Taxon[]>([])
  const [best, setBest] = useState<Best>(() => load('game2048', { score: 0, maxTile: 0 }))
  /** Animal (foto + nome) fixo para cada valor de bloco: blocos com o mesmo número mostram o mesmo animal. */
  const byValue = useRef(new Map<number, { url: string; name: string }>())
  const [photosReady, setPhotosReady] = useState(true)
  const board = useRef<HTMLDivElement>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  // O jogo só aceita animais do raio que o usuário já tinha selecionado no app.
  useEffect(() => {
    const controller = new AbortController()
    fetchDailyCandidates(place, radius, controller.signal)
      .then(setAnimals)
      .catch(() => {})
    return () => controller.abort()
  }, [place, radius])

  useEffect(() => save('game2048', best), [best])

  // Sorteia um animal para cada valor de bloco e pré-carrega as fotos,
  // para que o bloco já apareça com a foto, sem atraso de carregamento.
  useEffect(() => {
    const map = new Map<number, { url: string; name: string }>()
    const pool = animals
      .filter((a) => a.default_photo?.medium_url || a.default_photo?.square_url)
      .map((a) => ({ url: a.default_photo!.medium_url ?? a.default_photo!.square_url!, name: displayName(a) }))
      .sort(() => Math.random() - 0.5)
    if (!pool.length) {
      byValue.current = map
      setPhotosReady(true)
      return
    }
    const urls = new Set<string>()
    for (let value = 2; value <= GOAL; value *= 2) {
      const pick = pool[(Math.log2(value) - 1) % pool.length]
      map.set(value, pick)
      urls.add(pick.url)
    }
    byValue.current = map
    let pending = urls.size
    setPhotosReady(false)
    const done = () => {
      pending -= 1
      if (pending <= 0) setPhotosReady(true)
    }
    for (const url of urls) {
      const img = new Image()
      img.onload = done
      img.onerror = done
      img.src = url
    }
  }, [animals])

  function animalFor(value: number): { url: string; name: string } | undefined {
    const known = byValue.current.get(value)
    if (known) return known
    if (!byValue.current.size) return undefined
    // Valores acima de 2048 reutilizam os animais já sorteados.
    const all = [...byValue.current.values()]
    return all[(Math.log2(value) - 1) % all.length]
  }

  const start = useCallback((m: Mode) => {
    setMode(m)
    setGame(newGame(m))
  }, [])

  const move = useCallback(
    (dir: Direction) => {
      setGame((current) => {
        if (!current || current.over) return current
        if (current.won && current.mode === 'normal') return current
        const next = applyMove(current, dir)
        if (!next) return current
        const maxTile = Math.max(...next.tiles.map((t) => t.value))
        setBest((b) => (next.score > b.score || maxTile > b.maxTile ? { score: Math.max(b.score, next.score), maxTile: Math.max(b.maxTile, maxTile) } : b))
        return next
      })
    },
    [],
  )

  useEffect(() => {
    if (!game) return
    const onKey = (e: KeyboardEvent) => {
      const dir = DIRS[e.key]
      if (!dir) return
      e.preventDefault()
      move(dir)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [game, move])

  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 1) touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  function onTouchEnd(e: React.TouchEvent) {
    const startPoint = touchStart.current
    touchStart.current = null
    if (!startPoint || e.changedTouches.length !== 1) return
    const dx = e.changedTouches[0].clientX - startPoint.x
    const dy = e.changedTouches[0].clientY - startPoint.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up')
  }

  const maxTile = useMemo(() => (game ? Math.max(0, ...game.tiles.map((t) => t.value)) : 0), [game])
  const cells = useMemo(() => Array.from({ length: SIZE * SIZE }, (_, i) => i), [])

  if (!mode || !game) {
    return (
      <div className="g2048-intro">
        <h2>🧩 Bicho 2048</h2>
        <p>
          O clássico 2048 com os animais da sua região: deslize os blocos para juntar números iguais. Cada bloco traz a
          foto de um animal registrado dentro do seu raio, em marca-d'água.
        </p>
        {animals.length === 0 && <p className="fineprint">Buscando animais da região para ilustrar os blocos…</p>}
        {animals.length > 0 && !photosReady && <p className="fineprint">Carregando as fotos dos animais…</p>}
        <div className="g2048-modes">
          <button className="btn btn-primary btn-lg" onClick={() => start('normal')} disabled={!photosReady}>
            🏆 Modo normal
            <small>Vença ao chegar em 2048</small>
          </button>
          <button className="btn btn-lg" onClick={() => start('infinito')} disabled={!photosReady}>
            ♾️ Modo infinito
            <small>Continue até não haver mais movimentos</small>
          </button>
        </div>
        {(best.score > 0 || best.maxTile > 0) && (
          <p className="fineprint">
            Seu recorde: {best.score.toLocaleString('pt-BR')} pontos · maior bloco {best.maxTile}
          </p>
        )}
      </div>
    )
  }

  const finished = game.over || (game.won && game.mode === 'normal')

  return (
    <div className="g2048">
      <div className="g2048-bar">
        <div className="g2048-score">
          <span>Pontos</span>
          <strong>{game.score.toLocaleString('pt-BR')}</strong>
        </div>
        <div className="g2048-score">
          <span>Maior bloco</span>
          <strong>{maxTile}</strong>
        </div>
        <span className="g2048-mode-tag">{mode === 'normal' ? '🏆 Normal' : '♾️ Infinito'}</span>
        <button className="btn" onClick={() => start(mode)}>
          ↻ Novo jogo
        </button>
        <button className="btn" onClick={() => { setMode(null); setGame(null) }}>
          Trocar modo
        </button>
      </div>

      <div
        ref={board}
        className="g2048-board"
        role="application"
        aria-label="Jogo 2048 com animais da região. Use as setas do teclado ou deslize na tela."
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {cells.map((i) => (
          <div key={i} className="g2048-cell" />
        ))}
        {game.tiles.map((tile) => {
          const info = animalFor(tile.value)
          return (
            <div
              key={tile.id}
              className={`g2048-tile${tile.isNew ? ' is-new' : ''}${tile.justMerged ? ' is-merged' : ''}`}
              style={{
                top: `calc(${tile.row} * (var(--g2048-cell) + var(--g2048-gap)))`,
                left: `calc(${tile.col} * (var(--g2048-cell) + var(--g2048-gap)))`,
                background: tileColor(tile.value),
                color: tile.value <= 4 ? '#776e65' : '#f9f6f2',
              }}
              title={info?.name}
            >
              {info && <span className="g2048-photo" style={{ backgroundImage: `url(${info.url})` }} aria-hidden="true" />}
              <span className="g2048-value">{tile.value}</span>
            </div>
          )
        })}

        {finished && (
          <div className="g2048-over" role="alert">
            <strong>{game.won && game.mode === 'normal' ? '🎉 Você chegou em 2048!' : '😵 Fim de jogo!'}</strong>
            <p>
              {game.score.toLocaleString('pt-BR')} pontos · maior bloco {maxTile}
            </p>
            {game.won && game.mode === 'normal' && (
              <button className="btn" onClick={() => setGame({ ...game, mode: 'infinito' })}>
                ♾️ Continuar no infinito
              </button>
            )}
            <button className="btn btn-primary" onClick={() => start(mode)}>
              ↻ Jogar de novo
            </button>
          </div>
        )}
      </div>

      <div className="g2048-pad" aria-hidden={false}>
        <button className="btn" onClick={() => move('up')} aria-label="Mover para cima">↑</button>
        <div>
          <button className="btn" onClick={() => move('left')} aria-label="Mover para a esquerda">←</button>
          <button className="btn" onClick={() => move('down')} aria-label="Mover para baixo">↓</button>
          <button className="btn" onClick={() => move('right')} aria-label="Mover para a direita">→</button>
        </div>
      </div>

      <p className="fineprint g2048-tip">
        Setas do teclado, deslize na tela ou os botões acima. Fotos: animais registrados a até {radius} km de{' '}
        {place.label} (iNaturalist).
      </p>
    </div>
  )
}
