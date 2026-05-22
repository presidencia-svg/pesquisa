'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

const formatar = (raw: string): string => {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export function DiagnosticoForm({ valorInicial }: { valorInicial: string }) {
  const router = useRouter()
  const [cpf, setCpf] = useState(formatar(valorInicial))
  const [pending, setPending] = useState(false)

  const limpo = cpf.replace(/\D/g, '')
  const podeSubmeter = limpo.length === 11

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!podeSubmeter) return
    setPending(true)
    router.push(`/admin/diagnostico-spc?cpf=${limpo}`)
  }

  function copiarUrl() {
    const url = window.location.href
    navigator.clipboard.writeText(url)
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-md border border-border bg-background p-4 flex flex-col sm:flex-row gap-3 items-end"
    >
      <label htmlFor="cpf" className="flex-1 flex flex-col gap-1">
        <span className="text-xs font-medium text-foreground">
          CPF para testar
        </span>
        <input
          id="cpf"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="000.000.000-00"
          value={cpf}
          onChange={(e) => setCpf(formatar(e.target.value))}
          className="h-11 px-3 rounded-md border border-border bg-background tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </label>
      <button
        type="submit"
        disabled={!podeSubmeter || pending}
        className="h-11 px-5 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition"
      >
        {pending ? 'Consultando…' : 'Diagnosticar'}
      </button>
      {valorInicial ? (
        <button
          type="button"
          onClick={copiarUrl}
          className="h-11 px-4 rounded-md border border-border text-foreground text-sm hover:bg-muted transition"
          title="Copia URL com o CPF — útil pra compartilhar"
        >
          Copiar URL
        </button>
      ) : null}
    </form>
  )
}
