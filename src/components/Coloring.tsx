// Página de colorir de uma espécie, aberta pelo App.tsx (pela ficha ou pela aba Jogos). Busca as fotos com
// licença reutilizável via fetchTaxon (iNaturalist), baixa a escolhida com loadImage (shareCard.ts) e a transforma
// em contorno com makeLineArt (lineArt.ts). A pintura fica só na memória: nada vai para o localStorage.
// Dois canvas empilhados: embaixo a pintura (onde o pincel e o balde mexem), em cima os traços, que o CSS
// mistura com mix-blend-mode: multiply e deixa sem pointer-events, para os toques chegarem ao de baixo.

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { fetchTaxon, type Photo, type Taxon } from '../api'
import { displayName } from '../format'
import { DETAIL_LEVELS, floodFill, makeLineArt, type Detail, type LineArt } from '../lineArt'
import { loadImage } from '../shareCard'

/** Ferramenta ativa: balde de tinta, pincel ou borracha (que é um pincel branco). */
type Tool = 'fill' | 'brush' | 'eraser'

/** Paleta fixa de cores; o seletor 🎨 permite qualquer outra. */
const COLORS = [
  '#e63946', '#f4a261', '#f9c74f', '#90be6d', '#2a9d8f', '#4cc9f0',
  '#277da1', '#7b2cbf', '#f28482', '#8d5524', '#6c757d', '#1b1b1b',
]

/** Espessuras do pincel; `id` é a largura do traço em pixels do desenho (não da tela). */
const BRUSHES = [
  { id: 6, label: 'Fino' },
  { id: 14, label: 'Médio' },
  { id: 28, label: 'Grosso' },
]

/** Quantos passos o "Desfazer" guarda (cada um é uma cópia inteira da pintura, por isso o limite). */
const MAX_UNDO = 20

/** Só fotos com licença que permite obra derivada (o desenho é uma obra derivada da foto). */
function isReusable(photo: Photo | null | undefined): photo is Photo {
  return !!(photo?.medium_url ?? photo?.square_url) && !!photo?.license_code && !photo.license_code.includes('nd')
}

/** URL da versão grande da foto: o iNaturalist só muda o tamanho no nome do arquivo (square/medium/large). */
const largeUrl = (photo: Photo) => (photo.medium_url ?? photo.square_url)!.replace(/\/(medium|square)\./, '/large.')

/** "#rrggbb" → [r, g, b] (0–255), formato que o floodFill espera. */
const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
]

/** Nome em minúsculas, sem acentos e com hífens, para o nome do arquivo baixado. */
const slug = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** Baixa uma URL (data: ou blob:) com o nome dado, criando e clicando num link temporário. */
function download(url: string, name: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
}

/**
 * Página de colorir de uma espécie: a foto vira um desenho de contorno, que dá para pintar na tela
 * (balde, pincel e borracha) ou imprimir em preto e branco.
 */
