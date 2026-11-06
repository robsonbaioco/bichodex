// Transforma a foto de uma espécie num desenho de contorno (preto e branco) para colorir ou imprimir.
// Tudo roda no aparelho: borra um pouco a foto, acha as bordas (Sobel) e fica só com as mais fortes.
// Usado só pelo Coloring.tsx (makeLineArt, floodFill, DETAIL_LEVELS). Sem rede nem armazenamento; a foto precisa
// ter vindo com CORS (loadImage do shareCard.ts), senão o getImageData do canvas falha.

/** Resultado do makeLineArt: o desenho e a máscara dos traços, no mesmo tamanho (até MAX_SIDE de lado). */
export interface LineArt {
  width: number
  height: number
  /** Desenho pronto: traço escuro sobre branco. */
  image: ImageData
  /** 1 onde há traço; serve de parede para o balde de tinta. */
  mask: Uint8Array
}

/**
 * Quanto do desenho vira traço, do mais limpo ao mais detalhado. `share` é a fração dos pixels com borda mais
 * forte que passa no limiar (antes de tirar os pedacinhos soltos e engrossar o traço).
 */
export const DETAIL_LEVELS = [
  { id: 1, label: 'Simples', share: 0.05 },
  { id: 2, label: 'Médio', share: 0.08 },
  { id: 3, label: 'Detalhado', share: 0.12 },
] as const

/** Nível de detalhe: 1, 2 ou 3 (ids de DETAIL_LEVELS). */
export type Detail = (typeof DETAIL_LEVELS)[number]['id']

/** Maior lado do desenho, em pixels: limita memória e tempo de processamento (e o tamanho do "Desfazer"). */
const MAX_SIDE = 900
/** Tom de cinza do traço (0 = preto); quase preto, para não pesar na impressão. */
const INK = 34

/**
 * Borrão de caixa separável (horizontal e depois vertical) de raio `r` sobre uma imagem em tons de cinza.
 * Usa soma deslizante, então o custo não depende do raio; nas bordas repete o pixel da extremidade.
 */
function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(w * h)
  const out = new Float32Array(w * h)
  const size = r * 2 + 1
  for (let y = 0; y < h; y++) {
    let sum = 0
    for (let x = -r; x <= r; x++) sum += src[y * w + Math.min(w - 1, Math.max(0, x))]
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = sum / size
      sum += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)]
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0
    for (let y = -r; y <= r; y++) sum += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / size
      sum += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]
    }
  }
  return out
}

/**
 * Gera o desenho de contorno a partir da foto: reduz a no máximo MAX_SIDE, passa para cinza, borra, calcula a
 * força das bordas (Sobel), corta pelo percentil do nível de detalhe, descarta traços pequenos e engrossa o
 * resto. Síncrono e pesado: roda na thread principal e pode travar a tela por um instante.
 */
