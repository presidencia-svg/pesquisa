/**
 * Relatório de cruzamentos demográfico × voto.
 *
 * Pra cada cargo (presidente/governador/senador), mostra como cada perfil
 * demográfico distribuiu seus votos entre os candidatos.
 *
 * Fonte: v_resultados_demografico (supressão N≥30 aplicada na view).
 *
 * Quando supressão esconde tudo (n < 30 por célula), mostra wireframe
 * explicativo do formato que aparecerá com a amostra real.
 */
import { supabaseAdmin } from '@/lib/supabase/admin'

import './cruzamentos.css'

export const metadata = { title: 'Cruzamentos demográfico × voto · Admin' }
export const dynamic = 'force-dynamic'

type Cargo = 'presidente' | 'governador' | 'senador'

const ROTULO_CARGO: Record<Cargo, string> = {
  presidente: 'Presidente',
  governador: 'Governador',
  senador: 'Senador',
}

const DIMENSOES = [
  { key: 'sexo', label: 'Por gênero', ordem: ['M', 'F'] },
  {
    key: 'faixa_etaria',
    label: 'Por faixa etária',
    ordem: ['16-24', '25-34', '35-44', '45-59', '60+'],
  },
  {
    key: 'escolaridade',
    label: 'Por escolaridade',
    ordem: [
      'fundamental_incompleto',
      'fundamental',
      'medio',
      'superior',
      'pos_graduacao',
    ],
  },
  {
    key: 'nivel_economico',
    label: 'Por renda familiar',
    ordem: ['ate_2sm', '2_5sm', '5_10sm', '10_20sm', 'acima_20sm', 'nao_informar'],
  },
  {
    key: 'regiao',
    label: 'Por região de Sergipe',
    ordem: [
      'Grande Aracaju',
      'Centro-Sul',
      'Agreste',
      'Leste Sergipano',
      'Médio Sertão',
      'Alto Sertão',
      'Baixo São Francisco',
    ],
  },
] as const

const ROTULO_VALOR: Record<string, string> = {
  M: 'Masculino',
  F: 'Feminino',
  '16-24': '16 a 24',
  '25-34': '25 a 34',
  '35-44': '35 a 44',
  '45-59': '45 a 59',
  '60+': '60 ou mais',
  fundamental_incompleto: 'Fund. incompleto',
  fundamental: 'Fundamental',
  medio: 'Médio',
  superior: 'Superior',
  pos_graduacao: 'Pós-graduação',
  ate_2sm: 'Até 2 SM',
  '2_5sm': '2 a 5 SM',
  '5_10sm': '5 a 10 SM',
  '10_20sm': '10 a 20 SM',
  acima_20sm: 'Acima de 20 SM',
  nao_informar: 'Não informou',
}

function rotuloValor(v: string): string {
  return ROTULO_VALOR[v] ?? v
}

type CandidatoMeta = {
  id: string
  numero: number
  nome_urna: string
  sigla: string | null
  cor_hex: string | null
}

type CruzRow = {
  cargo: Cargo
  candidato_id: string
  dimensao: string
  valor: string
  votos: number
}

