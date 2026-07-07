'use client'

import { useEffect, useState } from 'react'

/**
 * Bloco de compartilhamento no encerramento — cresce a amostra sem viés
 * nem propaganda: o convite é pra REPRESENTATIVIDADE da pesquisa, não pra
 * fortalecer candidato. WhatsApp + copiar link + compartilhar nativo (mobile).
 */
const URL_PESQUISA = 'https://pesquisa.cdlaju.com.br'
const MENSAGEM =
  'Participei da Pesquisa Eleitoral Sergipe 2026! 🗳️ Responda você também — quanto mais gente de Sergipe responde, mais a pesquisa reflete a realidade.'

export function CompartilharPesquisa() {
  const [copiado, setCopiado] = useState(false)
  const [podeNativo, setPodeNativo] = useState(false)

  useEffect(() => {
    setPodeNativo(typeof navigator !== 'undefined' && !!navigator.share)
  }, [])

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${MENSAGEM} ${URL_PESQUISA}`)}`

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(URL_PESQUISA)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      /* clipboard bloqueado — ignora */
    }
  }

  const compartilharNativo = async () => {
    try {
      await navigator.share({
        title: 'Pesquisa Eleitoral Sergipe 2026',
        text: MENSAGEM,
        url: URL_PESQUISA,
      })
    } catch {
      /* usuário cancelou */
    }
  }

  return (
    <div className="w-full rounded-2xl bg-white text-capsule px-6 py-8 sm:px-10 sm:py-10 flex flex-col items-center gap-5 shadow-xl">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-3xl">📣</span>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Chame seus amigos!
        </h2>
        <p className="text-base sm:text-lg text-capsule/70 max-w-md">
          Quanto mais gente de Sergipe responde, mais a pesquisa reflete a
          realidade. Compartilhe e ajude a fortalecer a pesquisa.
        </p>
      </div>

      <div className="w-full max-w-md flex flex-col sm:flex-row gap-3">
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-2 h-14 px-6 rounded-xl bg-[#25D366] text-white text-lg font-semibold hover:brightness-95 transition"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.5 14.4c-.3-.15-1.7-.85-2-.95-.26-.1-.45-.15-.64.15-.19.28-.73.94-.9 1.13-.16.19-.33.21-.61.07-.3-.15-1.24-.46-2.36-1.46-.87-.78-1.46-1.73-1.63-2.02-.17-.29-.02-.45.13-.6.13-.13.29-.33.44-.5.15-.17.19-.29.29-.48.1-.19.05-.36-.02-.5-.08-.15-.64-1.55-.88-2.12-.23-.56-.47-.48-.64-.49h-.55c-.19 0-.5.07-.76.36s-1 .98-1 2.38 1.02 2.76 1.17 2.95c.14.19 2.01 3.08 4.88 4.32.68.29 1.21.47 1.63.6.68.22 1.3.19 1.79.11.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.34zM12 2A10 10 0 0 0 3.5 17.3L2 22l4.8-1.5A10 10 0 1 0 12 2z" />
          </svg>
          Compartilhar no WhatsApp
        </a>
        <button
          type="button"
          onClick={copiar}
          className="flex-1 inline-flex items-center justify-center h-14 px-6 rounded-xl border-2 border-capsule/20 text-capsule text-lg font-semibold hover:bg-capsule/5 transition"
        >
          {copiado ? '✓ Link copiado!' : 'Copiar link'}
        </button>
      </div>

      {podeNativo && (
        <button
          type="button"
          onClick={compartilharNativo}
          className="text-sm text-capsule/60 underline hover:text-capsule"
        >
          Mais opções de compartilhamento
        </button>
      )}
    </div>
  )
}
