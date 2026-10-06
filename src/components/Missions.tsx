import type { Category } from '../categories'
import { medalsFor, questsFor, type Progress } from '../missions'

interface Props {
  progress: Progress
  category: Category
  seenCount: number
  trailActive: boolean
  /** Falso enquanto a lista da região não carregou: baralho e trilha dependem dela. */
  ready: boolean
  onStartDeck: () => void
  onStartTrail: () => void
}

/** Missões do dia, sequência de dias, medalhas e as duas formas rápidas de preencher a dex. */
export function Missions({ progress, category, seenCount, trailActive, ready, onStartDeck, onStartTrail }: Props) {
  const quests = questsFor(progress, category)
  const done = quests.filter((q) => q.value >= q.goal).length
  const medals = medalsFor(seenCount, progress.best)

  return (
    <>
      <header className="page-head">
        <h2>Missões</h2>
        <p>
          {done === quests.length
            ? 'Todas as missões de hoje concluídas. Amanhã tem mais.'
            : `${done} de ${quests.length} missões de hoje concluídas.`}
        </p>
      </header>

      <div className="missions">
        <section className="streak" aria-label="Sequência">
          <span className="streak-number">{progress.streak}</span>
          <span>
            <b>{progress.streak === 1 ? 'dia seguido' : 'dias seguidos'}</b>
            <span>Melhor sequência: {progress.best}</span>
          </span>
        </section>

        <ul className="quests">
          {quests.map((quest) => (
            <li key={quest.id} className={quest.value >= quest.goal ? 'is-done' : ''}>
              <span className="quest-label">
                <span>{quest.label}</span>
                <span className="quest-count">
                  {quest.value >= quest.goal ? '✓' : `${quest.value}/${quest.goal}`}
                </span>
              </span>
              <span className="meter" aria-hidden="true">
                <span style={{ width: `${(quest.value / quest.goal) * 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="actions-grid">
        <button className="action-card" onClick={onStartDeck} disabled={!ready}>
          <span aria-hidden="true">🃏</span>
          <b>Baralho de descobertas</b>
          <span>Uma espécie da região por vez: diga se já viu.</span>
        </button>
        <button className="action-card" onClick={onStartTrail} disabled={!ready}>
          <span aria-hidden="true">🥾</span>
          <b>{trailActive ? 'Voltar à trilha' : 'Modo trilha'}</b>
          <span>
            {trailActive
              ? 'Há uma trilha em andamento.'
              : 'Lista de toque rápido para usar em campo, com resumo no fim.'}
          </span>
        </button>
      </div>

      <section className="world">
        <h2>Medalhas</h2>
        <p>
          {medals.filter((m) => m.earned).length} de {medals.length} conquistadas.
        </p>
        <ul className="medals">
          {medals.map((medal) => (
            <li key={medal.id} className={medal.earned ? 'is-earned' : ''}>
              <span className="medal-emoji" aria-hidden="true">
                {medal.earned ? medal.emoji : '🔒'}
              </span>
              <b>{medal.label}</b>
              <span>{medal.hint}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
