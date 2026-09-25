/* Service Worker оболочки Dating PWA. Не кэширует /api и /auth. */
const VERSION = 'll-dating-shell-v1'
const SHELL_CACHE = `shell-${VERSION}`

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      const base = self.registration.scope
      return cache.addAll([base, `${base}manifest.webmanifest`, `${base}favicon.svg`]).catch(() => undefined)
    }),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith('shell-') && k !== SHELL_CACHE).map((k) => caches.delete(k))),
    ),
  )
  self.clients.claim()
})

function isApiOrAuth(url) {
  const p = url.pathname
  return p.includes('/api/') || p.includes('/auth/') || p.endsWith('/api') || p.endsWith('/auth')
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (isApiOrAuth(url)) return

  event.respondWith(
    caches.open(SHELL_CACHE).then(async (cache) => {
      const cached = await cache.match(req)
      if (cached) return cached
      try {
        const res = await fetch(req)
        if (res.ok && (url.pathname.match(/\.(js|css|png|svg|jpg|jpeg|webp|woff2?)$/i) || req.mode === 'navigate')) {
          cache.put(req, res.clone())
        }
        return res
      } catch (err) {
        if (req.mode === 'navigate') {
          const fallback = await cache.match(self.registration.scope)
          if (fallback) return fallback
        }
        throw err
      }
    }),
  )
})
