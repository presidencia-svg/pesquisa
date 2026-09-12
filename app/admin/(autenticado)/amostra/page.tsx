/**
 * Amostra × eleitorado (interno).
 *
 * Compara as marginais da amostra validada (WhatsApp confirmado) com as
 * marginais do eleitorado do TSE (parâmetro oficial importado por
 * scripts/importar-eleitorado-tse.mjs) nas quatro dimensões do plano amostral
 * registrado no PesqEle: município, sexo, faixa etária e grau de instrução.
 *
 * É o painel que teria denunciado, ainda durante a coleta, o desequilíbrio
 * que virou a Rp 0601015-42: a razão amostra/eleitorado por categoria mostra
 * onde o raking terá de puxar peso (razão < 1 → peso maior) e a execução
 * vigente de ponderação mostra o custo disso (n efetivo, deff, margem efetiva).
 *
 * Só agregados: nenhuma coluna pessoal é lida (views v_amostra_marginais e
 * v_eleitorado_marginais). Acesso fica no log de auditoria (LGPD art. 37).
 */
import Link from 'next/link'

import { registrarAcessoAdmin } from '@/lib/admin-audit'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const metadata = { title: 'Amostra × eleitorado · Admin' }
export const dynamic = 'force-dynamic'

type Dimensao = 'sexo' | 'faixa' | 'escolaridade' | 'municipio'

type Marginal = { dimensao: Dimensao; categoria: string; respondentes?: number; eleitores?: number }

type Execucao = {
  id: string
  executado_em: string
  executado_por: string | null
  importacao_id: string
  iteracoes: number | null
  convergiu: boolean | null
  n_peso_positivo: number | null
  n_eff: number | string | null
  deff: number | string | null
  peso_min: number | string | null
  peso_mediana: number | string | null
  peso_p95: number | string | null
  peso_p99: number | string | null
  peso_max: number | string | null
  margem_nominal: number | string | null
  margem_efetiva: number | string | null
}

const DIMENSOES: Array<{ key: Dimensao; label: string; ordem?: string[] }> = [
  { key: 'sexo', label: 'Sexo', ordem: ['M', 'F', 'NI'] },
  { key: 'faixa', label: 'Faixa etária', ordem: ['16-17', '18-24', '25-34', '35-44', '45-59', '60+', 'NI'] },
  { key: 'escolaridade', label: 'Grau de instrução', ordem: ['fundamental', 'medio', 'superior', 'NI'] },
  { key: 'municipio', label: 'Município' },
]

const ROTULO: Record<string, string> = {
  M: 'Masculino',
  F: 'Feminino',
  NI: 'Não informado',
  fundamental: 'Fundamental (até fund. completo)',
  medio: 'Médio',
  superior: 'Superior',
}

const nf = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
const pf = (n: number, d = 1) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })
const num = (x: number | string | null, d = 2) =>
  x == null ? '—' : Number(x).toLocaleString('pt-BR', { maximumFractionDigits: d })
const pp = (x: number | string | null) => (x == null ? '—' : `±${(Number(x) * 100).toFixed(2)} p.p.`)
const dt = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Recife', dateStyle: 'short', timeStyle: 'short' })

// Razão amostra/eleitorado por categoria. 1,00 = proporcional; <0,5 ou >2 é
// onde o raking gera pesos extremos. Cor sinaliza a gravidade.
function corRazao(r: number | null) {
  if (r == null) return 'text-muted-foreground'
  if (r < 0.5 || r > 2) return 'text-error font-semibold'
  if (r < 0.75 || r > 1.33) return 'text-amber-700 font-medium'
  return 'text-foreground'
}

