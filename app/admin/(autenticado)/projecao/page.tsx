import Link from 'next/link'

import { coligacaoCurta } from '@/lib/federacoes'
import { viewsPonderadas } from '@/lib/ponderacao-views'
import { lerTudo as lerTudoLib } from '@/lib/supabase/ler-tudo'
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

/**
 * Lê todas as linhas de uma view paginando — o PostgREST corta em 1.000 linhas
 * por padrão (max-rows). Sem isto, a projeção rodava sobre 1.000 votos só.
 */
// Delegado pra lib/supabase/ler-tudo: paginação com trava de duplicidade —
// a mesma chave em duas páginas faz a leitura FALHAR em vez de somar errado.
async function lerTudo<T>(
  fazerQuery: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error?: unknown }>,
  chave?: (row: T) => string,
): Promise<T[]> {
  return lerTudoLib(fazerQuery, chave)
}

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
    .select('id, nome, ponderacao_metodo, ponderacao_execucao_id')
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

  // -------- Votos ponderados: FONTE ÚNICA (lib/ponderacao-views.ts) --------
  // As mesmas views do banco que alimentam /resultados, TV, apresentação e a
  // prévia do estatístico. Esta página NÃO calcula peso: antes ela ponderava só
  // por município, em memória, e projetava eleitos diferentes do resultado
  // oficial (raking município × sexo × faixa × instrução).
  const views = viewsPonderadas(edicao)
  const pondCandidato = new Map<string, number>()
  const pondPartido = new Map<string, number>()
  if (ponderado) {
    const [{ data: candPond, error: e1 }, { data: legPond, error: e2 }] = await Promise.all([
      db
        .from(views.candidato)
        .select('cargo, candidato_id, votos_pond')
        .eq('edicao_id', edicao.id)
        .in('cargo', ['federal', 'estadual']),
      db
        .from(views.legenda)
        .select('cargo, partido_id, votos_pond')
        .eq('edicao_id', edicao.id)
        .in('cargo', ['federal', 'estadual']),
    ])
    if (e1 || e2) throw new Error('projeção: falha ao ler as views ponderadas')
    // Trava: a resposta tem que caber no limite de 1.000 linhas do PostgREST.
    if ((candPond ?? []).length >= 1000 || (legPond ?? []).length >= 1000) {
      throw new Error('projeção: view ponderada devolveu 1.000+ linhas — paginar antes de usar')
    }
    for (const r of (candPond ?? []) as Array<{ candidato_id: string; votos_pond: number | string }>) {
      pondCandidato.set(r.candidato_id, Number(r.votos_pond))
    }
    for (const r of (legPond ?? []) as Array<{
      cargo: string
      partido_id: string
      votos_pond: number | string
    }>) {
      pondPartido.set(`${r.cargo}:${r.partido_id}`, Number(r.votos_pond))
    }
  }

  // -------- Projecao por cargo --------
  const projecoes: Record<string, Projecao> = {}
  for (const cargo of cargos) {
    // Votos por (partido, municipio) — view agregada, paginada (todos os votos)
    const legendaRows = await lerTudo<{
      partido_id: string
      municipio_ibge: number | null
      votos: number
    }>((de, ate) =>
      db
        .from('v_proj_partido_mun')
        .select('partido_id, municipio_ibge, votos')
        .eq('edicao_id', edicao.id)
        .eq('cargo', cargo)
        // ORDER BY estável é obrigatório pra paginar: sem ele o Postgres pode
        // devolver linhas repetidas numa página e omitir outras na seguinte.
        .order('partido_id')
        .order('municipio_ibge')
        .range(de, ate),
      (r) => `${r.partido_id}:${r.municipio_ibge}`,
    )
    const votosPartidoBruto = new Map<string, number>()
    for (const r of legendaRows) {
      votosPartidoBruto.set(
        r.partido_id,
        (votosPartidoBruto.get(r.partido_id) ?? 0) + r.votos,
      )
    }

    // Votos por (candidato, municipio) — view agregada, paginada
    const candRows = await lerTudo<{
      candidato_id: string
      municipio_ibge: number | null
      votos: number
    }>((de, ate) =>
      db
        .from('v_proj_candidato_mun')
        .select('candidato_id, municipio_ibge, votos')
        .eq('edicao_id', edicao.id)
        .eq('cargo', cargo)
        .order('candidato_id')
        .order('municipio_ibge')
        .range(de, ate),
      (r) => `${r.candidato_id}:${r.municipio_ibge}`,
    )
    const votosCandidatoBruto = new Map<string, number>()
    for (const r of candRows) {
      votosCandidatoBruto.set(
        r.candidato_id,
        (votosCandidatoBruto.get(r.candidato_id) ?? 0) + r.votos,
      )
    }

    // Lista de partidos com candidatos cadastrados
    const { data: candidatos } = await db
      .from('candidatos_pesquisa')
      .select('id, numero, nome_urna, partido_id, coligacao, partidos!inner(id, numero, sigla, nome, cor_hex)')
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
        coligacao: string | null
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
      coligacao: string | null
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
        coligacao: null,
        candidatos: [],
      }
      // Coligação oficial (TSE) do partido neste cargo — vem do candidato.
      if (!entry.coligacao && c.coligacao) entry.coligacao = c.coligacao
      entry.candidatos.push({
        candidatoId: c.id,
        numero: c.numero,
        nomeUrna: c.nome_urna,
        votos: ponderado
          ? Math.round(pondCandidato.get(c.id) ?? 0)
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
          coligacao: null,
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
        coligacao: p.coligacao,
        votosLegenda: ponderado
          ? Math.round(pondPartido.get(`${cargo}:${p.partidoId}`) ?? 0)
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
          <strong className="text-foreground">Modo ponderado:</strong>{' '}
          {views.metodo === 'estratos_raking'
            ? 'votos ponderados pelo raking oficial da edição (município × sexo × faixa etária × instrução, marginais do eleitorado TSE)'
            : 'votos ponderados por município (participação no eleitorado TSE ÷ participação na amostra)'}
          , lidos das mesmas views do banco que alimentam os resultados, a TV e a
          apresentação — os eleitos daqui são os mesmos de lá. Pesos e
          diagnósticos: <Link href="/admin/amostra" className="underline">Amostra</Link>.
        </div>
      )}

      <details className="rounded-md border border-accent/30 bg-accent/5 px-4 py-3 text-xs leading-relaxed">
        <summary className="cursor-pointer text-foreground font-semibold list-none">
          Como o cálculo funciona ▾
        </summary>
        <ol className="mt-3 flex flex-col gap-2 text-muted-foreground list-decimal pl-5">
          <li>
            <strong>Federação conta como um partido só</strong> (Lei 14.208/2021):
            União Progressista (UNIÃO + PP), Brasil da Esperança (PT + PCdoB + PV),
            PSOL-Rede, PSDB-Cidadania e Renovação Solidária somam os votos de
            todos os seus partidos e disputam juntas. Partido fora de federação
            concorre sozinho (coligação é proibida no proporcional).
          </li>
          <li>
            <strong>QE (Quociente Eleitoral)</strong> = votos válidos ÷ vagas,
            desprezada a fração se igual ou inferior a meio, arredondada pra cima
            se superior (CE art. 106).
          </li>
          <li>
            <strong>QP (Quociente Partidário)</strong> = parte inteira de votos da
            agremiação ÷ QE (art. 107). As vagas vão pros candidatos mais votados
            da agremiação — na federação, lista única sem cota por partido — desde
            que cada um tenha pelo menos <strong>10% do QE</strong> (art. 108).
          </li>
          <li>
            <strong>Sobras por maiores médias:</strong> votos ÷ (cadeiras já obtidas + 1),
            uma vaga por rodada (art. 109). Só disputa agremiação com pelo menos{' '}
            <strong>80% do QE</strong>, e só entra candidato com pelo menos{' '}
            <strong>20% do QE</strong> (§ 2º). Se ninguém atender, as vagas
            restantes vão pelas médias sem as travas.
          </li>
          <li>
            <strong>Eleitos projetados</strong> = quem levou cada vaga pelos passos
            acima. Suplência e empate técnico são calculados dentro da agremiação.
          </li>
        </ol>
      </details>

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
          {/* Como o TSE apura: por agremiação (federação = um partido só) */}
          <div className="rounded-md border border-border bg-muted/40 px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              Por agremiação (federação conta como um partido só) · mínimo nominal{' '}
              {Math.ceil(projecao.minimoNominalQP).toLocaleString('pt-BR')} (QP) /{' '}
              {Math.ceil(projecao.minimoNominalSobra).toLocaleString('pt-BR')} (sobras)
              {projecao.fallbackSemTravas && (
                <span className="ml-2 text-error normal-case tracking-normal">
                  · alguma vaga preenchida sem as travas de 80%/20% (ninguém atendia)
                </span>
              )}
            </p>
            <table className="w-full text-xs">
              <tbody>
                {projecao.agremiacoes
                  .filter((a) => a.cadeirasTotal > 0 || a.atingiuClausula)
                  .map((a) => (
                    <tr key={a.chave} className="border-t border-border/60">
                      <td className="py-1 pr-2">
                        <span className="font-semibold">{coligacaoCurta(a.nome) ?? a.nome}</span>
                        {a.federacao && (
                          <span className="ml-1 text-muted-foreground">
                            ({a.siglas.join(' + ')}) · {a.nome}
                          </span>
                        )}
                      </td>
                      <td className="py-1 px-2 text-right tabular-nums">
                        {a.votos.toLocaleString('pt-BR')} · {a.pctValidos.toFixed(1)}%
                      </td>
                      <td className="py-1 pl-2 text-right tabular-nums whitespace-nowrap">
                        <strong>{a.cadeirasTotal}</strong>{' '}
                        <span className="text-muted-foreground">
                          (QP {a.cadeirasIniciais} + sobras {a.cadeirasSobras})
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

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
                    {p.federacao && (
                      <span className="ml-2 text-accent">
                        · Federação {coligacaoCurta(p.federacao)}
                      </span>
                    )}
                  </p>
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
