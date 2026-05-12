'use client'

import { useEffect, useState } from 'react'

export type Cargo =
  | 'governador'
  | 'senador'
  | 'presidente'
  | 'federal'
  | 'estadual'
  | 'zona_expansao'

export type CandidatoLinha = {
  candidato_id: string
  cargo: string
  numero: number
  nome_urna: string
  foto_url: string | null
  sigla: string | null
  cor_hex: string | null
  votos: number
}

export type LegendaLinha = {
  partido_id: string
  cargo: string
  numero: number
  sigla: string
  nome: string
  cor_hex: string | null
  votos: number
}

export type CandidatoLegenda = {
  id: string
  numero: number
  nome_urna: string
  votos: number
}

export type RankingItem = {
  candidatoId: string
  numero: number
  nomeUrna: string
  sigla: string
  corHex: string | null
  votos: number
  partidoId: string
}

export type ZonaLinha = {
  resposta: 'aracaju' | 'sao_cristovao'
  votos: number
}

const ROTULO_NAV: Record<Cargo, string> = {
  governador: 'Governador',
  senador: 'Senador',
  presidente: 'Presidente',
  federal: 'Dep. Federal',
  estadual: 'Dep. Estadual',
  zona_expansao: 'Zona Expansão',
}

const ROTULO_CARGO: Record<Cargo, string> = {
  governador: 'Governador',
  senador: 'Senador (2 vagas)',
  presidente: 'Presidente',
  federal: 'Deputado Federal',
  estadual: 'Deputado Estadual',
  zona_expansao: 'Zona de Expansão',
}

const VAGAS = { federal: 8, estadual: 24 } as const

type Props = {
  cargosDisponiveis: Cargo[]
  porCandidato: Record<string, CandidatoLinha[]>
  porLegenda: Record<string, LegendaLinha[]>
  candidatosPorPartidoEntries: Array<[string, CandidatoLegenda[]]>
  rankingCandidatos: Record<'federal' | 'estadual', RankingItem[]>
  eleitosIdsEntries: Record<'federal' | 'estadual', string[]>
  impedimentosEntries: Array<[string, string]>
  zona: ZonaLinha[]
  brancoNaoSei: Record<string, { branco: number; nao_sabe: number }>
}

export function ResultadosAbas(props: Props) {
  const {
    cargosDisponiveis,
    porCandidato,
    porLegenda,
    candidatosPorPartidoEntries,
    rankingCandidatos,
    eleitosIdsEntries,
    impedimentosEntries,
    zona,
    brancoNaoSei,
  } = props

  const candidatosPorPartido = new Map(candidatosPorPartidoEntries)
  const eleitosIds = {
    federal: new Set(eleitosIdsEntries.federal),
    estadual: new Set(eleitosIdsEntries.estadual),
  }
  const impedimentos = new Map(impedimentosEntries)

  const [active, setActive] = useState<Cargo>(cargosDisponiveis[0] ?? 'governador')

  // Sincroniza com URL hash na entrada — leitura legitima do window.
  useEffect(() => {
    const fromHash = (typeof window !== 'undefined'
      ? window.location.hash.slice(1)
      : '') as Cargo
    if (fromHash && cargosDisponiveis.includes(fromHash)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActive(fromHash)
    }
  }, [cargosDisponiveis])

  const trocar = (c: Cargo) => {
    setActive(c)
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${c}`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <>
      {/* Abas */}
      <nav className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-5 sm:px-6 flex gap-1 overflow-x-auto">
          {cargosDisponiveis.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => trocar(c)}
              className={`relative py-3 px-3 sm:px-4 text-sm font-medium whitespace-nowrap transition ${
                active === c
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {ROTULO_NAV[c]}
              {active === c && (
                <span className="absolute inset-x-1 -bottom-px h-0.5 bg-accent" />
              )}
            </button>
          ))}
        </div>
      </nav>

      <section className="px-5 sm:px-6 pt-8 sm:pt-12 pb-16">
        <div className="max-w-4xl mx-auto">
          {(['presidente', 'governador', 'senador'] as const).includes(active as 'presidente' | 'governador' | 'senador') && (
            <AbaCandidatos
              cargo={active}
              titulo={ROTULO_CARGO[active]}
              linhas={porCandidato[active] ?? []}
              branco={brancoNaoSei[active]?.branco ?? 0}
              naoSabe={brancoNaoSei[active]?.nao_sabe ?? 0}
              impedimentos={impedimentos}
            />
          )}

          {active === 'federal' && (
            <AbaLegenda
              cargo="federal"
              titulo={ROTULO_CARGO.federal}
              linhas={porLegenda.federal ?? []}
              candidatosPorPartido={candidatosPorPartido}
              eleitosIds={eleitosIds.federal}
              branco={brancoNaoSei.federal?.branco ?? 0}
              naoSabe={brancoNaoSei.federal?.nao_sabe ?? 0}
              vagas={VAGAS.federal}
              ranking={rankingCandidatos.federal}
              impedimentos={impedimentos}
            />
          )}

          {active === 'estadual' && (
            <AbaLegenda
              cargo="estadual"
              titulo={ROTULO_CARGO.estadual}
              linhas={porLegenda.estadual ?? []}
              candidatosPorPartido={candidatosPorPartido}
              eleitosIds={eleitosIds.estadual}
              branco={brancoNaoSei.estadual?.branco ?? 0}
              naoSabe={brancoNaoSei.estadual?.nao_sabe ?? 0}
              vagas={VAGAS.estadual}
              ranking={rankingCandidatos.estadual}
              impedimentos={impedimentos}
            />
          )}

          {active === 'zona_expansao' && (
            <AbaZona
              linhas={zona}
              branco={brancoNaoSei.zona_expansao?.branco ?? 0}
              naoSabe={brancoNaoSei.zona_expansao?.nao_sabe ?? 0}
            />
          )}
        </div>
      </section>
    </>
  )
}

