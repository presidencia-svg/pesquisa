'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Cronômetro regressivo até a divulgação prevista (edicao.divulgacao_prevista),
 * exibido em /resultados enquanto a edição ainda não foi divulgada.
 *
 * Quando chega a zero, passa a recarregar os dados da página a cada 20 s:
 * assim que o admin digita o TOTP e divulga, quem estiver com a página
 * aberta vê os resultados sem precisar atualizar.
 */
export function CronometroDivulgacao({ ateISO }: { ateISO: string }) {
  const router = useRouter()
  const alvo = new Date(ateISO).getTime()
  const [restante, setRestante] = useState<number | null>(null)

  useEffect(() => {
    const tick = () => setRestante(Math.max(0, alvo - Date.now()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [alvo])

  useEffect(() => {
    if (restante !== 0) return
    const id = setInterval(() => router.refresh(), 20_000)
    return () => clearInterval(id)
  }, [restante, router])

  if (restante === null) return null // evita divergência SSR/cliente

  if (restante === 0) {
    return (
      <div className="w-full rounded-lg border border-accent/40 bg-accent/10 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
          Divulgação
        </p>
        <p className="mt-1 text-lg font-semibold text-foreground">A qualquer momento</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta página atualiza sozinha quando o resultado for liberado.
        </p>
      </div>
    )
  }

  const s = Math.floor(restante / 1000)
  const dias = Math.floor(s / 86_400)
  const horas = Math.floor((s % 86_400) / 3600)
  const min = Math.floor((s % 3600) / 60)
  const seg = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="w-full rounded-lg border border-border bg-muted/40 px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
        Faltam
      </p>
      <p
        className="mt-1 text-3xl sm:text-4xl font-semibold tabular-nums tracking-tight text-foreground"
        aria-live="polite"
      >
        {dias > 0 && (
          <>
            {dias}
            <span className="text-base font-normal text-muted-foreground mr-3">d</span>
          </>
        )}
        {pad(horas)}
        <span className="text-base font-normal text-muted-foreground mr-2">h</span>
        {pad(min)}
        <span className="text-base font-normal text-muted-foreground mr-2">min</span>
        {pad(seg)}
        <span className="text-base font-normal text-muted-foreground">s</span>
      </p>
    </div>
  )
}
