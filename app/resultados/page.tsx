import Link from 'next/link'

import { MarcaCdl } from '@/components/marca-cdl'
import {
  ResultadosAbas,
  type Cargo,
  type CandidatoLegenda,
  type CandidatoLinha,
  type LegendaLinha,
  type RankingItem,
  type ZonaLinha,
} from '@/components/resultados-abas'
import { RodapeInstitucional } from '@/components/rodape-institucional'
import {
  projetarCadeiras,
  type PartidoVotos,
} from '@/lib/projecao'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const metadata = {
  title: 'Resultados · Pesquisa Sergipe 2026',
  description:
    'Resultados da Pesquisa Sergipe 2026 realizada pela CDL Aracaju. Registrada no TRE/SE.',
}

export const dynamic = 'force-dynamic'

const VAGAS = { federal: 8, estadual: 24 } as const
const CARGOS_CANDIDATO = ['governador', 'senador', 'presidente'] as const
const CARGOS_LEGENDA = ['federal', 'estadual'] as const

type Edicao = {
  id: string
  nome: string
  divulgada_em: string | null
  divulgacao_prevista: string | null
  registro_tre: string | null
}

export default async function ResultadosPublicosPage() {
  const db = supabaseAdmin()
  const { data: edicao } = await db
    .from('edicao')
    .select('id, nome, divulgada_em, divulgacao_prevista, registro_tre')
    .eq('ativa', true)
    .maybeSingle<Edicao>()

  if (!edicao || !edicao.divulgada_em) {
    return <AguardandoDivulgacao edicao={edicao} />
  }

  // Carrega tudo em paralelo
  const [
    { data: candidatosCargoData },
    { data: legendasCargoData },
    { data: candidatosFedEstData },
    { data: votosCandsFedEstData },
    { data: zonaRowsData },
    { data: bnsRowsData },
    { count: eleitoresCount },
    { data: impedimentosData },
  ] = await Promise.all([
    db
      .from('v_resultados_candidato')
      .select('candidato_id, cargo, numero, nome_urna, foto_url, sigla, cor_hex, votos')
      .eq('edicao_id', edicao.id)
      .in('cargo', CARGOS_CANDIDATO as unknown as string[])
      .order('votos', { ascending: false }),
    db
      .from('v_resultados_legenda')
      .select('partido_id, cargo, numero, sigla, nome, cor_hex, votos')
      .eq('edicao_id', edicao.id)
      .in('cargo', CARGOS_LEGENDA as unknown as string[])
      .order('votos', { ascending: false }),
    db
      .from('candidatos_pesquisa')
      .select('id, cargo, numero, nome_urna, partido_id')
      .eq('edicao_id', edicao.id)
      .eq('ativo', true)
      .in('cargo', ['federal', 'estadual'])
      .order('numero'),
    db
      .from('v_resultados_candidato')
      .select('candidato_id, votos')
      .eq('edicao_id', edicao.id)
      .in('cargo', CARGOS_LEGENDA as unknown as string[]),
    db
      .from('v_resultados_zona')
      .select('resposta, votos')
      .eq('edicao_id', edicao.id),
    db
      .from('votos_pesquisa')
      .select('cargo, metodo')
      .eq('edicao_id', edicao.id)
      .in('metodo', ['branco', 'nao_sabe']),
    db
      .from('eleitores_pesquisa')
      .select('id', { count: 'exact', head: true })
      .eq('edicao_id', edicao.id)
      .eq('wa_validado', true),
    db
      .from('candidatos_pesquisa')
      .select('id, impedimento')
      .eq('edicao_id', edicao.id)
      .not('impedimento', 'is', null),
  ])

  // Reorganiza
  const porCandidato: Record<string, CandidatoLinha[]> = {}
  for (const c of CARGOS_CANDIDATO) porCandidato[c] = []
  for (const r of (candidatosCargoData ?? []) as CandidatoLinha[]) {
    porCandidato[r.cargo].push(r)
  }

  const porLegenda: Record<string, LegendaLinha[]> = {}
  for (const c of CARGOS_LEGENDA) porLegenda[c] = []
  for (const r of (legendasCargoData ?? []) as LegendaLinha[]) {
    porLegenda[r.cargo].push(r)
  }

  const candidatosPorPartido = new Map<string, CandidatoLegenda[]>()
  {
    const votosPorCand = new Map<string, number>()
    for (const r of (votosCandsFedEstData ?? []) as Array<{
      candidato_id: string
      votos: number
    }>) {
      votosPorCand.set(r.candidato_id, r.votos)
    }
    for (const c of (candidatosFedEstData ?? []) as Array<{
      id: string
      cargo: 'federal' | 'estadual'
      numero: number
      nome_urna: string
      partido_id: string
    }>) {
      const key = `${c.cargo}:${c.partido_id}`
      const arr = candidatosPorPartido.get(key) ?? []
      arr.push({
        id: c.id,
        numero: c.numero,
        nome_urna: c.nome_urna,
        votos: votosPorCand.get(c.id) ?? 0,
      })
      candidatosPorPartido.set(key, arr)
    }
    for (const [k, arr] of candidatosPorPartido) {
      arr.sort((a, b) => b.votos - a.votos)
      candidatosPorPartido.set(k, arr)
    }
  }

  const zona = (zonaRowsData ?? []) as ZonaLinha[]
  const temZona = zona.length > 0

  const brancoNaoSei: Record<string, { branco: number; nao_sabe: number }> = {}
  for (const r of (bnsRowsData ?? []) as { cargo: string; metodo: string }[]) {
    if (!brancoNaoSei[r.cargo])
      brancoNaoSei[r.cargo] = { branco: 0, nao_sabe: 0 }
    if (r.metodo === 'branco') brancoNaoSei[r.cargo].branco++
    if (r.metodo === 'nao_sabe') brancoNaoSei[r.cargo].nao_sabe++
  }

  // Projeção fed/est pra calcular eleitosIds + ranking
  const eleitosIds: Record<'federal' | 'estadual', string[]> = {
    federal: [],
    estadual: [],
  }
  const rankingCandidatos: Record<'federal' | 'estadual', RankingItem[]> = {
    federal: [],
    estadual: [],
  }
  for (const cargo of CARGOS_LEGENDA) {
    const partidosInput: PartidoVotos[] = (porLegenda[cargo] ?? []).map((l) => ({
      partidoId: l.partido_id,
      numero: l.numero,
      sigla: l.sigla,
      nome: l.nome,
      corHex: l.cor_hex,
      votosLegenda: l.votos,
      candidatos: (candidatosPorPartido.get(`${cargo}:${l.partido_id}`) ?? []).map(
        (c) => ({
          candidatoId: c.id,
          numero: c.numero,
          nomeUrna: c.nome_urna,
          votos: c.votos,
        }),
      ),
    }))
    const projecao = projetarCadeiras(partidosInput, VAGAS[cargo])
    for (const p of projecao.partidos) {
      for (const e of p.eleitosProjetados) {
        eleitosIds[cargo].push(e.candidatoId)
      }
    }
    for (const l of porLegenda[cargo] ?? []) {
      const cands = candidatosPorPartido.get(`${cargo}:${l.partido_id}`) ?? []
      for (const c of cands) {
        rankingCandidatos[cargo].push({
          candidatoId: c.id,
          numero: c.numero,
          nomeUrna: c.nome_urna,
          sigla: l.sigla,
          corHex: l.cor_hex,
          votos: c.votos,
          partidoId: l.partido_id,
        })
      }
    }
    rankingCandidatos[cargo].sort((a, b) => b.votos - a.votos)
  }

  // Impedimentos
  const impedimentosEntries: Array<[string, string]> = []
  for (const r of (impedimentosData ?? []) as Array<{
    id: string
    impedimento: string | null
  }>) {
    if (r.impedimento) impedimentosEntries.push([r.id, r.impedimento])
  }

  // Map → entries pra serializar entre Server e Client
  const candidatosPorPartidoEntries = Array.from(candidatosPorPartido.entries())

  const cargosDisponiveis: Cargo[] = [
    ...CARGOS_CANDIDATO,
    ...CARGOS_LEGENDA,
    ...(temZona ? (['zona_expansao'] as const) : []),
  ]

  const n = eleitoresCount ?? 0
  const margem = calcularMargem(n)

  return (
    <>
      <main className="flex flex-col flex-1 bg-background">
        <header className="border-b border-border bg-background">
          <div className="max-w-4xl mx-auto px-5 sm:px-6 py-4 flex items-center justify-between gap-4">
            <Link href="/">
              <MarcaCdl tamanho="sm" />
            </Link>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Resultados
            </p>
          </div>
        </header>

        <section className="px-5 sm:px-6 pt-10 sm:pt-16 pb-6">
          <div className="max-w-4xl mx-auto flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
                Pesquisa Sergipe 2026 · {edicao.nome}
              </p>
              <h1 className="text-4xl sm:text-6xl font-bold leading-[1.05] tracking-tight">
                Eleições em Sergipe
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                Pesquisa de intenção de voto da CDL Aracaju. Cobertura
                estadual: 75 municípios. Identidade verificada por CPF +
                WhatsApp.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <CardFicha titulo="Amostra (n)" valor={n.toLocaleString('pt-BR')} />
              <CardFicha titulo="Margem" valor={margem} />
              <CardFicha titulo="Confiança" valor="95%" />
              <CardFicha
                titulo="Divulgação"
                valor={formatarData(edicao.divulgada_em)}
              />
            </div>

            {edicao.registro_tre && (
              <p className="text-[11px] sm:text-xs text-muted-foreground border border-border bg-muted rounded-md px-4 py-3">
                <strong>Registro TRE/SE:</strong>{' '}
                <span className="font-mono">{edicao.registro_tre}</span> ·
                Pesquisa registrada no PesqEle conforme Lei 9.504/97 art. 33
                e Resolução TSE 23.747/2026.{' '}
                <Link href="/transparencia" className="text-primary hover:underline">
                  Ver metodologia
                </Link>
                .
              </p>
            )}
          </div>
        </section>

        <ResultadosAbas
          cargosDisponiveis={cargosDisponiveis}
          porCandidato={porCandidato}
          porLegenda={porLegenda}
          candidatosPorPartidoEntries={candidatosPorPartidoEntries}
          rankingCandidatos={rankingCandidatos}
          eleitosIdsEntries={eleitosIds}
          impedimentosEntries={impedimentosEntries}
          zona={zona}
          brancoNaoSei={brancoNaoSei}
        />
      </main>

      <RodapeInstitucional />
    </>
  )
}

