import { useEffect, useState, type CSSProperties } from 'react'
import type { Place } from '../api'
import { Game2048 } from './Game2048'

type GameInfo = {
  id: string
  emoji: string
  name: string
  description: string
  /** Jogos estáticos em public/jogos/ (gerados pelo projeto biodiversigames), abertos num iframe. */
  src?: string
}

const GAMES: GameInfo[] = [
  {
    id: '2048',
    emoji: '🧩',
    name: 'Bicho 2048',
    description: 'Junte números iguais até chegar em 2048, com fotos dos animais da sua região nos blocos.',
  },
  {
    id: 'parentes',
    emoji: '🌳',
    name: 'Parentes',
    description: 'Desafio diário: ordene 5 espécies da mais à menos aparentada com a espécie do dia.',
    src: 'jogos/parentes/index.html',
  },
  {
    id: 'conexoes-selvagens',
    emoji: '🔗',
    name: 'Conexões Selvagens',
    description: 'Desafio diário: separe 16 seres vivos em 4 grupos escondidos. Cuidado com as pegadinhas!',
    src: 'jogos/conexoes-selvagens/index.html',
  },
  {
    id: 'onde-vive',
    emoji: '🗺️',
    name: 'Onde Vive?',
    description: 'Desafio diário: marque no mapa onde vive a espécie do dia, com distância e direção a cada palpite.',
    src: 'jogos/onde-vive/index.html',
  },
]

const FRAME_STYLE: CSSProperties = {
  display: 'block',
  width: '100%',
  height: 'calc(100dvh - 11rem)',
  minHeight: '34rem',
  marginTop: '0.5rem',
  border: 'var(--bw) solid var(--line)',
  borderRadius: 'var(--rad)',
  background: 'var(--surface)',
}

/** Jogo aberto pelo endereço (#/jogos/<id>), para que dê para mandar o link direto de um jogo. */
function gameFromHash(): string | null {
  return location.hash.match(/^#\/jogos\/([\w-]+)$/)?.[1] ?? null
}

/** Tela "Jogos": novos jogos entram na lista acima. */
export function Games({ place, radius }: { place: Place; radius: number }) {
  const [openGame, setOpenGame] = useState<string | null>(gameFromHash)
  const game = GAMES.find((g) => g.id === openGame)

  useEffect(() => {
    const onHashChange = () => setOpenGame(gameFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const open = (id: string | null) => {
    location.hash = id ? `#/jogos/${id}` : '#/jogos'
  }

  if (game) {
    return (
      <section>
        <button className="link-btn" onClick={() => open(null)}>
          ← Todos os jogos
        </button>
        {game.src ? (
          <iframe style={FRAME_STYLE} src={game.src} title={game.name} />
        ) : (
          <Game2048 place={place} radius={radius} />
        )}
      </section>
    )
  }

  return (
    <section className="games-list">
      <h2>🎮 Jogos</h2>
      {GAMES.map((game) => (
        <button key={game.id} className="game-card" onClick={() => open(game.id)}>
          <span className="game-emoji" aria-hidden="true">
            {game.emoji}
          </span>
          <span>
            <strong>{game.name}</strong>
            <small>{game.description}</small>
          </span>
          <span aria-hidden="true">▸</span>
        </button>
      ))}
    </section>
  )
}
