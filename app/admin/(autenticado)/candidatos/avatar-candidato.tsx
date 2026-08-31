'use client'

import { useState } from 'react'

/**
 * Avatar do candidato no painel admin: mostra a FOTO (foto_url) com o
 * número num selo no canto. Se a foto falhar/estiver ausente, cai no
 * quadrado colorido com o número (mesmo visual antigo).
 */
export function AvatarCandidato({
  fotoUrl,
  numero,
  corHex,
}: {
  fotoUrl: string | null
  numero: number
  corHex: string | null
}) {
  const [erro, setErro] = useState(false)
  const cor = corHex ?? '#52525b'

  if (!fotoUrl || erro) {
    return (
      <div
        className="w-12 h-12 rounded-md flex items-center justify-center text-xs font-bold text-white tabular-nums flex-none"
        style={{ background: cor }}
      >
        {numero}
      </div>
    )
  }

  return (
    <div className="relative w-12 h-12 flex-none">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={fotoUrl}
        alt=""
        onError={() => setErro(true)}
        className="w-12 h-12 rounded-md object-cover bg-muted"
      />
      <span
        className="absolute -bottom-1 -right-1 min-w-5 h-5 px-1 rounded-md flex items-center justify-center text-[10px] font-bold text-white tabular-nums border border-background"
        style={{ background: cor }}
      >
        {numero}
      </span>
    </div>
  )
}