function AguardandoDivulgacao({ edicao }: { edicao: Edicao | null }) {
  const prevista = edicao?.divulgacao_prevista
  return (
    <>
      <main className="flex flex-col flex-1 bg-background items-center justify-center px-5 py-16">
        <div className="w-full max-w-md flex flex-col gap-8 items-start">
          <MarcaCdl tamanho="md" />
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
              Resultados
            </p>
            <h1 className="text-3xl sm:text-4xl font-semibold leading-tight">
              Em breve aqui
            </h1>
            {prevista ? (
              <p className="text-base text-muted-foreground leading-relaxed">
                A pesquisa Sergipe 2026 da CDL Aracaju será divulgada em{' '}
                <strong className="text-foreground">
                  {formatarData(prevista)}
                </strong>
                , após registro no PesqEle do TRE/SE conforme Resolução TSE
                23.747/2026.
              </p>
            ) : (
              <p className="text-base text-muted-foreground leading-relaxed">
                A pesquisa Sergipe 2026 da CDL Aracaju ainda não foi
                divulgada. A divulgação ocorre após registro no PesqEle do
                TRE/SE conforme Resolução TSE 23.747/2026.
              </p>
            )}
            <p className="text-sm text-muted-foreground leading-relaxed pt-2 border-t border-border">
              Instale o app no celular pra ver o resultado assim que for
              publicado.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Link
              href="/"
              className="flex-1 inline-flex justify-center items-center h-11 px-5 rounded-md border border-border text-foreground text-sm font-medium hover:bg-muted transition"
            >
              ← Voltar ao início
            </Link>
            <Link
              href="/transparencia"
              className="flex-1 inline-flex justify-center items-center h-11 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
            >
              Ver metodologia
            </Link>
          </div>
        </div>
      </main>
      <RodapeInstitucional />
    </>
  )
}

function CardFicha({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 sm:px-4 py-3 flex flex-col gap-0.5">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {titulo}
      </p>
      <p className="text-sm sm:text-base font-semibold tabular-nums">{valor}</p>
    </div>
  )
}

function formatarData(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function calcularMargem(n: number): string {
  if (n < 30) return '±—'
  const margem = (1.96 * Math.sqrt(0.25 / n) * 100).toFixed(1)
  return `±${margem}pp`
}
