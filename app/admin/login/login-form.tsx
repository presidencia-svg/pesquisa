'use client'

import { useActionState } from 'react'

import { entrarAdmin, type LoginState } from './actions'

const initial: LoginState = { ok: true }

export function LoginForm({ totpAtivo }: { totpAtivo: boolean }) {
  const [state, action, pending] = useActionState(entrarAdmin, initial)

  return (
    <form action={action} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">Senha admin</span>
        <input
          name="senha"
          type="password"
          required
          autoComplete="current-password"
          autoFocus
          className="h-12 px-4 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </label>

      {totpAtivo ? (
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">
            Código (Google Authenticator)
          </span>
          <input
            name="codigo"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            required
            maxLength={6}
            minLength={6}
            placeholder="000000"
            className="h-12 px-4 rounded-md border border-border bg-background tracking-[0.4em] text-center text-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <span className="text-xs text-muted-foreground">
            Abra o app e digite os 6 dígitos atuais.
          </span>
        </label>
      ) : null}

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
        disabled={pending}
        className="h-12 px-6 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-50 hover:opacity-90 transition"
      >
        {pending ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}
