import { useEffect, useMemo, useState } from 'react'
import type { SpeciesCount, Taxon } from '../api'
import { categoryOf } from '../categories'
import { displayName } from '../format'
import { SITE_URL } from '../shareCard'

export interface TrailState {
  /** Início da trilha (milissegundos desde a época). */
  start: number
  place: string
  found: { id: number; name: string }[]
}

interface Props {
  trail: TrailState
  /** Espécies mais prováveis na região, da mais para a menos registrada. */
  items: SpeciesCount[]
  onToggle: (taxon: Taxon) => void
  /** Fecha a tela mantendo a trilha em andamento. */
  onMinimize: () => void
  onFinish: () => void
}

function clock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const pad = (n: number) => String(n).padStart(2, '0')
  const hours = Math.floor(total / 3600)
  return `${hours ? `${hours}:` : ''}${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`
}

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/** Modo trilha: lista de toque rápido com as espécies prováveis e, no fim, um resumo para compartilhar. */
export function Trail({ trail, items, onToggle, onMinimize, onFinish }: Props) {
  const [now, setNow] = useState(Date.now)
  const [query, setQuery] = useState('')
  const [ended, setEnded] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (ended != null) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [ended])

  const foundIds = useMemo(() => new Set(trail.found.map((f) => f.id)), [trail.found])
  const visible = useMemo(() => {
    const term = normalize(query.trim())
    return items
      .filter((e) => !term || normalize(`${e.taxon.preferred_common_name ?? ''} ${e.taxon.name}`).includes(term))
      .slice(0, 80)
  }, [items, query])

  const duration = clock((ended ?? now) - trail.start)
  const summary = [
    `Trilha em ${trail.place}: ${trail.found.length} ${trail.found.length === 1 ? 'espécie avistada' : 'espécies avistadas'} em ${duration}.`,
    ...trail.found.map((f) => `• ${f.name}`),
    `Registrado no Bichodex: ${SITE_URL}`,
  ].join('\n')

  async function share() {
    if (navigator.share) {
      await navigator.share({ text: summary }).catch(() => {})
      return
    }
    await navigator.clipboard
      .writeText(summary)
      .then(() => setCopied(true))
      .catch(() => {})
  }

  return (
    <div className="overlay">
      <section className="sheet trail" role="dialog" aria-modal="true" aria-label="Modo trilha">
        <header className="detail-bar">
          <span className="detail-number">🥾 Trilha · {duration}</span>
          <span className="deck-count">{trail.found.length} avistadas</span>
          {ended == null && (
            <button className="icon-btn" onClick={onMinimize} aria-label="Minimizar" title="Minimizar (a trilha continua)">
              ▾
            </button>
          )}
        </header>

        {ended == null ? (
          <>
            <div className="trail-search">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filtrar por nome…"
                aria-label="Filtrar por nome"
              />
            </div>
            <ul className="trail-list">
              {visible.map((entry) => {
                const found = foundIds.has(entry.taxon.id)
                const photo = entry.taxon.default_photo?.square_url
                return (
                  <li key={entry.taxon.id}>
                    <button className={found ? 'is-found' : ''} onClick={() => onToggle(entry.taxon)} aria-pressed={found}>
                      {photo ? (
                        <img src={photo} alt="" loading="lazy" />
                      ) : (
                        <span className="trail-nophoto" aria-hidden="true">
                          {categoryOf(entry.taxon).emoji}
                        </span>
                      )}
                      <span className="trail-name">
                        <b>{displayName(entry.taxon)}</b>
                        <span className="sci">{entry.taxon.name}</span>
                      </span>
                      <span className="trail-mark" aria-hidden="true">
                        {found ? '✓' : '+'}
                      </span>
                    </button>
                  </li>
                )
              })}
              {visible.length === 0 && <li className="notice">Nenhuma espécie com esse nome na lista da região.</li>}
            </ul>
            <div className="trail-actions">
              <button className="btn btn-primary btn-lg" onClick={() => setEnded(Date.now())}>
                Encerrar trilha
              </button>
            </div>
          </>
        ) : (
          <div className="sheet-pad trail-summary">
            <p className="deck-end-number">{trail.found.length}</p>
            <p>
              {trail.found.length === 1 ? 'espécie avistada' : 'espécies avistadas'} em {duration}, em {trail.place}.
            </p>
            {trail.found.length > 0 && (
              <ul>
                {trail.found.map((f) => (
                  <li key={f.id}>{f.name}</li>
                ))}
              </ul>
            )}
            <button className="btn btn-primary btn-lg" onClick={share}>
              {copied ? 'Resumo copiado' : 'Compartilhar resumo'}
            </button>
            <button className="btn btn-lg" onClick={onFinish}>
              Fechar
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
