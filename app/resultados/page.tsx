import Link from 'next/link'

import { MarcaCdl } from '@/components/marca-cdl'
import { RodapeInstitucional } from '@/components/rodape-institucional'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const metadata = {
  title: 'Resultados · Pesquisa Sergipe 2026',
  description:
    'Resultados da Pesqusa Sergipe 2026 realizada pela CDL Aracaju. Registrada no TRE/SE.',
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

const ROTULO_CARGO = {
  presidente: 'Presidente',
  governador: 'Governador',
  senador: 'Senador (2 vagas)',
  federal: 'Deputado Federal',
  estadual: 'Deputado Estadual',
  zona_expansao: 'Zona de Expansão',
} as const

export default async function ResultadosPublicosPage() {
  const db = supabaseAdmin()
  const { data: edicao } = await db
    .from('edicao')
    .select('id, nome, divulgada_em, divulgacao_prevista, registro_tre')
    .eq('ativa', true)
    .maybeSingle<Edicao>()

  // Sem edição ativa OU edição não divulgada → tela de espera
  if (!edicao || !edicao.divulgada_em) {
    return <AguardandoDivulgacao edicao={edicao} />
  }

  // Edição divulgada → carrega dados e renderiza
  const cargosCandidato = ['presidente', 'governador', 'senador'] as const
  const cargosLegenda = ['federal', 'estadual'] as const

  // Pres/Gov/Sen
  const porCandidato: Record<string, CandidatoLinha[]> = {}
  {
    const { data } = await db
      .from('v_resultados_candidato')
      .select(
        'candidato_id, cargo, numero, nome_urna, foto_url, sigla, cor_hex, votos',
      )
      .eq('edicao_id', edicao.id)
      .in('cargo', cargosCandidato as unknown as string[])
      .order('votos', { ascending: false })
    for (const c of cargosCandidato) porCandidato[c] = []
    for (const r of (data ?? []) as CandidatoLinha[]) {
      porCandidato[r.cargo].push(r)
    }
  }

  // Fed/Est legenda
  const porLegenda: Record<string, LegendaLinha[]> = {}
  {
    const { data } = await db
      .from('v_resultados_legenda')
      .select('partido_id, cargo, numero, sigla, nome, cor_hex, votos')
      .eq('edicao_id', edicao.id)
      .in('cargo', cargosLegenda as unknown as string[])
      .order('votos', { ascending: false })
    for (const c of cargosLegenda) porLegenda[c] = []
    for (const r of (data ?? []) as LegendaLinha[]) {
      porLegenda[r.cargo].push(r)
    }
  }

  // Candidatos fed/est com voto individual
  const candidatosPorPartido = new Map<string, CandidatoLegenda[]>()
  {
    const { data: candidatos } = await db
      .from('candidatos_pesquisa')
      .select('id, cargo, numero, nome_urna, partido_id')
      .eq('edicao_id', edicao.id)
      .eq('ativo', true)
      .in('cargo', ['federal', 'estadual'])
      .order('numero')
    const votosPorCandidato = new Map<string, number>()
    const { data: votosCands } = await db
      .from('v_resultados_candidato')
      .select('candidato_id, votos')
      .eq('edicao_id', edicao.id)
      .in('cargo', cargosLegenda as unknown as string[])
    for (const r of (votosCands ?? []) as Array<{
      candidato_id: string
      votos: number
    }>) {
      votosPorCandidato.set(r.candidato_id, r.votos)
    }
    for (const c of (candidatos ?? []) as Array<{
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
        votos: votosPorCandidato.get(c.id) ?? 0,
      })
      candidatosPorPartido.set(key, arr)
    }
    for (const [k, arr] of candidatosPorPartido) {
      arr.sort((a, b) => b.votos - a.votos)
      candidatosPorPartido.set(k, arr)
    }
  }

  // Zona expansão
  const { data: zonaRows } = await db
    .from('v_resultados_zona')
    .select('resposta, votos')
    .eq('edicao_id', edicao.id)
  const zona = (zonaRows ?? []) as ZonaLinha[]

  // Branco / Não sei
  const { data: bnsRows } = await db
    .from('votos_pesquisa')
    .select('cargo, metodo')
    .eq('edicao_id', edicao.id)
    .in('metodo', ['branco', 'nao_sabe'])
  const brancoNaoSei: Record<string, { branco: number; nao_sabe: number }> = {}
  for (const r of (bnsRows ?? []) as { cargo: string; metodo: string }[]) {
    if (!brancoNaoSei[r.cargo])
      brancoNaoSei[r.cargo] = { branco: 0, nao_sabe: 0 }
    if (r.metodo === 'branco') brancoNaoSei[r.cargo].branco++
    if (r.metodo === 'nao_sabe') brancoNaoSei[r.cargo].nao_sabe++
  }

  // Totais
  const { count: eleitoresCount } = await db
    .from('eleitores_pesquisa')
    .select('id', { count: 'exact', head: true })
    .eq('edicao_id', edicao.id)
    .eq('wa_validado', true)

  return (
    <>
      <main className="flex flex-col flex-1 bg-background">
        <header className="border-b border-border bg-background">
          <div className="max-w-3xl mx-auto px-5 sm:px-6 py-4 flex items-center justify-between gap-4">
            <Link href="/">
              <MarcaCdl tamanho="sm" />
            </Link>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Resultados
            </p>
          </div>
        </header>

        <section className="px-5 sm:px-6 py-10 sm:py-16">
          <div className="max-w-3xl mx-auto flex flex-col gap-10">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
                Pesquisa Sergipe 2026 · {edicao.nome}
              </p>
              <h1 className="text-3xl sm:text-5xl font-semibold leading-[1.05] tracking-tight">
                Resultados oficiais
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                Pesquisa de intenção de voto realizada pela CDL Aracaju,
                com identidade verificada (CPF + OTP no WhatsApp), voto
                desvinculado do eleitor, e cobertura dos 75 municípios de
                Sergipe.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <CardFicha
                titulo="Amostra (n)"
                valor={(eleitoresCount ?? 0).toLocaleString('pt-BR')}
              />
              <CardFicha
                titulo="Margem de erro"
                valor={calcularMargem(eleitoresCount ?? 0)}
              />
              <CardFicha titulo="Confiança" valor="95%" />
              <CardFicha
                titulo="Divulgação"
                valor={formatarData(edicao.divulgada_em)}
              />
            </div>

            {edicao.registro_tre && (
              <p className="text-xs text-muted-foreground border border-border bg-muted rounded-md px-4 py-3">
                <strong>Registro TRE/SE:</strong>{' '}
                <span className="font-mono">{edicao.registro_tre}</span> ·
                Pesquisa registrada no PesqEle conforme Lei 9.504/97 art. 33
                e Resolução TSE 23.747/2026. Metodologia completa em{' '}
                <Link href="/transparencia" className="text-primary hover:underline">
                  /transparencia
                </Link>
                .
              </p>
            )}

            {cargosCandidato.map((cargo) => (
              <SecaoCandidatos
                key={cargo}
                titulo={ROTULO_CARGO[cargo]}
                linhas={porCandidato[cargo] ?? []}
                branco={brancoNaoSei[cargo]?.branco ?? 0}
                naoSabe={brancoNaoSei[cargo]?.nao_sabe ?? 0}
              />
            ))}

            {cargosLegenda.map((cargo) => (
              <SecaoLegendas
                key={cargo}
                cargo={cargo}
                titulo={ROTULO_CARGO[cargo]}
                linhas={porLegenda[cargo] ?? []}
                candidatosPorPartido={candidatosPorPartido}
                branco={brancoNaoSei[cargo]?.branco ?? 0}
                naoSabe={brancoNaoSei[cargo]?.nao_sabe ?? 0}
              />
            ))}

            <SecaoZonaExpansao
              linhas={zona}
              branco={brancoNaoSei['zona_expansao']?.branco ?? 0}
              naoSabe={brancoNaoSei['zona_expansao']?.nao_sabe ?? 0}
            />

            <div className="rounded-md border border-border bg-muted px-5 py-5 flex flex-col gap-3 text-sm">
              <p className="font-semibold text-foreground">
                Sobre a metodologia
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Pesquisa <strong>espontânea</strong> (eleitor digita número
                estilo urna). Federal e Estadual usam dupla contagem:
                legenda define cadeiras via Quociente Eleitoral, candidato
                individual define ordem dentro da legenda. Diferenças entre
                candidatos menores que 2× a margem são empate técnico.
              </p>
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
                TRE/SE conforme Resolução TSE 23.747/2026, com mínimo de 5
                dias de antecedência.
              </p>
            )}
            <p className="text-sm text-muted-foreground leading-relaxed pt-2 border-t border-border">
              Instale o app no seu celular pra ver o resultado assim que
              for publicado.
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
  titulo,
  linhas,
  branco,
  naoSabe,
}: {
  titulo: string
  linhas: CandidatoLinha[]
  branco: number
  naoSabe: number
}) {
  const totalNum = linhas.reduce((acc, l) => acc + l.votos, 0)
  const total = totalNum + branco + naoSabe
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold text-foreground border-l-2 border-accent pl-4">
        {titulo}{' '}
        <span className="text-sm text-muted-foreground font-normal">
          ({total.toLocaleString('pt-BR')} votos)
        </span>
      </h2>
      {total === 0 ? (
        <p className="text-sm text-muted-foreground italic px-2 py-1">
          Sem votos registrados.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {linhas.map((l) => (
            <BarraCandidato
              key={l.candidato_id}
              numero={l.numero}
              nome={l.nome_urna}
              detalhe={l.sigla ?? ''}
              cor={l.cor_hex ?? '#52525b'}
              votos={l.votos}
              total={total}
            />
          ))}
          {(branco > 0 || naoSabe > 0) && (
            <div className="mt-2 pt-3 border-t border-dashed border-border flex flex-col gap-1">
              {branco > 0 && (
                <LinhaSec rotulo="Branco" votos={branco} total={total} />
              )}
              {naoSabe > 0 && (
                <LinhaSec rotulo="Não sabe / não quis responder" votos={naoSabe} total={total} />
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function SecaoLegendas({
  cargo,
  titulo,
  linhas,
  candidatosPorPartido,
  branco,
  naoSabe,
}: {
  cargo: 'federal' | 'estadual'
  titulo: string
  linhas: LegendaLinha[]
  candidatosPorPartido: Map<string, CandidatoLegenda[]>
  branco: number
  naoSabe: number
}) {
  const totalNum = linhas.reduce((acc, l) => acc + l.votos, 0)
  const total = totalNum + branco + naoSabe
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold text-foreground border-l-2 border-accent pl-4">
        {titulo}{' '}
        <span className="text-sm text-muted-foreground font-normal">
          ({total.toLocaleString('pt-BR')} votos · por legenda)
        </span>
      </h2>
      <p className="text-xs text-muted-foreground italic">
        Voto por legenda define quantas cadeiras a chapa elege (Quociente
        Eleitoral). Voto individual de cada candidato define a ordem
        dentro da legenda.
      </p>
      {total === 0 ? (
        <p className="text-sm text-muted-foreground italic px-2 py-1">
          Sem votos registrados.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {linhas.map((l) => {
            const cands = candidatosPorPartido.get(`${cargo}:${l.partido_id}`) ?? []
            const somaCandidatos = cands.reduce((acc, c) => acc + c.votos, 0)
            const semCandidato = Math.max(l.votos - somaCandidatos, 0)
            return (
              <div key={l.partido_id} className="flex flex-col">
                <BarraCandidato
                  numero={l.numero}
                  nome={l.sigla}
                  detalhe={l.nome}
                  cor={l.cor_hex ?? '#52525b'}
                  votos={l.votos}
                  total={total}
                />
                {cands.length > 0 && (
                  <details
                    className="mt-2 ml-2 sm:ml-14 text-xs"
                    open={cands.some((c) => c.votos > 0)}
                  >
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition">
                      Candidatos da legenda ({cands.length}) ▾
                    </summary>
                    <ul className="mt-2 flex flex-col gap-1 pl-3 border-l border-dashed border-border">
                      {cands.map((c) => {
                        const pct = l.votos === 0 ? 0 : (c.votos / l.votos) * 100
                        return (
                          <li
                            key={c.id}
                            className="flex items-baseline gap-2 py-1"
                          >
                            <span className="font-mono tabular-nums text-[10px] text-muted-foreground w-12 flex-none">
                              {c.numero}
                            </span>
                            <span className="text-foreground truncate flex-1">
                              {c.nome_urna}
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
                          <span className="truncate flex-1">
                            Só legenda
                          </span>
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
          {(branco > 0 || naoSabe > 0) && (
            <div className="mt-2 pt-3 border-t border-dashed border-border flex flex-col gap-1">
              {branco > 0 && (
                <LinhaSec rotulo="Branco" votos={branco} total={total} />
              )}
              {naoSabe > 0 && (
                <LinhaSec rotulo="Não sabe / não quis responder" votos={naoSabe} total={total} />
              )}
            </div>
          )}
        </div>
      )}
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
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold text-foreground border-l-2 border-accent pl-4">
        Zona de Expansão{' '}
        <span className="text-sm text-muted-foreground font-normal">
          ({total.toLocaleString('pt-BR')} votos · só Aju/São Cristóvão)
        </span>
      </h2>
      <div className="flex flex-col gap-1">
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

function BarraCandidato({
  numero,
  nome,
  detalhe,
  cor,
  votos,
  total,
}: {
  numero: number
  nome: string
  detalhe: string
  cor: string
  votos: number
  total: number
}) {
  const pct = total === 0 ? 0 : (votos / total) * 100
  return (
    <div className="rounded-md border border-border bg-background px-4 py-3 flex items-center gap-4">
      <div
        className="w-12 h-12 rounded-md flex items-center justify-center text-sm font-bold text-white tabular-nums flex-none shadow-sm"
        style={{ background: cor }}
      >
        {numero}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-base font-semibold truncate">{nome}</p>
          <p className="text-base font-bold tabular-nums whitespace-nowrap">
            {pct.toFixed(1)}%
            <span className="text-xs text-muted-foreground font-normal ml-1">
              ({votos.toLocaleString('pt-BR')})
            </span>
          </p>
        </div>
        {detalhe ? (
          <p className="text-xs text-muted-foreground truncate">{detalhe}</p>
        ) : null}
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
    <div className="flex items-baseline justify-between px-4 py-2 text-sm text-muted-foreground">
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
    <div className="rounded-md border border-border bg-background px-4 py-3 flex flex-col gap-0.5">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {titulo}
      </p>
      <p className="text-base font-semibold tabular-nums">{valor}</p>
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

/**
 * Margem de erro proporcao 50% (worst-case) com IC 95%, populacao
 * infinita (Sergipe ~1.45M >> n). Formula: 1.96 * sqrt(0.25 / n) * 100.
 */
function calcularMargem(n: number): string {
  if (n < 30) return '±—'
  const margem = (1.96 * Math.sqrt(0.25 / n) * 100).toFixed(1)
  return `±${margem}pp`
}
