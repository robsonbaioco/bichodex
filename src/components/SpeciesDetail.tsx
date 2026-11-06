// Ficha completa de uma espécie, aberta por cima da lista (rota #/especie/<id>). Quem monta é o App.tsx, que
// passa se a espécie já foi avistada e os callbacks de marcar, compartilhar (ShareAchievement) e colorir
// (Coloring). Busca os detalhes no iNaturalist via fetchTaxon (api.ts); não guarda nada por conta própria.
// Também exporta o campo de data do avistamento (SeenAtField), reaproveitado no cartão de conquista.

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
  localDateTime,
  type SeenWhere,
} from '../format'

/** Níveis taxonômicos mostrados em "Classificação", com o nome em português; os demais são ignorados. */
const RANKS: Record<string, string> = {
  kingdom: 'Reino',
  phylum: 'Filo',
  class: 'Classe',
  order: 'Ordem',
  family: 'Família',
  genus: 'Gênero',
}

/**
 * Dia e horário em que a pessoa viu a espécie. Já vem com o momento da marcação, mas dá para voltar no
 * tempo e registrar um bicho visto antes (não aceita datas futuras). `value`/`onChange` usam o formato do
 * input datetime-local (AAAA-MM-DDTHH:MM, horário local); quem guarda o valor é o App.
 */
export function SeenAtField({ value, onChange }: { value?: string; onChange: (value: string) => void }) {
  return (
    <label className="seen-at">
      <span>📅 Quando você viu?</span>
      <input
        type="datetime-local"
        value={value ?? ''}
        max={localDateTime(new Date())}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

interface Props {
  /** ID do táxon no iNaturalist. */
  id: number
  /** Entrada da lista regional, quando a espécie já foi carregada nela. */
  entry?: SpeciesCount
  /** Posição no ranking regional (vira o "Nº 001" do cabeçalho); ausente fora da região. */
  number?: number
  /** Maior contagem de registros da lista regional, usada como 100% da barrinha de frequência. */
  maxCount: number
  seen: boolean
  /** Onde foi o avistamento, quando a espécie já está marcada. */
  where?: SeenWhere
  /** Data e hora do avistamento (AAAA-MM-DDTHH:MM). */
  seenAt?: string
  onSeenAtChange: (value: string) => void
  onToggleSeen: (taxon: Taxon) => void
  /** Ausente enquanto não há local definido, já que o cartão de conquista mostra onde foi o avistamento. */
  onShare?: (taxon: Taxon) => void
  /** Abre a página de colorir da espécie. */
  onColor?: (taxon: Taxon) => void
  onClose: () => void
}

/**
 * Ficha da espécie em folha modal: fotos (até 6, com miniaturas), botões de avistamento, raridade, risco,
 * resumo da Wikipédia e classificação. Mostra já o que veio na lista (`entry`) e completa quando chega o
 * fetchTaxon. Fecha com Esc, com o ✕ ou tocando fora.
 */
export function SpeciesDetail({
  id,
  entry,
  number,
  maxCount,
  seen,
  where,
  seenAt,
  onSeenAtChange,
  onToggleSeen,
  onShare,
  onColor,
  onClose,
}: Props) {
  const [detail, setDetail] = useState<TaxonDetail | null>(null)
  const [failed, setFailed] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)

  // Busca os detalhes (fotos, Wikipédia, conservação, ancestrais) a cada troca de espécie; cancela a anterior.
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

  // Esc fecha a ficha. As telas abertas por cima (cartão, colorir) escutam na fase de captura e param o evento.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const taxon = detail ?? entry?.taxon
  const category = taxon ? categoryOf(taxon) : null
  // galeria do iNaturalist quando os detalhes chegam; antes disso (ou se falhar), só a foto de capa
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
                  {seen ? (where === 'zoo' ? '✓ Avistado no zoológico' : '✓ Avistado') : '👁️ Marcar como avistado'}
                </button>
                {seen && onShare && (
                  <button className="btn" onClick={() => onShare(taxon)}>
                    📤 Compartilhar conquista
                  </button>
                )}
                {seen && onColor && (
                  <button className="btn" onClick={() => onColor(taxon)}>
                    🖍️ Colorir ou imprimir
                  </button>
                )}
              </div>
              {seen && <SeenAtField value={seenAt} onChange={onSeenAtChange} />}

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
                      {/* escala logarítmica: senão só as campeãs de registros apareceriam; mínimo de 4% para a barra não sumir */}
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
                  🌐 Ver no iNaturalist ↗
                </a>
                <a
                  href={`https://pt.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(taxon.name)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  📚 Wikipédia ↗
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
