import { useState } from 'react'
import type { Place } from '../api'
import { Game2048 } from './Game2048'

const GAMES = [
  {
    id: '2048',
    emoji: '🧩',
    name: 'Bicho 2048',
    description: 'Junte números iguais até chegar em 2048, com fotos dos animais da sua região nos blocos.',
  },
]

/** Tela "Jogos": por enquanto com um único jogo; novos entram na lista acima. */
export function Games({ place, radius }: { place: Place; radius: number }) {
  const [openGame, setOpenGame] = useState<string | null>(null)

  if (openGame === '2048') {
    return (
      <section>
        <button className="link-btn" onClick={() => setOpenGame(null)}>
          ← Todos os jogos
        </button>
        <Game2048 place={place} radius={radius} />
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
