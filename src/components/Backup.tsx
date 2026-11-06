// Exportar e importar os dados do app em arquivo JSON. Usa exportBackup/parseBackup/restoreBackup de
// storage.ts, que leem e gravam todas as chaves `bichodex:` do localStorage. Aparece na tela de
// boas-vindas (só importar) e na aba Minha dex (exportar e importar).
import { useRef, useState } from 'react'
import { formatNumber } from '../format'
import { exportBackup, parseBackup, restoreBackup, type BackupData } from '../storage'

interface Props {
  /** Na tela de boas-vindas só faz sentido trazer dados; não há nada para levar ainda. */
  importOnly?: boolean
}

/** Cópia dos dados em arquivo, para trocar de navegador ou de aparelho sem perder a dex. */
export function Backup({ importOnly = false }: Props) {
  /** Seletor de arquivo escondido, acionado pelos botões de importar. */
  const input = useRef<HTMLInputElement>(null)
  /** Cópia já lida e válida, esperando a confirmação para substituir os dados atuais. */
  const [pending, setPending] = useState<BackupData | null>(null)
  const [error, setError] = useState('')

  /** Baixa a cópia como `bichodex-AAAA-MM-DD.json`, por um link temporário. */
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
    // libera o endereço do blob depois de o navegador começar o download
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  /** Lê o arquivo escolhido e, se for uma cópia válida, pede confirmação (nada é gravado ainda). */
  async function pick(file: File | undefined) {
    if (!file) return
    setError('')
    const backup = parseBackup(await file.text())
    if (backup) setPending(backup)
    else setError('Este arquivo não é uma cópia de dados do Bichodex.')
    // limpa o seletor para escolher o mesmo arquivo de novo disparar o onChange
    if (input.current) input.current.value = ''
  }

  /** Grava a cópia pendente no localStorage (apagando os dados atuais) e recarrega o app. */
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

  // a cópia vem de um arquivo qualquer: só confia em `seen` se for mesmo uma lista
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
              📥 Substituir e importar
            </button>
            <button className="btn" onClick={() => setPending(null)}>
              ✕ Cancelar
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
