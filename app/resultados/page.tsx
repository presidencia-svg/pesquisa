import Link from 'next/link'

import { MarcaCdl } from '@/components/marca-cdl'
import { RodapeInstitucional } from '@/components/rodape-institucional'
import {
  projetarCadeiras,
  type PartidoVotos,
} from '@/lib/projecao'
import { supabaseAdmin } from '@/lib/supabase/admin'

const VAGAS = { federal: 8, estadual: 24 } as const

export const metadata = {
  title: 'Resultados · Pesquisa Sergipe 2026',
  description:
    'Resultados da Pesquisa Sergipe 2026 realizada pela CDL Aracaju. Registrada no TRE/SE.',
}

export const dynamic = 'force-dynamic'

type Edicao = {
  id: string
  nome: string
  divulgada_em: string | null
  divulgacao_prevista: string | null
  registro_tre: string | null
}

type CandidatoLinha = {
  candidato_id: string
  cargo: string
  numero: number
  nome_urna: string
  foto_url: string | null
  sigla: string | null
  cor_hex: string | null
  votos: number
}

type LegendaLinha = {
  partido_id: string
  cargo: string
  numero: number
  sigla: string
  nome: string
  cor_hex: string | null
  votos: number
}

type CandidatoLegenda = {
  id: string
  numero: number
  nome_urna: string
  votos: number
}

type ZonaLinha = {
  resposta: 'aracaju' | 'sao_cristovao'
  votos: number
}

// Ordem didática — local primeiro
const CARGOS_CANDIDATO = ['governador', 'senador', 'presidente'] as const
const CARGOS_LEGENDA = ['federal', 'estadual'] as const

const ROTULO_CARGO = {
  governador: 'Governador',
  senador: 'Senador (2 vagas)',
  presidente: 'Presidente',
  federal: 'Deputado Federal',
  estadual: 'Deputado Estadual',
  zona_expansao: 'Zona de Expansão',
} as const

