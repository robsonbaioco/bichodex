// Service worker mínimo: rede primeiro, com cópia em cache do próprio app para abrir offline.
// Registrado pelo main.tsx só no build de produção. Cuida apenas de arquivos da mesma origem (página,
// scripts, CSS, ícones, jogos); as APIs externas (iNaturalist etc.) e as fotos passam direto, sem cache.

/** Nome do cache; trocar o nome faz o `activate` apagar o cache antigo inteiro. */
const CACHE = 'bichodex-v1'

// Ativa a versão nova na hora, sem esperar todas as abas fecharem.
self.addEventListener('install', () => self.skipWaiting())

// Apaga caches de nomes antigos e passa a controlar as abas já abertas.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

// Toda resposta da rede vira a cópia em cache; sem rede, serve a cópia (ou a página inicial, numa navegação).
self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return

  // A página sempre confere com o servidor (o GitHub Pages manda guardar por 10 min), para uma versão nova
  // chegar na hora; os arquivos de assets têm o hash no nome e podem vir do cache do navegador.
  const network =
    request.mode === 'navigate' ? fetch(request.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(request)

  event.respondWith(
    network
      .then((response) => {
        // grava qualquer resposta, inclusive 404/500; o cache só é usado quando a rede falha de vez
        const copy = response.clone()
        caches.open(CACHE).then((cache) => cache.put(request, copy))
        return response
      })
      .catch(async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        if (request.mode === 'navigate') {
          // endereço nunca visitado offline: cai na página inicial em cache (as rotas são por #, então serve)
          const shell = await caches.match(self.registration.scope)
          if (shell) return shell
        }
        return Response.error()
      }),
  )
})
