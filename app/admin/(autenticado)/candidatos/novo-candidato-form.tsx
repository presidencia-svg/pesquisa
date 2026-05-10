'use client'

import { useActionState, useState } from 'react'

import { criarCandidato, type CandidatoState } from './actions'

type Partido = { id: string; numero: number; sigla: string; nome: string }

const initial: CandidatoState = { ok: true }

export function NovoCandidatoForm({ partidos }: { partidos: Partido[] }) {
  const [state, action, pending] = useActionState(criarCandidato, initial)
  const [aberto, setAberto] = useState(false)

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="self-start h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
      >
        + Novo candidato
      </button>
    )
  }

  return (
    <form
      action={action}
      className="flex flex-col gap-3 p-5 rounded-md border border-border bg-muted"
    >
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest text-foreground">
            Cargo
          </span>
          <select
            name="cargo"
            required
            defaultValue=""
            className="h-10 px-3 rounded-md border border-border bg-background"
          >
            <option value="" disabled>
              Selecione…
            </option>
            <option value="presidente">Presidente</option>
            <option value="governador">Governador</option>
            <option value="senador">Senador</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest text-foreground">
            Número
          </span>
          <input
            name="numero"
            type="number"
            required
            min={1}
            max={99999}
            placeholder="13"
            className="h-10 px-3 rounded-md border border-border bg-background tabular-nums"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest text-foreground">
            Partido
          </span>
          <select
            name="partido_id"
            required
            defaultValue=""
            className="h-10 px-3 rounded-md border border-border bg-background"
          >
            <option value="" disabled>
              Selecione…
            </option>
            {partidos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.numero} · {p.sigla}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-widest text-foreground">
          Nome de urna (curto, MAIÚSCULAS)
        </span>
        <input
          name="nome_urna"
          required
          minLength={2}
          maxLength={100}
          placeholder="LULA"
          className="h-10 px-3 rounded-md border border-border bg-background uppercase"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-widest text-foreground">
          Nome completo (opcional)
        </span>
        <input
          name="nome_completo"
          maxLength={200}
          placeholder="Luiz Inácio Lula da Silva"
          className="h-10 px-3 rounded-md border border-border bg-background"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-widest text-foreground">
          Foto (URL, opcional)
        </span>
        <input
          name="foto_url"
          type="url"
          placeholder="https://..."
          className="h-10 px-3 rounded-md border border-border bg-background font-mono text-xs"
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
          {pending ? 'Salvando…' : 'Adicionar candidato'}
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