export default async function CruzamentosPage() {
  const db = supabaseAdmin()

  const { data: edicao } = await db
    .from('edicao')
    .select('id, nome, divulgada_em')
    .eq('ativa', true)
    .maybeSingle<{ id: string; nome: string; divulgada_em: string | null }>()

  if (!edicao) {
    return (
      <main className="cruz-msg">
        <h1>Sem edição ativa</h1>
        <p>
          Ative uma edição em <strong>/admin/edicoes</strong>.
        </p>
      </main>
    )
  }

  // Candidatos (pra ter nome/cor/número de cada candidato_id que aparece nos cruzamentos)
  const { data: candRows } = await db
    .from('v_resultados_candidato')
    .select('candidato_id, cargo, numero, nome_urna, sigla, cor_hex, votos')
    .eq('edicao_id', edicao.id)
    .in('cargo', ['presidente', 'governador', 'senador'])
    .order('votos', { ascending: false })

  const candPorCargo = new Map<Cargo, CandidatoMeta[]>()
  candPorCargo.set('presidente', [])
  candPorCargo.set('governador', [])
  candPorCargo.set('senador', [])
  for (const r of (candRows ?? []) as Array<{
    candidato_id: string
    cargo: Cargo
    numero: number
    nome_urna: string
    sigla: string | null
    cor_hex: string | null
  }>) {
    candPorCargo.get(r.cargo)?.push({
      id: r.candidato_id,
      numero: r.numero,
      nome_urna: r.nome_urna,
      sigla: r.sigla,
      cor_hex: r.cor_hex,
    })
  }

  // Cruzamentos reais (vem com supressão N≥30 da view)
  const { data: cruzRows } = await db
    .from('v_resultados_demografico')
    .select('cargo, candidato_id, dimensao, valor, votos')
    .eq('edicao_id', edicao.id)
    .in('cargo', ['presidente', 'governador', 'senador'])
    .in(
      'dimensao',
      DIMENSOES.map((d) => d.key) as unknown as string[],
    )

  // Reorganiza: cargo → dimensao → valor → candidato_id → votos
  const cruz = new Map<Cargo, Map<string, Map<string, Map<string, number>>>>()
  for (const r of (cruzRows ?? []) as CruzRow[]) {
    if (!cruz.has(r.cargo)) cruz.set(r.cargo, new Map())
    const porDim = cruz.get(r.cargo)!
    if (!porDim.has(r.dimensao)) porDim.set(r.dimensao, new Map())
    const porValor = porDim.get(r.dimensao)!
    if (!porValor.has(r.valor)) porValor.set(r.valor, new Map())
    porValor.get(r.valor)!.set(r.candidato_id, r.votos)
  }

  const temDadosReais = (cruzRows ?? []).length > 0

  return (
    <main className="cruz">
      <header className="cruz-header">
        <h1>Cruzamentos demográfico × voto</h1>
        <p className="cruz-edicao">{edicao.nome}</p>
        <p className="cruz-explicacao">
          Como cada perfil de eleitor distribuiu seus votos entre os
          candidatos. Dados agregados da Sala 2 (votos sem CPF), com
          supressão de células com menos de 30 respondentes (k-anonimato
          N≥30, padrão IBGE/Datafolha) — o sistema nunca expõe perfis
          re-identificáveis.
        </p>
      </header>

      {!temDadosReais && (
        <section className="cruz-aviso">
          <p>
            <strong>Sem cruzamentos disponíveis nesta edição.</strong>
          </p>
          <p>
            Pode ser porque ainda não há 30 respondentes em nenhum perfil
            demográfico × candidato — o filtro <code>HAVING count(*) ≥ 30</code>{' '}
            da <code>v_resultados_demografico</code> esconde tudo até esse
            patamar. Quando a Pesquisa Eleitoral Sergipe 2026 real for ao ar (1 e 2
            de setembro), com ~200 mil respondentes, cada uma das ~60
            células (3 cargos × 5 dimensões × ~4 valores) terá milhares de
            respondentes.
          </p>
          <p>
            Abaixo, um <strong>wireframe</strong> de como o relatório
            ficará. Os números são fictícios pra ilustrar o formato.
          </p>
        </section>
      )}

      {temDadosReais
        ? (['presidente', 'governador', 'senador'] as const).map((cargo) => (
            <SecaoCargoReal
              key={cargo}
              cargo={cargo}
              candidatos={candPorCargo.get(cargo) ?? []}
              cruzamentos={cruz.get(cargo) ?? new Map()}
            />
          ))
        : (['presidente', 'governador', 'senador'] as const).map((cargo) => (
            <SecaoCargoWireframe
              key={cargo}
              cargo={cargo}
              candidatos={candPorCargo.get(cargo) ?? []}
            />
          ))}

      <footer className="cruz-footer">
        <p>
          Fonte: <code>v_resultados_demografico</code> ·{' '}
          <code>votos_pesquisa</code> (sem ligação com CPF) · supressão
          N≥30 aplicada na view.
        </p>
        <p>
          Recorte demográfico copiado da Sala 1 (eleitor) pra Sala 2 (voto
          anônimo) sem cpf_hash — não permite identificar pessoa
          individualmente, apenas perfil agregado.
        </p>
      </footer>
    </main>
  )
}