export function Coloring({ taxon, onClose }: { taxon: Taxon; onClose: () => void }) {
  const [photos, setPhotos] = useState<Photo[] | null>(null)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [detail, setDetail] = useState<Detail>(2)
  const [art, setArt] = useState<LineArt | null>(null)
  const [artUrl, setArtUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  // o contorno vindo de foto quase nunca fecha, então o balde tende a vazar: o pincel é o padrão
  const [tool, setTool] = useState<Tool>('brush')
  const [color, setColor] = useState(COLORS[0])
  const [brush, setBrush] = useState(14)
  const [undoCount, setUndoCount] = useState(0)
  const [printing, setPrinting] = useState(false)

  const paintRef = useRef<HTMLCanvasElement>(null)
  const lineRef = useRef<HTMLCanvasElement>(null)
  /** Pilha do "Desfazer": cópias da pintura antes de cada ação. */
  const history = useRef<ImageData[]>([])
  /** Último ponto do traço em andamento; null quando o dedo/mouse não está pressionado. */
  const drawing = useRef<{ x: number; y: number } | null>(null)
  /** Foto já baixada, para refazer o contorno ao mudar o nível de detalhe sem baixar de novo. */
  const photoRef = useRef<HTMLImageElement | null>(null)

  const name = displayName(taxon)
  const photo = photos?.[photoIndex] ?? null

  // Esc fecha só esta tela: escuta na captura e para o evento antes que a ficha da espécie (por baixo) o receba.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      onClose()
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [onClose])

  // Lista as fotos reutilizáveis da espécie; se a consulta falhar, tenta a de capa que já veio com o táxon.
  useEffect(() => {
    const controller = new AbortController()
    fetchTaxon(taxon.id, controller.signal)
      .then((found) => {
        const list = (found.taxon_photos ?? []).map((item) => item.photo).filter(isReusable)
        setPhotos(list.length ? list : [found.default_photo].filter(isReusable))
      })
      .catch((error) => error.name !== 'AbortError' && setPhotos([taxon.default_photo].filter(isReusable)))
    return () => controller.abort()
  }, [taxon])

  // Baixa a foto escolhida (só quando muda a foto; o nível de detalhe reaproveita a mesma).
  useEffect(() => {
    if (!photo) return
    let cancelled = false
    setArt(null)
    setFailed(false)
    photoRef.current = null
    loadImage(largeUrl(photo))
      .then((image) => {
        if (cancelled) return
        photoRef.current = image
        setArt(makeLineArt(image, detail))
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- o detalhe é tratado no efeito abaixo
  }, [photo])

  // Mudou o nível de detalhe: refaz o contorno com a foto que já está na memória.
  useEffect(() => {
    if (photoRef.current) setArt(makeLineArt(photoRef.current, detail))
  }, [detail])

  // Desenho novo: ajusta os dois canvas ao tamanho do contorno, limpa a pintura, desenha os traços, zera o
  // "Desfazer" e guarda o PNG dos traços (usado na impressão e no download em preto e branco).
  useEffect(() => {
    if (!art || !paintRef.current || !lineRef.current) return
    for (const canvas of [paintRef.current, lineRef.current]) {
      canvas.width = art.width
      canvas.height = art.height
    }
    const paint = paintRef.current.getContext('2d', { willReadFrequently: true })!
    paint.fillStyle = '#fff'
    paint.fillRect(0, 0, art.width, art.height)
    lineRef.current.getContext('2d')!.putImageData(art.image, 0, 0)
    history.current = []
    setUndoCount(0)
    setArtUrl(lineRef.current.toDataURL('image/png'))
  }, [art])

  /** Empilha uma cópia da pintura atual no "Desfazer" (descartando a mais antiga além de MAX_UNDO). */
  const remember = useCallback(() => {
    const canvas = paintRef.current
    if (!canvas) return
    history.current.push(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height))
    if (history.current.length > MAX_UNDO) history.current.shift()
    setUndoCount(history.current.length)
  }, [])

  /** Volta a pintura para o último estado guardado. */
  function undo() {
    const last = history.current.pop()
    if (last) paintRef.current?.getContext('2d')!.putImageData(last, 0, 0)
    setUndoCount(history.current.length)
  }

  /** Pinta tudo de branco de novo (dá para desfazer). Os traços ficam, pois estão no outro canvas. */
  function clearPaint() {
    const canvas = paintRef.current
    if (!canvas) return
    remember()
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  /** Converte a posição do ponteiro na tela para pixels do canvas, que é exibido em outro tamanho pelo CSS. */
  function point(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: Math.floor(((event.clientX - rect.left) / rect.width) * event.currentTarget.width),
      y: Math.floor(((event.clientY - rect.top) / rect.height) * event.currentTarget.height),
    }
  }

  /** Risca um segmento na pintura com a cor e a espessura atuais (branco, se for a borracha). */
  function stroke(from: { x: number; y: number }, to: { x: number; y: number }) {
    const ctx = paintRef.current!.getContext('2d')!
    ctx.strokeStyle = tool === 'eraser' ? '#fff' : color
    ctx.lineWidth = brush
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
  }

  /**
   * Toque na pintura. Com o balde, preenche na hora (e só guarda no "Desfazer" se algo mudou); com pincel ou
   * borracha, começa um traço e captura o ponteiro para seguir recebendo os movimentos fora do canvas.
   */
  function onPointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!art || !paintRef.current) return
    const at = point(event)
    if (tool === 'fill') {
      // o balde trabalha numa cópia; `before` intacto vira o passo do "Desfazer"
      const ctx = paintRef.current.getContext('2d', { willReadFrequently: true })!
      const before = ctx.getImageData(0, 0, art.width, art.height)
      const after = new ImageData(new Uint8ClampedArray(before.data), art.width, art.height)
      if (floodFill(after, art.mask, at.x, at.y, hexToRgb(color))) {
        history.current.push(before)
        if (history.current.length > MAX_UNDO) history.current.shift()
        setUndoCount(history.current.length)
        ctx.putImageData(after, 0, 0)
      }
      return
    }
    remember()
    event.currentTarget.setPointerCapture(event.pointerId)
    drawing.current = at
    stroke(at, at)
  }

  /** Continua o traço em andamento até a posição atual. */
  function onPointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    const at = point(event)
    stroke(drawing.current, at)
    drawing.current = at
  }

  /** Encerra o traço (também ao cancelar o ponteiro). */
  const onPointerUp = () => {
    drawing.current = null
  }

  /** Junta pintura e traços num canvas novo (traços em "multiply", como na tela) e baixa como PNG. */
  function savePainting() {
    const paint = paintRef.current
    const lines = lineRef.current
    if (!paint || !lines) return
    const out = document.createElement('canvas')
    out.width = paint.width
    out.height = paint.height
    const ctx = out.getContext('2d')!
    ctx.drawImage(paint, 0, 0)
    ctx.globalCompositeOperation = 'multiply'
    ctx.drawImage(lines, 0, 0)
    download(out.toDataURL('image/png'), `bichodex-pintura-${slug(name) || taxon.id}.png`)
  }

  /** Liga o modo de impressão; o efeito abaixo monta a folha e chama window.print(). */
  function print() {
    setPrinting(true)
  }

  // A folha de impressão só existe enquanto imprime; o CSS de impressão esconde o resto da página.
  // A classe `printing` no body ativa esse CSS; o atraso de 50 ms dá tempo do portal com a folha ser montado,
  // e o evento afterprint desliga tudo quando a janela de impressão fecha.
  useEffect(() => {
    if (!printing) return
    document.body.classList.add('printing')
    const done = () => setPrinting(false)
    window.addEventListener('afterprint', done)
    const timer = setTimeout(() => window.print(), 50)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('afterprint', done)
      document.body.classList.remove('printing')
    }
  }, [printing])

  const ready = !!art

  return (
    <div className="overlay" onClick={onClose}>
      <section
        className="sheet coloring"
        role="dialog"
        aria-modal="true"
        aria-label={`Colorir: ${name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="detail-bar">
          <span className="detail-number">🖍️ Colorir · {name}</span>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </header>

        <div className="sheet-pad coloring-body">
          {photos && photos.length === 0 ? (
            <p className="notice">
              As fotos desta espécie no catálogo não têm licença que permita fazer desenhos a partir delas. Escolha outro
              bicho.
            </p>
          ) : failed ? (
            <p className="notice notice-error" role="alert">
              Não foi possível carregar a foto. Verifique sua conexão ou tente outra foto.
            </p>
          ) : (
            !ready && <p className="notice">✏️ Desenhando o contorno…</p>
          )}

          <div className={`coloring-stage${ready ? '' : ' is-loading'}`}>
            <canvas
              ref={paintRef}
              className="coloring-paint"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              aria-label="Área de pintura"
            />
            <canvas ref={lineRef} className="coloring-lines" aria-hidden="true" />
          </div>

          {ready && (
            <>
              <div className="segmented coloring-tools" role="group" aria-label="Ferramenta">
                <button className={tool === 'brush' ? 'is-active' : ''} onClick={() => setTool('brush')}>
                  🖌️ Pincel
                </button>
                <button className={tool === 'fill' ? 'is-active' : ''} onClick={() => setTool('fill')}>
                  🪣 Balde
                </button>
                <button className={tool === 'eraser' ? 'is-active' : ''} onClick={() => setTool('eraser')}>
                  🧽 Borracha
                </button>
              </div>

              <div className="coloring-palette" role="group" aria-label="Cor">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    className={c === color ? 'is-active' : ''}
                    style={{ background: c }}
                    onClick={() => {
                      setColor(c)
                      if (tool === 'eraser') setTool('brush')
                    }}
                    aria-label={`Cor ${c}`}
                    aria-pressed={c === color}
                  />
                ))}
                <label className="coloring-custom" title="Outra cor">
                  🎨
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Outra cor" />
                </label>
              </div>

              {tool === 'fill' && (
                <p className="fineprint">
                  O balde pinta a área inteira até encontrar um traço. Se vazar para fora, toque em ↩️ Desfazer e use o
                  pincel.
                </p>
              )}
              {tool !== 'fill' && (
                <div className="segmented" role="group" aria-label="Espessura">
                  {BRUSHES.map((b) => (
                    <button key={b.id} className={brush === b.id ? 'is-active' : ''} onClick={() => setBrush(b.id)}>
                      {b.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="coloring-actions">
                <button className="btn" onClick={undo} disabled={!undoCount}>
                  ↩️ Desfazer
                </button>
                <button className="btn" onClick={clearPaint}>
                  🧹 Limpar pintura
                </button>
              </div>

              <div className="share-actions">
                <button className="btn btn-primary btn-lg" onClick={print}>
                  🖨️ Imprimir para colorir
                </button>
                <button className="btn btn-lg" onClick={savePainting}>
                  ⬇️ Baixar minha pintura
                </button>
                {artUrl && (
                  <button className="btn btn-lg" onClick={() => download(artUrl, `bichodex-colorir-${slug(name) || taxon.id}.png`)}>
                    ⬇️ Baixar desenho em preto e branco
                  </button>
                )}
              </div>
            </>
          )}

          {photos && photos.length > 0 && (
            <details className="coloring-setup">
              <summary>⚙️ Mudar o desenho (apaga a pintura)</summary>
              <div className="segmented" role="group" aria-label="Quantidade de traços">
                {DETAIL_LEVELS.map((level) => (
                  <button
                    key={level.id}
                    className={detail === level.id ? 'is-active' : ''}
                    onClick={() => setDetail(level.id)}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
              {photos.length > 1 && (
                <button className="link-btn" onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}>
                  🔀 Usar outra foto ({photoIndex + 1} de {photos.length})
                </button>
              )}
            </details>
          )}

          {photo?.attribution && <p className="fineprint">Desenho feito a partir da foto: {photo.attribution}</p>}
        </div>
      </section>

      {printing &&
        artUrl &&
        createPortal(
          <div className="print-sheet">
            <h1>{name}</h1>
            <p className="sci">{taxon.name}</p>
            <img src={artUrl} alt={`Desenho para colorir: ${name}`} />
            <p className="print-credit">
              Bichodex · robsonbaioco.github.io/bichodex{photo?.attribution ? ` · Foto original: ${photo.attribution}` : ''}
            </p>
          </div>,
          document.body,
        )}
    </div>
  )
}
