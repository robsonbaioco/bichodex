// Modo trilha: durante uma caminhada, a pessoa toca nas espécies que vai encontrando (lista de toque rápido com
// as mais prováveis da região) e, ao encerrar, ganha um resumo em texto para compartilhar. Aberto pelo App.tsx,
// que guarda a trilha em andamento no localStorage (chave "trail") para ela sobreviver a minimizar ou fechar o
// app; tocar numa espécie também a marca como avistada (toggleTrail no App). Não chama API.

import { useEffect, useMemo, useState } from 'react'
import type { SpeciesCount, Taxon } from '../api'
import { categoryOf } from '../categories'
import { displayName } from '../format'
import { SITE_URL } from '../shareCard'

/** Trilha em andamento, como fica salva pelo App. */
export interface TrailState {
  /** Início da trilha (milissegundos desde a época). */
  start: number
  /** Nome do local no momento em que a trilha começou. */
  place: string
  /** Espécies encontradas, na ordem dos toques; o nome é guardado já pronto para o resumo. */
  found: { id: number; name: string }[]
}

interface Props {
  trail: TrailState
  /** Espécies mais prováveis na região, da mais para a menos registrada. */
  items: SpeciesCount[]
  /** Inclui ou tira a espécie da trilha. */
  onToggle: (taxon: Taxon) => void
  /** Fecha a tela mantendo a trilha em andamento. */
  onMinimize: () => void
  /** Fecha o resumo e descarta a trilha. */
  onFinish: () => void
}

/** Duração em "mm:ss" ou, passando de uma hora, "h:mm:ss". */
function clock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const pad = (n: number) => String(n).padStart(2, '0')
  const hours = Math.floor(total / 3600)
  return `${hours ? `${hours}:` : ''}${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`
}

/** Minúsculas e sem acentos, para o filtro achar "sabia" em "Sabiá". */
const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/**
 * Modo trilha: lista de toque rápido com as espécies prováveis e, no fim, um resumo para compartilhar.
 * Não fecha tocando fora nem com Esc, para não interromper a trilha sem querer: só minimizar ou encerrar.
 */
export function Trail({ trail, items, onToggle, onMinimize, onFinish }: Props) {
  const [now, setNow] = useState(Date.now)
  const [query, setQuery] = useState('')
  /** Momento em que a pessoa encerrou; não é salvo, então reabrir o app volta para a trilha em andamento. */
  const [ended, setEnded] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  // Relógio: atualiza a cada segundo até a trilha ser encerrada. A duração sai sempre de `start`, então o
  // tempo continua contando com a tela minimizada ou o app fechado.
  useEffect(() => {
    if (ended != null) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [ended])

  const foundIds = useMemo(() => new Set(trail.found.map((f) => f.id)), [trail.found])
  // filtro por nome popular ou científico; no máximo 80 itens para a lista continuar leve no celular
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

  /** Compartilha o resumo pela Web Share API; sem ela (desktop), copia para a área de transferência. */
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
                🏁 Encerrar trilha
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
              {copied ? '✓ Resumo copiado' : '📤 Compartilhar resumo'}
            </button>
            <button className="btn btn-lg" onClick={onFinish}>
              ✕ Fechar
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