export function makeLineArt(photo: CanvasImageSource & { width: number; height: number }, detail: Detail): LineArt {
  const scale = Math.min(1, MAX_SIDE / Math.max(photo.width, photo.height))
  const w = Math.max(1, Math.round(photo.width * scale))
  const h = Math.max(1, Math.round(photo.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(photo, 0, 0, w, h)
  const rgba = ctx.getImageData(0, 0, w, h).data

  // luminância (pesos do padrão BT.601): o desenho só olha para claro/escuro, não para a cor
  const luma = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) luma[i] = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]
  // três borrões de caixa seguidos ≈ um gaussiano: tira a textura fina (pelos, grama) e deixa os contornos
  const gray = boxBlur(boxBlur(boxBlur(luma, w, h, 3), w, h, 3), w, h, 2)

  // operador de Sobel: gx e gy são as variações horizontal e vertical do brilho; a magnitude é a força da borda
  // (a moldura de 1 pixel fica com zero)
  const magnitude = new Float32Array(w * h)
  let max = 0
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const gx =
        gray[i - w + 1] + 2 * gray[i + 1] + gray[i + w + 1] - gray[i - w - 1] - 2 * gray[i - 1] - gray[i + w - 1]
      const gy =
        gray[i + w - 1] + 2 * gray[i + w] + gray[i + w + 1] - gray[i - w - 1] - 2 * gray[i - w] - gray[i - w + 1]
      const m = Math.hypot(gx, gy)
      magnitude[i] = m
      if (m > max) max = m
    }
  }

  // limiar pelo percentil: a mesma fração da imagem vira traço, seja a foto clara, escura ou de pouco contraste
  const BINS = 1024
  const histogram = new Uint32Array(BINS)
  for (let i = 0; i < w * h; i++) histogram[Math.min(BINS - 1, Math.floor((magnitude[i] / (max || 1)) * BINS))]++
  const share = DETAIL_LEVELS.find((level) => level.id === detail)!.share
  // desce das faixas mais fortes do histograma para as mais fracas até juntar `share` dos pixels; o limiar é o início dessa faixa
  let keep = w * h * share
  let bin = BINS - 1
  while (bin > 0 && keep > 0) keep -= histogram[bin--]
  const threshold = ((bin + 1) / BINS) * (max || 1)

  const edge = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) edge[i] = magnitude[i] >= threshold && magnitude[i] > 0 ? 1 : 0

  // tira os pedacinhos soltos (textura de pele, folhas, pedra): só ficam os traços ligados com tamanho razoável
  // (componentes conexos com vizinhança de 8, por busca em profundidade com pilha; mínimo de pixels ∝ tamanho da foto)
  const minSize = Math.round((w + h) * 0.06)
  const label = new Int32Array(w * h)
  const keepEdge = new Uint8Array(w * h)
  const stack: number[] = []
  const members: number[] = []
  for (let start = 0; start < w * h; start++) {
    if (!edge[start] || label[start]) continue
    members.length = 0
    stack.push(start)
    label[start] = 1
    while (stack.length) {
      const i = stack.pop()!
      members.push(i)
      const x = i % w
      const y = (i - x) / w
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy
        if (ny < 0 || ny >= h) continue
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          if (nx < 0 || nx >= w) continue
          const j = ny * w + nx
          if (edge[j] && !label[j]) {
            label[j] = 1
            stack.push(j)
          }
        }
      }
    }
    if (members.length >= minSize) for (const i of members) keepEdge[i] = 1
  }

  // engrossa o traço um pouco (1 pixel em cruz para cada lado), para dar para pintar sem vazar
  const mask = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    if (!keepEdge[i]) continue
    const x = i % w
    mask[i] = 1
    if (x > 0) mask[i - 1] = 1
    if (x < w - 1) mask[i + 1] = 1
    if (i >= w) mask[i - w] = 1
    if (i < w * (h - 1)) mask[i + w] = 1
  }

  const image = ctx.createImageData(w, h)
  for (let i = 0; i < w * h; i++) {
    const v = mask[i] ? INK : 255
    image.data[i * 4] = image.data[i * 4 + 1] = image.data[i * 4 + 2] = v
    image.data[i * 4 + 3] = 255
  }
  return { width: w, height: h, image, mask }
}

/**
 * Balde de tinta: pinta a área da cor tocada, parando nos traços do desenho. Altera `paint` no lugar
 * (vizinhança de 4, com pilha). Devolve false sem mexer em nada se o toque caiu fora, num traço ou numa área
 * que já tem a cor escolhida; true se pintou.
 */
export function floodFill(paint: ImageData, mask: Uint8Array, startX: number, startY: number, rgb: [number, number, number]) {
  const { width: w, height: h, data } = paint
  const start = startY * w + startX
  if (startX < 0 || startY < 0 || startX >= w || startY >= h || mask[start]) return false
  const target = [data[start * 4], data[start * 4 + 1], data[start * 4 + 2]]
  if (target[0] === rgb[0] && target[1] === rgb[1] && target[2] === rgb[2]) return false
  // tolerância para as bordas suavizadas do pincel
  const same = (i: number) =>
    !mask[i] &&
    Math.abs(data[i * 4] - target[0]) + Math.abs(data[i * 4 + 1] - target[1]) + Math.abs(data[i * 4 + 2] - target[2]) < 60
  const visited = new Uint8Array(w * h)
  const stack = [start]
  while (stack.length) {
    const i = stack.pop()!
    if (visited[i] || !same(i)) continue
    visited[i] = 1
    data[i * 4] = rgb[0]
    data[i * 4 + 1] = rgb[1]
    data[i * 4 + 2] = rgb[2]
    data[i * 4 + 3] = 255
    const x = i % w
    if (x > 0) stack.push(i - 1)
    if (x < w - 1) stack.push(i + 1)
    if (i >= w) stack.push(i - w)
    if (i < w * (h - 1)) stack.push(i + w)
  }
  // cobre também os pixels do traço vizinhos à área, para não sobrar uma franja branca entre a tinta e a linha
  for (let i = 0; i < w * h; i++) {
    if (!mask[i] || visited[i]) continue
    const x = i % w
    if ((x > 0 && visited[i - 1]) || (x < w - 1 && visited[i + 1]) || visited[i - w] || visited[i + w]) {
      data[i * 4] = rgb[0]
      data[i * 4 + 1] = rgb[1]
      data[i * 4 + 2] = rgb[2]
    }
  }
  return true
}
