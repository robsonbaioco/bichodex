import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchTaxon, type Photo, type Taxon } from '../api'
import { categoryOf } from '../categories'
import { displayName, type SeenWhere } from '../format'
import { CARD_SIZES, SITE_URL, drawCard, loadImage, type CardFormat } from '../shareCard'

type Source = 'catalog' | 'own'

/** Só reutilizamos fotos do catálogo com licença Creative Commons que permita obras derivadas. */
function isReusable(photo: Photo | null | undefined): photo is Photo {
  return !!(photo?.medium_url ?? photo?.square_url) && !!photo?.license_code && !photo.license_code.includes('nd')
}

const largeUrl = (photo: Photo) => (photo.medium_url ?? photo.square_url)!.replace(/\/(medium|square)\./, '/large.')

const pickRandom = (photos: Photo[], except?: Photo | null): Photo | null => {
  const pool = photos.length > 1 ? photos.filter((photo) => photo !== except) : photos
  return pool[Math.floor(Math.random() * pool.length)] ?? null
}

const slug = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

interface Props {
  taxon: Taxon
  place: string
  /** Posição desta espécie entre as avistadas pela pessoa. */
  ordinal: number
  where: SeenWhere
  onWhereChange: (where: SeenWhere) => void
  onClose: () => void
}

