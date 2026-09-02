/**
 * Cobertura da coleta por município (interno).
 *
 * Responde "onde a pesquisa já chegou e onde está rala": eleitorado do
 * município, quantos participaram, quantos votos geraram e que fatia do
 * eleitorado isso representa. É a leitura que sustenta a ponderação —
 * município sub-representado ganha peso maior no resultado ponderado.
 */
import Link from 'next/link'

import { supabaseAdmin } from '@/lib/supabase/admin'

export const metadata = { title: 'Cobertura por município · Admin' }
export const dynamic = 'force-dynamic'

type Linha = {
  ibge_codigo: number
  nome: string
  regiao: string | null
  eleitorado: number
  cota_pesquisa: number | null
  participantes: number
  votos: number
  pct_eleitorado: number
}

type Ordem = 'participantes' | 'pct' | 'eleitorado' | 'nome' | 'votos'

const ORDENS: Array<{ key: Ordem; label: string }> = [
  { key: 'participantes', label: 'Participantes' },
  { key: 'votos', label: 'Votos' },
  { key: 'pct', label: '% do eleitorado' },
  { key: 'eleitorado', label: 'Eleitorado' },
  { key: 'nome', label: 'Nome (A-Z)' },
]

const nf = (n: number) => n.toLocaleString('pt-BR')
const pf = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })

export default async function CoberturaMunicipiosPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams
  const ordem: Ordem = (['participantes', 'pct', 'eleitorado', 'nome', 'votos'] as const).includes(
    sp?.ordem as Ordem,
  )
    ? (sp?.ordem as Ordem)
    : 'participantes'

  const db = supabaseAdmin()
  const { data: edicao } = await db
    .from('edicao')
    .select('id, nome')
    .eq('ativa', true)
    .maybeSingle()

  if (!edicao) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">Cobertura por município</h1>
        <p className="text-sm text-muted-foreground">Nenhuma edição ativa.</p>
      </div>
    )
  }

  const { data } = await db
    .from('v_cobertura_municipio')
    .select('ibge_codigo, nome, regiao, eleitorado, cota_pesquisa, participantes, votos, pct_eleitorado')
    .eq('edicao_id', edicao.id)

  const linhas = (data ?? []) as Linha[]

  const ordenadas = [...linhas].sort((a, b) => {
    if (ordem === 'nome') return a.nome.localeCompare(b.nome, 'pt-BR')
    if (ordem === 'pct') return b.pct_eleitorado - a.pct_eleitorado
    if (ordem === 'eleitorado') return b.eleitorado - a.eleitorado
    if (ordem === 'votos') return b.votos - a.votos
    return b.participantes - a.participantes
  })

  const tot = linhas.reduce(
    (acc, l) => ({
      eleitorado: acc.eleitorado + l.eleitorado,
      participantes: acc.participantes + l.participantes,
      votos: acc.votos + l.votos,
    }),
    { eleitorado: 0, participantes: 0, votos: 0 },
  )
  const pctGeral = tot.eleitorado > 0 ? (tot.participantes * 100) / tot.eleitorado : 0
  const semNinguem = linhas.filter((l) => l.participantes === 0).length
  // Referência pra barra: o município mais penetrado da lista.
  const pctMax = Math.max(...linhas.map((l) => l.pct_eleitorado), 0.0001)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          Resultados internos
        </p>
        <h1 className="text-2xl font-semibold">Cobertura por município</h1>
        <p className="text-sm text-muted-foreground">
          Edição <span className="font-medium text-foreground">{edicao.nome}</span>.
          O percentual é <strong>participantes ÷ eleitorado</strong> do município —
          é ele que orienta a ponderação da amostra.
        </p>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { l: 'Municípios', v: nf(linhas.length), s: 'Sergipe' },
          { l: 'Eleitorado', v: nf(tot.eleitorado), s: 'TSE/TRE-SE' },
          { l: 'Participantes', v: nf(tot.participantes), s: 'CPF + WhatsApp' },
          { l: 'Votos', v: nf(tot.votos), s: 'Todos os cargos' },
          { l: '% do eleitorado', v: `${pf(pctGeral)}%`, s: 'Penetração geral' },
        ].map((c) => (
          <div
            key={c.l}
            className="rounded-md border border-border bg-background p-4 flex flex-col gap-1"
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {c.l}
            </p>
            <p className="text-2xl font-bold tabular-nums">{c.v}</p>
            <p className="text-xs text-muted-foreground">{c.s}</p>
          </div>
        ))}
      </section>

      {semNinguem > 0 ? (
        <p className="text-sm rounded-md border border-amber-300 bg-amber-50 text-amber-800 px-4 py-3">
          <strong>{semNinguem}</strong>{' '}
          {semNinguem === 1 ? 'município ainda sem nenhum participante' : 'municípios ainda sem nenhum participante'}.
        </p>
      ) : (
        <p className="text-sm rounded-md border border-accent/30 bg-accent/5 text-accent px-4 py-3">
          Todos os {linhas.length} municípios já têm participante.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          Ordenar por
        </span>
        {ORDENS.map((o) => (
          <Link
            key={o.key}
            href={`/admin/resultados/municipios?ordem=${o.key}`}
            className={`h-8 px-3 rounded-md border text-[11px] inline-flex items-center transition ${
              ordem === o.key
                ? 'border-accent bg-accent/10 text-accent font-semibold'
                : 'border-border hover:bg-muted'
            }`}
          >
            {o.label}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/60 text-left">
              <th className="px-3 py-2 font-semibold">#</th>
              <th className="px-3 py-2 font-semibold">Município</th>
              <th className="px-3 py-2 font-semibold text-right">Eleitorado</th>
              <th className="px-3 py-2 font-semibold text-right">Participantes</th>
              <th className="px-3 py-2 font-semibold text-right">Votos</th>
              <th className="px-3 py-2 font-semibold text-right">% do eleitorado</th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((l, i) => (
              <tr
                key={l.ibge_codigo}
                className={`border-t border-border ${l.participantes === 0 ? 'bg-amber-50/60' : ''}`}
              >
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{i + 1}</td>
                <td className="px-3 py-2">
                  <span className="font-medium">{l.nome}</span>
                  {l.regiao ? (
                    <span className="ml-2 text-xs text-muted-foreground">{l.regiao}</span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{nf(l.eleitorado)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold">
                  {nf(l.participantes)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{nf(l.votos)}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{
                          width: `${Math.min(100, (l.pct_eleitorado / pctMax) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="tabular-nums w-16">{pf(l.pct_eleitorado)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/40 font-semibold">
              <td className="px-3 py-2" />
              <td className="px-3 py-2">Total</td>
              <td className="px-3 py-2 text-right tabular-nums">{nf(tot.eleitorado)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{nf(tot.participantes)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{nf(tot.votos)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{pf(pctGeral)}%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
