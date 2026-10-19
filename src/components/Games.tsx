import { useState, type CSSProperties } from 'react'
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

/** Tela "Jogos": novos jogos entram na lista acima. */
export function Games({ place, radius }: { place: Place; radius: number }) {
  const [openGame, setOpenGame] = useState<string | null>(null)
  const game = GAMES.find((g) => g.id === openGame)

  if (game) {
    return (
      <section>
        <button className="link-btn" onClick={() => setOpenGame(null)}>
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
        <button key={game.id} className="game-card" onClick={() => setOpenGame(game.id)}>
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
