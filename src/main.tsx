import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { InstallPrompt } from './components/InstallPrompt'
import { applyTheme, loadTheme } from './themes'
import '@fontsource/permanent-marker/latin-400.css'
import '@fontsource/cinzel/latin-700.css'
import '@fontsource/press-start-2p/latin-400.css'
import '@fontsource/rubik-wet-paint/latin-400.css'
import '@fontsource/alfa-slab-one/latin-400.css'
import '@fontsource/caveat/latin-700.css'
import '@fontsource/vt323/latin-400.css'
import '@fontsource/orbitron/latin-800.css'
import '@fontsource/bangers/latin-400.css'
import '@fontsource/bebas-neue/latin-400.css'
import './styles.css'
import './themes.css'
import './themes-ousados.css'

// antes da primeira pintura, para o app não piscar no tema original
applyTheme(loadTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <InstallPrompt />
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}
