/**
 * Mapa de Sergipe com o vencedor por cidade, estilo UOL/G1.
 *
 * Fonte: v_vencedor_municipio (top 3 por município, supressão N>=30).
 *
 * Por cargo (presidente/governador/senador) separadamente. Cargo vem
 * via searchParams.cargo — RSC reativa.
 */
import Link from 'next/link'

import { MapaSergipe, type PinturaMunicipio } from '@/components/mapa-sergipe'
import { supabaseAdmin } from '@/lib/supabase/admin'

import './mapa.css'

export const metadata = { title: 'Mapa de Sergipe · Admin' }
export const dynamic = 'force-dynamic'

type Cargo = 'presidente' | 'governador' | 'senador'

const ROTULO: Record<Cargo, string> = {
  presidente: 'Presidente da República',
  governador: 'Governador de Sergipe',
  senador: 'Senador',
}

type Linha = {
  municipio_ibge: number
  municipio_nome: string
  regiao: string | null
  total_municipio: number
  posicao: number
  candidato_id: string
  numero: number
  nome_urna: string
  partido_sigla: string | null
  partido_cor: string | null
  votos: number
  pct: number
}

const REGIAO_ROTULO: Record<string, string> = {
  grande_aracaju: 'Grande Aracaju',
  centro_sul: 'Centro-Sul',
  agreste: 'Agreste',
  leste: 'Leste Sergipano',
  sertao: 'Sertão',
  baixo_sao_francisco: 'Baixo São Francisco',
}

function rotuloRegiao(r: string | null | undefined): string {
  if (!r) return 'Sem região'
  return REGIAO_ROTULO[r] ?? r
}