const ROTULO_NAV = {
  governador: 'Governador',
  senador: 'Senador',
  presidente: 'Presidente',
  federal: 'Dep. Federal',
  estadual: 'Dep. Estadual',
  zona_expansao: 'Zona Expansão',
} as const

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

  // --- carrega tudo em paralelo ---
  const [
    { data: candidatosCargoData },
    { data: legendasCargoData },
    { data: candidatosFedEstData },
    { data: votosCandsFedEstData },
    { data: zonaRowsData },
    { data: bnsRowsData },
    { count: eleitoresCount },
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
  ])

  // Impedimentos de candidatos (sub judice / inelegivel / cassado)
  const { data: impedimentosData } = await db
    .from('candidatos_pesquisa')
    .select('id, impedimento')
    .eq('edicao_id', edicao.id)
    .not('impedimento', 'is', null)
  const impedimentos = new Map<string, string>()
  for (const r of (impedimentosData ?? []) as Array<{
    id: string
    impedimento: string | null
  }>) {
    if (r.impedimento) impedimentos.set(r.id, r.impedimento)
  }

  // Reorganiza dados pro render
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

  // --- projeção TSE pra fed/est: identifica eleitosIds ---
  const eleitosIds: Record<'federal' | 'estadual', Set<string>> = {
    federal: new Set(),
    estadual: new Set(),
  }
  // Cria um ranking completo (todos candidatos do cargo ordenados por voto)
  // pra renderizar a aba "Por candidato"
  const rankingCandidatos: Record<
    'federal' | 'estadual',
    Array<{
      candidatoId: string
      numero: number
      nomeUrna: string
      sigla: string
      corHex: string | null
      votos: number
      partidoId: string
    }>
  > = { federal: [], estadual: [] }

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
        eleitosIds[cargo].add(e.candidatoId)
      }
    }

    // Constroi ranking individual: todos os candidatos do cargo
    for (const l of porLegenda[cargo] ?? []) {
      const cands =
        candidatosPorPartido.get(`${cargo}:${l.partido_id}`) ?? []
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

  const brancoNaoSei: Record<string, { branco: number; nao_sabe: number }> = {}
  for (const r of (bnsRowsData ?? []) as { cargo: string; metodo: string }[]) {
    if (!brancoNaoSei[r.cargo])
      brancoNaoSei[r.cargo] = { branco: 0, nao_sabe: 0 }
    if (r.metodo === 'branco') brancoNaoSei[r.cargo].branco++
    if (r.metodo === 'nao_sabe') brancoNaoSei[r.cargo].nao_sabe++
  }

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

        {/* Pills de navegação */}
        <nav className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
          <div className="max-w-4xl mx-auto px-5 sm:px-6 py-3 flex gap-2 overflow-x-auto">
            {CARGOS_CANDIDATO.map((cargo) => (
              <a
                key={cargo}
                href={`#${cargo}`}
                className="inline-flex items-center justify-center h-9 px-4 rounded-full border border-border bg-background text-sm font-medium text-foreground hover:bg-muted hover:border-accent transition whitespace-nowrap"
              >
                {ROTULO_NAV[cargo]}
              </a>
            ))}
            {CARGOS_LEGENDA.map((cargo) => (
              <a
                key={cargo}
                href={`#${cargo}-candidatos`}
                className="inline-flex items-center justify-center h-9 px-4 rounded-full border border-border bg-background text-sm font-medium text-foreground hover:bg-muted hover:border-accent transition whitespace-nowrap"
              >
                {ROTULO_NAV[cargo]}
              </a>
            ))}
            {temZona && (
              <a
                href="#zona_expansao"
                className="inline-flex items-center justify-center h-9 px-4 rounded-full border border-border bg-background text-sm font-medium text-foreground hover:bg-muted hover:border-accent transition whitespace-nowrap"
              >
                Zona Expansão
              </a>
            )}
          </div>
        </nav>

        <section className="px-5 sm:px-6 pt-10 pb-16">
          <div className="max-w-4xl mx-auto flex flex-col gap-14">
            {CARGOS_CANDIDATO.map((cargo) => (
              <SecaoCandidatos
                key={cargo}
                cargo={cargo}
                titulo={ROTULO_CARGO[cargo]}
                linhas={porCandidato[cargo] ?? []}
                branco={brancoNaoSei[cargo]?.branco ?? 0}
                naoSabe={brancoNaoSei[cargo]?.nao_sabe ?? 0}
                impedimentos={impedimentos}
              />
            ))}

            {CARGOS_LEGENDA.map((cargo) => (
              <div key={cargo} className="flex flex-col gap-10">
                <SecaoLegendas
                  cargo={cargo}
                  titulo={ROTULO_CARGO[cargo]}
                  linhas={porLegenda[cargo] ?? []}
                  candidatosPorPartido={candidatosPorPartido}
                  eleitosIds={eleitosIds[cargo]}
                  branco={brancoNaoSei[cargo]?.branco ?? 0}
                  naoSabe={brancoNaoSei[cargo]?.nao_sabe ?? 0}
                  vagas={VAGAS[cargo]}
                  impedimentos={impedimentos}
                />
                <SecaoRankingIndividual
                  cargo={cargo}
                  vagas={VAGAS[cargo]}
                  linhas={rankingCandidatos[cargo]}
                  eleitosIds={eleitosIds[cargo]}
                  impedimentos={impedimentos}
                />
              </div>
            ))}

            {temZona && (
              <SecaoZonaExpansao
                linhas={zona}
                branco={brancoNaoSei['zona_expansao']?.branco ?? 0}
                naoSabe={brancoNaoSei['zona_expansao']?.nao_sabe ?? 0}
              />
            )}

            <div className="rounded-md border border-border bg-muted px-5 py-5 flex flex-col gap-3 text-sm">
              <p className="font-semibold text-foreground">
                Como ler estes resultados
              </p>
              <ul className="text-muted-foreground leading-relaxed list-disc pl-5 flex flex-col gap-1.5 text-xs sm:text-sm">
                <li>
                  <strong>Governador, Senador, Presidente:</strong> voto por
                  candidato. O eleitor digita o número completo.
                </li>
                <li>
                  <strong>Deputado Federal e Estadual:</strong> voto por
                  legenda — define cadeiras via Quociente Eleitoral.
                  Candidato individual aparece sob cada legenda definindo a
                  ordem.
                </li>
                <li>
                  <strong>Senador:</strong> são 2 vagas em 2026 (igual a
                  2018). Cada eleitor escolhe até 2 candidatos.
                </li>
                <li>
                  <strong>Branco / Não sei:</strong> contados em separado e
                  entram no denominador do percentual.
                </li>
              </ul>
              <Link
                href="/transparencia"
                className="self-start text-sm text-primary hover:underline font-medium"
              >
                Ler metodologia completa →
              </Link>
            </div>
          </div>
        </section>
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

function SecaoCandidatos({
  cargo,
  titulo,
  linhas,
  branco,
  naoSabe,
  impedimentos,
}: {
  cargo: string
  titulo: string
  linhas: CandidatoLinha[]
  branco: number
  naoSabe: number
  impedimentos: Map<string, string>
}) {
  const validos = linhas.reduce((acc, l) => acc + l.votos, 0)
  const total = validos + branco + naoSabe
  const lider = linhas[0]
  const liderPct = total === 0 || !lider ? 0 : (lider.votos / total) * 100
  const segundo = linhas[1]
  const segundoPct = total === 0 || !segundo ? 0 : (segundo.votos / total) * 100
  const diferenca = liderPct - segundoPct

  return (
    <section
      id={cargo}
      className="scroll-mt-20 flex flex-col gap-5"
    >
      <h2 className="text-2xl sm:text-3xl font-bold text-foreground border-l-4 border-accent pl-4">
        {titulo}
      </h2>

      {total === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          Sem votos registrados.
        </p>
      ) : (
        <>
          {lider && (
            <div
              className="rounded-md border-l-4 px-5 py-4 bg-muted/50"
              style={{ borderLeftColor: lider.cor_hex ?? '#52525b' }}
            >
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                Lidera a corrida
              </p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">
                {lider.nome_urna}
                {lider.sigla && (
                  <span className="text-base font-normal text-muted-foreground ml-2">
                    ({lider.sigla})
                  </span>
                )}{' '}
                com <span style={{ color: lider.cor_hex ?? undefined }}>
                  {liderPct.toFixed(1)}%
                </span>
              </p>
              {segundo && (
                <p className="text-sm text-muted-foreground mt-1">
                  {diferenca > 0
                    ? `${diferenca.toFixed(1)} pontos à frente de ${segundo.nome_urna} (${segundoPct.toFixed(1)}%)`
                    : 'Empate técnico no topo'}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {linhas.map((l, i) => (
              <LinhaCandidato
                key={l.candidato_id}
                posicao={i + 1}
                numero={l.numero}
                nome={l.nome_urna}
                detalhe={l.sigla ?? ''}
                cor={l.cor_hex ?? '#52525b'}
                votos={l.votos}
                total={total}
                impedimento={impedimentos.get(l.candidato_id) ?? null}
              />
            ))}
          </div>

          <TotaisCargo validos={validos} brancos={branco} naoSabe={naoSabe} />
        </>
      )}
    </section>
  )
}

function SecaoLegendas({
  cargo,
  titulo,
  linhas,
  candidatosPorPartido,
  eleitosIds,
  branco,
  naoSabe,
  vagas,
  impedimentos,
}: {
  cargo: 'federal' | 'estadual'
  titulo: string
  linhas: LegendaLinha[]
  candidatosPorPartido: Map<string, CandidatoLegenda[]>
  eleitosIds: Set<string>
  branco: number
  naoSabe: number
  vagas: number
  impedimentos: Map<string, string>
}) {
  const validos = linhas.reduce((acc, l) => acc + l.votos, 0)
  const total = validos + branco + naoSabe
  const lider = linhas[0]
  const liderPct = total === 0 || !lider ? 0 : (lider.votos / total) * 100

  return (
    <section id={cargo} className="scroll-mt-20 flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground border-l-4 border-accent pl-4">
          {titulo}
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground pl-5">
          {vagas} cadeiras em disputa · voto por legenda · projeção pelo
          Quociente Eleitoral (Lei 9.504/97 art. 109)
        </p>
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground pl-5 pt-1">
          Por legenda (cadeiras projetadas)
        </p>
      </div>

      {total === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          Sem votos registrados.
        </p>
      ) : (
        <>
          {lider && (
            <div
              className="rounded-md border-l-4 px-5 py-4 bg-muted/50"
              style={{ borderLeftColor: lider.cor_hex ?? '#52525b' }}
            >
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                Legenda mais votada
              </p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">
                {lider.sigla} ·{' '}
                <span style={{ color: lider.cor_hex ?? undefined }}>
                  {liderPct.toFixed(1)}%
                </span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">{lider.nome}</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {linhas.map((l, i) => {
              const cands = candidatosPorPartido.get(`${cargo}:${l.partido_id}`) ?? []
              const somaCandidatos = cands.reduce(
                (acc, c) => acc + c.votos,
                0,
              )
              const semCandidato = Math.max(l.votos - somaCandidatos, 0)
              return (
                <div key={l.partido_id} className="flex flex-col">
                  <LinhaCandidato
                    posicao={i + 1}
                    numero={l.numero}
                    nome={l.sigla}
                    detalhe={l.nome}
                    cor={l.cor_hex ?? '#52525b'}
                    votos={l.votos}
                    total={total}
                  />
                  {cands.length > 0 && (
                    <details
                      className="mt-1 ml-2 sm:ml-14 text-xs"
                      open={cands.some((c) => c.votos > 0)}
                    >
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition py-1">
                        Candidatos da legenda ({cands.length}) ▾
                      </summary>
                      <ul className="mt-1 flex flex-col gap-1 pl-3 border-l border-dashed border-border">
                        {cands.map((c) => {
                          const pct = l.votos === 0 ? 0 : (c.votos / l.votos) * 100
                          const eleito = eleitosIds.has(c.id)
                          const imped = impedimentos.get(c.id)
                          return (
                            <li
                              key={c.id}
                              className="flex items-baseline gap-2 py-1"
                            >
                              <span className="font-mono tabular-nums text-[10px] text-muted-foreground w-12 flex-none">
                                {c.numero}
                              </span>
                              <span className="text-foreground truncate flex-1 inline-flex items-center gap-1.5">
                                <span className="truncate">{c.nome_urna}</span>
                                {imped && (
                                  <span
                                    className="inline-flex items-center text-[9px] uppercase tracking-widest font-bold text-amber-700 bg-amber-50 border border-amber-300 rounded-full px-1.5 py-0.5"
                                    title={imped}
                                  >
                                    sub judice
                                  </span>
                                )}
                                {eleito && (
                                  <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-widest font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5">
                                    eleito
                                  </span>
                                )}
                              </span>
                              <span className="tabular-nums whitespace-nowrap text-foreground">
                                {c.votos.toLocaleString('pt-BR')}
                                {c.votos > 0 ? (
                                  <span className="text-muted-foreground font-normal ml-1">
                                    ({pct.toFixed(0)}%)
                                  </span>
                                ) : null}
                              </span>
                            </li>
                          )
                        })}
                        {semCandidato > 0 && (
                          <li className="flex items-baseline gap-2 py-1 mt-1 pt-2 border-t border-dotted border-border/60 text-muted-foreground italic">
                            <span className="font-mono tabular-nums text-[10px] w-12 flex-none">
                              ?
                            </span>
                            <span className="truncate flex-1">Só legenda</span>
                            <span className="tabular-nums whitespace-nowrap not-italic">
                              {semCandidato.toLocaleString('pt-BR')}
                            </span>
                          </li>
                        )}
                      </ul>
                    </details>
                  )}
                </div>
              )
            })}
          </div>

          <TotaisCargo validos={validos} brancos={branco} naoSabe={naoSabe} />
        </>
      )}
    </section>
  )
}

function SecaoRankingIndividual({
  cargo,
  vagas,
  linhas,
  eleitosIds,
  impedimentos,
}: {
  cargo: 'federal' | 'estadual'
  vagas: number
  linhas: Array<{
    candidatoId: string
    numero: number
    nomeUrna: string
    sigla: string
    corHex: string | null
    votos: number
    partidoId: string
  }>
  eleitosIds: Set<string>
  impedimentos: Map<string, string>
}) {
  // Mostra os top N+10 (pra dar contexto pos-corte)
  const TOPO = Math.max(vagas + 10, 30)
  const visiveis = linhas.slice(0, TOPO)
  const ocultas = linhas.length - visiveis.length
  const totalVotos = linhas.reduce((acc, l) => acc + l.votos, 0)

  if (visiveis.length === 0) return null

  return (
    <section
      id={`${cargo}-candidatos`}
      className="scroll-mt-20 flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1 pl-5">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
          Por candidato (ranking individual)
        </p>
        <p className="text-sm text-muted-foreground">
          {linhas.length} candidatos com voto individual nesta pesquisa.
          Os <strong>top {vagas}</strong> seriam eleitos se a eleição
          fosse hoje, considerando a regra do Quociente Eleitoral.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {visiveis.map((c, i) => {
          const eleito = eleitosIds.has(c.candidatoId)
          const imped = impedimentos.get(c.candidatoId)
          const pct = totalVotos === 0 ? 0 : (c.votos / totalVotos) * 100
          return (
            <div
              key={c.candidatoId}
              className={`rounded-md border px-3 sm:px-4 py-3 flex items-center gap-3 sm:gap-4 ${
                eleito
                  ? 'border-emerald-200 bg-emerald-50/40'
                  : 'border-border bg-background'
              }`}
            >
              <span className="text-xs sm:text-sm text-muted-foreground tabular-nums w-5 flex-none text-center">
                {i + 1}
              </span>
              <div
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-md flex items-center justify-center text-xs sm:text-sm font-bold text-white tabular-nums flex-none shadow-sm"
                style={{ background: c.corHex ?? '#52525b' }}
              >
                {c.numero}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm sm:text-base font-semibold truncate">
                    {c.nomeUrna}
                  </p>
                  {imped && (
                    <span
                      className="inline-flex items-center text-[10px] uppercase tracking-widest font-bold text-amber-700 bg-amber-100 border border-amber-300 rounded-full px-2 py-0.5"
                      title={imped}
                    >
                      sub judice
                    </span>
                  )}
                  {eleito && (
                    <span className="inline-flex items-center text-[10px] uppercase tracking-widest font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 rounded-full px-2 py-0.5">
                      eleito
                    </span>
                  )}
                </div>
                {imped && (
                  <p className="text-[11px] text-amber-700 italic mt-0.5">
                    {imped}
                  </p>
                )}
                <div className="flex items-baseline justify-between gap-3 mt-0.5">
                  <p className="text-xs text-muted-foreground truncate">
                    {c.sigla}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                    {c.votos.toLocaleString('pt-BR')}{' '}
                    {c.votos === 1 ? 'voto' : 'votos'}
                    {pct > 0 && (
                      <span className="ml-1">
                        ({pct.toFixed(2)}%)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {ocultas > 0 && (
        <p className="text-[11px] text-muted-foreground italic text-center pt-2">
          +{ocultas} candidato{ocultas !== 1 ? 's' : ''} fora do top {TOPO}.
        </p>
      )}

      <p className="text-[11px] text-muted-foreground italic pt-1 leading-relaxed">
        A projeção de quem seria eleito segue a regra TSE: o total da
        legenda define quantas cadeiras o partido ganha (Quociente
        Eleitoral + sobras por maiores médias), depois os candidatos mais
        votados <em>dentro do partido</em> ocupam essas cadeiras. Por
        isso um candidato com mais votos individuais pode ficar de fora
        se a legenda dele não atinge o QE — e um candidato com menos
        votos individuais pode entrar se seu partido elege muitas cadeiras.
      </p>
    </section>
  )
}

function SecaoZonaExpansao({
  linhas,
  branco,
  naoSabe,
}: {
  linhas: ZonaLinha[]
  branco: number
  naoSabe: number
}) {
  const aju = linhas.find((l) => l.resposta === 'aracaju')?.votos ?? 0
  const sc = linhas.find((l) => l.resposta === 'sao_cristovao')?.votos ?? 0
  const total = aju + sc + branco + naoSabe
  if (total === 0) return null
  return (
    <section id="zona_expansao" className="scroll-mt-20 flex flex-col gap-5">
      <h2 className="text-2xl sm:text-3xl font-bold text-foreground border-l-4 border-accent pl-4">
        Zona de Expansão
      </h2>
      <p className="text-xs sm:text-sm text-muted-foreground -mt-2">
        Consulta extra apresentada apenas a eleitores de Aracaju e São
        Cristóvão.
      </p>
      <div className="flex flex-col gap-2">
        <LinhaSec rotulo="Deveria ficar com Aracaju" votos={aju} total={total} />
        <LinhaSec rotulo="Deveria ficar com São Cristóvão" votos={sc} total={total} />
        {branco > 0 && (
          <LinhaSec rotulo="Branco" votos={branco} total={total} />
        )}
        {naoSabe > 0 && (
          <LinhaSec rotulo="Não sabe / não quis responder" votos={naoSabe} total={total} />
        )}
      </div>
    </section>
  )
}

function LinhaCandidato({
  posicao,
  numero,
  nome,
  detalhe,
  cor,
  votos,
  total,
  impedimento,
}: {
  posicao: number
  numero: number
  nome: string
  detalhe: string
  cor: string
  votos: number
  total: number
  impedimento?: string | null
}) {
  const pct = total === 0 ? 0 : (votos / total) * 100
  return (
    <div className="rounded-md border border-border bg-background px-3 sm:px-4 py-3 flex items-center gap-3 sm:gap-4">
      <span className="text-xs sm:text-sm text-muted-foreground tabular-nums w-5 flex-none text-center">
        {posicao}
      </span>
      <div
        className="w-11 h-11 sm:w-12 sm:h-12 rounded-md flex items-center justify-center text-xs sm:text-sm font-bold text-white tabular-nums flex-none shadow-sm"
        style={{ background: cor }}
      >
        {numero}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm sm:text-base font-semibold truncate inline-flex items-center gap-1.5">
            <span className="truncate">{nome}</span>
            {impedimento && (
              <span
                className="inline-flex items-center text-[9px] uppercase tracking-widest font-bold text-amber-700 bg-amber-50 border border-amber-300 rounded-full px-1.5 py-0.5 whitespace-nowrap"
                title={impedimento}
              >
                sub judice
              </span>
            )}
          </p>
          <p className="text-base sm:text-lg font-bold tabular-nums whitespace-nowrap">
            {pct.toFixed(1)}%
          </p>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          {detalhe ? (
            <p className="text-xs text-muted-foreground truncate">{detalhe}</p>
          ) : <span />}
          <p className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
            {votos.toLocaleString('pt-BR')} {votos === 1 ? 'voto' : 'votos'}
          </p>
        </div>
        {impedimento && (
          <p className="text-[11px] text-amber-700 italic mt-1">
            {impedimento}
          </p>
        )}
        <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: cor }}
          />
        </div>
      </div>
    </div>
  )
}

function TotaisCargo({
  validos,
  brancos,
  naoSabe,
}: {
  validos: number
  brancos: number
  naoSabe: number
}) {
  const total = validos + brancos + naoSabe
  if (total === 0) return null
  const pct = (n: number) => (total === 0 ? '0,00' : ((n / total) * 100).toFixed(2).replace('.', ','))
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-4 mt-2 border-t border-border">
      <CardTotal
        rotulo="Válidos"
        pct={pct(validos)}
        abs={validos}
        destaque
      />
      <CardTotal rotulo="Brancos" pct={pct(brancos)} abs={brancos} />
      <CardTotal rotulo="Não sabe" pct={pct(naoSabe)} abs={naoSabe} />
    </div>
  )
}

function CardTotal({
  rotulo,
  pct,
  abs,
  destaque = false,
}: {
  rotulo: string
  pct: string
  abs: number
  destaque?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5 items-center text-center py-2">
      <p
        className={`text-lg sm:text-2xl font-bold tabular-nums ${
          destaque ? 'text-foreground' : 'text-muted-foreground'
        }`}
      >
        {pct}%
      </p>
      <p className="text-xs sm:text-sm tabular-nums text-muted-foreground">
        {abs.toLocaleString('pt-BR')}
      </p>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {rotulo}
      </p>
    </div>
  )
}

function LinhaSec({
  rotulo,
  votos,
  total,
}: {
  rotulo: string
  votos: number
  total: number
}) {
  const pct = total === 0 ? 0 : (votos / total) * 100
  return (
    <div className="flex items-baseline justify-between px-3 sm:px-4 py-2 text-sm text-muted-foreground">
      <span>{rotulo}</span>
      <span className="tabular-nums">
        {pct.toFixed(1)}%{' '}
        <span className="text-xs">({votos.toLocaleString('pt-BR')})</span>
      </span>
    </div>
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
