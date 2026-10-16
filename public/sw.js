// Service worker mínimo: rede primeiro, com cópia em cache do próprio app para abrir offline.
const CACHE = 'bichodex-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

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
        const copy = response.clone()
        caches.open(CACHE).then((cache) => cache.put(request, copy))
        return response
      })
      .catch(async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        if (request.mode === 'navigate') {
          const shell = await caches.match(self.registration.scope)
          if (shell) return shell
        }
        return Response.error()
      }),
  )
})