export default async function MapaAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ cargo?: string }>
}) {
  const sp = await searchParams
  const cargo: Cargo =
    sp.cargo === 'governador' || sp.cargo === 'senador'
      ? sp.cargo
      : 'presidente'

  const db = supabaseAdmin()

  const { data: edicao } = await db
    .from('edicao')
    .select('id, nome')
    .eq('ativa', true)
    .maybeSingle<{ id: string; nome: string }>()

  if (!edicao) {
    return (
      <main className="mapa-msg">
        <h1>Sem edição ativa</h1>
        <p>
          Ative uma edição em <strong>/admin/edicoes</strong>.
        </p>
      </main>
    )
  }

  // Top 3 candidatos por município pra este cargo
  const { data: linhas } = await db
    .from('v_vencedor_municipio')
    .select(
      'municipio_ibge, municipio_nome, regiao, total_municipio, posicao, candidato_id, numero, nome_urna, partido_sigla, partido_cor, votos, pct',
    )
    .eq('edicao_id', edicao.id)
    .eq('cargo', cargo)
    .order('municipio_nome', { ascending: true })
    .returns<Linha[]>()

  // Reorganiza: municipio_ibge -> [linha1, linha2, linha3]
  const porMunicipio = new Map<number, Linha[]>()
  for (const l of linhas ?? []) {
    if (!porMunicipio.has(l.municipio_ibge)) porMunicipio.set(l.municipio_ibge, [])
    porMunicipio.get(l.municipio_ibge)!.push(l)
  }
  for (const arr of porMunicipio.values()) arr.sort((a, b) => a.posicao - b.posicao)

  const dadosVazios = porMunicipio.size === 0

  // Cor por candidato (do partido). Cai pra paleta fixa se partido_cor
  // for null. Mantém consistência entre mapa, ranking e top cidades.
  const PALETA = [
    '#dc2626', '#0a2a6e', '#16a34a', '#ca8a04', '#7c3aed',
    '#0891b2', '#db2777', '#65a30d', '#ea580c', '#0d9488',
  ]
  const corPorCandidato = new Map<string, string>()
  {
    let i = 0
    for (const arr of porMunicipio.values()) {
      const lider = arr[0]
      if (!lider) continue
      if (!corPorCandidato.has(lider.candidato_id)) {
        const cor = lider.partido_cor ?? PALETA[i % PALETA.length] ?? '#9ca3af'
        corPorCandidato.set(lider.candidato_id, cor)
        i++
      }
    }
  }

  // Pintura do mapa: cor do líder de cada município + tooltip
  const pintura = new Map<number, PinturaMunicipio>()
  for (const [ibge, arr] of porMunicipio.entries()) {
    const lider = arr[0]
    if (!lider) continue
    const cor = corPorCandidato.get(lider.candidato_id) ?? '#9ca3af'
    pintura.set(ibge, {
      cor,
      label: `${lider.municipio_nome}: ${lider.nome_urna} (${lider.numero}) — ${lider.pct.toFixed(1)}% · n=${lider.total_municipio.toLocaleString('pt-BR')}`,
    })
  }

  // Cidades vencidas por candidato + região dominada
  type Stat = {
    candidato_id: string
    nome_urna: string
    numero: number
    partido_sigla: string | null
    cor: string
    cidades: Linha[]
  }
  const porCandidato = new Map<string, Stat>()
  for (const arr of porMunicipio.values()) {
    const lider = arr[0]
    if (!lider) continue
    if (!porCandidato.has(lider.candidato_id)) {
      porCandidato.set(lider.candidato_id, {
        candidato_id: lider.candidato_id,
        nome_urna: lider.nome_urna,
        numero: lider.numero,
        partido_sigla: lider.partido_sigla,
        cor: corPorCandidato.get(lider.candidato_id) ?? '#9ca3af',
        cidades: [],
      })
    }
    porCandidato.get(lider.candidato_id)!.cidades.push(lider)
  }
  const stats = [...porCandidato.values()].sort(
    (a, b) => b.cidades.length - a.cidades.length,
  )

  // Análises automáticas
  const totalComDados = porMunicipio.size
  const totalMunicipios = 75
  const semDados = totalMunicipios - totalComDados
  const lider = stats[0]
  const analiseTopo = lider
    ? `${lider.nome_urna} (${lider.numero}${lider.partido_sigla ? '/' + lider.partido_sigla : ''}) venceu em ${lider.cidades.length} de ${totalComDados} cidades com amostra suficiente.`
    : null

  return (
    <main className="mapa">
      <header className="mapa-header">
        <div>
          <h1>Mapa de Sergipe</h1>
          <p className="mapa-edicao">{edicao.nome}</p>
        </div>
        <nav className="mapa-tabs">
          {(['presidente', 'governador', 'senador'] as const).map((c) => (
            <Link
              key={c}
              href={`/admin/resultados/mapa?cargo=${c}`}
              className={`mapa-tab ${c === cargo ? 'mapa-tab-ativa' : ''}`}
            >
              {ROTULO[c]}
            </Link>
          ))}
        </nav>
      </header>

      {dadosVazios ? (
        <section className="mapa-vazio">
          <p>
            <strong>Sem dados pra {ROTULO[cargo]}.</strong>
          </p>
          <p>
            Nenhum município atingiu o mínimo de 30 votos válidos. Os
            cruzamentos por município aparecem quando a amostra ficar
            estatisticamente significativa por cidade — esperado pro 1
            e 2 de setembro com ~200k respondentes.
          </p>
        </section>
      ) : (
        <>
          <section className="mapa-analise">
            <p className="mapa-analise-titulo">Análise rápida</p>
            <ul>
              {analiseTopo && <li>{analiseTopo}</li>}
              <li>
                {totalComDados} de {totalMunicipios} municípios com
                amostra suficiente
                {semDados > 0
                  ? ` (${semDados} cidades aparecem em cinza no mapa — < 30 votos)`
                  : ''}
                .
              </li>
              {stats[1] && (
                <li>
                  {stats[1].nome_urna} ficou em 2º, vencendo em{' '}
                  {stats[1].cidades.length}{' '}
                  {stats[1].cidades.length === 1 ? 'cidade' : 'cidades'}.
                </li>
              )}
            </ul>
          </section>

          <section className="mapa-grid">
            <div className="mapa-grid-mapa">
              <MapaSergipe pintura={pintura} className="mapa-svg" />
              <Legenda stats={stats} />
            </div>

            <div className="mapa-grid-side">
              <TopCidades stats={stats} />
            </div>
          </section>

          <RankingMunicipios linhas={linhas ?? []} />
        </>
      )}
    </main>
  )
}

