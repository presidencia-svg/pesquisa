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

export default async function ProjecaoPage() {
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

  // Pra cada cargo, monta o input do algoritmo:
  // - lista de partidos com votos_legenda
  // - candidatos de cada partido com votos individuais
  const projecoes: Record<string, Projecao> = {}
  for (const cargo of cargos) {
    // 1. Votos por partido (legenda)
    const { data: legendas } = await db
      .from('v_resultados_legenda')
      .select('partido_id, numero, sigla, nome, cor_hex, votos')
      .eq('edicao_id', edicao.id)
      .eq('cargo', cargo)

    // 2. Votos individuais por candidato (apenas onde candidato_id != null)
    const { data: candVotos } = await db
      .from('v_resultados_candidato')
      .select('candidato_id, partido_id, votos')
      .eq('edicao_id', edicao.id)
      .eq('cargo', cargo)
    const votosPorCandidato = new Map<string, number>()
    for (const r of (candVotos ?? []) as Array<{
      candidato_id: string
      votos: number
    }>) {
      votosPorCandidato.set(r.candidato_id, r.votos)
    }

    // 3. Lista de candidatos cadastrados de cada partido
    const { data: candidatos } = await db
      .from('candidatos_pesquisa')
      .select('id, numero, nome_urna, partido_id')
      .eq('edicao_id', edicao.id)
      .eq('cargo', cargo)
      .eq('ativo', true)
    const candidatosPorPartido = new Map<
      string,
      Array<{
        candidatoId: string
        numero: number
        nomeUrna: string
        votos: number
      }>
    >()
    for (const c of (candidatos ?? []) as Array<{
      id: string
      numero: number
      nome_urna: string
      partido_id: string
    }>) {
      const arr = candidatosPorPartido.get(c.partido_id) ?? []
      arr.push({
        candidatoId: c.id,
        numero: c.numero,
        nomeUrna: c.nome_urna,
        votos: votosPorCandidato.get(c.id) ?? 0,
      })
      candidatosPorPartido.set(c.partido_id, arr)
    }

    // 4. Monta input
    const partidosInput: PartidoVotos[] = ((legendas ?? []) as Array<{
      partido_id: string
      numero: number
      sigla: string
      nome: string
      cor_hex: string | null
      votos: number
    }>).map((l) => ({
      partidoId: l.partido_id,
      numero: l.numero,
      sigla: l.sigla,
      nome: l.nome,
      corHex: l.cor_hex,
      votosLegenda: l.votos,
      candidatos: candidatosPorPartido.get(l.partido_id) ?? [],
    }))

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
          Recalculado a cada acesso — vai mudando conforme entram votos.
        </p>
      </header>

      <details className="rounded-md border border-accent/30 bg-accent/5 px-4 py-3 text-xs leading-relaxed">
        <summary className="cursor-pointer text-foreground font-semibold list-none">
          Como o cálculo funciona ▾
        </summary>
        <ol className="mt-3 flex flex-col gap-2 text-muted-foreground list-decimal pl-5">
          <li>
            <strong>QE (Quociente Eleitoral)</strong> = floor(total de votos
            válidos ÷ número de vagas). Define o &ldquo;valor&rdquo; de uma cadeira em votos.
          </li>
          <li>
            <strong>Cláusula de barreira:</strong> só partidos que atingem 80% do
            QE concorrem por cadeiras.
          </li>
          <li>
            <strong>QP (Quociente Partidário)</strong> = floor(votos do partido
            ÷ QE). Define as cadeiras iniciais de cada partido elegível.
          </li>
          <li>
            <strong>Sobras por maiores médias:</strong> as cadeiras que sobrarem
            vão pra os partidos com maior `votos ÷ (cadeiras + 1)`. Repete até
            preencher todas as vagas.
          </li>
          <li>
            <strong>Dentro de cada partido:</strong> os candidatos são ordenados
            por voto individual (decrescente). Os N primeiros (N = cadeiras do
            partido) são os <em>eleitos projetados</em>.
          </li>
        </ol>
      </details>

      {cargos.map((cargo) => (
        <SecaoProjecao
          key={cargo}
          titulo={ROTULO[cargo]}
          projecao={projecoes[cargo]}
        />
      ))}
    </div>
  )
}

function SecaoProjecao({
  titulo,
  projecao,
}: {
  titulo: string
  projecao: Projecao
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-2xl font-semibold text-foreground border-l-2 border-accent pl-4">
        {titulo}{' '}
        <span className="text-sm text-muted-foreground font-normal">
          ({projecao.vagas} cadeiras em disputa)
        </span>
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card titulo="Votos válidos" valor={projecao.totalValidos} />
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
                  <p className="text-xs text-muted-foreground truncate">
                    {p.nome}
                  </p>
                </div>
                <div className="flex flex-col items-end text-right">
                  <p className="text-sm font-semibold tabular-nums">
                    {p.votos.toLocaleString('pt-BR')} votos
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {p.pctValidos.toFixed(1)}% dos válidos
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
                      (QP {p.cadeirasIniciais} + sobras {p.cadeirasSobras})
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
                          {c.votos.toLocaleString('pt-BR')} votos
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {p.cadeirasTotal > p.eleitosProjetados.length && (
                <p className="text-[11px] text-muted-foreground italic mt-2">
                  {p.cadeirasTotal - p.eleitosProjetados.length} cadeira(s)
                  sem candidato individual identificado — eleitor digitou só a
                  legenda ou candidato não está na nossa base. Cadeira existe
                  mas o nome do eleito ainda não pode ser projetado.
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
