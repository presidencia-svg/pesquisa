import Link from 'next/link'

import { registrarAcessoAdmin } from '@/lib/admin-audit'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const metadata = { title: 'Resultados · Admin' }

// Forca renderizacao dinamica — resultados mudam a cada voto.
export const dynamic = 'force-dynamic'

type CandidatoLinha = {
  id: string
  numero: number
  nome_urna: string
  foto_url: string | null
  sigla: string | null
  cor_hex: string | null
  votos: number
}

type LegendaLinha = {
  id: string
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
  foto_url: string | null
  votos: number
}

type ZonaLinha = {
  resposta: 'aracaju' | 'sao_cristovao'
  votos: number
}

type BrancoNaoSei = Record<string, { branco: number; nao_sabe: number }>

const ROTULO_CARGO = {
  presidente: 'Presidente',
  governador: 'Governador',
  senador: 'Senador (2 vagas)',
  federal: 'Deputado Federal (por legenda)',
  estadual: 'Deputado Estadual (por legenda)',
  zona_expansao: 'Zona de Expansão (Aju + São Cristóvão)',
} as const

export default async function ResultadosPage() {
  const db = supabaseAdmin()

  const { data: edicao } = await db
    .from('edicao')
    .select('id, nome, divulgada_em')
    .eq('ativa', true)
    .maybeSingle()

  // Auditoria: registra acesso a resultados. Distingue se foi ANTES
  // ou DEPOIS da divulgação pública — antes da divulgação é o caso
  // mais sensível (vantagem informacional sobre o público).
  if (edicao) {
    await registrarAcessoAdmin(
      edicao.divulgada_em
        ? 'view_resultados_pos_divulgacao'
        : 'view_resultados_pre_divulgacao',
      {
        edicao_id: edicao.id,
        edicao_nome: edicao.nome,
        divulgada_em: edicao.divulgada_em,
      },
      `edicao:${edicao.id}`,
    )
  }

  if (!edicao) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Resultados</h1>
        <div className="rounded-md border border-error/30 bg-error/5 px-5 py-4 text-sm text-error">
          Nenhuma edição ativa. Resultados aparecem aqui assim que houver
          edição ativa com votos registrados.
        </div>
      </div>
    )
  }

  // -------- Pres/Gov/Sen — agrega por candidato_id (view) --------
  const cargosCandidato = ['presidente', 'governador', 'senador'] as const
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
    for (const cargo of cargosCandidato) porCandidato[cargo] = []
    for (const r of (data ?? []) as Array<{
      candidato_id: string
      cargo: (typeof cargosCandidato)[number]
      numero: number
      nome_urna: string
      foto_url: string | null
      sigla: string | null
      cor_hex: string | null
      votos: number
    }>) {
      porCandidato[r.cargo].push({
        id: r.candidato_id,
        numero: r.numero,
        nome_urna: r.nome_urna,
        foto_url: r.foto_url,
        sigla: r.sigla,
        cor_hex: r.cor_hex,
        votos: r.votos,
      })
    }
  }

  // -------- Fed/Est — agrega por partido_id (view) --------
  const cargosLegenda = ['federal', 'estadual'] as const
  const porLegenda: Record<string, LegendaLinha[]> = {}
  {
    const { data } = await db
      .from('v_resultados_legenda')
      .select('partido_id, cargo, numero, sigla, nome, cor_hex, votos')
      .eq('edicao_id', edicao.id)
      .in('cargo', cargosLegenda as unknown as string[])
      .order('votos', { ascending: false })
    for (const cargo of cargosLegenda) porLegenda[cargo] = []
    for (const r of (data ?? []) as Array<{
      partido_id: string
      cargo: (typeof cargosLegenda)[number]
      numero: number
      sigla: string
      nome: string
      cor_hex: string | null
      votos: number
    }>) {
      porLegenda[r.cargo].push({
        id: r.partido_id,
        numero: r.numero,
        sigla: r.sigla,
        nome: r.nome,
        cor_hex: r.cor_hex,
        votos: r.votos,
      })
    }
  }

  // -------- Candidatos fed/est por partido + votos individuais --------
  // Voto agregado por legenda (define cadeiras via QE). Tambem registramos
  // candidato_id individual quando o eleitor digita o numero completo —
  // serve pra projetar quem dentro da legenda seria eleito (TSE faz igual).
  const candidatosPorPartido = new Map<string, CandidatoLegenda[]>()
  {
    // Lista completa de candidatos fed/est cadastrados.
    const { data: candidatos } = await db
      .from('candidatos_pesquisa')
      .select('id, cargo, numero, nome_urna, foto_url, partido_id')
      .eq('edicao_id', edicao.id)
      .eq('ativo', true)
      .in('cargo', ['federal', 'estadual'])
      .order('numero')

    // Votos individuais — vem da v_resultados_candidato (apos migration 008
    // ela inclui fed/est). Pode estar vazio se ninguem votou no numero
    // completo ou se a migration ainda nao foi aplicada.
    const votosPorCandidato = new Map<string, number>()
    const { data: votosCands } = await db
      .from('v_resultados_candidato')
      .select('candidato_id, cargo, votos')
      .eq('edicao_id', edicao.id)
      .in('cargo', ['federal', 'estadual'])
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
      foto_url: string | null
      partido_id: string
    }>) {
      const key = `${c.cargo}:${c.partido_id}`
      const arr = candidatosPorPartido.get(key) ?? []
      arr.push({
        id: c.id,
        numero: c.numero,
        nome_urna: c.nome_urna,
        foto_url: c.foto_url,
        votos: votosPorCandidato.get(c.id) ?? 0,
      })
      candidatosPorPartido.set(key, arr)
    }
    // Ordena candidatos dentro de cada legenda por votos desc
    for (const [k, arr] of candidatosPorPartido) {
      arr.sort((a, b) => b.votos - a.votos)
      candidatosPorPartido.set(k, arr)
    }
  }

  // -------- Zona expansão (view) --------
  const { data: zonaRows } = await db
    .from('v_resultados_zona')
    .select('resposta, votos')
    .eq('edicao_id', edicao.id)
  const zona = (zonaRows ?? []) as ZonaLinha[]

  // -------- Branco / Não sei por cargo --------
  const { data: bnsRows } = await db
    .from('votos_pesquisa')
    .select('cargo, metodo')
    .eq('edicao_id', edicao.id)
    .in('metodo', ['branco', 'nao_sabe'])
  const brancoNaoSei: BrancoNaoSei = {}
  for (const r of (bnsRows ?? []) as { cargo: string; metodo: string }[]) {
    if (!brancoNaoSei[r.cargo]) brancoNaoSei[r.cargo] = { branco: 0, nao_sabe: 0 }
    if (r.metodo === 'branco') brancoNaoSei[r.cargo].branco++
    if (r.metodo === 'nao_sabe') brancoNaoSei[r.cargo].nao_sabe++
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Resultados</h1>
          <p className="text-sm text-muted-foreground">
            Apuração em tempo real da edição{' '}
            <span className="font-medium text-foreground">{edicao.nome}</span>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-end">
          <Link
            href="/admin/resultados/cruzamentos"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-accent/40 bg-accent/5 text-accent text-sm font-semibold hover:bg-accent/10 transition whitespace-nowrap"
          >
            Cruzamentos demográficos
          </Link>
          <Link
            href="/admin/resultados/snapshot"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-accent text-white text-sm font-semibold hover:opacity-90 transition whitespace-nowrap"
          >
            Snapshot pra TV
          </Link>
        </div>
      </header>

      <div className="rounded-md border border-error/30 bg-error/5 px-4 py-3 text-xs text-error">
        <strong>Visão interna.</strong> Não divulgar antes do registro no
        TRE/SE conforme Resolução TSE 23.747/2026 (mínimo 5 dias de
        antecedência).
      </div>

      <details className="rounded-md border border-accent/30 bg-accent/5 px-4 py-3 text-xs leading-relaxed">
        <summary className="cursor-pointer text-foreground font-semibold list-none">
          Como ler estes resultados (metodologia) ▾
        </summary>
        <div className="mt-3 flex flex-col gap-2 text-muted-foreground">
          <p>
            <strong>Presidente, Governador e Senador:</strong> voto por
            candidato. O eleitor digita o número completo na cédula e o
            sistema armazena qual candidato recebeu o voto. Listagem mostra
            cada candidato com sua contagem.
          </p>
          <p>
            <strong>Deputado Federal e Estadual:</strong> dupla contagem,
            igual ao TSE.{' '}
            <strong>(1) Voto na legenda</strong> — os 2 primeiros dígitos
            sempre contam pro total do partido, que define quantas
            cadeiras a chapa elege (Quociente Eleitoral, Quociente
            Partidário e maiores médias, Lei 9.504/97).{' '}
            <strong>(2) Voto no candidato</strong> — se o eleitor digitou
            o número completo (4/5 dígitos) e o candidato está cadastrado,
            também conta pra ele individualmente. Isso define a{' '}
            <strong>ordem</strong> dentro da chapa: quais candidatos do
            partido X seriam eleitos primeiro. Eleitores que digitam só
            a legenda (2 dígitos + zeros) entram só na contagem 1.
          </p>
          <p>
            <strong>Zona de Expansão:</strong> consulta extra apresentada
            apenas a eleitores de Aracaju e São Cristóvão.
          </p>
          <p>
            <strong>Branco / Não sei:</strong> contados em separado em cada
            cargo. Entram no denominador do percentual, mas não no total
            de “votos válidos” do candidato.
          </p>
          <p className="pt-1">
            Metodologia completa, plano amostral e ponderação:{' '}
            <Link
              href="/transparencia"
              target="_blank"
              className="text-primary hover:underline font-medium"
            >
              /transparencia
            </Link>
            .
          </p>
        </div>
      </details>

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
    </div>
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
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide">
        {titulo}{' '}
        <span className="text-muted-foreground tabular-nums">
          ({total.toLocaleString('pt-BR')})
        </span>
      </h2>
      {total === 0 ? (
        <p className="text-xs text-muted-foreground italic px-3 py-2">
          Nenhum voto ainda neste cargo.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {linhas.map((l) => (
            <Linha
              key={l.id}
              numero={l.numero}
              nome={l.nome_urna}
              detalhe={l.sigla ?? ''}
              cor={l.cor_hex ?? '#52525b'}
              votos={l.votos}
              total={total}
            />
          ))}
          {(branco > 0 || naoSabe > 0) && (
            <div className="flex flex-col gap-1 mt-1 pt-2 border-t border-dashed border-border">
              {branco > 0 && (
                <LinhaSimples rotulo="Voto em branco" votos={branco} total={total} />
              )}
              {naoSabe > 0 && (
                <LinhaSimples rotulo="Não sabe / não quis responder" votos={naoSabe} total={total} />
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
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide">
        {titulo}{' '}
        <span className="text-muted-foreground tabular-nums">
          ({total.toLocaleString('pt-BR')})
        </span>
      </h2>
      <p className="text-xs text-muted-foreground italic">
        Voto por legenda define quantas cadeiras a chapa elege (Quociente
        Eleitoral). Voto individual de cada candidato — quando o eleitor
        digita o número completo — define a ordem dentro da legenda.
      </p>
      {total === 0 ? (
        <p className="text-xs text-muted-foreground italic px-3 py-2">
          Nenhum voto ainda neste cargo.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {linhas.map((l) => {
            const cands = candidatosPorPartido.get(`${cargo}:${l.id}`) ?? []
            return (
              <div key={l.id} className="flex flex-col">
                <Linha
                  numero={l.numero}
                  nome={l.sigla}
                  detalhe={l.nome}
                  cor={l.cor_hex ?? '#52525b'}
                  votos={l.votos}
                  total={total}
                />
                {cands.length > 0 && (() => {
                  const somaCandidatos = cands.reduce(
                    (acc, c) => acc + c.votos,
                    0,
                  )
                  const semCandidato = Math.max(l.votos - somaCandidatos, 0)
                  return (
                    <details
                      className="mt-1 ml-14 mr-2 text-xs"
                      open={l.votos > 0}
                    >
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition">
                        Candidatos da legenda ({cands.length}) ▾
                      </summary>
                      <ul className="mt-2 flex flex-col gap-1 pl-2 border-l border-dashed border-border">
                        {cands.map((c) => {
                          const pctNaLegenda =
                            l.votos === 0 ? 0 : (c.votos / l.votos) * 100
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
                                {c.votos > 0 && l.votos > 0 ? (
                                  <span className="text-muted-foreground font-normal ml-1">
                                    ({pctNaLegenda.toFixed(0)}% da legenda)
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
                              Só legenda (número digitado não bateu nenhum
                              candidato cadastrado)
                            </span>
                            <span className="tabular-nums whitespace-nowrap not-italic">
                              {semCandidato.toLocaleString('pt-BR')}
                              <span className="font-normal ml-1">
                                ({((semCandidato / l.votos) * 100).toFixed(0)}
                                % da legenda)
                              </span>
                            </span>
                          </li>
                        )}
                      </ul>
                      <p className="mt-2 text-[10px] text-muted-foreground italic">
                        Voto vai pra um candidato individual só quando o
                        eleitor digita o número completo (4/5 dígitos) E
                        esse número está cadastrado nesta edição. Caso
                        contrário, conta só pra o total da legenda.
                      </p>
                    </details>
                  )
                })()}
              </div>
            )
          })}
          {(branco > 0 || naoSabe > 0) && (
            <div className="flex flex-col gap-1 mt-1 pt-2 border-t border-dashed border-border">
              {branco > 0 && (
                <LinhaSimples rotulo="Voto em branco" votos={branco} total={total} />
              )}
              {naoSabe > 0 && (
                <LinhaSimples rotulo="Não sabe / não quis responder" votos={naoSabe} total={total} />
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
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide">
        {ROTULO_CARGO.zona_expansao}{' '}
        <span className="text-muted-foreground tabular-nums">
          ({total.toLocaleString('pt-BR')})
        </span>
      </h2>
      {total === 0 ? (
        <p className="text-xs text-muted-foreground italic px-3 py-2">
          Nenhuma resposta ainda. Aparece só pra eleitores de Aracaju ou São
          Cristóvão.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          <LinhaSimples rotulo="Deveria ficar com Aracaju" votos={aju} total={total} />
          <LinhaSimples rotulo="Deveria ficar com São Cristóvão" votos={sc} total={total} />
          {(branco > 0 || naoSabe > 0) && (
            <div className="flex flex-col gap-1 mt-1 pt-2 border-t border-dashed border-border">
              {branco > 0 && (
                <LinhaSimples rotulo="Voto em branco" votos={branco} total={total} />
              )}
              {naoSabe > 0 && (
                <LinhaSimples rotulo="Não sabe / não quis responder" votos={naoSabe} total={total} />
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function Linha({
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
        className="w-10 h-10 rounded-md flex items-center justify-center text-xs font-bold text-white tabular-nums flex-none"
        style={{ background: cor }}
      >
        {numero}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold truncate">{nome}</p>
          <p className="text-sm font-semibold tabular-nums whitespace-nowrap">
            {votos.toLocaleString('pt-BR')}{' '}
            <span className="text-xs text-muted-foreground font-normal">
              ({pct.toFixed(1)}%)
            </span>
          </p>
        </div>
        {detalhe ? (
          <p className="text-xs text-muted-foreground truncate">{detalhe}</p>
        ) : null}
        <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: cor }}
          />
        </div>
      </div>
    </div>
  )
}

function LinhaSimples({
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
    <div className="flex items-baseline justify-between px-4 py-2 text-xs text-muted-foreground">
      <span>{rotulo}</span>
      <span className="tabular-nums">
        {votos.toLocaleString('pt-BR')} ({pct.toFixed(1)}%)
      </span>
    </div>
  )
}
