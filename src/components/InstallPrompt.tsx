import { useEffect, useState } from 'react'

// O Chrome só mostra o próprio aviso de instalação quando suas heurísticas de uso decidem, o que é raro.
// Em vez disso, sempre que o navegador informa que o app é instalável, mostramos um cartão nosso cujo
// botão abre o diálogo nativo. Dispensar vale até a próxima visita: nada é gravado.

type InstallPromptEvent = Event & { prompt(): Promise<void> }

let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

// Registrado no carregamento do módulo, para não perder o evento caso ele chegue antes de o React montar.
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault() // troca a mini-barra do Chrome pelo nosso cartão
  deferred = event as InstallPromptEvent
  notify()
})

window.addEventListener('appinstalled', () => {
  deferred = null
  notify()
})

export function InstallPrompt() {
  const [available, setAvailable] = useState(deferred !== null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const update = () => setAvailable(deferred !== null)
    listeners.add(update)
    update()
    return () => void listeners.delete(update)
  }, [])

  if (!available || dismissed) return null

  async function install() {
    const prompt = deferred
    deferred = null // o diálogo de instalação só pode ser aberto uma vez
    setAvailable(false)
    await prompt?.prompt()
  }

  return (
    <aside className="install" aria-label="Instalar app">
      <img src="./pwa-192x192.png" alt="" width="44" height="44" />
      <div className="install-text">
        <strong>Instalar o Bichodex</strong>
        <span>Abre em tela cheia, como um aplicativo.</span>
      </div>
      <div className="install-actions">
        <button className="btn" onClick={() => setDismissed(true)}>
          Agora não
        </button>
        <button className="btn btn-primary" onClick={install}>
          Instalar
        </button>
      </div>
    </aside>
  )
}
