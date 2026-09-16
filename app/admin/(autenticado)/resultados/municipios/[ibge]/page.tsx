/**
 * Detalhe de um município na cobertura (interno).
 *
 * Aberto pelo clique no nome em "Cobertura por município": quem são os
 * mais votados ali, cargo a cargo, com brancos e "não sabe" no mesmo
 * denominador. Leitura interna de acompanhamento da coleta — nada daqui
 * vai pra divulgação.
 *
 * Os votos vêm da view agregada v_votos_municipio_opcao (migration 058):
 * o cru por município estoura o limite de 1.000 linhas em Aracaju.
 */
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { CARGOS, CARGO_CONFIG, type Cargo } from '@/lib/cargos'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { lerTudo } from '@/lib/supabase/ler-tudo'

export const dynamic = 'force-dynamic'

type VotoOpcao = {
  cargo: string
  metodo: string
  candidato_id: string | null
  partido_id: string | null
  resposta: string | null
  votos: number
}

type CandidatoRow = {
  id: string
  cargo: string
  numero: number | null
  nome_urna: string
  impedimento: string | null
  partidos: { sigla: string; cor_hex: string | null } | null
}

type PartidoRow = { id: string; numero: number | null; sigla: string; cor_hex: string | null }

type Opcao = {
  chave: string
  rotulo: string
  detalhe: string | null
  cor: string | null
  votos: number
  especial: boolean
}

const nf = (n: number) => n.toLocaleString('pt-BR')
const pf = (n: number, casas = 1) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

const REGIAO_LABEL: Record<string, string> = {
  grande_aracaju: 'Grande Aracaju',
  leste: 'Leste',
  agreste: 'Agreste',
  centro_sul: 'Centro-Sul',
  sertao: 'Sertão',
}

