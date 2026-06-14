'use client'

import { useState, useTransition } from 'react'

import { atualizarStatus } from './actions'

type Lead = {
  id: string
  empresa: string
  cnpj: string | null
  contato_nome: string
  contato_email: string
  contato_telefone: string | null
  cota: 'ouro' | 'prata'
  mensagem: string | null
  status: 'novo' | 'em_contato' | 'firmado' | 'recusado'
  criado_em: string
}

const ROTULO_COTA = { ouro: 'Ouro · R$ 15k', prata: 'Prata · R$ 10k' } as const
const COR_COTA = {
  ouro: 'rgb(202, 138, 4)',
  prata: 'rgb(100, 116, 139)',
} as const

const ROTULO_STATUS = {
  novo: 'Novo',
  em_contato: 'Em contato',
  firmado: 'Firmado',
  recusado: 'Recusado',
} as const

export function LinhaInteressado({ lead }: { lead: Lead }) {
  const [aberto, setAberto] = useState(false)
  const [statusAtual, setStatusAtual] = useState(lead.status)
  const [pending, startTransition] = useTransition()

  function mudarStatus(novo: Lead['status']) {
    startTransition(async () => {
      const r = await atualizarStatus(lead.id, novo)
      if (r.ok) setStatusAtual(novo)
    })
  }

  return (
    <article className="rounded-md border border-border bg-background">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-muted/40 transition"
      >
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="font-semibold">{lead.empresa}</span>
          <span
            className="text-[10px] uppercase tracking-widest font-bold"
            style={{ color: COR_COTA[lead.cota] }}
          >
            {ROTULO_COTA[lead.cota]}
          </span>
          <span className="text-xs text-muted-foreground">
            {lead.contato_nome}
          </span>
          <span className="text-xs text-muted-foreground">
            ·{' '}
            {new Date(lead.criado_em).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: '2-digit',
            })}
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {ROTULO_STATUS[statusAtual]} {aberto ? '▴' : '▾'}
        </span>
      </button>

      {aberto && (
        <div className="border-t border-border p-4 flex flex-col gap-4 text-sm">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <dt className="text-muted-foreground">CNPJ</dt>
            <dd className="font-mono">{lead.cnpj ?? '—'}</dd>
            <dt className="text-muted-foreground">E-mail</dt>
            <dd>{lead.contato_email}</dd>
            <dt className="text-muted-foreground">Telefone</dt>
            <dd>{lead.contato_telefone ?? '—'}</dd>
          </dl>
          {lead.mensagem && (
            <div className="border-l-2 border-muted-foreground/30 pl-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                Mensagem
              </p>
              <p className="text-sm whitespace-pre-wrap">{lead.mensagem}</p>
            </div>
          )}
          <div className="flex gap-2 flex-wrap pt-2 border-t border-dashed border-border">
            {(['novo', 'em_contato', 'firmado', 'recusado'] as const).map(
              (s) => (
                <button
                  key={s}
                  type="button"
                  disabled={pending || statusAtual === s}
                  onClick={() => mudarStatus(s)}
                  className={`h-8 px-3 rounded-md text-xs font-medium border transition ${
                    statusAtual === s
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  Marcar como {ROTULO_STATUS[s]}
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </article>
  )
}
