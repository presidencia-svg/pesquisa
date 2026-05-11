// Service worker minimo pra atender criterio de "instalavel" do Chrome/Edge.
// Nao faz cache — todo trafego passa direto pela rede. Cache offline pode
// vir depois sem mexer no que ja' tem aqui.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', () => {
  // No-op: deixa o browser cuidar.
})
