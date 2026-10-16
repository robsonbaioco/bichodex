import { useRef, useState } from 'react'
import { formatNumber } from '../format'
import { exportBackup, parseBackup, restoreBackup, type BackupData } from '../storage'

interface Props {
  /** Na tela de boas-vindas só faz sentido trazer dados; não há nada para levar ainda. */
  importOnly?: boolean
}

/** Cópia dos dados em arquivo, para trocar de navegador ou de aparelho sem perder a dex. */
export function Backup({ importOnly = false }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<BackupData | null>(null)
  const [error, setError] = useState('')

  function download() {
    const backup = exportBackup()
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `bichodex-${backup.exportedAt.slice(0, 10)}.json`
    document.body.append(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function pick(file: File | undefined) {
    if (!file) return
    setError('')
    const backup = parseBackup(await file.text())
    if (backup) setPending(backup)
    else setError('Este arquivo não é uma cópia de dados do Bichodex.')
    if (input.current) input.current.value = ''
  }

  function confirm() {
    if (!pending) return
    try {
      restoreBackup(pending)
    } catch {
      setError('Não foi possível gravar os dados neste navegador.')
      setPending(null)
      return
    }
    // recarrega para todo o app ler os dados novos de uma vez (tema, local, dex, missões…)
    location.reload()
  }

  const seenCount = Array.isArray(pending?.data.seen) ? pending.data.seen.length : 0

  return (
    <section className="backup">
      {!importOnly && (
        <>
          <h2>Trocar de aparelho</h2>
          <p>
            Seus dados ficam só neste navegador. Exporte uma cópia e importe no outro navegador ou aparelho para levar a
            dex, as missões e as preferências.
          </p>
        </>
      )}
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {pending ? (
        <div className="backup-confirm" role="alert">
          <p>
            Cópia de {new Date(pending.exportedAt).toLocaleDateString('pt-BR')}, com {formatNumber(seenCount)}{' '}
            {seenCount === 1 ? 'espécie avistada' : 'espécies avistadas'}. Os dados atuais deste aparelho serão
            substituídos.
          </p>
          <div className="backup-actions">
            <button className="btn btn-primary" onClick={confirm}>
              Substituir e importar
            </button>
            <button className="btn" onClick={() => setPending(null)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : importOnly ? (
        <button className="link-btn" onClick={() => input.current?.click()}>
          📥 Já usa o Bichodex em outro aparelho? Importar dados
        </button>
      ) : (
        <div className="backup-actions">
          <button className="btn" onClick={download}>
            📤 Exportar dados
          </button>
          <button className="btn" onClick={() => input.current?.click()}>
            📥 Importar dados
          </button>
        </div>
      )}
      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
