'use client'

import { useActionState } from 'react'

import {
  dispararLoteNotificacao,
  type NotificarResultadoState,
} from './actions'

const initialState: NotificarResultadoState = { ok: true }

export function DispararLoteForm({
  desabilitado,
  pendentes,
}: {
  desabilitado: boolean
  pendentes: number
}) {
  const [state, formAction, pending] = useActionState(
    async () => dispararLoteNotificacao(),
    initialState,
  )

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <button
        type="submit"
        disabled={pending || desabilitado}
        className="h-12 px-6 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition self-start"
      >
        {pending
          ? 'Enviando lote…'
          : desabilitado
            ? 'Sem pendentes ou edição não divulgada'
            : `Disparar lote (${Math.min(100, pendentes)} de ${pendentes})`}
      </button>

      {state.message ? (
        <p
          role="status"
          aria-live="polite"
          className={
            state.ok
              ? 'text-sm text-accent bg-accent/5 border border-accent/20 rounded-md px-3 py-2'
              : 'text-sm text-error bg-error/5 border border-error/20 rounded-md px-3 py-2'
          }
        >
          {state.message}
        </p>
      ) : null}

      {state.resumo ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-muted rounded px-2 py-1">
            <span className="text-muted-foreground">Processados:</span>{' '}
            <strong>{state.resumo.processados}</strong>
          </div>
          <div className="bg-accent/10 rounded px-2 py-1">
            <span className="text-muted-foreground">Enviados:</span>{' '}
            <strong>{state.resumo.enviados}</strong>
          </div>
          <div className="bg-error/10 rounded px-2 py-1">
            <span className="text-muted-foreground">Falhas:</span>{' '}
            <strong>{state.resumo.falhas}</strong>
          </div>
          <div className="bg-primary/10 rounded px-2 py-1">
            <span className="text-muted-foreground">Restam:</span>{' '}
            <strong>{state.resumo.pendentes_restantes}</strong>
          </div>
        </div>
      ) : null}
    </form>
  )
}
