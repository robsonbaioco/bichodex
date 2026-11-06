// Aviso de versão nova, montado pelo main.tsx ao lado do App. Usa updates.ts para saber quando há
// publicação nova; fora dos jogos recarrega a página sozinho, nos jogos mostra um cartão com o botão.
import { useEffect, useState } from 'react'
import { watchForUpdates } from '../updates'

/** Partidas em andamento não são guardadas: nessas telas a atualização espera a pessoa pedir. */
const busy = () => location.hash.startsWith('#/jogos')

/** Recarrega sozinho quando há versão nova publicada; nos jogos, só avisa. */
export function UpdatePrompt() {
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    if (!import.meta.env.PROD) return
    // sem limpeza: o componente vive o tempo todo, e os ouvintes registrados duram até a página recarregar
    watchForUpdates(() => (busy() ? setAvailable(true) : location.reload()))
  }, [])

  if (!available) return null

  return (
    <aside className="install" aria-label="Atualização disponível">
      <img src="./pwa-192x192.png" alt="" width="44" height="44" />
      <div className="install-text">
        <strong>Nova versão do Bichodex</strong>
        <span>Atualize quando terminar a partida.</span>
      </div>
      <div className="install-actions">
        <button className="btn btn-primary" onClick={() => location.reload()}>
          🔄 Atualizar
        </button>
      </div>
    </aside>
  )
}
