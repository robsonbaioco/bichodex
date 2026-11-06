// Detecta quando uma versão nova do app foi publicada: baixa o index.html do servidor e compara o nome
// do script principal (que leva o hash do build) com o da página aberta. Usado só pelo UpdatePrompt.
// Não depende do service worker: o pedido vai com `no-store`, e o sw.js também busca a página na rede primeiro.

/** Script principal da página em uso; o nome muda a cada publicação (leva o hash do conteúdo). */
function scriptOf(html: string): string | null {
  return html.match(/assets\/index-[\w-]+\.js/)?.[0] ?? null
}

/** Script da versão que está rodando, lido uma vez ao carregar o módulo; nulo em desenvolvimento (lá não há hash). */
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
  // avisa uma vez só; depois disso as conferências param de ir à rede
  let notified = false
  const check = async () => {
    if (notified || !(await hasUpdate())) return
    notified = true
    onUpdate()
  }
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check())
  setInterval(() => document.visibilityState === 'visible' && check(), 30 * 60 * 1000)
}
