/**
 * Mapa público de Sergipe — vencedor por cidade.
 *
 * Só visível depois de edicao.divulgada_em (mesma regra do /resultados).
 * Dados de v_vencedor_municipio com supressão N≥30 já aplicada na view.
 */
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { MapaSergipe, type PinturaMunicipio } from '@/components/mapa-sergipe'
import { RodapeInstitucional } from '@/components/rodape-institucional'
import { supabaseAdmin } from '@/lib/supabase/admin'

import './mapa-publico.css'

export const metadata = {
  title: 'Mapa por cidade · Pesquisa Eleitoral Sergipe 2026',
}
export const dynamic = 'force-dynamic'

type Cargo = 'presidente' | 'governador' | 'senador'

const ROTULO: Record<Cargo, string> = {
  presidente: 'Presidente',
  governador: 'Governador',
  senador: 'Senador',
}

const REGIAO_ROTULO: Record<string, string> = {
  grande_aracaju: 'Grande Aracaju',
  centro_sul: 'Centro-Sul',
  agreste: 'Agreste',
  leste: 'Leste Sergipano',
  sertao: 'Sertão',
  baixo_sao_francisco: 'Baixo São Francisco',
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

export default async function MapaPublicoPage({
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
    .select('id, nome, divulgada_em')
    .eq('ativa', true)
    .maybeSingle<{ id: string; nome: string; divulgada_em: string | null }>()

  if (!edicao || !edicao.divulgada_em) {
    redirect('/resultados')
  }

  const { data: linhas } = await db
    .from('v_vencedor_municipio')
    .select(
      'municipio_ibge, municipio_nome, regiao, total_municipio, posicao, candidato_id, numero, nome_urna, partido_sigla, partido_cor, votos, pct',
    )
    .eq('edicao_id', edicao.id)
    .eq('cargo', cargo)
    .order('municipio_nome', { ascending: true })
    .returns<Linha[]>()

  const porMunicipio = new Map<number, Linha[]>()
  for (const l of linhas ?? []) {
    if (!porMunicipio.has(l.municipio_ibge)) porMunicipio.set(l.municipio_ibge, [])
    porMunicipio.get(l.municipio_ibge)!.push(l)
  }
  for (const arr of porMunicipio.values()) arr.sort((a, b) => a.posicao - b.posicao)

  const dadosVazios = porMunicipio.size === 0

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

  const pintura = new Map<number, PinturaMunicipio>()
  for (const [ibge, arr] of porMunicipio.entries()) {
    const lider = arr[0]
    if (!lider) continue
    pintura.set(ibge, {
      cor: corPorCandidato.get(lider.candidato_id) ?? '#9ca3af',
      label: `${lider.municipio_nome}: ${lider.nome_urna} (${lider.numero}) — ${lider.pct.toFixed(1)}% · n=${lider.total_municipio.toLocaleString('pt-BR')}`,
    })
  }

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

  const lideres = (linhas ?? [])
    .filter((l) => l.posicao === 1)
    .sort((a, b) => b.pct - a.pct)

  const porRegiao = new Map<string, Linha[]>()
  for (const l of lideres) {
    const r = l.regiao ?? 'sem_regiao'
    if (!porRegiao.has(r)) porRegiao.set(r, [])
    porRegiao.get(r)!.push(l)
  }

  return (
    <>
      <header className="mp-header">
        <div className="mp-header-inner">
          <Link href="/" className="mp-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cdl-pesquisas-logo.png" alt="CDL Pesquisas" className="mp-brand-img" />
          </Link>
          <span className="mp-header-tag">Pesquisa Eleitoral Sergipe 2026 · Mapa por cidade</span>
        </div>
      </header>

      <main className="mp">
        <div className="mp-titulo">
          <h1>Mapa de Sergipe — quem ganhou em cada cidade</h1>
          <p>{edicao.nome}</p>
        </div>

        <nav className="mp-tabs" aria-label="Cargo">
          {(['presidente', 'governador', 'senador'] as const).map((c) => (
            <Link
              key={c}
              href={`/resultados/mapa?cargo=${c}`}
              className={`mp-tab ${c === cargo ? 'mp-tab-ativa' : ''}`}
            >
              {ROTULO[c]}
            </Link>
          ))}
        </nav>

        {dadosVazios ? (
          <section className="mp-vazio">
            <p>
              <strong>Sem dados pra {ROTULO[cargo]}.</strong> Cruzamentos por
              cidade aparecem quando cada município tem pelo menos 30 votos
              válidos (padrão IBGE/Datafolha).
            </p>
          </section>
        ) : (
          <>
            <section className="mp-grid">
              <div className="mp-mapa-wrap">
                <MapaSergipe pintura={pintura} className="mp-svg" />
                <ul className="mp-legenda">
                  {stats.map((s) => (
                    <li key={s.candidato_id}>
                      <span className="mp-legenda-quad" style={{ background: s.cor }} />
                      <span className="mp-legenda-num">{s.numero}</span>
                      <span className="mp-legenda-nome">
                        {s.nome_urna}
                        {s.partido_sigla ? ` (${s.partido_sigla})` : ''}
                      </span>
                      <span className="mp-legenda-qtd">
                        {s.cidades.length}{' '}
                        {s.cidades.length === 1 ? 'cidade' : 'cidades'}
                      </span>
                    </li>
                  ))}
                  <li>
                    <span className="mp-legenda-quad" style={{ background: '#e5e7eb' }} />
                    <span className="mp-legenda-nome">Amostra insuficiente</span>
                  </li>
                </ul>
              </div>

              <div className="mp-top">
                <h2>Top cidades por candidato</h2>
                {stats.slice(0, 5).map((s) => {
                  const top5 = [...s.cidades].sort((a, b) => b.pct - a.pct).slice(0, 5)
                  return (
                    <div key={s.candidato_id} className="mp-top-bloco">
                      <header>
                        <span className="mp-top-pin" style={{ background: s.cor }}>
                          {s.numero}
                        </span>
                        <span className="mp-top-nome">{s.nome_urna}</span>
                      </header>
                      <ol>
                        {top5.map((c, i) => (
                          <li key={c.municipio_nome}>
                            <span className="mp-top-pos">{i + 1}º</span>
                            <span className="mp-top-cidade">{c.municipio_nome}</span>
                            <span className="mp-top-pct">{c.pct.toFixed(1)}%</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="mp-ranking">
              <h2>Ranking — vencedor por cidade ({lideres.length} municípios)</h2>
              {[...porRegiao.entries()].map(([regiao, arr]) => (
                <details key={regiao} className="mp-ranking-regiao" open>
                  <summary>
                    {REGIAO_ROTULO[regiao] ?? regiao} ({arr.length})
                  </summary>
                  <table>
                    <thead>
                      <tr>
                        <th>Município</th>
                        <th className="mp-th-n">n</th>
                        <th>Vencedor</th>
                        <th className="mp-th-pct">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {arr.map((l) => (
                        <tr key={l.municipio_ibge}>
                          <td>{l.municipio_nome}</td>
                          <td className="mp-td-n">
                            {l.total_municipio.toLocaleString('pt-BR')}
                          </td>
                          <td>
                            <span
                              className="mp-td-num"
                              style={{ background: l.partido_cor ?? '#9ca3af' }}
                            >
                              {l.numero}
                            </span>
                            {l.nome_urna}
                            {l.partido_sigla ? (
                              <span className="mp-td-partido">/{l.partido_sigla}</span>
                            ) : null}
                          </td>
                          <td className="mp-td-pct">{l.pct.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              ))}
            </section>
          </>
        )}

        <p className="mp-nota">
          Voltar pra <Link href="/resultados">resultados gerais</Link>.
        </p>
      </main>
      <RodapeInstitucional />
    </>
  )
}
