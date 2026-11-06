// Janela "Tema e letra": tamanho da letra, intensidade dos efeitos (suave/forte) e a lista de temas.
// Só mostra e avisa: o App.tsx guarda as escolhas no estado e chama applyTheme/applyTextSize
// (themes.ts), que mudam o <html> e gravam no localStorage. A lista vem de THEMES.

import type { CSSProperties } from 'react'
import { TEXT_SIZES, THEMES, type Intensity, type TextSize, type ThemeId } from '../themes'

interface Props {
  current: ThemeId
  intensity: Intensity
  onPick: (id: ThemeId) => void
  onIntensity: (intensity: Intensity) => void
  textSize: TextSize
  onTextSize: (size: TextSize) => void
  onClose: () => void
}

/**
 * Folha de escolha de tema; tocar fora dela fecha. A amostra de cada tema usa as cores de `swatch`
 * (variáveis --s1/--s2/--s3), e não as do tema em uso, para dar para comparar.
 */
export function ThemePicker({ current, intensity, onPick, onIntensity, textSize, onTextSize, onClose }: Props) {
  return (
    <div className="overlay" onClick={onClose}>
      <section
        className="sheet sheet-small"
        role="dialog"
        aria-modal="true"
        aria-label="Tema e tamanho da letra"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="detail-bar">
          <span className="detail-number">🎨 Tema e letra</span>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </header>
        <div className="sheet-pad theme-intensity">
          <p className="theme-section-title">🔠 Tamanho da letra</p>
          <div className="segmented text-size" role="group" aria-label="Tamanho da letra">
            {TEXT_SIZES.map((size) => (
              <button
                key={size.id}
                className={textSize === size.id ? 'is-active' : ''}
                aria-pressed={textSize === size.id}
                onClick={() => onTextSize(size.id)}
                style={{ fontSize: `${size.scale}em` }}
              >
                {size.label}
              </button>
            ))}
          </div>
          <p className="theme-section-title">✨ Efeitos do tema</p>
          <div className="segmented" role="group" aria-label="Intensidade do tema">
            <button className={intensity === 'suave' ? 'is-active' : ''} onClick={() => onIntensity('suave')}>
              🌤️ Suave
            </button>
            <button className={intensity === 'forte' ? 'is-active' : ''} onClick={() => onIntensity('forte')}>
              🔥 Forte
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
