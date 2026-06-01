/**
 * Snapshot embargado — gerador de PDF pra enviar pra TV Atalaia.
 *
 * Fluxo previsto pelo Convênio TV Atalaia v1.1 (Cláusula 2ª, II):
 *
 *   1. Admin abre esta rota 4h antes do telejornal
 *   2. Layout aparece formatado pra impressão (sem botões/sidebar)
 *   3. Admin clica "Imprimir / Salvar PDF" → browser dialog
 *   4. Salva PDF e envia pra equipe TV Atalaia com aviso de embargo
 *   5. Após o anúncio no telejornal, admin vai em /admin/edicoes e
 *      clica "📢 Divulgar publicamente" → /resultados público abre
 *
 * Trilha de auditoria: cada acesso a esta rota grava em
 * admin_audit_log com ação 'gerar_snapshot_tv' + timestamp + edicao_id.
 */
import { registrarAcessoAdmin } from '@/lib/admin-audit'
import { supabaseAdmin } from '@/lib/supabase/admin'
import QRCode from 'qrcode'

import { BotaoImprimir } from './botao-imprimir'
import './snapshot.css'

export const metadata = { title: 'Snapshot embargado · Admin' }
export const dynamic = 'force-dynamic'

type CandLinha = {
  id: string
  numero: number
  nome_urna: string
  sigla: string | null
  cor_hex: string | null
  votos: number
}

type LegLinha = {
  id: string
  numero: number
  sigla: string
  nome: string
  cor_hex: string | null
  votos: number
}

const ROTULO = {
  presidente: 'Presidente',
  governador: 'Governador',
  senador: 'Senador (2 vagas)',
  federal: 'Deputado Federal (legenda)',
  estadual: 'Deputado Estadual (legenda)',
} as const

/**
 * Margem de erro IC 95% via pior caso (p=0,5): 1,96 × √(0,25/n).
 * Mesma fórmula usada na página pública /resultados.
 */
function calcMargem(n: number): string {
  if (n <= 0) return '—'
  return `±${(1.96 * Math.sqrt(0.25 / n) * 100).toFixed(1)}pp`
}

function formatarBR(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Maceio', // SE = Maceió no fuso horário (BRT, sem DST)
  })
}

