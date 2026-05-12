/**
 * Bloco "Base eleitoral SE 2024" — total + top 5 + bottom 5 municipios
 * por eleitorado. Le da tabela municipios_se.eleitorado (TSE/TRE-SE).
 *
 * Usado em /admin e /transparencia.
 *
 * Server Component (le do banco diretamente).
 */

import { supabaseAdmin } from '@/lib/supabase/admin'

type MunicipioRow = {
  nome: string
  eleitorado: number | null
}

export async function BaseEleitoralSe({
  compacto = false,
}: {
  compacto?: boolean
}) {
  const db = supabaseAdmin()
  const { data: municipios } = await db
    .from('municipios_se')
    .select('nome, eleitorado')
    .order('eleitorado', { ascending: false })
    .returns<MunicipioRow[]>()

  const lista = municipios ?? []
  const valores = lista.filter((m) => (m.eleitorado ?? 0) > 0)
  const total = valores.reduce((acc, m) => acc + (m.eleitorado ?? 0), 0)
  const top5 = valores.slice(0, 5)
  const bottom5 = valores.slice(-5).reverse() // ordena asc, depois inverte
  // bottom5 vem em ordem desc do slice, queremos asc pra mostrar o menor primeiro
  bottom5.sort((a, b) => (a.eleitorado ?? 0) - (b.eleitorado ?? 0))

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2
          className={
            compacto
              ? 'text-sm font-semibold uppercase tracking-wide text-foreground'
              : 'text-xl font-semibold text-foreground'
          }
        >
          Base eleitoral · Sergipe 2024
        </h2>
        <p className="text-xs text-muted-foreground">
          Fonte: TSE/TRE-SE · {lista.length} municípios
        </p>
      </header>

      <div className="rounded-md border border-border bg-background px-5 py-4 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Total de eleitores em Sergipe
        </p>
        <p className="text-3xl font-bold tabular-nums text-foreground">
          {total.toLocaleString('pt-BR')}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-md border border-border bg-background px-4 py-3 flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-widest text-emerald-700">
            5 maiores municípios
          </p>
          <ul className="flex flex-col gap-1.5">
            {top5.map((m, i) => (
              <li
                key={m.nome}
                className="flex items-baseline gap-3 text-sm"
              >
                <span className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold flex items-center justify-center flex-none">
                  {i + 1}
                </span>
                <span className="flex-1 truncate">{m.nome}</span>
                <span className="font-semibold tabular-nums whitespace-nowrap">
                  {(m.eleitorado ?? 0).toLocaleString('pt-BR')}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap min-w-[3.5rem] text-right">
                  {(((m.eleitorado ?? 0) / total) * 100).toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-md border border-border bg-background px-4 py-3 flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-widest text-error">
            5 menores municípios
          </p>
          <ul className="flex flex-col gap-1.5">
            {bottom5.map((m, i) => (
              <li
                key={m.nome}
                className="flex items-baseline gap-3 text-sm"
              >
                <span className="w-5 h-5 rounded-full bg-error/5 border border-error/30 text-error text-[10px] font-bold flex items-center justify-center flex-none">
                  {i + 1}
                </span>
                <span className="flex-1 truncate">{m.nome}</span>
                <span className="font-semibold tabular-nums whitespace-nowrap">
                  {(m.eleitorado ?? 0).toLocaleString('pt-BR')}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap min-w-[3.5rem] text-right">
                  {(((m.eleitorado ?? 0) / total) * 100).toFixed(2)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {!compacto && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          A pesquisa é proporcionalmente ponderada pelo eleitorado de cada
          município. Uma resposta vinda de Aracaju (
          {((top5[0]?.eleitorado ?? 0) / total * 100).toFixed(1)}% do
          eleitorado) tem peso diferente de uma vinda de{' '}
          {bottom5[0]?.nome ?? 'um município pequeno'} (
          {((bottom5[0]?.eleitorado ?? 0) / total * 100).toFixed(2)}%),
          evitando que a opinião da capital domine a projeção estadual.
        </p>
      )}
    </section>
  )
}
