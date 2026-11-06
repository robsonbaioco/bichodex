// Destaques do topo da aba Explorar: lembretes de datas do dia, um cartão por data comemorativa
// com animal e o cartão do "bicho do dia". Usado pelo App.tsx. A regra de cada destaque fica em
// highlights.ts; aqui só se busca o que falta no iNaturalist (detalhes do táxon para foto e resumo,
// e quantas espécies do grupo há na região) e se desenha. Não grava nada além do cache do bicho do dia.

import { useEffect, useMemo, useState } from 'react'
import { countSpeciesInArea, fetchTaxon, type Place, type Taxon, type TaxonDetail } from '../api'
import { displayName, excerpt, formatNumber, htmlToText } from '../format'
import { dailyAnimal, remindersOn, specialDaysOn } from '../highlights'
import type { SpecialDay } from '../specialDays'

interface Props {
  place: Place
  radius: number
  seen: Set<number>
  onOpen: (taxonId: number) => void
  /** "Avistei" no bicho do dia. */
  onMarkSeen: (taxon: Taxon) => void
  /** Compartilhar o bicho do dia, quando ele já foi avistado. */
  onShare: (taxon: Taxon) => void
  /** Filtra a lista pelas espécies do grupo homenageado que ocorrem na região. */
  onExploreGroup: (day: SpecialDay) => void
}

/** Foto do táxon, de preferência a média. */
const photoOf = (taxon: Taxon) => taxon.default_photo?.medium_url ?? taxon.default_photo?.square_url

/** Trecho curto do resumo da Wikipédia (sem HTML), ou vazio se não houver. */
function blurbOf(detail: TaxonDetail | null): string {
  return detail?.wikipedia_summary ? excerpt(htmlToText(detail.wikipedia_summary)) : ''
}

/** Permite ver o destaque de outra data pelo endereço, ex.: `?data=2026-08-10` (para conferir o calendário). */
function previewDate(): Date | null {
  const match = new URLSearchParams(location.search).get('data')?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null
}

/** Detalhes do táxon (para foto e mini descrição); null enquanto carrega ou se falhar. */
function useTaxonDetail(id: number | undefined): TaxonDetail | null {
  const [detail, setDetail] = useState<TaxonDetail | null>(null)
  useEffect(() => {
    setDetail(null)
    if (id == null) return
    const controller = new AbortController()
    fetchTaxon(id, controller.signal)
      .then(setDetail)
      .catch(() => {})
    return () => controller.abort()
  }, [id])
  return detail
}

/**
 * Cartão de uma data comemorativa: foto do táxon (ou o emoji), o motivo ou o resumo da Wikipédia,
 * e o botão que filtra o Explorar pelo grupo, que só aparece se o grupo tiver registros na região.
 */
function SpecialDayCard({ day, place, radius, onOpen, onExploreGroup }: { day: SpecialDay } & Pick<Props, 'place' | 'radius' | 'onOpen' | 'onExploreGroup'>) {
  const [groupCount, setGroupCount] = useState<number | null>(null)
  const taxon = useTaxonDetail(day.taxonId)
  const photo = taxon && photoOf(taxon)

  // quantas espécies do grupo homenageado têm registro na área (0 = sugere o zoológico)
  useEffect(() => {
    const controller = new AbortController()
    setGroupCount(null)
    countSpeciesInArea(place, radius, day.taxonId, controller.signal)
      .then(setGroupCount)
      .catch(() => {})
    return () => controller.abort()
  }, [day, place, radius])

  return (
    <article className="highlight highlight-special">
      {photo ? (
        <img src={photo} alt="" />
      ) : (
        <span className="highlight-emoji" aria-hidden="true">
          {day.emoji}
        </span>
      )}
      <div className="highlight-body">
        <p className="highlight-kicker">{day.emoji} Hoje é</p>
        <h2>{day.name}</h2>
        {day.reason ? (
          <p className="highlight-text">
            <b>{day.group}.</b> {day.reason}
          </p>
        ) : (
          <p className="highlight-text">
            {blurbOf(taxon)}{' '}
            {groupCount === 0 && `Não há registros de ${day.group.toLowerCase()} perto de você: já viu no zoológico?`}
          </p>
        )}
        <div className="highlight-actions">
          {groupCount != null && groupCount > 0 && (
            <button className="btn btn-primary" onClick={() => onExploreGroup(day)}>
              {groupCount === 1 ? 'Ver a espécie da sua região' : `Ver as ${formatNumber(groupCount)} espécies da sua região`}
            </button>
          )}
          <button className="btn" onClick={() => onOpen(day.taxonId)}>
            📖 Ver ficha
          </button>
        </div>
      </div>
    </article>
  )
}

/** Faixa de destaques do dia; não desenha nada se não houver bicho do dia, data especial nem lembrete. */
export function Highlights({ place, radius, seen, onOpen, onMarkSeen, onShare, onExploreGroup }: Props) {
  // a data é fixada ao montar: ?data= só muda as datas comemorativas; o bicho do dia sempre usa o dia real
  const [today] = useState(() => previewDate() ?? new Date())
  const specialDays = useMemo(() => specialDaysOn(today), [today])
  const reminders = useMemo(() => remindersOn(today), [today])
  const [daily, setDaily] = useState<Taxon | null>(null)

  // sorteia (ou lê do cache) o bicho do dia sempre que o local ou o raio mudam
  useEffect(() => {
    const controller = new AbortController()
    setDaily(null)
    dailyAnimal(place, radius, controller.signal)
      .then(setDaily)
      .catch(() => {})
    return () => controller.abort()
  }, [place, radius])

  const dailyDetail = useTaxonDetail(daily?.id)

  if (!daily && !specialDays.length && !reminders.length) return null

  const dailySeen = !!daily && seen.has(daily.id)

  return (
    <section className="today" aria-label="Destaques de hoje">
      {reminders.length > 0 && (
        <p className="reminders">
          <b>📅 Hoje {specialDays.length ? 'também ' : ''}é:</b> {reminders.join(' · ')}
        </p>
      )}
      <div className="highlights">
      {specialDays.map((day) => (
        <SpecialDayCard
          key={day.name}
          day={day}
          place={place}
          radius={radius}
          onOpen={onOpen}
          onExploreGroup={onExploreGroup}
        />
      ))}

      {daily && (
        <article className="highlight highlight-daily">
          <img src={photoOf(daily)} alt="" />
          <div className="highlight-body">
            <p className="highlight-kicker">🔎 Bicho do dia</p>
            <h2>{displayName(daily)}</h2>
            <p className="highlight-text">
              {blurbOf(dailyDetail)}{' '}
              <b>{dailySeen ? 'Você já avistou um desses: conte para os seus amigos!' : 'Tente encontrá-lo hoje!'}</b>
            </p>
            <div className="highlight-actions">
              {dailySeen ? (
                <button className="btn btn-primary" onClick={() => onShare(daily)}>
                  📤 Compartilhar
                </button>
              ) : (
                <button className="btn btn-primary" onClick={() => onMarkSeen(daily)}>
                  ✓ Avistei
                </button>
              )}
              <button className="btn" onClick={() => onOpen(daily.id)}>
                📖 Ver ficha
              </button>
            </div>
          </div>
        </article>
      )}
      </div>
    </section>
  )
}