function Legenda({
  stats,
}: {
  stats: Array<{
    candidato_id: string
    nome_urna: string
    numero: number
    partido_sigla: string | null
    cor: string
    cidades: Array<{ municipio_ibge: number }>
  }>
}) {
  return (
    <ul className="mapa-legenda">
      {stats.map((s) => (
        <li key={s.candidato_id}>
          <span className="mapa-legenda-quad" style={{ background: s.cor }} />
          <span className="mapa-legenda-num">{s.numero}</span>
          <span className="mapa-legenda-nome">
            {s.nome_urna}
            {s.partido_sigla ? ` (${s.partido_sigla})` : ''}
          </span>
          <span className="mapa-legenda-qtd">
            {s.cidades.length} {s.cidades.length === 1 ? 'cidade' : 'cidades'}
          </span>
        </li>
      ))}
      <li>
        <span className="mapa-legenda-quad" style={{ background: '#e5e7eb' }} />
        <span className="mapa-legenda-nome">Amostra insuficiente</span>
      </li>
    </ul>
  )
}

function TopCidades({
  stats,
}: {
  stats: Array<{
    candidato_id: string
    nome_urna: string
    numero: number
    cor: string
    cidades: Array<{
      municipio_nome: string
      regiao: string | null
      pct: number
      total_municipio: number
    }>
  }>
}) {
  return (
    <div className="mapa-top">
      <h2>Top cidades por candidato</h2>
      {stats.slice(0, 6).map((s) => {
        const top5 = [...s.cidades]
          .sort((a, b) => b.pct - a.pct)
          .slice(0, 5)
        return (
          <div key={s.candidato_id} className="mapa-top-bloco">
            <header>
              <span className="mapa-top-pin" style={{ background: s.cor }}>
                {s.numero}
              </span>
              <span className="mapa-top-nome">{s.nome_urna}</span>
            </header>
            <ol>
              {top5.map((c, i) => (
                <li key={c.municipio_nome}>
                  <span className="mapa-top-pos">{i + 1}º</span>
                  <span className="mapa-top-cidade">{c.municipio_nome}</span>
                  <span className="mapa-top-pct">{c.pct.toFixed(1)}%</span>
                </li>
              ))}
            </ol>
          </div>
        )
      })}
    </div>
  )
}

function RankingMunicipios({ linhas }: { linhas: Linha[] }) {
  // Pega só os de posicao=1 e ordena por pct desc (cidades onde o líder
  // ganhou mais folgado primeiro)
  const lideres = linhas
    .filter((l) => l.posicao === 1)
    .sort((a, b) => b.pct - a.pct)

  // Agrupa por região pra navegação visual
  const porRegiao = new Map<string, Linha[]>()
  for (const l of lideres) {
    const r = l.regiao ?? 'sem_regiao'
    if (!porRegiao.has(r)) porRegiao.set(r, [])
    porRegiao.get(r)!.push(l)
  }

  return (
    <section className="mapa-ranking">
      <h2>Ranking — vencedor por cidade</h2>
      <p className="mapa-ranking-hint">
        Ordenado por margem do vencedor dentro de cada região.
      </p>
      {[...porRegiao.entries()].map(([regiao, arr]) => (
        <div key={regiao} className="mapa-ranking-regiao">
          <h3>{rotuloRegiao(regiao)}</h3>
          <table>
            <thead>
              <tr>
                <th>Município</th>
                <th className="mapa-th-n">n</th>
                <th>Vencedor</th>
                <th className="mapa-th-pct">%</th>
              </tr>
            </thead>
            <tbody>
              {arr.map((l) => (
                <tr key={l.municipio_ibge}>
                  <td>{l.municipio_nome}</td>
                  <td className="mapa-td-n">
                    {l.total_municipio.toLocaleString('pt-BR')}
                  </td>
                  <td>
                    <span
                      className="mapa-td-num"
                      style={{ background: l.partido_cor ?? '#9ca3af' }}
                    >
                      {l.numero}
                    </span>
                    {l.nome_urna}
                    {l.partido_sigla ? (
                      <span className="mapa-td-partido">/{l.partido_sigla}</span>
                    ) : null}
                  </td>
                  <td className="mapa-td-pct">{l.pct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  )
}
