// Desenha o cartão de conquista ("espécie avistada") em um canvas, pronto para virar imagem.
// Usado por ShareAchievement.tsx (drawCard, CARD_SIZES); loadImage também serve ao Coloring.tsx e SITE_URL
// à Trilha e ao Bicho 2048. Só canvas 2D, sem estado nem armazenamento; as cores e a fonte dos títulos vêm do tema (themes.ts).

import type { Theme } from './themes'

/** Endereço público do Bichodex, impresso no cartão e incluído no texto de compartilhamento. */
export const SITE_URL = 'https://robsonbaioco.github.io/bichodex/'

/** Formato do cartão: post de feed (4:5) ou stories (9:16). */
export type CardFormat = 'feed' | 'stories'

/** Tamanho em pixels de cada formato (o recomendado pelo Instagram). O layout abaixo é fixo para 1080 de largura. */
export const CARD_SIZES: Record<CardFormat, { width: number; height: number }> = {
  feed: { width: 1080, height: 1350 },
  stories: { width: 1080, height: 1920 },
}

/** Tudo o que vai impresso no cartão. */
export interface CardData {
  format: CardFormat
  /** Nome popular (até duas linhas). */
  name: string
  scientificName: string
  categoryLabel: string
  categoryEmoji: string
  /** Cor da categoria, que preenche o quadro da foto enquanto ela não cobre (ou quando não há foto). */
  color: string
  /** Linha de local, já montada (ex.: "No zoológico · 03/11/2026"). */
  place: string
  /** Texto do selo sobre a foto (ex.: "ESPÉCIE AVISTADA!"). */
  seal: string
  /** Quantas espécies a pessoa já avistou, contando esta. */
  ordinal: number
  /** Autoria da foto do catálogo, impressa no rodapé (exigência da licença CC). */
  credit?: string
  /** Foto já carregada; null desenha o emoji da categoria no lugar. */
  photo: HTMLImageElement | null
  logo: HTMLImageElement | null
  /** Tema em uso, de onde vêm as cores e a fonte dos títulos. */
  theme: Theme
}

/** Fonte dos textos que não são título. */
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
/** Margem lateral do cartão, em pixels. */
const MARGIN = 60

/**
 * Carrega uma imagem de forma que possa ser exportada do canvas (exige CORS para URLs remotas).
 * Aceita URL ou Blob/File (foto enviada pela pessoa). Baixa como Blob e decodifica a partir de uma URL de
 * objeto, assim o canvas não fica "contaminado" e toBlob/toDataURL/getImageData continuam funcionando.
 * Rejeita se a resposta não for OK, se o servidor não liberar CORS ou se o arquivo não for imagem.
 */
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

/** Quebra o texto em linhas que caibam em `maxWidth` com a fonte atual do contexto (palavra longa demais fica inteira). */
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

/** Corta o texto com "…" até caber em `maxWidth` com a fonte atual do contexto. */
function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let cut = text
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1)
  return `${cut.trimEnd()}…`
}

/**
 * Redimensiona o canvas para o formato pedido e desenha o cartão inteiro: fundo com faixa diagonal, cabeçalho
 * com logo e endereço, foto recortada com cantos arredondados, selo, nome, nome científico, categoria e local,
 * frase do ordinal e crédito da foto. As posições são fixas a partir do topo e do fim do cartão; a foto ocupa
 * o que sobra no meio, por isso o stories ganha uma foto mais alta.
 */
export function drawCard(canvas: HTMLCanvasElement, data: CardData): void {
  const { width: W, height: H } = CARD_SIZES[data.format]
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const inner = W - MARGIN * 2
  const { card, displayFont, displayWeight } = data.theme
  // cor do texto com transparência; color-mix no canvas exige navegador recente (nos antigos o fillStyle é ignorado)
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
  // 540 px reservados embaixo para selo, textos e rodapé
  const photoHeight = H - photoTop - 540
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(MARGIN, photoTop, inner, photoHeight, 48)
  ctx.clip()
  ctx.fillStyle = data.color
  ctx.fillRect(MARGIN, photoTop, inner, photoHeight)
  if (data.photo) {
    // "cover": escala para cobrir o quadro todo e centraliza; o que sobra é cortado pelo clip
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
  // desfaz o último decremento: `size` volta a ser o da fonte em uso
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
