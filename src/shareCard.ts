// Desenha o cartão de conquista ("espécie avistada") em um canvas, pronto para virar imagem.

import type { Theme } from './themes'

/** Endereço público do Bichodex, impresso no cartão e incluído no texto de compartilhamento. */
export const SITE_URL = 'https://robsonbaioco.github.io/bichodex/'

export type CardFormat = 'feed' | 'stories'

export const CARD_SIZES: Record<CardFormat, { width: number; height: number }> = {
  feed: { width: 1080, height: 1350 },
  stories: { width: 1080, height: 1920 },
}

export interface CardData {
  format: CardFormat
  name: string
  scientificName: string
  categoryLabel: string
  categoryEmoji: string
  color: string
  place: string
  /** Texto do selo sobre a foto (ex.: "ESPÉCIE AVISTADA!"). */
  seal: string
  /** Quantas espécies a pessoa já avistou, contando esta. */
  ordinal: number
  credit?: string
  photo: HTMLImageElement | null
  logo: HTMLImageElement | null
  /** Tema em uso, de onde vêm as cores e a fonte dos títulos. */
  theme: Theme
}

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
const MARGIN = 60

/** Carrega uma imagem de forma que possa ser exportada do canvas (exige CORS para URLs remotas). */
export async function loadImage(source: string | Blob): Promise<HTMLImageElement> {
  const blob =
    typeof source === 'string'
      ? // 'reload' evita reaproveitar do cache uma resposta obtida sem CORS pelas <img> da lista
        await fetch(source, { mode: 'cors', cache: 'reload' }).then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          return response.blob()
        })
      : source
  const url = URL.createObjectURL(blob)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let cut = text
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1)
  return `${cut.trimEnd()}…`
}

export function drawCard(canvas: HTMLCanvasElement, data: CardData): void {
  const { width: W, height: H } = CARD_SIZES[data.format]
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const inner = W - MARGIN * 2
  const { card, displayFont, displayWeight } = data.theme
  const soft = (alpha: number) => `color-mix(in srgb, ${card.ink} ${alpha * 100}%, transparent)`

  // Fundo
  ctx.fillStyle = card.bg
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = card.deep
  ctx.beginPath()
  ctx.moveTo(0, H * 0.72)
  ctx.lineTo(W, H * 0.5)
  ctx.lineTo(W, H)
  ctx.lineTo(0, H)
  ctx.fill()

  // Cabeçalho
  if (data.logo) ctx.drawImage(data.logo, MARGIN, 50, 84, 84)
  ctx.fillStyle = card.ink
  ctx.textBaseline = 'middle'
  ctx.font = `${displayWeight} 54px ${displayFont}`
  ctx.fillText('Bichodex', MARGIN + 104, 94)
  ctx.font = `600 30px ${FONT}`
  ctx.fillStyle = soft(0.85)
  ctx.textAlign = 'right'
  ctx.fillText(SITE_URL.replace(/^https:\/\/|\/$/g, ''), W - MARGIN, 96)
  ctx.textAlign = 'left'

  // Foto
  const photoTop = 170
  const photoHeight = H - photoTop - 540
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(MARGIN, photoTop, inner, photoHeight, 48)
  ctx.clip()
  ctx.fillStyle = data.color
  ctx.fillRect(MARGIN, photoTop, inner, photoHeight)
  if (data.photo) {
    const scale = Math.max(inner / data.photo.naturalWidth, photoHeight / data.photo.naturalHeight)
    const w = data.photo.naturalWidth * scale
    const h = data.photo.naturalHeight * scale
    ctx.drawImage(data.photo, MARGIN + (inner - w) / 2, photoTop + (photoHeight - h) / 2, w, h)
  } else {
    ctx.fillStyle = 'rgb(0 0 0 / 0.25)'
    ctx.fillRect(MARGIN, photoTop, inner, photoHeight)
    ctx.font = `280px ${FONT}`
    ctx.textAlign = 'center'
    ctx.fillText(data.categoryEmoji, W / 2, photoTop + photoHeight / 2)
    ctx.textAlign = 'left'
  }
  ctx.restore()
  ctx.lineWidth = 10
  ctx.strokeStyle = card.ink
  ctx.beginPath()
  ctx.roundRect(MARGIN, photoTop, inner, photoHeight, 48)
  ctx.stroke()

  // Selo, sobreposto à borda inferior da foto
  const photoBottom = photoTop + photoHeight
  const seal = `✓  ${data.seal}`
  ctx.font = `800 40px ${FONT}`
  const sealWidth = ctx.measureText(seal).width + 72
  ctx.fillStyle = card.accent
  ctx.beginPath()
  ctx.roundRect(MARGIN + 36, photoBottom - 44, sealWidth, 88, 44)
  ctx.fill()
  ctx.fillStyle = card.onAccent
  ctx.fillText(seal, MARGIN + 72, photoBottom + 2)

  // Nome: até duas linhas, reduzindo a fonte se preciso
  let size = 84
  let lines: string[]
  do {
    ctx.font = `${displayWeight} ${size}px ${displayFont}`
    lines = wrap(ctx, data.name, inner)
    size -= 6
  } while (lines.length > 2 && size >= 46)
  size += 6
  lines = lines.slice(0, 2).map((line) => ellipsize(ctx, line, inner))

  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = card.ink
  let y = photoBottom + 80
  for (const line of lines) {
    y += size * 1.08
    ctx.fillText(line, MARGIN, y)
  }

  ctx.font = `italic 44px ${FONT}`
  ctx.fillStyle = soft(0.85)
  y += 64
  ctx.fillText(ellipsize(ctx, data.scientificName, inner), MARGIN, y)

  ctx.font = `600 38px ${FONT}`
  y += 68
  ctx.fillText(ellipsize(ctx, `${data.categoryEmoji} ${data.categoryLabel}  ·  📍 ${data.place}`, inner), MARGIN, y)

  // Rodapé
  ctx.font = `800 44px ${FONT}`
  ctx.fillStyle = card.accent
  ctx.fillText(ellipsize(ctx, `Minha ${data.ordinal}ª espécie avistada no Bichodex`, inner), MARGIN, H - 104)

  if (data.credit) {
    ctx.font = `24px ${FONT}`
    ctx.fillStyle = soft(0.7)
    ctx.fillText(ellipsize(ctx, `Foto: ${data.credit}`, inner), MARGIN, H - 44)
  }
}
