import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Gera os ícones PNG do app em public/ a partir de public/icon.svg: `npm run icons`.
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#0f7a4d' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#0f7a4d' } },
  },
  images: ['public/icon.svg'],
})
