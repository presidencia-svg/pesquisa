/**
 * Prévia reservada do resultado PONDERADO — só pra quem consumiu um link de
 * uso único (migration 060) e ainda tem o cookie da sessão neste navegador.
 *
 * Mesma fonte dos números de /resultados e /tv (carregarResultados → views
 * v_*_pond_estratos no banco), com ignorarDivulgacao: o conteúdo existe antes
 * de edicao.divulgada_em, por isso o acesso é amarrado ao navegador, marcado
 * com o nome do destinatário e registrado em admin_audit_log a cada abertura.
 */
import type { CargoCandidato } from '@/components/resultados-dashboard'
import { registrarAcessoAdmin } from '@/lib/admin-audit'
import { contarVisualizacao, sessaoDePrevia } from '@/lib/previa-link'
import { carregarResultados } from '@/lib/resultados-data'
import { supabaseAdmin } from '@/lib/supabase/admin'

import './previa.css'

export const metadata = {
  title: 'Prévia reservada · Pesquisa CDL Aracaju',
  robots: { index: false, follow: false },
  referrer: 'no-referrer' as const,
}
export const dynamic = 'force-dynamic'

const CARGOS = [
  ['presidente', 'Presidente da República'],
  ['governador', 'Governador de Sergipe'],
  ['senador', 'Senador (2 vagas)'],
  ['federal', 'Deputado Federal'],
  ['estadual', 'Deputado Estadual'],
] as const

const DIMENSOES = [
  ['sexo', 'Sexo'],
  ['faixa', 'Faixa etária'],
  ['escolaridade', 'Instrução'],
] as const

type Marginais = Record<string, Record<string, number>>
type Execucao = {
  id: string
  executado_em: string
  executado_por: string | null
  respondentes_total: number
  respondentes_se: number
  respondentes_fora_se: number
  iteracoes: number | null
  desvio_max: number | null
  convergiu: boolean | null
  n_eff: number | null
  deff: number | null
  peso_min: number | null
  peso_mediana: number | null
  peso_p95: number | null
  peso_p99: number | null
  peso_max: number | null
  margem_nominal: number | null
  margem_efetiva: number | null
  alvos: Marginais | null
  amostra: Marginais | null
}

const int = (n: number) => Math.round(n).toLocaleString('pt-BR')
const dec = (n: number | null | undefined, d = 2) =>
  n == null ? '—' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })
const pct = (a: number, b: number) => (b > 0 ? (100 * a) / b : 0)
const fpct = (x: number) => `${dec(x, 1)}%`
const pp = (x: number | null | undefined) => (x == null ? '—' : `±${dec(Number(x) * 100, 1)} pp`)
const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Maceio',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <main className="pv-aviso">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/cdl-pesquisas-logo.png" alt="CDL Pesquisas" />
      <h1>{titulo}</h1>
      <p>{texto}</p>
    </main>
  )
}

function TabelaCargo({ titulo, cargo }: { titulo: string; cargo: CargoCandidato }) {
  const linhas = cargo.candidatos
    .filter((c) => c.votos > 0)
    .map((c) => ({ ...c, pond: c.votosPond ?? c.votos }))
    .sort((a, b) => b.pond - a.pond)
  const validos = linhas.reduce((s, c) => s + c.votos, 0)
  const validosPond = linhas.reduce((s, c) => s + c.pond, 0)
  const branco = cargo.branco ?? 0
  const naoSabe = cargo.nao_sabe ?? 0
  const brancoPond = cargo.brancoPond ?? branco
  const naoSabePond = cargo.naoSabePond ?? naoSabe
  const total = validos + branco + naoSabe
  const totalPond = validosPond + brancoPond + naoSabePond

  return (
    <section className="pv-cargo">
      <h2>{titulo}</h2>
      <p className="pv-sub">
        {int(total)} respostas · percentuais sobre o total (nominais + brancos/nulos + indecisos) ·
        ordenado pelo ponderado
      </p>
      <div className="pv-rolagem">
        <table>
          <thead>
            <tr>
              <th className="pv-esq">#</th>
              <th className="pv-esq">Candidato</th>
              <th className="pv-esq">Partido</th>
              <th>Votos brutos</th>
              <th>% bruto</th>
              <th>% ponderado</th>
              <th>Dif. (pp)</th>
              <th>% válidos pond.</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((c, i) => {
              const b = pct(c.votos, total)
              const p = pct(c.pond, totalPond)
              return (
                <tr key={c.id}>
                  <td className="pv-esq">{i + 1}</td>
                  <td className="pv-esq pv-nome">{c.nome}</td>
                  <td className="pv-esq">{c.partido}</td>
                  <td>{int(c.votos)}</td>
                  <td>{fpct(b)}</td>
                  <td className="pv-forte">{fpct(p)}</td>
                  <td className={p - b >= 0 ? 'pv-mais' : 'pv-menos'}>
                    {p - b >= 0 ? '+' : '−'}
                    {dec(Math.abs(p - b), 1)}
                  </td>
                  <td>{fpct(pct(c.pond, validosPond))}</td>
                </tr>
              )
            })}
            <tr className="pv-resto">
              <td />
              <td className="pv-esq" colSpan={2}>
                Brancos / nulos
              </td>
              <td>{int(branco)}</td>
              <td>{fpct(pct(branco, total))}</td>
              <td className="pv-forte">{fpct(pct(brancoPond, totalPond))}</td>
              <td />
              <td />
            </tr>
            <tr className="pv-resto">
              <td />
              <td className="pv-esq" colSpan={2}>
                Indecisos
              </td>
              <td>{int(naoSabe)}</td>
              <td>{fpct(pct(naoSabe, total))}</td>
              <td className="pv-forte">{fpct(pct(naoSabePond, totalPond))}</td>
              <td />
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}

