import type { CSSProperties } from 'react'
import type { Taxon } from '../api'
import { categoryOf } from '../categories'
import { displayName, entryNumber, formatNumber, riskLabel } from '../format'

interface Props {
  /** Sem `count`, a espécie é de fora da região (resultado da busca mundial). */
  entry: { taxon: Taxon; count?: number }
  /** Posição no ranking regional; ausente para espécies de fora da região. */
  number?: number
  seen: boolean
  onOpen: () => void
  onToggleSeen: () => void
}

export function SpeciesCard({ entry, number, seen, onOpen, onToggleSeen }: Props) {
  const { taxon, count } = entry
  const category = categoryOf(taxon)
  const risk = riskLabel(taxon)
  const photo = taxon.default_photo?.medium_url ?? taxon.default_photo?.square_url

  return (
    <article className="card" style={{ '--c': category.color } as CSSProperties}>
      <a className="card-link" href={`#/especie/${taxon.id}`} onClick={onOpen}>
        <div className="card-photo">
          {photo ? (
            <img src={photo} alt="" loading="lazy" />
          ) : (
            <span className="card-nophoto" aria-hidden="true">
              {category.emoji}
            </span>
          )}
          {number != null && <span className="card-number">{entryNumber(number)}</span>}
          {risk && <span className="card-risk">⚠ {risk}</span>}
        </div>
        <div className="card-body">
          <h3>{displayName(taxon)}</h3>
          <p className="sci">{taxon.name}</p>
          <div className="card-meta">
            <span className="tag">
              {category.emoji} {category.label}
            </span>
            {count != null ? (
              <span className="card-count" title="Registros na região">
                {formatNumber(count)}×
              </span>
            ) : (
              <span className="card-count" title="Sem registros na sua região">
                🌍
              </span>
            )}
          </div>
        </div>
      </a>
      <button
        className={`seen-toggle${seen ? ' is-seen' : ''}`}
        onClick={onToggleSeen}
        aria-pressed={seen}
        aria-label={seen ? 'Desmarcar como avistado' : 'Marcar como avistado'}
        title={seen ? 'Avistado' : 'Marcar como avistado'}
      >
        ✓
      </button>
    </article>
  )
}
