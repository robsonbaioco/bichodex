import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { fetchTaxaByIds, type SpeciesCount, type Taxon } from '../api'
import { CATEGORIES, categoryOf } from '../categories'
import { formatNumber } from '../format'
import { SpeciesCard } from './SpeciesCard'

interface Props {
  seen: number[]
  /** Espécies por grupo icônico na região, para a barra de progresso de cada categoria. */
  counts: Record<string, number>
  /** Espécies da região já carregadas, de onde saem as sugestões do que procurar. */
  regional: SpeciesCount[]
  onOpen: () => void
  onToggleSeen: (taxon: Taxon) => void
  onStartDeck: () => void
}

/** Álbum das espécies avistadas, com o progresso por categoria e sugestões do que ainda falta. */
export function Dex({ seen, counts, regional, onOpen, onToggleSeen, onStartDeck }: Props) {
  const [taxa, setTaxa] = useState<Map<number, Taxon>>(new Map())
  const [failed, setFailed] = useState(false)
  const requested = useRef(new Set<number>())

  // só busca o que ainda não foi pedido, para marcar ou desmarcar não recarregar o álbum inteiro
  useEffect(() => {
    const missing = seen.filter((id) => !requested.current.has(id))
    if (!missing.length) return
    missing.forEach((id) => requested.current.add(id))
    setFailed(false)
    fetchTaxaByIds(missing)
      .then((found) => setTaxa((current) => new Map([...current, ...found.map((t) => [t.id, t] as const)])))
      .catch(() => {
        missing.forEach((id) => requested.current.delete(id))
        setFailed(true)
      })
  }, [seen])

  // mais recentes primeiro
  const album = useMemo(
    () => [...seen].reverse().flatMap((id) => taxa.get(id) ?? []),
    [seen, taxa],
  )

  const byCategory = useMemo(() => {
    const totals = new Map<string, number>()
    for (const taxon of album) {
      const id = categoryOf(taxon).id
      totals.set(id, (totals.get(id) ?? 0) + 1)
    }
    return totals
  }, [album])

  const seenSet = useMemo(() => new Set(seen), [seen])
  // registros na região, para as avistadas que também aparecem na lista regional
  const regionalCount = useMemo(() => new Map(regional.map((entry) => [entry.taxon.id, entry.count])), [regional])
  const toFind = useMemo(
    () => regional.filter((entry) => !seenSet.has(entry.taxon.id) && entry.taxon.default_photo).slice(0, 12),
    [regional, seenSet],
  )
  const loading = album.length < seen.length && !failed && taxa.size < requested.current.size

  return (
    <>
      <header className="page-head">
        <h2>Minha dex</h2>
        <p>
          {seen.length === 0
            ? 'Nenhuma espécie avistada ainda.'
            : `${formatNumber(seen.length)} ${seen.length === 1 ? 'espécie avistada' : 'espécies avistadas'}`}
        </p>
      </header>

      <ul className="dex-progress">
        {CATEGORIES.filter((c) => c.iconic && (counts[c.iconic] || byCategory.get(c.id))).map((c) => {
          const have = byCategory.get(c.id) ?? 0
          const total = Math.max(counts[c.iconic!] ?? 0, have)
          return (
            <li key={c.id} style={{ '--c': c.color } as CSSProperties}>
              <span className="dex-progress-label">
                <span>
                  {c.emoji} {c.label}
                </span>
                <span className="dex-progress-count">
                  {formatNumber(have)} de {formatNumber(total)}
                </span>
              </span>
              <span className="meter" aria-hidden="true">
                <span style={{ width: `${have ? Math.max(3, (have / total) * 100) : 0}%` }} />
              </span>
            </li>
          )
        })}
      </ul>

      {seen.length === 0 ? (
        <div className="notice empty-state">
          <p>
            Marque no catálogo as espécies que você já viu, ou passe pelo baralho de descobertas para preencher a dex em
            poucos minutos.
          </p>
          <button className="btn btn-primary" onClick={onStartDeck} disabled={!regional.length}>
            Abrir o baralho
          </button>
        </div>
      ) : (
        <div className="grid">
          {album.map((taxon) => (
            <SpeciesCard key={taxon.id} entry={{ taxon, count: regionalCount.get(taxon.id) }} seen onOpen={onOpen} onToggleSeen={() => onToggleSeen(taxon)} />
          ))}
          {loading &&
            Array.from({ length: Math.min(8, seen.length - album.length) }, (_, i) => (
              <div key={i} className="card skeleton" aria-hidden="true" />
            ))}
        </div>
      )}

      {failed && (
        <p className="notice notice-error" role="alert">
          Não foi possível carregar as espécies avistadas. Verifique sua conexão.
        </p>
      )}

      {toFind.length > 0 && (
        <section className="world">
          <h2>Para procurar por perto</h2>
          <p>As mais registradas da sua região que ainda faltam na sua dex.</p>
          <div className="grid is-locked">
            {toFind.map((entry) => (
              <SpeciesCard
                key={entry.taxon.id}
                entry={entry}
                seen={false}
                onOpen={onOpen}
                onToggleSeen={() => onToggleSeen(entry.taxon)}
              />
            ))}
          </div>
        </section>
      )}
    </>
  )
}
