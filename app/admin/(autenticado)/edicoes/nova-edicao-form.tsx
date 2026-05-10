'use client'

import { useActionState, useState } from 'react'

import { criarEdicao, type EdicaoState } from './actions'

const initial: EdicaoState = { ok: true }

export function NovaEdicaoForm() {
  const [state, action, pending] = useActionState(criarEdicao, initial)
  const [aberto, setAberto] = useState(false)

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="self-start h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
      >
        + Nova edição
      </button>
    )
  }

  return (
    <form
      action={action}
      className="flex flex-col gap-3 p-5 rounded-md border border-border bg-muted"
    >
      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-widest text-foreground">
          Nome
        </span>
        <input
          name="nome"
          required
          minLength={3}
          placeholder="Pesquisa Outubro 2026"
          className="h-10 px-3 rounded-md border border-border bg-background"
        />
      </label>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest text-foreground">
            Início
          </span>
          <input
            name="inicio"
            type="datetime-local"
            required
            className="h-10 px-3 rounded-md border border-border bg-background"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest text-foreground">
            Fim
          </span>
          <input
            name="fim"
            type="datetime-local"
            required
            className="h-10 px-3 rounded-md border border-border bg-background"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-widest text-foreground">
          Registro TRE/SE (opcional)
        </span>
        <input
          name="registro_tre"
          placeholder="SE-XX/2026"
          className="h-10 px-3 rounded-md border border-border bg-background"
        />
      </label>

      {state.message ? (
        <p
          role="alert"
          className="text-xs text-error bg-error/5 border border-error/20 rounded-md px-3 py-2"
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:opacity-90 transition"
        >
          {pending ? 'Criando…' : 'Criar edição'}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="h-10 px-4 rounded-md border border-border text-sm hover:bg-background transition"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
