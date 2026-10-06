import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import type { SpeciesCount, Taxon } from '../api'
import { categoryOf } from '../categories'
import { displayName, formatNumber, frequencyLabel } from '../format'

interface Props {
  /** Espécies da região ainda não avistadas, na ordem em que serão mostradas. */
  items: SpeciesCount[]
  onSeen: (taxon: Taxon) => void
  onClose: () => void
}

const SWIPE = 90

/** Baralho de descobertas: uma espécie por vez; arrastar para a direita (ou tocar em "Já vi") marca como avistada. */
export function Deck({ items, onSeen, onClose }: Props) {
  // a fila é fixada na abertura, para não pular cartas conforme as espécies vão sendo marcadas
  const [queue] = useState(items)
  const [index, setIndex] = useState(0)
  const [marked, setMarked] = useState(0)
  const [drag, setDrag] = useState(0)
  const start = useRef<number | null>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') answer(true)
      if (event.key === 'ArrowLeft') answer(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  const entry = queue[index]

  function answer(sawIt: boolean) {
    if (!entry) return
    if (sawIt) {
      onSeen(entry.taxon)
      setMarked((n) => n + 1)
    }
    setDrag(0)
    setIndex((i) => i + 1)
  }

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    start.current = event.clientX
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: PointerEvent) {
    if (start.current != null) setDrag(event.clientX - start.current)
  }

  function onPointerUp() {
    if (start.current == null) return
    start.current = null
    if (Math.abs(drag) >= SWIPE) answer(drag > 0)
    else setDrag(0)
  }

  const category = entry ? categoryOf(entry.taxon) : null
  const photo = entry?.taxon.default_photo?.medium_url ?? entry?.taxon.default_photo?.square_url

  return (
    <div className="overlay" onClick={onClose}>
      <section
        className="sheet deck"
        role="dialog"
        aria-modal="true"
        aria-label="Baralho de descobertas"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="detail-bar">
          <span className="detail-number">Você já viu este?</span>
          {entry && (
            <span className="deck-count">
              {index + 1} de {queue.length}
            </span>
          )}
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </header>

        {entry && category ? (
          <>
            <div className="deck-stage">
              <article
                key={entry.taxon.id}
                className={`deck-card${drag > 30 ? ' is-yes' : drag < -30 ? ' is-no' : ''}`}
                style={
                  {
                    '--c': category.color,
                    transform: `translateX(${drag}px) rotate(${drag / 22}deg)`,
                    transition: start.current == null ? 'transform 0.18s' : 'none',
                  } as CSSProperties
                }
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                <div className="deck-photo">
                  {photo ? (
                    <img src={photo} alt="" draggable={false} />
                  ) : (
                    <span className="card-nophoto" aria-hidden="true">
                      {category.emoji}
                    </span>
                  )}
                </div>
                <div className="deck-body">
                  <h2>{displayName(entry.taxon)}</h2>
                  <p className="sci">{entry.taxon.name}</p>
                  <p className="deck-meta">
                    <span className="tag">
                      {category.emoji} {category.label}
                    </span>
                    <span>
                      {frequencyLabel(entry.count)} · {formatNumber(entry.count)} registros
                    </span>
                  </p>
                </div>
              </article>
            </div>
            <div className="deck-actions">
              <button className="btn btn-lg" onClick={() => answer(false)}>
                Ainda não
              </button>
              <button className="btn btn-primary btn-lg" onClick={() => answer(true)}>
                ✓ Já vi
              </button>
            </div>
          </>
        ) : (
          <div className="sheet-pad deck-end">
            <p className="deck-end-number">{formatNumber(marked)}</p>
            <p>
              {queue.length === 0
                ? 'Não há espécies novas para mostrar nesta lista.'
                : marked === 1
                  ? 'espécie marcada como avistada neste baralho.'
                  : 'espécies marcadas como avistadas neste baralho.'}
            </p>
            <button className="btn btn-primary btn-lg" onClick={onClose}>
              Fechar
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