function TabelaMarginal({
  titulo,
  amostra,
  alvo,
  rotulo,
}: {
  titulo: string
  amostra: Record<string, number>
  alvo: Record<string, number>
  rotulo?: (k: string) => string
}) {
  const chaves = Object.keys({ ...alvo, ...amostra }).filter(
    (k) => (amostra[k] ?? 0) > 0 || (alvo[k] ?? 0) > 0,
  )
  const nAmostra = chaves.reduce((s, k) => s + (amostra[k] ?? 0), 0)
  const nAlvo = chaves.reduce((s, k) => s + (alvo[k] ?? 0), 0)
  chaves.sort((a, b) => (alvo[b] ?? 0) - (alvo[a] ?? 0))
  return (
    <div className="pv-rolagem">
      <table>
        <thead>
          <tr>
            <th className="pv-esq">{titulo}</th>
            <th>Respondentes</th>
            <th>% amostra</th>
            <th>% eleitorado TSE</th>
            <th>Peso médio</th>
          </tr>
        </thead>
        <tbody>
          {chaves.map((k) => {
            const a = amostra[k] ?? 0
            const t = alvo[k] ?? 0
            return (
              <tr key={k}>
                <td className="pv-esq">{rotulo ? rotulo(k) : k}</td>
                <td>{int(a)}</td>
                <td>{fpct(pct(a, nAmostra))}</td>
                <td>{fpct(pct(t, nAlvo))}</td>
                <td className="pv-forte">{a > 0 ? dec(t / a, 2) : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default async function PreviaVerPage() {
  const sessao = await sessaoDePrevia()
  if (!sessao) {
    return (
      <Aviso
        titulo="Acesso encerrado"
        texto="Esta prévia só abre no navegador que consumiu o link de uso único, dentro do prazo da sessão. Se precisar ver de novo, peça outro link à CDL Aracaju."
      />
    )
  }

  const db = supabaseAdmin()
  const [r, { data: edicao }] = await Promise.all([
    carregarResultados({ ignorarDivulgacao: true }),
    db
      .from('edicao')
      .select('id, nome, registro_tre, ponderacao_execucao_id, ponderacao_aprovada_em, ponderacao_aprovada_por')
      .eq('ativa', true)
      .maybeSingle<{
        id: string
        nome: string
        registro_tre: string | null
        ponderacao_execucao_id: string | null
        ponderacao_aprovada_em: string | null
        ponderacao_aprovada_por: string | null
      }>(),
  ])
  if (r.status !== 'ok' || !edicao || edicao.id !== sessao.edicao_id) {
    return (
      <Aviso
        titulo="Prévia indisponível"
        texto="A edição deste link não é mais a edição ativa. Peça um novo link à CDL Aracaju."
      />
    )
  }

  const [{ data: exec }, { data: municipios }] = await Promise.all([
    edicao.ponderacao_execucao_id
      ? db
          .from('ponderacao_execucao')
          .select(
            'id, executado_em, executado_por, respondentes_total, respondentes_se, respondentes_fora_se, iteracoes, desvio_max, convergiu, n_eff, deff, peso_min, peso_mediana, peso_p95, peso_p99, peso_max, margem_nominal, margem_efetiva, alvos, amostra',
          )
          .eq('id', edicao.ponderacao_execucao_id)
          .maybeSingle<Execucao>()
      : Promise.resolve({ data: null as Execucao | null }),
    db
      .from('v_cobertura_municipio')
      .select('ibge_codigo, nome')
      .eq('edicao_id', edicao.id)
      .order('ibge_codigo')
      .limit(200),
  ])

  await Promise.all([
    contarVisualizacao(sessao),
    registrarAcessoAdmin(
      'previa_link_visualizada',
      { destinatario: sessao.destinatario, edicao_id: edicao.id, execucao_id: exec?.id ?? null },
      `previa_link:${sessao.id}`,
    ),
  ])

  const nomeMunicipio = new Map(
    (municipios ?? []).map((m) => [String(m.ibge_codigo), String(m.nome)] as const),
  )
  const { pesquisa } = r
  const agora = dataHora(new Date().toISOString())
  const marca = `CONFIDENCIAL · ${sessao.destinatario} · ${agora} · ${sessao.ip ?? 'ip n/d'}`

  return (
    <>
      <div className="pv-marca" aria-hidden="true">
        {Array.from({ length: 80 }, (_, i) => (
          <span key={i}>{marca}</span>
        ))}
      </div>
      <main className="pv">
        <header className="pv-topo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/cdl-pesquisas-logo.png" alt="CDL Pesquisas" />
          <div>
            <p className="pv-rotulo">Prévia reservada · resultado ponderado</p>
            <h1>{edicao.nome}</h1>
            <p className="pv-sub">
              Registro PesqEle {edicao.registro_tre ?? '—'} · acesso de{' '}
              <strong>{sessao.destinatario}</strong> · sessão até{' '}
              {sessao.sessao_expira_em ? dataHora(sessao.sessao_expira_em) : '—'}
            </p>
          </div>
        </header>

        <p className="pv-sigilo">
          Conteúdo sigiloso até a divulgação oficial (a partir de 24/09/2026, data de divulgação registrada no PesqEle; Res. TSE 23.747/2026).
          Esta página só abre neste navegador, leva o seu nome e cada acesso fica registrado. Não
          fotografe nem repasse.
        </p>

        <section className="pv-cargo">
          <h2>Execução da ponderação</h2>
          {exec ? (
            <>
              <p className="pv-sub">
                Raking município × sexo × faixa etária × instrução nas marginais do eleitorado TSE ·
                execução {exec.id.slice(0, 8)} de {dataHora(exec.executado_em)}
                {exec.executado_por ? ` · por ${exec.executado_por}` : ''} ·{' '}
                {edicao.ponderacao_aprovada_em
                  ? `aprovada por ${edicao.ponderacao_aprovada_por ?? '—'} em ${dataHora(edicao.ponderacao_aprovada_em)}`
                  : 'AGUARDANDO APROVAÇÃO DO ESTATÍSTICO'}
              </p>
              <dl className="pv-ficha">
                <div><dt>Respondentes (total)</dt><dd>{int(exec.respondentes_total)}</dd></div>
                <div><dt>Com domicílio eleitoral em SE</dt><dd>{int(exec.respondentes_se)}</dd></div>
                <div><dt>Fora de SE (peso 0)</dt><dd>{int(exec.respondentes_fora_se)}</dd></div>
                <div><dt>Amostra efetiva (Kish)</dt><dd>{exec.n_eff == null ? '—' : int(Number(exec.n_eff))}</dd></div>
                <div><dt>Efeito de desenho</dt><dd>{dec(exec.deff)}</dd></div>
                <div><dt>Margem nominal</dt><dd>{pp(exec.margem_nominal)}</dd></div>
                <div><dt>Margem efetiva</dt><dd>{pp(exec.margem_efetiva)}</dd></div>
                <div><dt>Convergência</dt><dd>{exec.convergiu ? 'sim' : 'NÃO'} · {exec.iteracoes ?? '—'} iterações</dd></div>
                <div><dt>Desvio máximo</dt><dd>{exec.desvio_max == null ? '—' : Number(exec.desvio_max).toExponential(1)}</dd></div>
                <div><dt>Peso mín. / mediana</dt><dd>{dec(exec.peso_min, 3)} / {dec(exec.peso_mediana)}</dd></div>
                <div><dt>Peso p95 / p99</dt><dd>{dec(exec.peso_p95)} / {dec(exec.peso_p99)}</dd></div>
                <div><dt>Peso máximo</dt><dd>{dec(exec.peso_max)}</dd></div>
              </dl>
              {exec.alvos && exec.amostra && (
                <>
                  {DIMENSOES.map(([k, t]) =>
                    exec.alvos?.[k] && exec.amostra?.[k] ? (
                      <TabelaMarginal key={k} titulo={t} amostra={exec.amostra[k]} alvo={exec.alvos[k]} />
                    ) : null,
                  )}
                  {exec.alvos.municipio && exec.amostra.municipio && (
                    <details>
                      <summary>Município (75) — amostra × eleitorado</summary>
                      <TabelaMarginal
                        titulo="Município"
                        amostra={exec.amostra.municipio}
                        alvo={exec.alvos.municipio}
                        rotulo={(k) => nomeMunicipio.get(k) ?? k}
                      />
                    </details>
                  )}
                </>
              )}
            </>
          ) : (
            <p className="pv-sub">Edição sem execução de raking apontada.</p>
          )}
        </section>

        {CARGOS.map(([k, titulo]) => {
          const cargo = pesquisa[k]
          return cargo ? <TabelaCargo key={k} titulo={titulo} cargo={cargo} /> : null
        })}

        <footer className="pv-rodape">
          CDL Aracaju · CNPJ 13.045.935/0001-36 · números lidos das mesmas views do banco que
          alimentam a divulgação · gerado em {agora}
        </footer>
      </main>
    </>
  )
}
