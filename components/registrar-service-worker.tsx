'use client'

import { useEffect } from 'react'

/**
 * Registra /sw.js silenciosamente apos o load. So' faz isso em producao
 * (NODE_ENV !== 'development'), assim dev nao sofre interferencia de cache.
 *
 * Falha silenciosa — se o browser nao suporta SW, ignora.
 */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV === 'development') return

    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Silencioso — SW e' progressive enhancement.
      })
    }

    if (document.readyState === 'complete') {
      onLoad()
    } else {
      window.addEventListener('load', onLoad)
      return () => window.removeEventListener('load', onLoad)
    }
  }, [])

  return null
}
