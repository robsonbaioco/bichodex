import type { CSSProperties } from 'react'
import { THEMES, type Intensity, type ThemeId } from '../themes'

interface Props {
  current: ThemeId
  intensity: Intensity
  onPick: (id: ThemeId) => void
  onIntensity: (intensity: Intensity) => void
  onClose: () => void
}

export function ThemePicker({ current, intensity, onPick, onIntensity, onClose }: Props) {
  return (
    <div className="overlay" onClick={onClose}>
      <section
        className="sheet sheet-small"
        role="dialog"
        aria-modal="true"
        aria-label="Escolher tema"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="detail-bar">
          <span className="detail-number">Tema</span>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </header>
        <div className="sheet-pad theme-intensity">
          <div className="segmented" role="group" aria-label="Intensidade do tema">
            <button className={intensity === 'suave' ? 'is-active' : ''} onClick={() => onIntensity('suave')}>
              Suave
            </button>
            <button className={intensity === 'forte' ? 'is-active' : ''} onClick={() => onIntensity('forte')}>
              Forte
            </button>
          </div>
          <p className="fineprint">
            {intensity === 'suave'
              ? 'Só as cores e as fontes do tema, sem texturas, rotações nem brilhos.'
              : 'O tema completo, com texturas, rotações e brilhos.'}
          </p>
        </div>
        <ul className="sheet-pad theme-list">
          {THEMES.map((theme) => (
            <li key={theme.id}>
              <button
                className={`theme-option${theme.id === current ? ' is-active' : ''}`}
                onClick={() => onPick(theme.id)}
                aria-pressed={theme.id === current}
              >
                <span
                  className="theme-swatch"
                  style={{ '--s1': theme.swatch[0], '--s2': theme.swatch[1], '--s3': theme.swatch[2] } as CSSProperties}
                  aria-hidden="true"
                />
                <span className="theme-text">
                  <b>
                    {theme.emoji} {theme.label}
                  </b>
                  <span>{theme.description}</span>
                </span>
                {theme.id === current && (
                  <span className="theme-check" aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