/* ============================================================
 * Bloco real — quando há dados na view
 * ============================================================ */
function SecaoCargoReal({
  cargo,
  candidatos,
  cruzamentos,
}: {
  cargo: Cargo
  candidatos: CandidatoMeta[]
  cruzamentos: Map<string, Map<string, Map<string, number>>>
}) {
  const top = candidatos.slice(0, 6)

  return (
    <section className="cruz-secao">
      <h2 className="cruz-cargo">{ROTULO_CARGO[cargo]}</h2>

      {DIMENSOES.map((dim) => {
        const porValor = cruzamentos.get(dim.key)
        if (!porValor || porValor.size === 0) {
          return (
            <div key={dim.key} className="cruz-dim">
              <h3>{dim.label}</h3>
              <p className="cruz-vazio">
                Sem dados — nenhuma célula atingiu N≥30 nesta dimensão.
              </p>
            </div>
          )
        }

        const valoresOrdenados = [...porValor.keys()].sort((a, b) => {
          const ia = (dim.ordem as readonly string[]).indexOf(a)
          const ib = (dim.ordem as readonly string[]).indexOf(b)
          if (ia === -1 && ib === -1) return a.localeCompare(b)
          if (ia === -1) return 1
          if (ib === -1) return -1
          return ia - ib
        })

        return (
          <div key={dim.key} className="cruz-dim">
            <h3>{dim.label}</h3>
            <table className="cruz-tabela">
              <thead>
                <tr>
                  <th className="cruz-th-perfil">Perfil</th>
                  <th className="cruz-th-n">n</th>
                  {top.map((c) => (
                    <th key={c.id} className="cruz-th-cand">
                      <span
                        className="cruz-num-cand"
                        style={{
                          backgroundColor: c.cor_hex ?? '#9ca3af',
                        }}
                      >
                        {c.numero}
                      </span>
                      <span className="cruz-nome-cand">{c.nome_urna}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {valoresOrdenados.map((valor) => {
                  const porCand = porValor.get(valor)!
                  const total = [...porCand.values()].reduce((s, v) => s + v, 0)
                  return (
                    <tr key={valor}>
                      <td className="cruz-td-perfil">{rotuloValor(valor)}</td>
                      <td className="cruz-td-n">{total.toLocaleString('pt-BR')}</td>
                      {top.map((c) => {
                        const v = porCand.get(c.id) ?? 0
                        const pct = total > 0 ? (v / total) * 100 : 0
                        return (
                          <td key={c.id} className="cruz-td-pct">
                            <div className="cruz-pct-wrap">
                              <span className="cruz-pct-num">
                                {pct.toFixed(1)}%
                              </span>
                              <span
                                className="cruz-barra"
                                style={{
                                  width: `${Math.min(100, pct * 1.5)}%`,
                                  backgroundColor: c.cor_hex ?? '#9ca3af',
                                }}
                              />
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}
    </section>
  )
}

/* ============================================================
 * Wireframe — quando ainda não há 30 respondentes por célula
 * Mostra o formato com números fictícios pra ilustrar.
 * ============================================================ */
function SecaoCargoWireframe({
  cargo,
  candidatos,
}: {
  cargo: Cargo
  candidatos: CandidatoMeta[]
}) {
  // Se ainda não cadastraram candidatos, usa placeholders A/B/C
  const lista: CandidatoMeta[] =
    candidatos.length >= 3
      ? candidatos.slice(0, 3)
      : [
          {
            id: 'A',
            numero: 13,
            nome_urna: 'Candidato A',
            sigla: 'XX',
            cor_hex: '#dc2626',
          },
          {
            id: 'B',
            numero: 22,
            nome_urna: 'Candidato B',
            sigla: 'YY',
            cor_hex: '#0a2a6e',
          },
          {
            id: 'C',
            numero: 10,
            nome_urna: 'Candidato C',
            sigla: 'ZZ',
            cor_hex: '#16a34a',
          },
        ]

  // Distribuições fictícias por dimensão × candidato (somam ~100% com
  // outros = 1 - sum). Refletem padrões típicos de pesquisas eleitorais.
  const fakes: Record<string, Array<{ valor: string; pcts: number[]; n: number }>> = {
    sexo: [
      { valor: 'M', pcts: [42, 38, 12], n: 95_400 },
      { valor: 'F', pcts: [48, 32, 14], n: 104_600 },
    ],
    faixa_etaria: [
      { valor: '16-24', pcts: [58, 22, 16], n: 28_300 },
      { valor: '25-34', pcts: [52, 28, 14], n: 45_200 },
      { valor: '35-44', pcts: [44, 36, 12], n: 41_800 },
      { valor: '45-59', pcts: [38, 42, 12], n: 52_100 },
      { valor: '60+', pcts: [32, 50, 10], n: 32_600 },
    ],
    escolaridade: [
      { valor: 'fundamental', pcts: [50, 32, 10], n: 38_400 },
      { valor: 'medio', pcts: [44, 36, 12], n: 92_700 },
      { valor: 'superior', pcts: [40, 36, 18], n: 56_300 },
      { valor: 'pos_graduacao', pcts: [38, 34, 22], n: 12_600 },
    ],
    nivel_economico: [
      { valor: 'ate_2sm', pcts: [52, 32, 8], n: 64_200 },
      { valor: '2_5sm', pcts: [46, 36, 12], n: 78_900 },
      { valor: '5_10sm', pcts: [38, 38, 18], n: 36_400 },
      { valor: '10_20sm', pcts: [36, 40, 20], n: 14_200 },
      { valor: 'acima_20sm', pcts: [32, 42, 22], n: 6_300 },
    ],
    regiao: [
      { valor: 'Grande Aracaju', pcts: [44, 36, 16], n: 76_500 },
      { valor: 'Centro-Sul', pcts: [46, 38, 12], n: 28_200 },
      { valor: 'Agreste', pcts: [48, 36, 10], n: 31_400 },
      { valor: 'Leste Sergipano', pcts: [42, 40, 12], n: 22_800 },
      { valor: 'Médio Sertão', pcts: [44, 38, 12], n: 13_600 },
      { valor: 'Alto Sertão', pcts: [50, 34, 10], n: 16_900 },
      { valor: 'Baixo São Francisco', pcts: [46, 38, 10], n: 10_600 },
    ],
  }

  // Variação leve por cargo pra não ficar idêntico nas 3 seções
  const offset = cargo === 'governador' ? 4 : cargo === 'senador' ? -3 : 0

  return (
    <section className="cruz-secao cruz-secao-wf">
      <h2 className="cruz-cargo">
        {ROTULO_CARGO[cargo]} <span className="cruz-badge-wf">wireframe</span>
      </h2>

      {DIMENSOES.map((dim) => {
        const linhas = fakes[dim.key]
        return (
          <div key={dim.key} className="cruz-dim">
            <h3>{dim.label}</h3>
            <table className="cruz-tabela">
              <thead>
                <tr>
                  <th className="cruz-th-perfil">Perfil</th>
                  <th className="cruz-th-n">n</th>
                  {lista.map((c) => (
                    <th key={c.id} className="cruz-th-cand">
                      <span
                        className="cruz-num-cand"
                        style={{ backgroundColor: c.cor_hex ?? '#9ca3af' }}
                      >
                        {c.numero}
                      </span>
                      <span className="cruz-nome-cand">{c.nome_urna}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.map((linha) => (
                  <tr key={linha.valor}>
                    <td className="cruz-td-perfil">{rotuloValor(linha.valor)}</td>
                    <td className="cruz-td-n">{linha.n.toLocaleString('pt-BR')}</td>
                    {lista.map((c, i) => {
                      const pct = Math.max(
                        1,
                        Math.min(70, linha.pcts[i] + (i === 0 ? offset : 0)),
                      )
                      return (
                        <td key={c.id} className="cruz-td-pct">
                          <div className="cruz-pct-wrap">
                            <span className="cruz-pct-num">{pct.toFixed(1)}%</span>
                            <span
                              className="cruz-barra"
                              style={{
                                width: `${Math.min(100, pct * 1.5)}%`,
                                backgroundColor: c.cor_hex ?? '#9ca3af',
                              }}
                            />
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </section>
  )
}
