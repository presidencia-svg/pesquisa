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
 *
 * PADRÃO ÚNICO: os números de voto, o n e a margem saem de
 * carregarResultados() — o mesmo carregador do /resultados público, da TV e
 * da apresentação (percentual ponderado oficial, bruto ao lado). Esta página
 * não consulta view de voto por conta própria: o PDF que vai pra emissora tem
 * que bater com o que abre no site depois do anúncio.
 */
import type { CargoCandidato, CargoZona } from '@/components/resultados-dashboard'
import { registrarAcessoAdmin } from '@/lib/admin-audit'
import { NIVEL_ECONOMICO_ROTULO_CURTO } from '@/lib/demograficos'
import { carregarResultados } from '@/lib/resultados-data'
import { supabaseAdmin } from '@/lib/supabase/admin'
import QRCode from 'qrcode'

import { BotaoImprimir } from './botao-imprimir'
import './snapshot.css'

export const metadata = { title: 'Snapshot embargado · Admin' }
export const dynamic = 'force-dynamic'

const CARGOS = ['presidente', 'governador', 'senador', 'federal', 'estadual'] as const

const ROTULO = {
  presidente: 'Presidente',
  governador: 'Governador',
  senador: 'Senador (2 vagas)',
  federal: 'Deputado Federal',
  estadual: 'Deputado Estadual',
} as const

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

  // Fonte única: mesmo carregador do /resultados público (ponderado oficial).
  const oficial = await carregarResultados({ ignorarDivulgacao: true })
  if (oficial.status !== 'ok') {
    return (
      <main className="snapshot-msg">
        <h1>Resultado indisponível</h1>
        <p>
          O carregador oficial de resultados respondeu{' '}
          <strong>{oficial.status}</strong> para a edição ativa. Confira a
          situação em <strong>/admin/edicoes</strong> antes de gerar o snapshot.
        </p>
      </main>
    )
  }
  const { pesquisa } = oficial
  const n = pesquisa.meta.n
  const margem = pesquisa.meta.margem_efetiva ?? pesquisa.meta.margem

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

  // Patrocinador Diamante — único que aparece no snapshot pra TV
  // (Ouro e Prata só na página pública /resultados pós-divulgação;
  // Diamante tem direito a "Pesquisa apresentada por" no telejornal,
  // por isso a TV precisa saber quem é durante a produção).
  const { data: diamanteRow } = await db
    .from('interessados_patrocinio')
    .select('empresa, logo_url')
    .eq('status', 'firmado')
    .eq('mostrar_publico', true)
    .eq('cota', 'diamante')
    .not('logo_url', 'is', null)
    .order('criado_em', { ascending: true })
    .limit(1)
    .maybeSingle<{ empresa: string; logo_url: string }>()

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
          <h2 className="snapshot-titulo">Pesquisa Eleitoral Sergipe 2026</h2>
          <p className="snapshot-edicao">
            {edicao.nome} · {edicao.turno ?? 1}º turno
          </p>
        </div>

        {/* Patrocinador Diamante — "Pesquisa apresentada por" */}
        {diamanteRow && (
          <div className="snapshot-diamante">
            <p className="snapshot-diamante-kicker">
              Pesquisa apresentada por
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={diamanteRow.logo_url}
              alt={diamanteRow.empresa}
              className="snapshot-diamante-logo"
            />
            <p className="snapshot-diamante-empresa">{diamanteRow.empresa}</p>
            <p className="snapshot-diamante-nota">
              Patrocinador Master da Pesquisa Eleitoral Sergipe 2026 — citar nos
              créditos de abertura do telejornal, conforme convênio.
            </p>
          </div>
        )}

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
                <span className="snapshot-ficha-sub">
                  {pesquisa.meta.margem_efetiva ? 'efetiva · ' : ''}IC 95%
                </span>
              </dd>
            </div>
            <div>
              <dt>Ponderação</dt>
              <dd>
                {pesquisa.meta.ponderacao_curta ?? '—'}
                <br />
                <span className="snapshot-ficha-sub">
                  % oficial = ponderado · bruto ao lado
                </span>
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

        {/* Votos por cargo — resultado oficial (ponderado), bruto ao lado */}
        {CARGOS.map((cargo) => {
          const bloco = pesquisa[cargo]
          return bloco ? (
            <SecaoCand key={cargo} titulo={ROTULO[cargo]} cargo={bloco} />
          ) : null
        })}

        {/* Zona */}
        {pesquisa.zona_expansao && <SecaoZona zona={pesquisa.zona_expansao} />}

        {/* Rodapé */}
        <footer className="snapshot-footer">
          <p>
            <strong>Pesquisa Eleitoral Sergipe 2026</strong> · realização CDL Aracaju ·
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

const fmtPct = (parte: number, total: number) =>
  total > 0 ? ((parte / total) * 100).toFixed(1).replace('.', ',') + '%' : '0,0%'

function SecaoCand({ titulo, cargo }: { titulo: string; cargo: CargoCandidato }) {
  // Mesma conta do /resultados público (components/resultados-dashboard):
  // % oficial = ponderado ÷ (válidos + brancos + não sabe) ponderados.
  const linhas = cargo.candidatos
  const total = linhas.reduce((acc, l) => acc + l.votos, 0) + cargo.branco + cargo.nao_sabe
  const brancoPond = cargo.brancoPond ?? cargo.branco
  const naoSabePond = cargo.naoSabePond ?? cargo.nao_sabe
  const totalPond =
    linhas.reduce((acc, l) => acc + (l.votosPond ?? l.votos), 0) + brancoPond + naoSabePond
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
              <th className="th-votos">Votos (bruto)</th>
              <th className="th-pct">% bruto</th>
              <th className="th-pct">% oficial</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.id}>
                <td className="td-num">{l.numero}</td>
                <td>
                  {l.nome}
                  {l.eleito && <span className="snapshot-tag"> · eleito na projeção</span>}
                  {l.segundoTurno && <span className="snapshot-tag"> · 2º turno</span>}
                </td>
                <td className="td-partido">{l.partido || '—'}</td>
                <td className="td-votos">{l.votos.toLocaleString('pt-BR')}</td>
                <td className="td-pct">{fmtPct(l.votos, total)}</td>
                <td className="td-pct td-pct-oficial">
                  {fmtPct(l.votosPond ?? l.votos, totalPond)}
                </td>
              </tr>
            ))}
            {cargo.branco > 0 && (
              <tr className="tr-extra">
                <td colSpan={3}>Voto em branco</td>
                <td className="td-votos">{cargo.branco.toLocaleString('pt-BR')}</td>
                <td className="td-pct">{fmtPct(cargo.branco, total)}</td>
                <td className="td-pct td-pct-oficial">{fmtPct(brancoPond, totalPond)}</td>
              </tr>
            )}
            {cargo.nao_sabe > 0 && (
              <tr className="tr-extra">
                <td colSpan={3}>Não sabe / não respondeu</td>
                <td className="td-votos">{cargo.nao_sabe.toLocaleString('pt-BR')}</td>
                <td className="td-pct">{fmtPct(cargo.nao_sabe, total)}</td>
                <td className="td-pct td-pct-oficial">{fmtPct(naoSabePond, totalPond)}</td>
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
  // Renda: vocabulário da 2ª edição (salários mínimos) + o da 1ª (classes).
  ...NIVEL_ECONOMICO_ROTULO_CURTO,
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

function SecaoZona({ zona }: { zona: CargoZona }) {
  const { aracaju: aju, sao_cristovao: sc, branco, nao_sabe: naoSabe } = zona
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
