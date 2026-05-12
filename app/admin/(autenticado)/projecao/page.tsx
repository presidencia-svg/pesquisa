import Link from 'next/link'

import { calcularPesos } from '@/lib/ponderacao'
import {
  projetarCadeiras,
  type PartidoVotos,
  type Projecao,
} from '@/lib/projecao'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const metadata = { title: 'Projeção de cadeiras · Admin' }
export const dynamic = 'force-dynamic'

const VAGAS = { federal: 8, estadual: 24 } as const
const ROTULO = { federal: 'Deputado Federal', estadual: 'Deputado Estadual' } as const

type SearchParams = { ponderado?: string }

export default async function ProjecaoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const ponderado = params.ponderado === '1'

  const db = supabaseAdmin()
  const { data: edicao } = await db
    .from('edicao')
    .select('id, nome')
    .eq('ativa', true)
    .maybeSingle()

  if (!edicao) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Projeção de cadeiras</h1>
        <div className="rounded-md border border-error/30 bg-error/5 px-5 py-4 text-sm text-error">
          Nenhuma edição ativa.
        </div>
      </div>
    )
  }

  const cargos = ['federal', 'estadual'] as const

  // -------- Calculo de pesos amostrais (se modo ponderado) --------
  const { data: municipios } = await db
    .from('municipios_se')
    .select('ibge_codigo, nome, eleitorado')
  const municipiosNorm =
    ((municipios ?? []) as Array<{
      ibge_codigo: number
      nome: string
      eleitorado: number | null
    }>).map((m) => ({
      ibgeCodigo: m.ibge_codigo,
      nome: m.nome,
      eleitorado: m.eleitorado,
    }))

  // Respostas por municipio = distinct token_hash com voto valido naquele municipio
  // (sem filtrar por cargo — peso amostral e' do respondente, nao do voto especifico)
  const { data: respostasRows } = await db
    .from('votos_pesquisa')
    .select('token_hash, municipio_ibge')
    .eq('edicao_id', edicao.id)
    .not('municipio_ibge', 'is', null)
  const tokensPorMunicipio = new Map<number, Set<string>>()
  for (const r of (respostasRows ?? []) as Array<{
    token_hash: string
    municipio_ibge: number
  }>) {
    const set = tokensPorMunicipio.get(r.municipio_ibge) ?? new Set<string>()
    set.add(r.token_hash)
    tokensPorMunicipio.set(r.municipio_ibge, set)
  }
  const respostasPorMunicipio = new Map<number, number>()
  for (const [ibge, set] of tokensPorMunicipio) {
    respostasPorMunicipio.set(ibge, set.size)
  }

  const pesos = calcularPesos(municipiosNorm, respostasPorMunicipio)

  /** Aplica peso amostral a uma contagem (votos_brutos * peso_do_municipio). */
  const ponderar = (votos: number, ibge: number | null): number => {
    if (!ponderado) return votos
    if (ibge === null) return 0 // votos sem municipio nao entram na ponderacao
    return votos * (pesos.get(ibge)?.peso ?? 0)
  }

  // -------- Projecao por cargo --------
  const projecoes: Record<string, Projecao> = {}
  for (const cargo of cargos) {
    // Votos por (partido, municipio)
    const { data: legendaRows } = await db
      .from('votos_pesquisa')
      .select('partido_id, municipio_ibge')
      .eq('edicao_id', edicao.id)
      .eq('cargo', cargo)
      .eq('metodo', 'numero')
      .not('partido_id', 'is', null)
    const votosPartidoBruto = new Map<string, number>()
    const votosPartidoPond = new Map<string, number>()
    for (const r of (legendaRows ?? []) as Array<{
      partido_id: string
      municipio_ibge: number | null
    }>) {
      votosPartidoBruto.set(
        r.partido_id,
        (votosPartidoBruto.get(r.partido_id) ?? 0) + 1,
      )
      votosPartidoPond.set(
        r.partido_id,
        (votosPartidoPond.get(r.partido_id) ?? 0) +
          ponderar(1, r.municipio_ibge),
      )
    }

    // Votos por (candidato, municipio)
    const { data: candRows } = await db
      .from('votos_pesquisa')
      .select('candidato_id, municipio_ibge')
      .eq('edicao_id', edicao.id)
      .eq('cargo', cargo)
      .eq('metodo', 'numero')
      .not('candidato_id', 'is', null)
    const votosCandidatoBruto = new Map<string, number>()
    const votosCandidatoPond = new Map<string, number>()
    for (const r of (candRows ?? []) as Array<{
      candidato_id: string
      municipio_ibge: number | null
    }>) {
      votosCandidatoBruto.set(
        r.candidato_id,
        (votosCandidatoBruto.get(r.candidato_id) ?? 0) + 1,
      )
      votosCandidatoPond.set(
        r.candidato_id,
        (votosCandidatoPond.get(r.candidato_id) ?? 0) +
          ponderar(1, r.municipio_ibge),
      )
    }

    // Lista de partidos com candidatos cadastrados
    const { data: candidatos } = await db
      .from('candidatos_pesquisa')
      .select('id, numero, nome_urna, partido_id, partidos!inner(id, numero, sigla, nome, cor_hex)')
      .eq('edicao_id', edicao.id)
      .eq('cargo', cargo)
      .eq('ativo', true)

    const partidosMap = new Map<
      string,
      {
        partidoId: string
        numero: number
        sigla: string
        nome: string
        corHex: string | null
        candidatos: Array<{
          candidatoId: string
          numero: number
          nomeUrna: string
          votos: number
        }>
      }
    >()
    for (const c of (candidatos ?? []) as unknown as Array<{
      id: string
      numero: number
      nome_urna: string
      partido_id: string
      partidos: {
        id: string
        numero: number
        sigla: string
        nome: string
        cor_hex: string | null
      }
    }>) {
      const p = c.partidos
      const entry = partidosMap.get(p.id) ?? {
        partidoId: p.id,
        numero: p.numero,
        sigla: p.sigla,
        nome: p.nome,
        corHex: p.cor_hex,
        candidatos: [],
      }
      entry.candidatos.push({
        candidatoId: c.id,
        numero: c.numero,
        nomeUrna: c.nome_urna,
        votos: ponderado
          ? Math.round(votosCandidatoPond.get(c.id) ?? 0)
          : votosCandidatoBruto.get(c.id) ?? 0,
      })
      partidosMap.set(p.id, entry)
    }

    // Inclui partidos que tem voto mas nao tem candidato cadastrado
    const todosPartidos = new Set([
      ...partidosMap.keys(),
      ...votosPartidoBruto.keys(),
    ])
    if (todosPartidos.size > partidosMap.size) {
      const { data: partidosExtras } = await db
        .from('partidos')
        .select('id, numero, sigla, nome, cor_hex')
        .in(
          'id',
          Array.from(todosPartidos).filter((id) => !partidosMap.has(id)),
        )
      for (const p of (partidosExtras ?? []) as Array<{
        id: string
        numero: number
        sigla: string
        nome: string
        cor_hex: string | null
      }>) {
        partidosMap.set(p.id, {
          partidoId: p.id,
          numero: p.numero,
          sigla: p.sigla,
          nome: p.nome,
          corHex: p.cor_hex,
          candidatos: [],
        })
      }
    }

    const partidosInput: PartidoVotos[] = Array.from(partidosMap.values()).map(
      (p) => ({
        partidoId: p.partidoId,
        numero: p.numero,
        sigla: p.sigla,
        nome: p.nome,
        corHex: p.corHex,
        votosLegenda: ponderado
          ? Math.round(votosPartidoPond.get(p.partidoId) ?? 0)
          : votosPartidoBruto.get(p.partidoId) ?? 0,
        candidatos: p.candidatos,
      }),
    )

    projecoes[cargo] = projetarCadeiras(partidosInput, VAGAS[cargo])
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Projeção de cadeiras</h1>
        <p className="text-sm text-muted-foreground">
          Aplicação das regras do TSE (Lei 9.504/97 art. 109) sobre os votos
          atuais da edição{' '}
          <span className="font-medium text-foreground">{edicao.nome}</span>.
        </p>
      </header>

      <div className="flex gap-1 rounded-md border border-border bg-muted p-1 self-start">
        <Link
          href="/admin/projecao"
          className={`px-4 py-2 rounded text-sm font-medium transition ${
            !ponderado
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Bruto
        </Link>
        <Link
          href="/admin/projecao?ponderado=1"
          className={`px-4 py-2 rounded text-sm font-medium transition ${
            ponderado
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Ponderado
        </Link>
      </div>

      {ponderado && (
        <div className="rounded-md border border-accent/30 bg-accent/5 px-4 py-3 text-xs leading-relaxed">
          <strong className="text-foreground">Modo ponderado:</strong> cada
          voto é multiplicado por (% do eleitorado do município ÷ % das
          respostas vindas do município). Município sub-representado tem
          peso maior; super-representado tem peso menor. Os números abaixo
          são votos ponderados, não brutos.
        </div>
      )}

      <details className="rounded-md border border-accent/30 bg-accent/5 px-4 py-3 text-xs leading-relaxed">
        <summary className="cursor-pointer text-foreground font-semibold list-none">
          Como o cálculo funciona ▾
        </summary>
        <ol className="mt-3 flex flex-col gap-2 text-muted-foreground list-decimal pl-5">
          <li>
            <strong>QE (Quociente Eleitoral)</strong> = floor(total de votos
            válidos ÷ número de vagas).
          </li>
          <li>
            <strong>Cláusula de barreira:</strong> só partidos que atingem 80% do QE.
          </li>
          <li>
            <strong>QP (Quociente Partidário)</strong> = floor(votos do partido ÷ QE).
          </li>
          <li>
            <strong>Sobras por maiores médias:</strong> votos ÷ (cadeiras + 1).
          </li>
          <li>
            <strong>Eleitos projetados</strong> = top N candidatos do partido por voto individual.
          </li>
        </ol>
      </details>

      {ponderado && (
        <BlocoPesos
          municipios={municipiosNorm}
          respostasPorMunicipio={respostasPorMunicipio}
          pesos={Array.from(calcularPesos(municipiosNorm, respostasPorMunicipio).values())}
        />
      )}

      {cargos.map((cargo) => (
        <SecaoProjecao
          key={cargo}
          titulo={ROTULO[cargo]}
          projecao={projecoes[cargo]}
          ponderado={ponderado}
        />
      ))}
    </div>
  )
}

function BlocoPesos({
  pesos,
}: {
  municipios: Array<{ ibgeCodigo: number; nome: string; eleitorado: number | null }>
  respostasPorMunicipio: Map<number, number>
  pesos: Array<{
    ibgeCodigo: number
    nome: string
    eleitorado: number
    respostas: number
    peso: number
  }>
}) {
  const ativos = pesos
    .filter((p) => p.respostas > 0)
    .sort((a, b) => b.respostas - a.respostas)
  if (ativos.length === 0) return null
  return (
    <details className="rounded-md border border-border bg-background px-4 py-3 text-xs">
      <summary className="cursor-pointer text-foreground font-semibold list-none">
        Pesos por município ({ativos.length} com resposta) ▾
      </summary>
      <table className="mt-3 w-full text-xs">
        <thead>
          <tr className="text-muted-foreground uppercase tracking-widest text-[10px]">
            <th className="text-left font-medium py-1">Município</th>
            <th className="text-right font-medium py-1">Eleitorado</th>
            <th className="text-right font-medium py-1">Respostas</th>
            <th className="text-right font-medium py-1">Peso</th>
          </tr>
        </thead>
        <tbody>
          {ativos.map((p) => (
            <tr key={p.ibgeCodigo} className="border-t border-border/50">
              <td className="py-1">{p.nome}</td>
              <td className="text-right tabular-nums py-1">
                {p.eleitorado.toLocaleString('pt-BR')}
              </td>
              <td className="text-right tabular-nums py-1">{p.respostas}</td>
              <td className="text-right tabular-nums py-1 font-semibold">
                {p.peso.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}

function SecaoProjecao({
  titulo,
  projecao,
  ponderado,
}: {
  titulo: string
  projecao: Projecao
  ponderado: boolean
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-2xl font-semibold text-foreground border-l-2 border-accent pl-4">
        {titulo}{' '}
        <span className="text-sm text-muted-foreground font-normal">
          ({projecao.vagas} cadeiras)
        </span>
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card
          titulo={ponderado ? 'Votos válidos (ponderados)' : 'Votos válidos'}
          valor={projecao.totalValidos}
        />
        <Card titulo="Quociente Eleitoral" valor={projecao.qe} />
        <Card titulo="Cláusula (80% QE)" valor={projecao.clausulaBarreira} />
        <Card
          titulo="Cadeiras distribuídas"
          valor={`${projecao.cadeirasDistribuidas} / ${projecao.vagas}`}
        />
      </div>

      {projecao.totalValidos === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          Sem votos registrados pra este cargo.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {projecao.partidos.map((p) => (
            <div
              key={p.partidoId}
              className={`rounded-md border px-4 py-3 ${
                p.atingiuClausula
                  ? 'border-border bg-background'
                  : 'border-border/50 bg-muted opacity-70'
              }`}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <div
                  className="w-10 h-10 rounded-md flex items-center justify-center text-xs font-bold text-white tabular-nums flex-none"
                  style={{ background: p.corHex ?? '#52525b' }}
                >
                  {p.numero}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">
                    {p.sigla}{' '}
                    {!p.atingiuClausula && (
                      <span className="text-[10px] uppercase tracking-widest text-error bg-error/10 border border-error/30 rounded-full px-2 py-0.5 ml-2">
                        sem cláusula
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{p.nome}</p>
                </div>
                <div className="flex flex-col items-end text-right">
                  <p className="text-sm font-semibold tabular-nums">
                    {p.votos.toLocaleString('pt-BR')} votos
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {p.pctValidos.toFixed(1)}%
                  </p>
                </div>
                <div className="flex-none border-l border-border pl-3 ml-1">
                  <p className="text-2xl font-bold tabular-nums text-foreground">
                    {p.cadeirasTotal}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    cadeira{p.cadeirasTotal !== 1 ? 's' : ''}
                  </p>
                  {p.cadeirasSobras > 0 && (
                    <p className="text-[10px] text-accent">
                      QP {p.cadeirasIniciais} + sobras {p.cadeirasSobras}
                    </p>
                  )}
                </div>
              </div>

              {p.eleitosProjetados.length > 0 && (
                <div className="mt-3 pt-3 border-t border-dashed border-border">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                    Eleitos projetados
                  </p>
                  <ul className="flex flex-col gap-1">
                    {p.eleitosProjetados.map((c, i) => (
                      <li
                        key={c.candidatoId}
                        className="flex items-center gap-3 py-1"
                      >
                        <span className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="font-mono tabular-nums text-[11px] text-muted-foreground w-14">
                          {c.numero}
                        </span>
                        <span className="text-sm text-foreground flex-1 truncate">
                          {c.nomeUrna}
                        </span>
                        <span className="tabular-nums text-sm text-muted-foreground">
                          {c.votos.toLocaleString('pt-BR')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {p.cadeirasTotal > p.eleitosProjetados.length && (
                <p className="text-[11px] text-muted-foreground italic mt-2">
                  {p.cadeirasTotal - p.eleitosProjetados.length} cadeira(s)
                  sem candidato individual identificado.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function Card({ titulo, valor }: { titulo: string; valor: number | string }) {
  return (
    <div className="rounded-md border border-border bg-background px-4 py-3 flex flex-col gap-0.5">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {titulo}
      </p>
      <p className="text-xl font-semibold tabular-nums text-foreground">
        {typeof valor === 'number' ? valor.toLocaleString('pt-BR') : valor}
      </p>
    </div>
  )
}