/** Aba pra Pres / Gov / Sen — voto por candidato. */
function AbaCandidatos({
  cargo,
  titulo,
  linhas,
  branco,
  naoSabe,
  impedimentos,
}: {
  cargo: Cargo
  titulo: string
  linhas: CandidatoLinha[]
  branco: number
  naoSabe: number
  impedimentos: Map<string, string>
}) {
  const validos = linhas.reduce((a, b) => a + b.votos, 0)
  const total = validos + branco + naoSabe
  const lider = linhas[0]
  const liderPct = total === 0 || !lider ? 0 : (lider.votos / total) * 100
  const segundo = linhas[1]
  const segundoPct = total === 0 || !segundo ? 0 : (segundo.votos / total) * 100
  const dif = liderPct - segundoPct

  return (
    <div className="flex flex-col gap-6">
      <CabecalhoCargo titulo={titulo} subtitle={`${total.toLocaleString('pt-BR')} votos contabilizados`} />

      {total === 0 ? (
        <SemVotos />
      ) : (
        <>
          {lider && (
            <CardLider
              nome={lider.nome_urna}
              sigla={lider.sigla ?? ''}
              cor={lider.cor_hex ?? '#52525b'}
              pct={liderPct}
              segundoNome={segundo?.nome_urna ?? null}
              segundoPct={segundoPct}
              diferenca={dif}
              impedimento={impedimentos.get(lider.candidato_id)}
            />
          )}

          <Lista>
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
                impedimento={impedimentos.get(l.candidato_id)}
              />
            ))}
          </Lista>

          <TotaisCargo validos={validos} brancos={branco} naoSabe={naoSabe} />

          <NotaCargo cargo={cargo} />
        </>
      )}
    </div>
  )
}

