'use client'

import { useState } from 'react'

import { salvarImpedimento } from './actions'

/**
 * Editor inline do campo `impedimento` do candidato. Texto livre — admin
 * escreve o motivo (ex.: "Sub judice — julgamento pendente no TSE").
 * Vazio = sem impedimento. Apos salvar, candidato ganha badge amarelo no
 * admin e icone (i) com tooltip na pagina publica /resultados.
 */
export function EditarImpedimento({
  candidatoId,
  valorAtual,
}: {
  candidatoId: string
  valorAtual: string
}) {
  const [aberto, setAberto] = useState(false)
  const tem = valorAtual.length > 0

  if (!aberto) {
    return (
      <div className="flex items-center gap-2 text-[11px]">
        {tem ? (
          <>
            <span className="text-amber-700 truncate flex-1">
              <strong>Impedimento:</strong> {valorAtual}
            </span>
            <button
              type="button"
              onClick={() => setAberto(true)}
              className="text-muted-foreground hover:text-foreground underline"
            >
              Editar
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setAberto(true)}
            className="text-muted-foreground hover:text-foreground underline"
          >
            + Marcar como sub judice / impedido
          </button>
        )}
      </div>
    )
  }

  return (
    <form
      action={async (fd) => {
        await salvarImpedimento(fd)
        setAberto(false)
      }}
      className="flex flex-col sm:flex-row gap-2"
    >
      <input type="hidden" name="id" value={candidatoId} />
      <input
        name="impedimento"
        defaultValue={valorAtual}
        placeholder="Ex.: Sub judice — julgamento pendente no TSE"
        maxLength={500}
        autoFocus
        className="flex-1 h-9 px-3 rounded-md border border-amber-300 bg-amber-50 text-sm"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          className="h-9 px-3 rounded-md bg-amber-600 text-white text-xs font-medium hover:opacity-90"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="h-9 px-3 rounded-md border border-border text-xs hover:bg-muted"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
