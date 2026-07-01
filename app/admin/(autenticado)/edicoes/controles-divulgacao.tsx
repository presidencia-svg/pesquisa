'use client'

import { useActionState, useState } from 'react'

import {
  atualizarTurno,
  divulgarEdicao,
  retirarDivulgacao,
  salvarMetadadosDivulgacao,
  type EdicaoState,
} from './actions'

const initial: EdicaoState = { ok: true }

type Props = {
  edicaoId: string
  divulgadaEm: string | null
  registroTre: string | null
  conreResponsavel: string | null
  dataRegistroPesqele: string | null
  divulgacaoPrevista: string | null
  turno: number
}

/**
 * Bloco de controle de divulgacao publica da edicao. Tres acoes:
 *   1. Editar/salvar metadados (registro TRE + data prevista).
 *   2. Divulgar (botao primario — so' habilita se tiver registro_tre).
 *   3. Retirar divulgacao (volta pra estado nao divulgado).
 */
export function ControlesDivulgacao({
  edicaoId,
  divulgadaEm,
  registroTre,
  conreResponsavel,
  dataRegistroPesqele,
  divulgacaoPrevista,
  turno,
}: Props) {
  const [editando, setEditando] = useState(false)
  const [estadoMeta, salvarMeta, salvandoMeta] = useActionState(
    salvarMetadadosDivulgacao,
    initial,
  )
  const [estadoDivulgar, divulgar, divulgando] = useActionState(
    (_prev: EdicaoState, fd: FormData) => divulgarEdicao(fd),
    initial,
  )

  const divulgada = Boolean(divulgadaEm)

  // Bloco do turno, sempre visivel acima dos demais controles.
  const blocoTurno = (
    <form
      action={atualizarTurno}
      className="flex items-center justify-between gap-3 pt-3 mt-2 border-t border-dashed border-border"
    >
      <input type="hidden" name="id" value={edicaoId} />
      <div className="flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
          Turno
        </span>
        <select
          name="turno"
          defaultValue={String(turno)}
          className="h-8 px-2 rounded-md border border-border bg-background text-xs"
        >
          <option value="1">1º Turno</option>
          <option value="2">2º Turno</option>
        </select>
      </div>
      <button
        type="submit"
        className="h-8 px-3 rounded-md border border-border text-[11px] hover:bg-muted transition"
      >
        Salvar turno
      </button>
    </form>
  )

  if (!editando && !divulgada) {
    return (
      <>
        {blocoTurno}
        <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-dashed border-border">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Divulgação pública: <strong className="text-foreground">não divulgada</strong>
              {divulgacaoPrevista && (
                <>
                  {' '}
                  · Prevista pra{' '}
                  <span className="font-medium text-foreground">
                    {formatarPrevista(divulgacaoPrevista)}
                  </span>
                </>
              )}
            </p>
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="h-8 px-3 rounded-md border border-border text-[11px] hover:bg-muted transition whitespace-nowrap"
            >
              Editar registro / divulgar
            </button>
          </div>
          {estadoDivulgar.message && (
            <p className="text-[11px] text-error">{estadoDivulgar.message}</p>
          )}
        </div>
      </>
    )
  }

  if (divulgada && !editando) {
    return (
      <>
        {blocoTurno}
        <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-dashed border-border">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs">
              <span className="text-[10px] uppercase tracking-widest text-accent bg-accent/10 border border-accent/30 rounded-full px-2 py-0.5">
                divulgada
              </span>
              <span className="ml-2 text-muted-foreground">
                em{' '}
                <span className="font-medium text-foreground">
                  {formatarPrevista(divulgadaEm!)}
                </span>
              </span>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="h-8 px-3 rounded-md border border-border text-[11px] hover:bg-muted transition"
              >
                Editar
              </button>
              <form action={retirarDivulgacao}>
                <input type="hidden" name="id" value={edicaoId} />
                <button
                  type="submit"
                  className="h-8 px-3 rounded-md border border-error/40 text-error text-[11px] hover:bg-error/5 transition"
                >
                  Retirar divulgação
                </button>
              </form>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Modo editando — formulario de metadados + acao divulgar
  return (
    <>
      {blocoTurno}
      <div className="flex flex-col gap-3 mt-2 pt-3 border-t border-dashed border-border">
      <form action={salvarMeta} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={edicaoId} />
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Nº de registro TRE/SE (PesqEle)
          </span>
          <input
            name="registro_tre"
            defaultValue={registroTre ?? ''}
            placeholder="SE-XXXXX/2026"
            className="h-9 px-3 rounded-md border border-border bg-background text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Nº CONRE do estatístico responsável (obrigatório p/ divulgar)
          </span>
          <input
            name="numero_conre_responsavel"
            defaultValue={conreResponsavel ?? ''}
            placeholder="ex.: 9-01234"
            className="h-9 px-3 rounded-md border border-border bg-background text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Data do registro no PesqEle (divulgação só ≥5 dias depois)
          </span>
          <input
            name="data_registro_pesqele"
            type="date"
            defaultValue={dataRegistroPesqele ?? ''}
            className="h-9 px-3 rounded-md border border-border bg-background text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Data prevista pra divulgação (opcional — aparece pública)
          </span>
          <input
            name="divulgacao_prevista"
            type="datetime-local"
            defaultValue={
              divulgacaoPrevista ? toDatetimeLocal(divulgacaoPrevista) : ''
            }
            className="h-9 px-3 rounded-md border border-border bg-background text-sm"
          />
        </label>
        {estadoMeta.message && (
          <p className="text-[11px] text-error">{estadoMeta.message}</p>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={salvandoMeta}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50 hover:opacity-90"
          >
            {salvandoMeta ? 'Salvando…' : 'Salvar metadados'}
          </button>
          <button
            type="button"
            onClick={() => setEditando(false)}
            className="h-9 px-4 rounded-md border border-border text-xs hover:bg-muted transition"
          >
            Cancelar
          </button>
        </div>
      </form>

      {!divulgada && (
        <form action={divulgar} className="pt-3 border-t border-dashed border-border flex flex-col gap-2">
          <input type="hidden" name="id" value={edicaoId} />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Divulgar agora torna a página{' '}
            <span className="font-mono">/resultados</span> pública pra
            qualquer pessoa. Confira o registro TRE/SE antes.
          </p>
          {estadoDivulgar.message && (
            <p className="text-[11px] text-error">{estadoDivulgar.message}</p>
          )}
          <button
            type="submit"
            disabled={divulgando}
            className="h-9 px-4 rounded-md bg-accent text-white text-xs font-semibold disabled:opacity-50 hover:opacity-90 transition self-start"
            onClick={(e) => {
              if (
                !confirm(
                  'Confirma divulgação pública? A página /resultados ficará visível pra qualquer um.',
                )
              ) {
                e.preventDefault()
              }
            }}
          >
            {divulgando ? 'Divulgando…' : '📢 Divulgar publicamente'}
          </button>
        </form>
      )}
      </div>
    </>
  )
}

function formatarPrevista(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toDatetimeLocal(iso: string): string {
  const dt = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
}
