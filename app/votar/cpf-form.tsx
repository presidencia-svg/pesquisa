'use client'

import { useActionState, useState } from 'react'

import { entrarComCpf, type VotarFormState } from './actions'

const formatarCpfInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

const initialState: VotarFormState = { ok: true }

export function CpfForm() {
  const [state, formAction, pending] = useActionState(entrarComCpf, initialState)
  const [cpfDisplay, setCpfDisplay] = useState('')

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <label htmlFor="cpf" className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">Seu CPF</span>
        <input
          id="cpf"
          name="cpf"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          required
          placeholder="000.000.000-00"
          value={cpfDisplay}
          onChange={(e) => setCpfDisplay(formatarCpfInput(e.target.value))}
          className="h-14 px-4 rounded-md border border-border bg-background text-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </label>

      {state.message ? (
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
        disabled={pending || cpfDisplay.replace(/\D/g, '').length !== 11}
        className="h-14 px-6 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition"
      >
        {pending ? 'Validando…' : 'Continuar'}
      </button>

      <p className="text-xs text-muted-foreground">
        Seu CPF é validado e armazenado apenas como um código embaralhado
        (hash). O número original nunca fica gravado.
      </p>
    </form>
  )
}