export async function generateMetadata({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params
  const codigo = Number(ibge)
  if (!Number.isInteger(codigo)) return { title: 'Município · Admin' }
  const { data } = await supabaseAdmin()
    .from('municipios_se')
    .select('nome')
    .eq('ibge_codigo', codigo)
    .maybeSingle()
  return { title: `${data?.nome ?? 'Município'} · Cobertura · Admin` }
}

export default async function MunicipioDetalhePage({
  params,
}: {
  params: Promise<{ ibge: string }>
}) {
  const { ibge } = await params
  const codigo = Number(ibge)
  if (!Number.isInteger(codigo) || codigo <= 0) notFound()

  const db = supabaseAdmin()
  const [{ data: municipio }, { data: edicao }] = await Promise.all([
    db
      .from('municipios_se')
      .select('ibge_codigo, nome, regiao, eleitorado, cota_pesquisa')
      .eq('ibge_codigo', codigo)
      .maybeSingle(),
    db.from('edicao').select('id, nome').eq('ativa', true).maybeSingle(),
  ])

  if (!municipio) notFound()

  if (!edicao) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">{municipio.nome}</h1>
        <p className="text-sm text-muted-foreground">Nenhuma edição ativa.</p>
      </div>
    )
  }

  const [{ data: cobertura }, { data: votosData }, candidatos, { data: partidosData }] =
    await Promise.all([
      db
        .from('v_cobertura_municipio')
        .select('participantes, votos, pct_eleitorado')
        .eq('edicao_id', edicao.id)
        .eq('ibge_codigo', codigo)
        .maybeSingle(),
      db
        .from('v_votos_municipio_opcao')
        .select('cargo, metodo, candidato_id, partido_id, resposta, votos')
        .eq('edicao_id', edicao.id)
        .eq('municipio_ibge', codigo),
      lerTudo<CandidatoRow>(
        (de, ate) =>
          db
            .from('candidatos_pesquisa')
            .select('id, cargo, numero, nome_urna, impedimento, partidos(sigla, cor_hex)')
            .eq('edicao_id', edicao.id)
            .order('id')
            .range(de, ate)
            // O tipo inferido põe `partidos` como array; a relação é 1:1.
            .then((r) => r as unknown as { data: CandidatoRow[] | null; error?: unknown }),
        (r) => r.id,
      ),
      db.from('partidos').select('id, numero, sigla, cor_hex'),
    ])

  const votos = (votosData ?? []) as VotoOpcao[]
  const candPorId = new Map(candidatos.map((c) => [c.id, c]))
  const partidoPorId = new Map(((partidosData ?? []) as PartidoRow[]).map((p) => [p.id, p]))
  const zonaOpcoes = new Map(
    (CARGO_CONFIG.zona_expansao.opcoesConsulta ?? []).map((o) => [o.valor, o.label]),
  )

  // Agrupa por cargo, consolidando as linhas da view numa opção legível.
  const porCargo = new Map<Cargo, Map<string, Opcao>>()
  for (const v of votos) {
    const cargo = v.cargo as Cargo
    if (!(CARGOS as readonly string[]).includes(cargo)) continue
    const mapa = porCargo.get(cargo) ?? new Map<string, Opcao>()
    porCargo.set(cargo, mapa)

    let opcao: Omit<Opcao, 'votos'>
    if (v.metodo === 'branco') {
      opcao = { chave: 'branco', rotulo: 'Branco / nulo', detalhe: null, cor: null, especial: true }
    } else if (v.metodo === 'nao_sabe') {
      opcao = { chave: 'nao_sabe', rotulo: 'Não sabe / não respondeu', detalhe: null, cor: null, especial: true }
    } else if (cargo === 'zona_expansao') {
      const valor = v.resposta ?? '—'
      opcao = {
        chave: `resp:${valor}`,
        rotulo: zonaOpcoes.get(valor) ?? valor,
        detalhe: null,
        cor: null,
        especial: false,
      }
    } else if (v.candidato_id) {
      const c = candPorId.get(v.candidato_id)
      const sigla = c?.partidos?.sigla ?? null
      opcao = {
        chave: `cand:${v.candidato_id}`,
        rotulo: c?.nome_urna ?? 'Candidato não cadastrado',
        detalhe: [c?.numero != null ? String(c.numero) : null, sigla, c?.impedimento ? 'impedido' : null]
          .filter(Boolean)
          .join(' · ') || null,
        cor: c?.partidos?.cor_hex ?? null,
        especial: false,
      }
    } else if (v.partido_id) {
      const p = partidoPorId.get(v.partido_id)
      opcao = {
        chave: `leg:${v.partido_id}`,
        rotulo: `Legenda ${p?.sigla ?? '?'}`,
        detalhe: p?.numero != null ? `${p.numero} · só a legenda` : 'só a legenda',
        cor: p?.cor_hex ?? null,
        especial: false,
      }
    } else {
      opcao = { chave: `outro:${v.metodo}`, rotulo: v.metodo, detalhe: null, cor: null, especial: true }
    }

    const atual = mapa.get(opcao.chave)
    if (atual) atual.votos += v.votos
    else mapa.set(opcao.chave, { ...opcao, votos: v.votos })
  }

  const secoes = CARGOS.filter((c) => porCargo.has(c)).map((cargo) => {
    const opcoes = [...porCargo.get(cargo)!.values()].sort((a, b) => b.votos - a.votos)
    const total = opcoes.reduce((s, o) => s + o.votos, 0)
    const validos = opcoes.filter((o) => !o.especial).reduce((s, o) => s + o.votos, 0)
    const maior = Math.max(...opcoes.map((o) => o.votos), 1)
    return { cargo, opcoes, total, validos, maior }
  })

  const participantes = cobertura?.participantes ?? 0
  const totalVotos = cobertura?.votos ?? votos.reduce((s, v) => s + v.votos, 0)
  const pct = cobertura?.pct_eleitorado ?? 0
  const regiao = municipio.regiao ? (REGIAO_LABEL[municipio.regiao] ?? municipio.regiao) : null

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Link
          href="/admin/resultados/municipios"
          className="text-xs text-muted-foreground hover:text-foreground w-fit"
        >
          ← Cobertura por município
        </Link>
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          Resultados internos · {edicao.nome}
        </p>
        <h1 className="text-2xl font-semibold">
          {municipio.nome}
          {regiao ? (
            <span className="ml-3 text-sm font-normal text-muted-foreground">{regiao}</span>
          ) : null}
        </h1>
        <p className="text-sm text-muted-foreground">
          Mais votados no município, cargo a cargo. Percentuais sobre <strong>todos os votos</strong> do
          cargo aqui (incluindo brancos e &quot;não sabe&quot;). Uso interno — não divulgar.
        </p>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { l: 'Código IBGE', v: String(municipio.ibge_codigo), s: 'municipios_se' },
          { l: 'Eleitorado', v: nf(municipio.eleitorado), s: 'TSE/TRE-SE' },
          { l: 'Participantes', v: nf(participantes), s: 'CPF validado' },
          { l: 'Votos', v: nf(totalVotos), s: 'Todos os cargos' },
          { l: '% do eleitorado', v: `${pf(Number(pct), 3)}%`, s: 'participantes ÷ eleitorado' },
        ].map((c) => (
          <div
            key={c.l}
            className="rounded-md border border-border bg-background p-4 flex flex-col gap-1"
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{c.l}</p>
            <p className="text-2xl font-bold tabular-nums">{c.v}</p>
            <p className="text-xs text-muted-foreground">{c.s}</p>
          </div>
        ))}
      </section>

      {secoes.length === 0 ? (
        <p className="text-sm rounded-md border border-amber-300 bg-amber-50 text-amber-800 px-4 py-3">
          Nenhum voto registrado neste município nesta edição.
        </p>
      ) : (
        secoes.map((s) => (
          <section key={s.cargo} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">{CARGO_CONFIG[s.cargo].label}</h2>
              <p className="text-xs text-muted-foreground tabular-nums">
                {nf(s.total)} votos
                {s.cargo === 'senador' ? ' (2 por participante)' : ''}
                {' · '}
                {nf(s.validos)} válidos
              </p>
            </div>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/60 text-left">
                    <th className="px-3 py-2 font-semibold w-10">#</th>
                    <th className="px-3 py-2 font-semibold">Opção</th>
                    <th className="px-3 py-2 font-semibold text-right">Votos</th>
                    <th className="px-3 py-2 font-semibold text-right">% do cargo</th>
                  </tr>
                </thead>
                <tbody>
                  {s.opcoes.map((o, i) => (
                    <tr
                      key={o.chave}
                      className={`border-t border-border ${o.especial ? 'text-muted-foreground' : ''}`}
                    >
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">
                        {o.especial ? '' : i + 1}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full border border-border shrink-0"
                            style={{ backgroundColor: o.cor ?? 'transparent' }}
                          />
                          <span className={o.especial ? 'italic' : 'font-medium'}>{o.rotulo}</span>
                          {o.detalhe ? (
                            <span className="text-xs text-muted-foreground">{o.detalhe}</span>
                          ) : null}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">{nf(o.votos)}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${o.especial ? 'bg-muted-foreground/40' : 'bg-accent'}`}
                              style={{ width: `${Math.min(100, (o.votos / s.maior) * 100)}%` }}
                            />
                          </div>
                          <span className="tabular-nums w-14">
                            {s.total > 0 ? pf((o.votos * 100) / s.total) : '0,0'}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </div>
  )
}