export default async function AmostraPage() {
  await requireAdmin()
  const db = supabaseAdmin()

  const { data: edicao } = await db
    .from('edicao')
    .select('id, nome, ponderacao_metodo, ponderacao_execucao_id, inicio, fim, meta_amostra')
    .eq('ativa', true)
    .maybeSingle()

  if (!edicao) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">Amostra × eleitorado</h1>
        <p className="text-sm text-muted-foreground">Nenhuma edição ativa.</p>
      </div>
    )
  }

  const { data: importacao } = await db
    .from('eleitorado_tse_importacao')
    .select('id, arquivo, geracao, ano, total_se, total_mapeado, importado_em, importado_por')
    .order('importado_em', { ascending: false })
    .limit(1)
    .maybeSingle()

  const [amostraRes, eleitoradoRes, execRes, munRes] = await Promise.all([
    db
      .from('v_amostra_marginais')
      .select('dimensao, categoria, respondentes')
      .eq('edicao_id', edicao.id)
      .limit(1000),
    importacao
      ? db
          .from('v_eleitorado_marginais')
          .select('dimensao, categoria, eleitores')
          .eq('importacao_id', importacao.id)
          .limit(1000)
      : Promise.resolve({ data: [] as Marginal[] }),
    edicao.ponderacao_execucao_id
      ? db
          .from('ponderacao_execucao')
          .select(
            'id, executado_em, executado_por, importacao_id, iteracoes, convergiu, n_peso_positivo, n_eff, deff, peso_min, peso_mediana, peso_p95, peso_p99, peso_max, margem_nominal, margem_efetiva',
          )
          .eq('id', edicao.ponderacao_execucao_id)
          .maybeSingle<Execucao>()
      : Promise.resolve({ data: null as Execucao | null }),
    db.from('municipios_se').select('ibge_codigo, nome').limit(1000),
  ])

  await registrarAcessoAdmin(
    'view_amostra',
    { edicao_id: edicao.id, importacao_id: importacao?.id ?? null },
    `edicao:${edicao.id}`,
  )

  const nomeMun = new Map<string, string>()
  for (const m of munRes.data ?? []) nomeMun.set(String(m.ibge_codigo), m.nome as string)

  const amostra = (amostraRes.data ?? []) as Marginal[]
  const eleitorado = (eleitoradoRes.data ?? []) as Marginal[]
  const exec = execRes.data

  // Total da amostra = soma da dimensão sexo (cada respondente aparece uma vez por dimensão).
  const totalAmostra = amostra.filter((m) => m.dimensao === 'sexo').reduce((s, m) => s + (m.respondentes ?? 0), 0)
  const totalEleitorado = eleitorado
    .filter((m) => m.dimensao === 'sexo')
    .reduce((s, m) => s + (m.eleitores ?? 0), 0)

  // Meta mínima de respondentes validados (migration 049) e ritmo da coleta.
  const meta = edicao.meta_amostra == null ? null : Number(edicao.meta_amostra)
  const { diasRestantes, ritmoAtual, faltamMeta, ritmoNecessario } = ritmoDaColeta(
    edicao.inicio,
    edicao.fim,
    totalAmostra,
    meta,
  )

  type Linha = {
    categoria: string
    rotulo: string
    respondentes: number
    pctAmostra: number
    eleitores: number | null
    pctEleitorado: number | null
    razao: number | null
    /** Quantos respondentes faltam nesta categoria pra ela ficar proporcional ao eleitorado no tamanho da meta. */
    faltamMeta: number | null
  }

  const tabelas = DIMENSOES.map((d) => {
    const am = new Map<string, number>()
    for (const m of amostra) if (m.dimensao === d.key) am.set(m.categoria, m.respondentes ?? 0)
    const el = new Map<string, number>()
    for (const m of eleitorado) if (m.dimensao === d.key) el.set(m.categoria, m.eleitores ?? 0)

    // Total da dimensão na amostra inclui "NI" (respondente sem a variável),
    // que o raking redistribui; a razão é calculada sobre respondentes válidos.
    const totalValidoAmostra = [...am.entries()].filter(([k]) => k !== 'NI').reduce((s, [, v]) => s + v, 0)
    const totalEl = [...el.values()].reduce((s, v) => s + v, 0)

    const cats = new Set<string>([...am.keys(), ...el.keys()])
    let linhas: Linha[] = [...cats].map((c) => {
      const r = am.get(c) ?? 0
      const e = el.has(c) ? el.get(c)! : null
      const pa = totalValidoAmostra > 0 && c !== 'NI' ? (r * 100) / totalValidoAmostra : 0
      const pe = e != null && totalEl > 0 ? (e * 100) / totalEl : null
      return {
        categoria: c,
        rotulo: d.key === 'municipio' ? (nomeMun.get(c) ?? c) : (ROTULO[c] ?? c),
        respondentes: r,
        pctAmostra: c === 'NI' ? (totalAmostra > 0 ? (r * 100) / totalAmostra : 0) : pa,
        eleitores: e,
        pctEleitorado: pe,
        razao: pe != null && pe > 0 && c !== 'NI' ? pa / pe : null,
        faltamMeta: meta != null && pe != null && c !== 'NI' ? Math.max(0, Math.round((meta * pe) / 100) - r) : null,
      }
    })
    if (d.ordem) {
      const idx = new Map(d.ordem.map((k, i) => [k, i]))
      linhas.sort((a, b) => (idx.get(a.categoria) ?? 99) - (idx.get(b.categoria) ?? 99))
    } else {
      linhas = linhas.sort((a, b) => (a.razao ?? 9) - (b.razao ?? 9))
    }
    const ni = am.get('NI') ?? 0
    const extremos = linhas.filter((l) => l.razao != null && (l.razao < 0.5 || l.razao > 2)).length
    return { ...d, linhas, ni, extremos }
  })

  const totalExtremos = tabelas.reduce((s, t) => s + t.extremos, 0)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Monitor da coleta</p>
        <h1 className="text-2xl font-semibold">Amostra × eleitorado</h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Edição <span className="font-medium text-foreground">{edicao.nome}</span>. Marginais da amostra validada
          contra o eleitorado do TSE nas quatro variáveis do plano amostral registrado (município, sexo, faixa
          etária, instrução). <strong>Razão</strong> = % na amostra ÷ % no eleitorado: 1,00 é proporcional; abaixo
          de 0,50 ou acima de 2,00 o raking produz pesos extremos e derruba o n efetivo. Use durante a coleta pra
          direcionar convites, não depois.
        </p>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          {
            l: 'Amostra validada',
            v: nf(totalAmostra),
            s:
              ritmoAtual != null
                ? `CPF + WhatsApp confirmados · ${nf(ritmoAtual)}/dia até agora`
                : 'CPF + WhatsApp confirmados',
          },
          {
            l: 'Meta mínima',
            v: meta == null ? '—' : `${pf(meta > 0 ? (totalAmostra * 100) / meta : 0, 0)}%`,
            s:
              meta == null
                ? 'defina em /admin/edicoes'
                : faltamMeta === 0
                  ? `${nf(meta)} atingida`
                  : ritmoNecessario === Infinity
                    ? `${nf(faltamMeta ?? 0)} faltam · coleta encerrada`
                    : `${nf(faltamMeta ?? 0)} faltam · precisa de ${nf(ritmoNecessario ?? 0)}/dia (${pf(diasRestantes, 1)} dias)`,
          },
          {
            l: 'Eleitorado TSE',
            v: importacao ? nf(totalEleitorado) : '—',
            s: importacao ? `${importacao.arquivo} · ${importacao.ano ?? ''}`.trim() : 'nenhuma importação',
          },
          {
            l: 'Categorias fora da faixa',
            v: nf(totalExtremos),
            s: 'razão < 0,50 ou > 2,00',
          },
          {
            l: 'Método vigente',
            v: edicao.ponderacao_metodo === 'estratos_raking' ? 'Estratos' : 'Município',
            s: edicao.ponderacao_metodo === 'estratos_raking' ? 'raking nas 4 marginais' : 'só município (045)',
          },
        ].map((c) => (
          <div key={c.l} className="rounded-md border border-border bg-background p-4 flex flex-col gap-1">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{c.l}</p>
            <p className="text-2xl font-bold tabular-nums">{c.v}</p>
            <p className="text-xs text-muted-foreground truncate">{c.s}</p>
          </div>
        ))}
      </section>

      {!importacao && (
        <p className="text-sm rounded-md border border-amber-300 bg-amber-50 text-amber-800 px-4 py-3">
          Nenhum eleitorado do TSE importado. Rode{' '}
          <span className="font-mono">node --env-file=.env.local scripts/importar-eleitorado-tse.mjs &lt;perfil_eleitor_secao_2026_SE.zip&gt;</span>{' '}
          pra ter o parâmetro oficial das quatro marginais.
        </p>
      )}

      <section className="rounded-md border border-border bg-background p-4 flex flex-col gap-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Execução de ponderação vigente</p>
        {exec ? (
          <>
            <p className="text-sm">
              <span className="font-mono">{exec.id.slice(0, 8)}</span> · {dt(exec.executado_em)}
              {exec.executado_por ? ` · ${exec.executado_por}` : ''} ·{' '}
              {exec.convergiu ? (
                <span className="text-accent font-medium">convergiu</span>
              ) : (
                <span className="text-error font-medium">não convergiu</span>
              )}{' '}
              em {exec.iteracoes ?? '—'} iterações
              {new Date(exec.executado_em) < new Date(edicao.fim) && (
                <span className="text-error font-medium"> · executada antes do fim da coleta</span>
              )}
              {importacao && exec.importacao_id !== importacao.id && (
                <span className="text-amber-700 font-medium"> · usa importação diferente da mais recente</span>
              )}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-xs">
              {[
                ['n com peso', num(exec.n_peso_positivo, 0)],
                ['n efetivo (Kish)', num(exec.n_eff, 0)],
                ['deff', num(exec.deff, 2)],
                ['peso mín', num(exec.peso_min, 3)],
                ['peso mediana', num(exec.peso_mediana, 3)],
                ['peso p99', num(exec.peso_p99, 2)],
                ['peso máx', num(exec.peso_max, 2)],
                ['margem efetiva', pp(exec.margem_efetiva)],
              ].map(([l, v]) => (
                <div key={l} className="rounded border border-border px-2 py-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</p>
                  <p className="font-semibold tabular-nums">{v}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Margem nominal {pp(exec.margem_nominal)} (n bruto). A margem efetiva é a que vai na ficha técnica
              pública: 1,96·√(0,25/n_eff).
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhuma execução apontada pela edição. Depois do fim da coleta:{' '}
            <span className="font-mono">node --env-file=.env.local scripts/ponderar-estratos.mjs --por &quot;Nome&quot;</span>.
          </p>
        )}
      </section>

      {tabelas.map((t) => (
        <section key={t.key} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-semibold">{t.label}</h2>
            <p className="text-xs text-muted-foreground">
              {t.ni > 0 && (
                <>
                  <strong>{nf(t.ni)}</strong> sem a variável (
                  {pf(totalAmostra > 0 ? (t.ni * 100) / totalAmostra : 0)}% da amostra) ·{' '}
                </>
              )}
              {t.extremos > 0 ? (
                <span className="text-error font-medium">{t.extremos} categoria(s) fora da faixa</span>
              ) : (
                <span className="text-accent">nenhuma categoria fora da faixa</span>
              )}
            </p>
          </div>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Categoria</th>
                  <th className="text-right px-3 py-2">Amostra</th>
                  <th className="text-right px-3 py-2">% amostra</th>
                  <th className="text-right px-3 py-2">Eleitorado</th>
                  <th className="text-right px-3 py-2">% eleitorado</th>
                  <th className="text-right px-3 py-2">Razão</th>
                  <th className="text-right px-3 py-2">Peso implícito</th>
                  {meta != null && <th className="text-right px-3 py-2">Faltam p/ meta</th>}
                </tr>
              </thead>
              <tbody>
                {t.linhas.map((l) => (
                  <tr key={l.categoria} className="border-t border-border/60">
                    <td className="px-3 py-1.5">
                      {l.rotulo}
                      {t.key === 'municipio' && (
                        <span className="text-muted-foreground font-mono ml-2">{l.categoria}</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{nf(l.respondentes)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{pf(l.pctAmostra)}%</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {l.eleitores == null ? '—' : nf(l.eleitores)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {l.pctEleitorado == null ? '—' : `${pf(l.pctEleitorado)}%`}
                    </td>
                    <td className={`px-3 py-1.5 text-right tabular-nums ${corRazao(l.razao)}`}>
                      {l.razao == null ? '—' : pf(l.razao, 2)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                      {l.razao == null || l.razao === 0 ? '—' : `${pf(1 / l.razao, 2)}×`}
                    </td>
                    {meta != null && (
                      <td
                        className={`px-3 py-1.5 text-right tabular-nums ${
                          l.faltamMeta != null && l.faltamMeta > 0 ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {l.faltamMeta == null ? '—' : l.faltamMeta === 0 ? 'ok' : nf(l.faltamMeta)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <p className="text-xs text-muted-foreground">
        Categoria &quot;Não informado&quot; não entra na razão: o raking redistribui esses respondentes pelas demais
        dimensões (o peso da célula usa só as variáveis conhecidas). Peso implícito = 1 ÷ razão, aproximação do
        que a pós-estratificação marginal faria antes do ajuste conjunto.
        {meta != null && (
          <>
            {' '}
            &quot;Faltam p/ meta&quot; = respondentes que a categoria ainda precisa pra ficar proporcional ao eleitorado
            numa amostra do tamanho da meta ({nf(meta)}); é o número pra dirigir convites, não uma cota.
          </>
        )}{' '}
        Cobertura por município com eleitorado
        2024:{' '}
        <Link href="/admin/resultados/municipios" className="underline">
          /admin/resultados/municipios
        </Link>
        .
      </p>
    </div>
  )
}

/** Ritmo da coleta em relação à meta (fora do componente: o relógio é lido por request, não no render). */
function ritmoDaColeta(inicio: string, fim: string, total: number, meta: number | null) {
  const agora = Date.now()
  const inicioMs = new Date(inicio).getTime()
  const fimMs = new Date(fim).getTime()
  const diasRestantes = Math.max(0, (fimMs - agora) / 86_400_000)
  const diasDecorridos = Math.max(0, (Math.min(agora, fimMs) - inicioMs) / 86_400_000)
  const ritmoAtual = diasDecorridos > 0 ? total / diasDecorridos : null
  const faltamMeta = meta == null ? null : Math.max(0, meta - total)
  const ritmoNecessario =
    faltamMeta == null ? null : diasRestantes > 0 ? faltamMeta / diasRestantes : faltamMeta > 0 ? Infinity : 0
  return { diasRestantes, ritmoAtual, faltamMeta, ritmoNecessario }
}