export default async function SnapshotPage() {
  const db = supabaseAdmin()
  const agora = new Date()

  const { data: edicao } = await db
    .from('edicao')
    .select('id, nome, divulgada_em, divulgacao_prevista, registro_tre, turno')
    .eq('ativa', true)
    .maybeSingle<{
      id: string
      nome: string
      divulgada_em: string | null
      divulgacao_prevista: string | null
      registro_tre: string | null
      turno: number | null
    }>()

  if (!edicao) {
    return (
      <main className="snapshot-msg">
        <h1>Sem edição ativa</h1>
        <p>
          Não há edição ativa. Ative uma edição em <strong>/admin/edicoes</strong>{' '}
          antes de gerar snapshot.
        </p>
      </main>
    )
  }

  // Auditoria: registra geração. Importante porque o snapshot dá
  // acesso a TODOS os números antes da divulgação pública.
  await registrarAcessoAdmin(
    'gerar_snapshot_tv',
    {
      edicao_id: edicao.id,
      edicao_nome: edicao.nome,
      ja_divulgada: Boolean(edicao.divulgada_em),
      registro_tre: edicao.registro_tre,
    },
    `edicao:${edicao.id}`,
  )

  // n = eleitores com WhatsApp validado (mesma def do /resultados público)
  const { count: nCount } = await db
    .from('eleitores_pesquisa')
    .select('id', { count: 'exact', head: true })
    .eq('edicao_id', edicao.id)
    .eq('wa_validado', true)
  const n = nCount ?? 0
  const margem = calcMargem(n)

  // Pres/Gov/Sen
  const cargosCand = ['presidente', 'governador', 'senador'] as const
  const candPorCargo: Record<string, CandLinha[]> = {
    presidente: [],
    governador: [],
    senador: [],
  }
  {
    const { data } = await db
      .from('v_resultados_candidato')
      .select('candidato_id, cargo, numero, nome_urna, sigla, cor_hex, votos')
      .eq('edicao_id', edicao.id)
      .in('cargo', cargosCand as unknown as string[])
      .order('votos', { ascending: false })
    for (const r of (data ?? []) as Array<{
      candidato_id: string
      cargo: (typeof cargosCand)[number]
      numero: number
      nome_urna: string
      sigla: string | null
      cor_hex: string | null
      votos: number
    }>) {
      candPorCargo[r.cargo].push({
        id: r.candidato_id,
        numero: r.numero,
        nome_urna: r.nome_urna,
        sigla: r.sigla,
        cor_hex: r.cor_hex,
        votos: r.votos,
      })
    }
  }

  // Fed/Est
  const cargosLeg = ['federal', 'estadual'] as const
  const legPorCargo: Record<string, LegLinha[]> = {
    federal: [],
    estadual: [],
  }
  {
    const { data } = await db
      .from('v_resultados_legenda')
      .select('partido_id, cargo, numero, sigla, nome, cor_hex, votos')
      .eq('edicao_id', edicao.id)
      .in('cargo', cargosLeg as unknown as string[])
      .order('votos', { ascending: false })
    for (const r of (data ?? []) as Array<{
      partido_id: string
      cargo: (typeof cargosLeg)[number]
      numero: number
      sigla: string
      nome: string
      cor_hex: string | null
      votos: number
    }>) {
      legPorCargo[r.cargo].push({
        id: r.partido_id,
        numero: r.numero,
        sigla: r.sigla,
        nome: r.nome,
        cor_hex: r.cor_hex,
        votos: r.votos,
      })
    }
  }

  // Branco / Não sei por cargo
  const { data: bnsRows } = await db
    .from('votos_pesquisa')
    .select('cargo, metodo')
    .eq('edicao_id', edicao.id)
    .in('metodo', ['branco', 'nao_sabe'])
  const bns: Record<string, { branco: number; nao_sabe: number }> = {}
  for (const r of (bnsRows ?? []) as { cargo: string; metodo: string }[]) {
    if (!bns[r.cargo]) bns[r.cargo] = { branco: 0, nao_sabe: 0 }
    if (r.metodo === 'branco') bns[r.cargo].branco++
    if (r.metodo === 'nao_sabe') bns[r.cargo].nao_sabe++
  }

  // Zona expansão
  const { data: zonaRows } = await db
    .from('v_resultados_zona')
    .select('resposta, votos')
    .eq('edicao_id', edicao.id)
  const aju =
    (zonaRows ?? []).find(
      (r: { resposta: string; votos: number }) => r.resposta === 'aracaju',
    )?.votos ?? 0
  const sc =
    (zonaRows ?? []).find(
      (r: { resposta: string; votos: number }) => r.resposta === 'sao_cristovao',
    )?.votos ?? 0

  // Composição da amostra final (Resolução TSE 23.747/2026, Art. 2º §7º, IV).
  // Agrega da view v_amostra_composicao. 6 dimensões: sexo, faixa_etaria,
  // escolaridade, nivel_economico, municipio (nome legível), regiao.
  const { data: composicaoRows } = await db
    .from('v_amostra_composicao')
    .select('dimensao, valor, n')
    .eq('edicao_id', edicao.id)
  const composicao: Record<string, Array<{ valor: string; n: number }>> = {
    sexo: [],
    faixa_etaria: [],
    escolaridade: [],
    nivel_economico: [],
    municipio: [],
    regiao: [],
  }
  for (const r of (composicaoRows ?? []) as Array<{
    dimensao: string
    valor: string
    n: number
  }>) {
    if (composicao[r.dimensao]) {
      composicao[r.dimensao].push({ valor: r.valor, n: r.n })
    }
  }
  for (const k of Object.keys(composicao)) {
    composicao[k].sort((a, b) => b.n - a.n)
  }

  // QR code apontando pro endereço público (a TV pode chamar no ar)
  const qrSvg = await QRCode.toString(
    'https://pesquisa.cdlaju.com.br/resultados',
    { type: 'svg', errorCorrectionLevel: 'M', margin: 0, width: 90 },
  )

  return (
    <>
      <BotaoImprimir />

      <main className="snapshot">
        {/* Cabeçalho institucional + carimbos */}
        <header className="snapshot-header">
          <div className="snapshot-brand">
            <h1>CDL ARACAJU</h1>
            <p className="snapshot-cnpj">CNPJ 13.045.935/0001-36</p>
            <p className="snapshot-endereco">
              Rua Santa Luzia, 570 · São José · Aracaju/SE · CEP 49015-190
            </p>
          </div>
          <div
            className="snapshot-qr"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        </header>

        <div className="snapshot-titulo-wrap">
          <p className="snapshot-kicker">Snapshot embargado</p>
          <h2 className="snapshot-titulo">Pesquisa Sergipe 2026</h2>
          <p className="snapshot-edicao">
            {edicao.nome} · {edicao.turno ?? 1}º turno
          </p>
        </div>

        {/* Carimbo de embargo */}
        <div className="snapshot-embargo">
          <p>
            <strong>SOB EMBARGO JORNALÍSTICO</strong> até o anúncio no
            telejornal da TV Atalaia
          </p>
          <p className="snapshot-embargo-sub">
            Vide Convênio CDL Aracaju × TV Atalaia v1.1, Cláusula 2ª, III ·
            divulgação pública em https://pesquisa.cdlaju.com.br/resultados
            imediatamente após o anúncio
          </p>
        </div>

        {/* Ficha técnica */}
        <section className="snapshot-ficha">
          <dl>
            <div>
              <dt>Snapshot gerado em</dt>
              <dd>{formatarBR(agora)}</dd>
            </div>
            <div>
              <dt>Amostra (n)</dt>
              <dd>
                {n.toLocaleString('pt-BR')} eleitores
                <br />
                <span className="snapshot-ficha-sub">
                  CPF + WhatsApp validados
                </span>
              </dd>
            </div>
            <div>
              <dt>Margem de erro</dt>
              <dd>
                {margem}
                <br />
                <span className="snapshot-ficha-sub">IC 95%</span>
              </dd>
            </div>
            <div>
              <dt>Registro TRE/SE</dt>
              <dd>{edicao.registro_tre ?? '—'}</dd>
            </div>
            <div>
              <dt>Divulgação prevista</dt>
              <dd>
                {edicao.divulgacao_prevista
                  ? formatarBR(new Date(edicao.divulgacao_prevista))
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                {edicao.divulgada_em ? (
                  <span className="snapshot-status-divulgada">
                    Já divulgada em {formatarBR(new Date(edicao.divulgada_em))}
                  </span>
                ) : (
                  <span className="snapshot-status-aguardando">
                    Aguardando divulgação no telejornal
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </section>

        {/* Composição da amostra final (Resolução TSE 23.747/2026 §7º IV) */}
        <SecaoComposicao composicao={composicao} n={n} />

        {/* Pres/Gov/Sen */}
        {cargosCand.map((cargo) => (
          <SecaoCand
            key={cargo}
            titulo={ROTULO[cargo]}
            linhas={candPorCargo[cargo]}
            branco={bns[cargo]?.branco ?? 0}
            naoSabe={bns[cargo]?.nao_sabe ?? 0}
          />
        ))}

        {/* Fed/Est */}
        {cargosLeg.map((cargo) => (
          <SecaoLeg
            key={cargo}
            titulo={ROTULO[cargo]}
            linhas={legPorCargo[cargo]}
            branco={bns[cargo]?.branco ?? 0}
            naoSabe={bns[cargo]?.nao_sabe ?? 0}
          />
        ))}

        {/* Zona */}
        <SecaoZona
          aju={aju}
          sc={sc}
          branco={bns['zona_expansao']?.branco ?? 0}
          naoSabe={bns['zona_expansao']?.nao_sabe ?? 0}
        />

        {/* Rodapé */}
        <footer className="snapshot-footer">
          <p>
            <strong>Pesquisa Sergipe 2026</strong> · realização CDL Aracaju ·
            metodologia em pesquisa.cdlaju.com.br/transparencia
          </p>
          <p>
            Encarregada pelo tratamento de dados (DPO): dpo@cdlaju.com.br ·
            Lei 9.504/97, Resolução TSE 23.747/2026, LGPD 13.709/18
          </p>
          <p className="snapshot-footer-hash">
            Hash do snapshot: {edicao.id.slice(0, 8)} ·{' '}
            {agora.toISOString().slice(0, 19).replace(/[-:T]/g, '')}
          </p>
        </footer>
      </main>
    </>
  )
}

function SecaoCand({
  titulo,
  linhas,
  branco,
  naoSabe,
}: {
  titulo: string
  linhas: CandLinha[]
  branco: number
  naoSabe: number
}) {
  const totalCand = linhas.reduce((acc, l) => acc + l.votos, 0)
  const total = totalCand + branco + naoSabe
  return (
    <section className="snapshot-secao">
      <h3>
        {titulo}{' '}
        <span className="snapshot-secao-n">
          (n={total.toLocaleString('pt-BR')})
        </span>
      </h3>
      {total === 0 ? (
        <p className="snapshot-vazio">Sem votos.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th className="th-num">Nº</th>
              <th>Candidato</th>
              <th className="th-partido">Partido</th>
              <th className="th-votos">Votos</th>
              <th className="th-pct">%</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.id}>
                <td className="td-num">{l.numero}</td>
                <td>{l.nome_urna}</td>
                <td className="td-partido">{l.sigla ?? '—'}</td>
                <td className="td-votos">{l.votos.toLocaleString('pt-BR')}</td>
                <td className="td-pct">
                  {total === 0
                    ? '0,0%'
                    : ((l.votos / total) * 100).toFixed(1).replace('.', ',') +
                      '%'}
                </td>
              </tr>
            ))}
            {branco > 0 && (
              <tr className="tr-extra">
                <td colSpan={3}>Voto em branco</td>
                <td className="td-votos">{branco.toLocaleString('pt-BR')}</td>
                <td className="td-pct">
                  {((branco / total) * 100).toFixed(1).replace('.', ',')}%
                </td>
              </tr>
            )}
            {naoSabe > 0 && (
              <tr className="tr-extra">
                <td colSpan={3}>Não sabe / não respondeu</td>
                <td className="td-votos">{naoSabe.toLocaleString('pt-BR')}</td>
                <td className="td-pct">
                  {((naoSabe / total) * 100).toFixed(1).replace('.', ',')}%
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  )
}

function SecaoLeg({
  titulo,
  linhas,
  branco,
  naoSabe,
}: {
  titulo: string
  linhas: LegLinha[]
  branco: number
  naoSabe: number
}) {
  const totalLeg = linhas.reduce((acc, l) => acc + l.votos, 0)
  const total = totalLeg + branco + naoSabe
  return (
    <section className="snapshot-secao">
      <h3>
        {titulo}{' '}
        <span className="snapshot-secao-n">
          (n={total.toLocaleString('pt-BR')})
        </span>
      </h3>
      {total === 0 ? (
        <p className="snapshot-vazio">Sem votos.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th className="th-num">Nº</th>
              <th>Sigla</th>
              <th>Nome do partido</th>
              <th className="th-votos">Votos</th>
              <th className="th-pct">%</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.id}>
                <td className="td-num">{l.numero}</td>
                <td>
                  <strong>{l.sigla}</strong>
                </td>
                <td className="td-nome-partido">{l.nome}</td>
                <td className="td-votos">{l.votos.toLocaleString('pt-BR')}</td>
                <td className="td-pct">
                  {((l.votos / total) * 100).toFixed(1).replace('.', ',')}%
                </td>
              </tr>
            ))}
            {branco > 0 && (
              <tr className="tr-extra">
                <td colSpan={3}>Voto em branco</td>
                <td className="td-votos">{branco.toLocaleString('pt-BR')}</td>
                <td className="td-pct">
                  {((branco / total) * 100).toFixed(1).replace('.', ',')}%
                </td>
              </tr>
            )}
            {naoSabe > 0 && (
              <tr className="tr-extra">
                <td colSpan={3}>Não sabe / não respondeu</td>
                <td className="td-votos">{naoSabe.toLocaleString('pt-BR')}</td>
                <td className="td-pct">
                  {((naoSabe / total) * 100).toFixed(1).replace('.', ',')}%
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  )
}

const ROTULO_DIMENSAO: Record<string, string> = {
  sexo: 'Gênero',
  faixa_etaria: 'Faixa etária',
  escolaridade: 'Grau de instrução',
  nivel_economico: 'Nível econômico',
  municipio: 'Município (top 10)',
  regiao: 'Região',
}

const ROTULO_REGIAO: Record<string, string> = {
  grande_aracaju: 'Grande Aracaju',
  leste: 'Leste',
  agreste: 'Agreste',
  centro_sul: 'Centro-Sul',
  sertao: 'Sertão',
}

const ROTULO_VALOR: Record<string, string> = {
  M: 'Masculino',
  F: 'Feminino',
  fundamental: 'Fundamental',
  medio: 'Médio',
  superior: 'Superior',
  A: 'Classe A (> R$ 25.000)',
  B: 'Classe B (R$ 7.000 – 25.000)',
  C: 'Classe C (R$ 2.800 – 7.000)',
  D_E: 'Classe D-E (até R$ 2.800)',
  nao_informado: 'Não declarado',
}

function SecaoComposicao({
  composicao,
  n,
}: {
  composicao: Record<string, Array<{ valor: string; n: number }>>
  n: number
}) {
  // Ordem fixa: as 4 dimensões "compactas" primeiro, depois região,
  // depois top 10 municípios (que pode ser bem comprido).
  const dims = [
    'sexo',
    'faixa_etaria',
    'escolaridade',
    'nivel_economico',
    'regiao',
    'municipio',
  ]
  return (
    <section className="snapshot-secao">
      <h3>
        Composição da amostra final{' '}
        <span className="snapshot-secao-n">
          (Resolução TSE 23.747/2026, Art. 2º §7º, IV · n=
          {n.toLocaleString('pt-BR')})
        </span>
      </h3>
      <div className="snapshot-composicao-grid">
        {dims.map((d) => {
          let linhas = composicao[d] ?? []
          if (linhas.length === 0) return null
          // Pra município, agrega os de fora do top 10 em "Outros"
          let suffix: { valor: string; n: number } | null = null
          if (d === 'municipio' && linhas.length > 10) {
            const top10 = linhas.slice(0, 10)
            const restoSoma = linhas
              .slice(10)
              .reduce((s, l) => s + l.n, 0)
            suffix = {
              valor: `Outros ${linhas.length - 10} municípios`,
              n: restoSoma,
            }
            linhas = top10
          }
          const total =
            linhas.reduce((s, l) => s + l.n, 0) + (suffix?.n ?? 0)
          return (
            <div key={d} className="snapshot-composicao-bloco">
              <h4>{ROTULO_DIMENSAO[d]}</h4>
              <table>
                <tbody>
                  {linhas.map((l) => {
                    const rotulo =
                      d === 'regiao'
                        ? ROTULO_REGIAO[l.valor] ?? l.valor
                        : ROTULO_VALOR[l.valor] ?? l.valor
                    return (
                      <tr key={l.valor}>
                        <td>{rotulo}</td>
                        <td className="td-votos">
                          {l.n.toLocaleString('pt-BR')}
                        </td>
                        <td className="td-pct">
                          {total > 0
                            ? ((l.n / total) * 100)
                                .toFixed(1)
                                .replace('.', ',') + '%'
                            : '—'}
                        </td>
                      </tr>
                    )
                  })}
                  {suffix && (
                    <tr className="tr-extra">
                      <td>{suffix.valor}</td>
                      <td className="td-votos">
                        {suffix.n.toLocaleString('pt-BR')}
                      </td>
                      <td className="td-pct">
                        {((suffix.n / total) * 100)
                          .toFixed(1)
                          .replace('.', ',') + '%'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function SecaoZona({
  aju,
  sc,
  branco,
  naoSabe,
}: {
  aju: number
  sc: number
  branco: number
  naoSabe: number
}) {
  const total = aju + sc + branco + naoSabe
  if (total === 0) return null
  return (
    <section className="snapshot-secao">
      <h3>
        Zona de Expansão{' '}
        <span className="snapshot-secao-n">
          (Aracaju + São Cristóvão · n={total.toLocaleString('pt-BR')})
        </span>
      </h3>
      <table>
        <thead>
          <tr>
            <th>Posição</th>
            <th className="th-votos">Respostas</th>
            <th className="th-pct">%</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Deveria ficar com Aracaju</td>
            <td className="td-votos">{aju.toLocaleString('pt-BR')}</td>
            <td className="td-pct">
              {((aju / total) * 100).toFixed(1).replace('.', ',')}%
            </td>
          </tr>
          <tr>
            <td>Deveria ficar com São Cristóvão</td>
            <td className="td-votos">{sc.toLocaleString('pt-BR')}</td>
            <td className="td-pct">
              {((sc / total) * 100).toFixed(1).replace('.', ',')}%
            </td>
          </tr>
          {branco > 0 && (
            <tr className="tr-extra">
              <td>Voto em branco</td>
              <td className="td-votos">{branco.toLocaleString('pt-BR')}</td>
              <td className="td-pct">
                {((branco / total) * 100).toFixed(1).replace('.', ',')}%
              </td>
            </tr>
          )}
          {naoSabe > 0 && (
            <tr className="tr-extra">
              <td>Não sabe / não respondeu</td>
              <td className="td-votos">{naoSabe.toLocaleString('pt-BR')}</td>
              <td className="td-pct">
                {((naoSabe / total) * 100).toFixed(1).replace('.', ',')}%
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  )
}
