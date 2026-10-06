import { useEffect, useState, type CSSProperties } from 'react'
import { fetchTaxon, type Photo, type SpeciesCount, type Taxon, type TaxonDetail } from '../api'
import { categoryOf } from '../categories'
import {
  CONSERVATION,
  RISK_SHORT,
  displayName,
  entryNumber,
  formatNumber,
  frequencyLabel,
  htmlToText,
  type SeenWhere,
} from '../format'

const RANKS: Record<string, string> = {
  kingdom: 'Reino',
  phylum: 'Filo',
  class: 'Classe',
  order: 'Ordem',
  family: 'Família',
  genus: 'Gênero',
}

interface Props {
  id: number
  /** Entrada da lista regional, quando a espécie já foi carregada nela. */
  entry?: SpeciesCount
  number?: number
  maxCount: number
  seen: boolean
  /** Onde foi o avistamento, quando a espécie já está marcada. */
  where?: SeenWhere
  onToggleSeen: (taxon: Taxon) => void
  /** Ausente enquanto não há local definido, já que o cartão de conquista mostra onde foi o avistamento. */
  onShare?: (taxon: Taxon) => void
  onClose: () => void
}

export function SpeciesDetail({ id, entry, number, maxCount, seen, where, onToggleSeen, onShare, onClose }: Props) {
  const [detail, setDetail] = useState<TaxonDetail | null>(null)
  const [failed, setFailed] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setDetail(null)
    setFailed(false)
    setPhotoIndex(0)
    fetchTaxon(id, controller.signal)
      .then(setDetail)
      .catch((error) => {
        if (error.name !== 'AbortError') setFailed(true)
      })
    return () => controller.abort()
  }, [id])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const taxon = detail ?? entry?.taxon
  const category = taxon ? categoryOf(taxon) : null
  const photos: Photo[] = detail?.taxon_photos?.length
    ? detail.taxon_photos.slice(0, 6).map((p) => p.photo)
    : taxon?.default_photo
      ? [taxon.default_photo]
      : []
  const photo = photos[photoIndex] ?? photos[0]
  const summary = detail?.wikipedia_summary ? htmlToText(detail.wikipedia_summary) : ''
  const status = detail?.conservation_status?.status?.toUpperCase()
  const lineage = (detail?.ancestors ?? []).filter((a) => RANKS[a.rank])

  return (
    <div className="overlay" onClick={onClose}>
      <section
        className="sheet detail"
        role="dialog"
        aria-modal="true"
        aria-label={taxon ? displayName(taxon) : 'Espécie'}
        style={{ '--c': category?.color ?? 'var(--brand)' } as CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="detail-bar">
          <span className="detail-number">{number ? entryNumber(number) : 'Ficha'}</span>
          {category && (
            <span className="tag">
              {category.emoji} {category.label}
            </span>
          )}
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </header>

        {!taxon ? (
          <p className="notice">{failed ? 'Não foi possível carregar esta espécie.' : 'Carregando…'}</p>
        ) : (
          <>
            <div className="detail-photo">
              {photo ? (
                <img src={photo.medium_url ?? photo.square_url} alt={displayName(taxon)} />
              ) : (
                <span className="card-nophoto" aria-hidden="true">
                  {category?.emoji}
                </span>
              )}
            </div>
            <div className="detail-sheet">
            {photos.length > 1 && (
              <div className="thumbs">
                {photos.map((p, i) => (
                  <button
                    key={i}
                    className={i === photoIndex ? 'is-active' : ''}
                    onClick={() => setPhotoIndex(i)}
                    aria-label={`Foto ${i + 1}`}
                  >
                    <img src={p.square_url} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
            {photo?.attribution && <p className="credit">Foto: {photo.attribution}</p>}

            <div className="detail-body">
              <h2>{displayName(taxon)}</h2>
              <p className="sci">{taxon.name}</p>

              <div className="seen-actions">
                <button
                  className={`btn btn-seen${seen ? ' is-seen' : ''}`}
                  onClick={() => onToggleSeen(taxon)}
                  aria-pressed={seen}
                >
                  {seen ? (where === 'zoo' ? '✓ Avistado no zoológico' : '✓ Avistado') : 'Marcar como avistado'}
                </button>
                {seen && onShare && (
                  <button className="btn" onClick={() => onShare(taxon)}>
                    Compartilhar conquista
                  </button>
                )}
              </div>

              <dl className="attrs">
                <div>
                  <dt>Raridade</dt>
                  <dd>{entry ? frequencyLabel(entry.count) : 'Fora da região'}</dd>
                </div>
                <div>
                  <dt>Risco</dt>
                  <dd>{status ? (RISK_SHORT[status] ?? status) : 'Sem avaliação'}</dd>
                </div>
                <div>
                  <dt>No mundo</dt>
                  <dd>{taxon.observations_count != null ? formatNumber(taxon.observations_count) : '…'}</dd>
                </div>
              </dl>

              <dl className="stats">
                {entry && (
                  <div className="stat stat-wide">
                    <dt>Na sua região</dt>
                    <dd>
                      {frequencyLabel(entry.count)} · {formatNumber(entry.count)} registros
                      <span className="meter" aria-hidden="true">
                        <span
                          style={{
                            width: `${Math.max(4, (Math.log(entry.count + 1) / Math.log(maxCount + 1)) * 100)}%`,
                          }}
                        />
                      </span>
                    </dd>
                  </div>
                )}
                {status && (
                  <div className="stat stat-wide">
                    <dt>Conservação</dt>
                    <dd>
                      {CONSERVATION[status] ?? detail?.conservation_status?.status_name ?? status}
                      {CONSERVATION[status] && ` (${status})`}
                    </dd>
                  </div>
                )}
              </dl>

              {summary && (
                <>
                  <h3>Sobre</h3>
                  <p className="summary">{summary}</p>
                </>
              )}

              {lineage.length > 0 && (
                <>
                  <h3>Classificação</h3>
                  <dl className="lineage">
                    {lineage.map((ancestor) => (
                      <div key={ancestor.id}>
                        <dt>{RANKS[ancestor.rank]}</dt>
                        <dd>
                          <i>{ancestor.name}</i>
                          {ancestor.preferred_common_name && ` · ${ancestor.preferred_common_name}`}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}

              {failed && <p className="notice">Não foi possível carregar os detalhes completos.</p>}

              <div className="links">
                <a href={`https://www.inaturalist.org/taxa/${taxon.id}`} target="_blank" rel="noreferrer">
                  Ver no iNaturalist ↗
                </a>
                <a
                  href={`https://pt.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(taxon.name)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Wikipédia ↗
                </a>
              </div>
            </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
