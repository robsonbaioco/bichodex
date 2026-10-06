import { useEffect, useMemo, useRef, useState } from 'react'
import type { Taxon } from '../api'
import { categoryOf } from '../categories'
import { displayName } from '../format'
import { drawCard, loadImage, type CardFormat } from '../shareCard'

type Source = 'catalog' | 'own'

/** Só reutilizamos fotos do catálogo com licença Creative Commons que permita obras derivadas. */
function reusableCatalogPhoto(taxon: Taxon): string | null {
  const photo = taxon.default_photo
  const url = photo?.medium_url ?? photo?.square_url
  if (!url || !photo?.license_code || photo.license_code.includes('nd')) return null
  return url.replace(/\/(medium|square)\./, '/large.')
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
  onClose: () => void
}

export function ShareAchievement({ taxon, place, ordinal, onClose }: Props) {
  const catalogUrl = useMemo(() => reusableCatalogPhoto(taxon), [taxon])
  const [source, setSource] = useState<Source>(catalogUrl ? 'catalog' : 'own')
  const [ownPhoto, setOwnPhoto] = useState<File | null>(null)
  const [format, setFormat] = useState<CardFormat>('feed')
  const [image, setImage] = useState<Blob | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const name = displayName(taxon)
  const category = categoryOf(taxon)

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

  useEffect(() => {
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
        place,
        ordinal,
        credit: usingCatalog && photo ? taxon.default_photo?.attribution : undefined,
        photo,
        logo,
      })
      canvas.current.toBlob((blob) => !cancelled && setImage(blob), 'image/jpeg', 0.92)
    }

    render()
    return () => {
      cancelled = true
    }
  }, [source, ownPhoto, format, catalogUrl, taxon, name, category, place, ordinal])

  const fileName = `bichodex-${slug(name) || taxon.id}.jpg`
  const file = useMemo(() => image && new File([image], fileName, { type: 'image/jpeg' }), [image, fileName])
  const downloadUrl = useMemo(() => (image ? URL.createObjectURL(image) : null), [image])
  useEffect(() => () => void (downloadUrl && URL.revokeObjectURL(downloadUrl)), [downloadUrl])

  const text = `Avistei ${name} (${taxon.name}) em ${place}! É a minha ${ordinal}ª espécie no #Bichodex 🐾`
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

          <canvas ref={canvas} className={`share-preview is-${format}`} aria-label={`Cartão de conquista: ${name}`} />

          <div className="segmented" role="group" aria-label="Foto do cartão">
            <button
              className={source === 'catalog' ? 'is-active' : ''}
              onClick={() => setSource('catalog')}
              disabled={!catalogUrl}
              title={catalogUrl ? undefined : 'A foto do catálogo desta espécie não tem licença para reutilização'}
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

          {!catalogUrl && !ownPhoto && (
            <p className="fineprint">
              A foto do catálogo desta espécie não pode ser reutilizada. Envie uma foto sua para ilustrar o cartão.
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

          <p className="fineprint share-links">
            Ou baixe a imagem e publique com o texto pronto:{' '}
            <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
            {' · '}
            <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
              X
            </a>
          </p>
        </div>
      </section>
    </div>
  )
}
