'use client'

import { useActionState, useState } from 'react'

import { solicitarExclusao, type ExclusaoState } from './actions'

const initialState: ExclusaoState = { ok: true }

function formatarCpfInput(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export function ExcluirForm() {
  const [state, action, pending] = useActionState(
    solicitarExclusao,
    initialState,
  )
  const [cpf, setCpf] = useState('')
  const [confirmou, setConfirmou] = useState(false)

  if (state.ok && state.excluido) {
    return (
      <div className="rounded-md border border-accent/40 bg-accent/5 px-5 py-5 flex flex-col gap-3">
        <p className="text-base font-semibold text-foreground">
          ✓ Exclusão concluída
        </p>
        <p className="text-sm text-foreground leading-relaxed">
          {state.message}
        </p>
      </div>
    )
  }

  if (state.ok && state.excluido === false) {
    return (
      <div className="rounded-md border border-border bg-muted px-5 py-5 flex flex-col gap-3">
        <p className="text-base font-semibold text-foreground">
          Nenhum dado encontrado
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {state.message}
        </p>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">Seu CPF</span>
        <input
          name="cpf"
          type="text"
          inputMode="numeric"
          required
          placeholder="000.000.000-00"
          value={cpf}
          onChange={(e) => setCpf(formatarCpfInput(e.target.value))}
          className="h-12 px-4 rounded-md border border-border bg-background text-base tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </label>

      <label className="flex items-start gap-3 text-sm text-foreground border border-amber-300 bg-amber-50 rounded-md px-4 py-3 cursor-pointer">
        <input
          type="checkbox"
          name="confirmar"
          required
          checked={confirmou}
          onChange={(e) => setConfirmou(e.target.checked)}
          className="mt-0.5 w-4 h-4 flex-none"
        />
        <span className="leading-snug text-amber-900">
          Entendo que esta ação é <strong>definitiva</strong>. Meus
          dados pessoais serão apagados imediatamente das bases da CDL.
          Os votos que dei (se houver) permanecem anonimamente
          computados pois vivem em tabela separada sem ligação ao meu CPF.
        </span>
      </label>

      {state.message && !state.ok ? (
        <p
          role="alert"
          aria-live="polite"
          className="text-sm text-error bg-error/5 border border-error/20 rounded-md px-3 py-2"
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={
          pending ||
          cpf.replace(/\D/g, '').length !== 11 ||
          !confirmou
        }
        className="h-12 px-6 rounded-md bg-error text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition"
      >
        {pending ? 'Excluindo…' : 'Excluir meus dados'}
      </button>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Limite: 3 solicitações por IP a cada hora (anti-abuso). Em caso
        de problemas, contate o Encarregado de Dados da CDL Aracaju em{' '}
        <span className="font-mono">dpo@cdlaju.com.br</span>.
      </p>
    </form>
  )
}
