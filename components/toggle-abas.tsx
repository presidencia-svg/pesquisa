'use client'

import { useState, type ReactNode } from 'react'

/**
 * Alterna entre duas seções já renderizadas no servidor (RSC), só trocando a
 * visibilidade no client — sem refetch nem reload. Usado no /admin/resultados
 * pra alternar deputado entre "Por partido" e "Por federação".
 */
export function ToggleAbas({
  labelA,
  labelB,
  slotA,
  slotB,
}: {
  labelA: string
  labelB: string
  slotA: ReactNode
  slotB: ReactNode
}) {
  const [b, setB] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1 self-start rounded-lg bg-muted p-1">
        <button
          type="button"
          onClick={() => setB(false)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
            !b
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {labelA}
        </button>
        <button
          type="button"
          onClick={() => setB(true)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
            b
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {labelB}
        </button>
      </div>
      {b ? slotB : slotA}
    </div>
  )
}