export function ShareAchievement({ taxon, place, ordinal, where, onWhereChange, onClose }: Props) {
  /** Fotos do catálogo que podem ilustrar o cartão; null enquanto a lista é consultada. */
  const [catalogPhotos, setCatalogPhotos] = useState<Photo[] | null>(null)
  const [catalogPhoto, setCatalogPhoto] = useState<Photo | null>(null)
  const [source, setSource] = useState<Source>('catalog')
  const [ownPhoto, setOwnPhoto] = useState<File | null>(null)
  const [format, setFormat] = useState<CardFormat>('feed')
  const [image, setImage] = useState<Blob | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const name = displayName(taxon)
  const category = categoryOf(taxon)
  const atZoo = where === 'zoo'

  useEffect(() => {
    // captura antes da ficha da espécie, que também fecha com Esc
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      onClose()
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [onClose])

  // Sorteia a foto do catálogo entre todas as reutilizáveis da espécie, não só a de capa.
  useEffect(() => {
    const controller = new AbortController()
    const use = (photos: Photo[]) => {
      setCatalogPhotos(photos)
      setCatalogPhoto(pickRandom(photos))
    }
    setCatalogPhotos(null)
    fetchTaxon(taxon.id, controller.signal)
      .then((detail) => {
        const photos = (detail.taxon_photos ?? []).map((item) => item.photo).filter(isReusable)
        use(photos.length ? photos : [detail.default_photo].filter(isReusable))
      })
      .catch((error) => {
        if (error.name !== 'AbortError') use([taxon.default_photo].filter(isReusable))
      })
    return () => controller.abort()
  }, [taxon])

  const catalogUrl = catalogPhoto && largeUrl(catalogPhoto)
  const catalogReady = catalogPhotos !== null

  useEffect(() => {
    if (!catalogReady) return
    let cancelled = false
    setImage(null)
    setWarning(null)

    async function render() {
      const usingCatalog = source === 'catalog' && catalogUrl
      const photoSource = usingCatalog ? catalogUrl : source === 'own' ? ownPhoto : null
      const [photo, logo] = await Promise.all([
        photoSource
          ? loadImage(photoSource).catch(() => {
              if (!cancelled)
                setWarning(
                  usingCatalog
                    ? 'Não foi possível carregar a foto do catálogo. Envie uma foto sua.'
                    : 'Não foi possível abrir essa foto. Tente outro arquivo.',
                )
              return null
            })
          : null,
        loadImage('./icon.svg').catch(() => null),
      ])
      if (cancelled || !canvas.current) return
      drawCard(canvas.current, {
        format,
        name,
        scientificName: taxon.name,
        categoryLabel: category.label,
        categoryEmoji: category.emoji,
        color: category.color,
        place: atZoo ? 'No zoológico' : place,
        seal: atZoo ? 'AVISTADA NO ZOOLÓGICO!' : 'ESPÉCIE AVISTADA!',
        ordinal,
        credit: usingCatalog && photo ? catalogPhoto?.attribution : undefined,
        photo,
        logo,
      })
      canvas.current.toBlob((blob) => !cancelled && setImage(blob), 'image/jpeg', 0.92)
    }

    render()
    return () => {
      cancelled = true
    }
  }, [catalogReady, source, ownPhoto, format, catalogUrl, catalogPhoto, taxon, name, category, place, atZoo, ordinal])

  const fileName = `bichodex-${slug(name) || taxon.id}.jpg`
  const file = useMemo(() => image && new File([image], fileName, { type: 'image/jpeg' }), [image, fileName])
  const downloadUrl = useMemo(() => (image ? URL.createObjectURL(image) : null), [image])
  useEffect(() => () => void (downloadUrl && URL.revokeObjectURL(downloadUrl)), [downloadUrl])

  const text = `Avistei ${name} (${taxon.name}) ${atZoo ? 'no zoológico' : `em ${place}`}! É a minha ${ordinal}ª espécie no #Bichodex 🐾\nVeja a ficha: ${SITE_URL}#/especie/${taxon.id}`
  const canShareFile = !!file && !!navigator.canShare?.({ files: [file] })

  async function share() {
    if (!file) return
    try {
      await navigator.share({ files: [file], title: 'Bichodex', text })
    } catch {
      // a pessoa cancelou o compartilhamento
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <section
        className="sheet sheet-small share"
        role="dialog"
        aria-modal="true"
        aria-label="Compartilhar conquista"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="detail-bar">
          <span className="detail-number">🎉 Espécie avistada!</span>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </header>

        <div className="sheet-pad share-body">
          <p className="share-lead">
            <b>{name}</b> é a sua {ordinal}ª espécie. Monte o cartão e conte para todo mundo.
          </p>

          <canvas
            ref={canvas}
            className="share-preview"
            width={CARD_SIZES.feed.width}
            height={CARD_SIZES.feed.height}
            aria-label={`Cartão de conquista: ${name}`}
          />

          <div className="segmented" role="group" aria-label="Onde você viu">
            <button className={atZoo ? '' : 'is-active'} onClick={() => onWhereChange('wild')}>
              🌳 Na natureza
            </button>
            <button className={atZoo ? 'is-active' : ''} onClick={() => onWhereChange('zoo')}>
              🏛️ No zoológico
            </button>
          </div>

          <div className="segmented" role="group" aria-label="Foto do cartão">
            <button
              className={source === 'catalog' ? 'is-active' : ''}
              onClick={() => setSource('catalog')}
              disabled={catalogReady && !catalogUrl}
              title={
                catalogReady && !catalogUrl
                  ? 'As fotos do catálogo desta espécie não têm licença para reutilização'
                  : undefined
              }
            >
              Foto do catálogo
            </button>
            <button
              className={source === 'own' ? 'is-active' : ''}
              onClick={() => (ownPhoto ? setSource('own') : fileInput.current?.click())}
            >
              {ownPhoto ? 'Minha foto' : '📷 Enviar minha foto'}
            </button>
          </div>
          {source === 'catalog' && catalogPhotos && catalogPhotos.length > 1 && (
            <button className="link-btn" onClick={() => setCatalogPhoto(pickRandom(catalogPhotos, catalogPhoto))}>
              🔀 Sortear outra foto
            </button>
          )}
          {ownPhoto && source === 'own' && (
            <button className="link-btn" onClick={() => fileInput.current?.click()}>
              Trocar foto
            </button>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const chosen = e.target.files?.[0]
              if (chosen) {
                setOwnPhoto(chosen)
                setSource('own')
              }
              e.target.value = ''
            }}
          />

          <div className="segmented" role="group" aria-label="Formato do cartão">
            <button className={format === 'feed' ? 'is-active' : ''} onClick={() => setFormat('feed')}>
              Feed (4:5)
            </button>
            <button className={format === 'stories' ? 'is-active' : ''} onClick={() => setFormat('stories')}>
              Stories (9:16)
            </button>
          </div>

          {catalogReady && !catalogUrl && !ownPhoto && (
            <p className="fineprint">
              As fotos do catálogo desta espécie não podem ser reutilizadas. Envie uma foto sua para ilustrar o cartão.
            </p>
          )}
          {warning && (
            <p className="notice notice-error" role="alert">
              {warning}
            </p>
          )}

          <div className="share-actions">
            {canShareFile && (
              <button className="btn btn-primary btn-lg" onClick={share}>
                Compartilhar
              </button>
            )}
            {downloadUrl ? (
              <a className={`btn btn-lg${canShareFile ? '' : ' btn-primary'}`} href={downloadUrl} download={fileName}>
                Baixar imagem
              </a>
            ) : (
              <button className="btn btn-lg" disabled>
                Gerando imagem…
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
