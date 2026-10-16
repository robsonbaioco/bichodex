/** Script principal da página em uso; o nome muda a cada publicação (leva o hash do conteúdo). */
function scriptOf(html: string): string | null {
  return html.match(/assets\/index-[\w-]+\.js/)?.[0] ?? null
}

const running = scriptOf(document.documentElement.outerHTML)

/** Se o servidor já tem uma versão mais nova que a que está rodando. */
async function hasUpdate(): Promise<boolean> {
  if (!running) return false
  try {
    const response = await fetch('./', { cache: 'no-store' })
    if (!response.ok) return false
    const latest = scriptOf(await response.text())
    return !!latest && latest !== running
  } catch {
    return false // sem conexão: segue na versão atual
  }
}

/**
 * Procura versão nova quando o app volta para a tela (no celular o app instalado fica aberto em segundo plano
 * por dias) e de tempos em tempos enquanto está aberto. Com versão nova, `onUpdate` decide se recarrega já.
 */
export function watchForUpdates(onUpdate: () => void): void {
  let notified = false
  const check = async () => {
    if (notified || !(await hasUpdate())) return
    notified = true
    onUpdate()
  }
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check())
  setInterval(() => document.visibilityState === 'visible' && check(), 30 * 60 * 1000)
}