/** Aba pra Fed/Est — com sub-abas Por legenda / Por candidato. */
function AbaLegenda({
  cargo,
  titulo,
  linhas,
  candidatosPorPartido,
  eleitosIds,
  branco,
  naoSabe,
  vagas,
  ranking,
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
  ranking: RankingItem[]
  impedimentos: Map<string, string>
}) {
  const [sub, setSub] = useState<'legenda' | 'candidato'>('candidato')
  const validos = linhas.reduce((a, b) => a + b.votos, 0)
  const total = validos + branco + naoSabe
  const lider = linhas[0]
  const liderPct = total === 0 || !lider ? 0 : (lider.votos / total) * 100

  return (
    <div className="flex flex-col gap-6">
      <CabecalhoCargo
        titulo={titulo}
        subtitle={`${vagas} cadeiras em disputa · voto por legenda · ${total.toLocaleString('pt-BR')} votos contabilizados`}
      />

      {total === 0 ? (
        <SemVotos />
      ) : (
        <>
          {lider && (
            <CardLider
              nome={lider.sigla}
              sigla={lider.nome}
              cor={lider.cor_hex ?? '#52525b'}
              pct={liderPct}
              segundoNome={null}
              segundoPct={0}
              diferenca={0}
              rotuloLider="Legenda mais votada"
            />
          )}

          {/* Sub-abas */}
          <div className="flex gap-1 rounded-md border border-border bg-muted p-1 self-start">
            <button
              type="button"
              onClick={() => setSub('candidato')}
              className={`px-4 py-1.5 rounded text-xs font-medium transition ${
                sub === 'candidato'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Por candidato (eleitos)
            </button>
            <button
              type="button"
              onClick={() => setSub('legenda')}
              className={`px-4 py-1.5 rounded text-xs font-medium transition ${
                sub === 'legenda'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Por legenda (cadeiras)
            </button>
          </div>

          {sub === 'legenda' && (
            <div className="flex flex-col gap-3">
              {linhas.map((l, i) => {
                const cands = candidatosPorPartido.get(`${cargo}:${l.partido_id}`) ?? []
                const somaCand = cands.reduce((a, c) => a + c.votos, 0)
                const semCand = Math.max(l.votos - somaCand, 0)
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
                        className="mt-1 ml-3 sm:ml-14 text-xs"
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
                                    <span className="inline-flex items-center text-[9px] uppercase tracking-widest font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5">
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
                          {semCand > 0 && (
                            <li className="flex items-baseline gap-2 py-1 mt-1 pt-2 border-t border-dotted border-border/60 text-muted-foreground italic">
                              <span className="font-mono tabular-nums text-[10px] w-12 flex-none">?</span>
                              <span className="truncate flex-1">Só legenda</span>
                              <span className="tabular-nums whitespace-nowrap not-italic">
                                {semCand.toLocaleString('pt-BR')}
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
          )}

          {sub === 'candidato' && (
            <RankingCandidatos
              ranking={ranking}
              eleitosIds={eleitosIds}
              vagas={vagas}
              impedimentos={impedimentos}
            />
          )}

          <TotaisCargo validos={validos} brancos={branco} naoSabe={naoSabe} />

          <NotaCargo cargo={cargo} />
        </>
      )}
    </div>
  )
}

function AbaZona({
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
  const pct = (n: number) => (total === 0 ? 0 : (n / total) * 100)

  return (
    <div className="flex flex-col gap-6">
      <CabecalhoCargo
        titulo="Zona de Expansão"
        subtitle="Consulta extra · só eleitores de Aracaju e São Cristóvão"
      />
      {total === 0 ? (
        <SemVotos />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            <BlocoZona rotulo="Aracaju" votos={aju} pct={pct(aju)} cor="#0a2a6e" />
            <BlocoZona rotulo="São Cristóvão" votos={sc} pct={pct(sc)} cor="#fbb03b" />
          </div>
          <TotaisCargo validos={aju + sc} brancos={branco} naoSabe={naoSabe} />
        </>
      )}
    </div>
  )
}

function BlocoZona({
  rotulo,
  votos,
  pct,
  cor,
}: {
  rotulo: string
  votos: number
  pct: number
  cor: string
}) {
  return (
    <div
      className="rounded-md border-l-4 px-5 py-5 bg-background border border-border"
      style={{ borderLeftColor: cor }}
    >
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        Deveria ficar com
      </p>
      <p className="text-2xl font-bold text-foreground mt-1">{rotulo}</p>
      <p className="text-3xl font-bold tabular-nums mt-3" style={{ color: cor }}>
        {pct.toFixed(1)}%
      </p>
      <p className="text-xs text-muted-foreground tabular-nums mt-1">
        {votos.toLocaleString('pt-BR')} votos
      </p>
    </div>
  )
}

function RankingCandidatos({
  ranking,
  eleitosIds,
  vagas,
  impedimentos,
}: {
  ranking: RankingItem[]
  eleitosIds: Set<string>
  vagas: number
  impedimentos: Map<string, string>
}) {
  const TOPO_PADRAO = vagas
  const [mostrarTodos, setMostrarTodos] = useState(false)
  const visiveis = mostrarTodos ? ranking : ranking.slice(0, TOPO_PADRAO + 5)
  const totalVotos = ranking.reduce((a, b) => a + b.votos, 0)

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs sm:text-sm text-muted-foreground">
        Os <strong>top {vagas}</strong> seriam eleitos se a eleição
        fosse hoje (regra do Quociente Eleitoral).
      </p>
      <Lista>
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
                  <p className="text-xs text-muted-foreground truncate">{c.sigla}</p>
                  <p className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                    {c.votos.toLocaleString('pt-BR')}{' '}
                    {c.votos === 1 ? 'voto' : 'votos'}
                    {pct > 0 && (
                      <span className="ml-1">({pct.toFixed(2)}%)</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </Lista>
      {ranking.length > visiveis.length && (
        <button
          type="button"
          onClick={() => setMostrarTodos(true)}
          className="self-center h-9 px-4 rounded-md border border-border text-xs font-medium hover:bg-muted transition"
        >
          Mostrar todos ({ranking.length - visiveis.length} restantes)
        </button>
      )}
      {mostrarTodos && ranking.length > TOPO_PADRAO + 5 && (
        <button
          type="button"
          onClick={() => setMostrarTodos(false)}
          className="self-center h-9 px-4 rounded-md border border-border text-xs font-medium hover:bg-muted transition"
        >
          Mostrar menos
        </button>
      )}
    </div>
  )
}

function CabecalhoCargo({
  titulo,
  subtitle,
}: {
  titulo: string
  subtitle: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-2xl sm:text-4xl font-bold text-foreground border-l-4 border-accent pl-4">
        {titulo}
      </h2>
      <p className="text-xs sm:text-sm text-muted-foreground pl-5">{subtitle}</p>
    </div>
  )
}

function SemVotos() {
  return (
    <p className="text-sm text-muted-foreground italic text-center py-10">
      Sem votos registrados nesta categoria ainda.
    </p>
  )
}

function CardLider({
  nome,
  sigla,
  cor,
  pct,
  segundoNome,
  segundoPct,
  diferenca,
  rotuloLider = 'Lidera a corrida',
  impedimento,
}: {
  nome: string
  sigla: string
  cor: string
  pct: number
  segundoNome: string | null
  segundoPct: number
  diferenca: number
  rotuloLider?: string
  impedimento?: string
}) {
  return (
    <div
      className="rounded-md border-l-4 px-5 sm:px-6 py-5 sm:py-6 bg-muted/40 border border-border"
      style={{ borderLeftColor: cor }}
    >
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
        {rotuloLider}
      </p>
      <p className="text-2xl sm:text-4xl font-bold text-foreground leading-tight">
        {nome}
        {sigla && (
          <span className="text-base sm:text-xl font-normal text-muted-foreground ml-2">
            ({sigla})
          </span>
        )}
      </p>
      <p className="text-5xl sm:text-6xl font-bold tabular-nums mt-3 leading-none" style={{ color: cor }}>
        {pct.toFixed(1)}%
      </p>
      {segundoNome ? (
        <p className="text-sm text-muted-foreground mt-3">
          {diferenca > 0
            ? `${diferenca.toFixed(1)} pontos à frente de ${segundoNome} (${segundoPct.toFixed(1)}%)`
            : 'Empate técnico no topo'}
        </p>
      ) : null}
      {impedimento && (
        <p className="text-xs text-amber-700 italic mt-3 border-t border-border pt-3">
          <strong>Atenção:</strong> {impedimento}
        </p>
      )}
    </div>
  )
}

function Lista({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2">{children}</div>
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
  impedimento?: string
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
          <p className="text-[11px] text-amber-700 italic mt-1">{impedimento}</p>
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
  const pct = (n: number) =>
    total === 0 ? '0,00' : ((n / total) * 100).toFixed(2).replace('.', ',')
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-6 mt-2 border-t border-border">
      <CardTotal rotulo="Válidos" pct={pct(validos)} abs={validos} destaque />
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
        className={`text-xl sm:text-3xl font-bold tabular-nums ${
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

function NotaCargo({ cargo }: { cargo: Cargo }) {
  let texto = ''
  if (cargo === 'governador' || cargo === 'presidente') {
    texto =
      'Voto por candidato. Maioria absoluta no 1º turno (>50% dos válidos) elege direto; caso contrário, vai pra 2º turno entre os dois mais votados.'
  } else if (cargo === 'senador') {
    texto = 'São 2 vagas em disputa em 2026 (igual a 2018). Eleitor escolhe até 2 candidatos. Os 2 mais votados são eleitos.'
  } else if (cargo === 'federal' || cargo === 'estadual') {
    texto =
      'Voto por legenda — define quantas cadeiras o partido elege via Quociente Eleitoral (Lei 9.504/97). Os candidatos mais votados dentro do partido ocupam as cadeiras conquistadas.'
  } else if (cargo === 'zona_expansao') {
    texto =
      'Consulta extra exclusiva para eleitores de Aracaju e São Cristóvão sobre a administração da Zona de Expansão.'
  }
  if (!texto) return null
  return (
    <details className="rounded-md border border-border bg-muted px-4 py-3 text-xs sm:text-sm text-muted-foreground">
      <summary className="cursor-pointer font-semibold text-foreground">
        Como funciona este cargo ▾
      </summary>
      <p className="mt-2 leading-relaxed">{texto}</p>
    </details>
  )
}
