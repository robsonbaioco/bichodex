import { useEffect, useState, type CSSProperties } from 'react'
import { fetchTaxaByIds, type Place, type Taxon } from '../api'
import { categoryOf } from '../categories'
import { displayName } from '../format'
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
    id: 'colorir',
    emoji: '🖍️',
    name: 'Colorir os bichos',
    description: 'Pinte na tela ou imprima em preto e branco um desenho de cada bicho que você já avistou.',
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

/** Escolha de qual bicho avistado vai para a página de colorir. */
function ColoringPicker({ seen, onColor }: { seen: number[]; onColor: (taxon: Taxon) => void }) {
  const [taxa, setTaxa] = useState<Taxon[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!seen.length) return setTaxa([])
    const controller = new AbortController()
    setFailed(false)
    fetchTaxaByIds(seen, controller.signal)
      .then((found) => {
        // os mais recentes primeiro
        const order = new Map(seen.map((id, i) => [id, i]))
        setTaxa(found.sort((a, b) => (order.get(b.id) ?? 0) - (order.get(a.id) ?? 0)))
      })
      .catch((error) => error.name !== 'AbortError' && setFailed(true))
    return () => controller.abort()
  }, [seen])

  if (failed) return <p className="notice notice-error">Não foi possível carregar os seus bichos. Verifique sua conexão.</p>
  if (!taxa) return <p className="notice">Carregando os bichos que você avistou…</p>
  if (!taxa.length)
    return (
      <p className="notice">
        Você ainda não marcou nenhum bicho como avistado. Marque um em Explorar e volte aqui para colorir!
      </p>
    )
  return (
    <>
      <p className="fineprint">Escolha um bicho. A foto vira um desenho para pintar aqui ou imprimir.</p>
      <div className="coloring-pick">
        {taxa.map((taxon) => {
          const photo = taxon.default_photo?.square_url
          return (
            <button key={taxon.id} className="coloring-pick-item" onClick={() => onColor(taxon)}>
              {photo ? <img src={photo} alt="" loading="lazy" /> : <span aria-hidden="true">{categoryOf(taxon).emoji}</span>}
              <span>{displayName(taxon)}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}

interface Props {
  place: Place
  radius: number
  /** Espécies avistadas, para a página de colorir. */
  seen: number[]
  onColor: (taxon: Taxon) => void
}

/** Tela "Jogos": novos jogos entram na lista acima. */
export function Games({ place, radius, seen, onColor }: Props) {
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
        ) : game.id === 'colorir' ? (
          <>
            <h2>🖍️ Colorir os bichos</h2>
            <ColoringPicker seen={seen} onColor={onColor} />
          </>
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
