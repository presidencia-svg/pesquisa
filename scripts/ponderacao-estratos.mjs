#!/usr/bin/env node
/**
 * Ponderação completa — município × sexo × faixa etária × grau de instrução —
 * prometida no plano amostral registrado (PesqEle, campo 2). Rp 0601015-42.
 *
 * Sobre a edição ativa, e SÓ com agregados (nenhuma coluna pessoal é
 * selecionada; token_hash é hash opaco usado pra contar respondentes),
 * calcula quatro conjuntos de pesos e os resultados por cargo sob cada um:
 *   A  — pós-estratificação por município (a publicada; reproduz v_peso_municipio)
 *   B  — pós-estratificação literal por célula município × sexo × faixa × instrução
 *   B5 — B com pesos aparados em 5× a média (análise de sensibilidade)
 *   C  — raking (IPF) nas marginais município, sexo, faixa etária e instrução
 *   D  — C com aparo dos pesos extremos (teto CAP_D × média) e reajuste às marginais,
 *        iterado até o maior peso caber no teto (termina em raking: marginais exatas);
 *        grade de tetos (GRADE_D). Análise de sensibilidade — não recomendada (seção 10).
 *        Variável CAP_D no ambiente.
 * Parâmetro oficial: TSE, dados abertos, "Perfil do eleitorado por seção eleitoral" (SE).
 *
 * Uso: node --env-file=.env.local scripts/ponderacao-estratos.mjs [perfil_eleitor_secao_2026_SE.zip|.csv]
 *      Sem o arquivo do TSE calcula só o método A e imprime as marginais da amostra.
 * Saída: docs/juridico/rp-0601015-42/ponderacao-completa.md (+ .json)
 *
 * Edição: `--edicao <uuid>` (ou env EDICAO_ID); sem isso, usa a ativa. Desde
 * 12/09/2026 a ativa é a 2ª edição — pra regerar material da Rp use --edicao
 * 2c9211d1-6fd2-476d-8872-5952c12db5e9 (1ª edição).
 */
import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { basename, join } from 'node:path'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) throw new Error('faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (rode com --env-file=.env.local)')
const db = createClient(URL, KEY, { auth: { persistSession: false } })

const OUT_DIR = process.env.SAIDA_DIR ?? 'docs/juridico/rp-0601015-42'
const PUBLICADO = 'docs/juridico/rp-0601015-42/anexo-tecnico-numeros.json'
const ARQ_TSE = process.argv[2] ?? null
const PAGE = 1000
const TZ = 'America/Recife'
const CAP_B5 = 5
const CAP_D = Number(process.env.CAP_D ?? 10)
const GRADE_D = [5, 6, 8, 10, 12, 15, 20]
const FAIXAS = ['16-17', '18-24', '25-34', '35-44', '45-59', '60+']
const ESCOL = ['fundamental', 'medio', 'superior']
const ROT = {
  M: 'Masculino', F: 'Feminino', NI: 'Não informado', fundamental: 'Fundamental', medio: 'Médio', superior: 'Superior',
}
const CARGOS = [
  ['presidente', 'Presidente da República'],
  ['governador', 'Governador'],
  ['senador', 'Senador (até duas opções por respondente)'],
  ['federal', 'Deputado Federal'],
  ['estadual', 'Deputado Estadual'],
]
const METODOS = ['A', 'B', 'B5', 'C', 'D']
const METODOS_GRADE = GRADE_D.map((c) => 'D' + c)
const TODOS = [...METODOS, ...METODOS_GRADE]

// ------------------------------------------------------------------ utils
async function all(table, select, { eq = {}, order = 'id' } = {}) {
  const rows = []
  for (let from = 0; ; from += PAGE) {
    let q = db.from(table).select(select).order(order, { ascending: true }).range(from, from + PAGE - 1)
    for (const [k, v] of Object.entries(eq)) q = q.eq(k, v)
    const { data, error } = await q
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE) break
  }
  return rows
}
const soma = (arr, f = (x) => x) => arr.reduce((a, x) => a + f(x), 0)
const inc = (m, k, v = 1) => m.set(k, (m.get(k) ?? 0) + v)
const fmtInt = (n) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 0 })
const fmtNum = (n, d = 2) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })
const fmtPct = (x, d = 2) => fmtNum(100 * x, d) + '%'
const fmtPP = (x, d = 2) => (x >= 0 ? '+' : '−') + fmtNum(Math.abs(100 * x), d)
const agora = new Date()
const dataHoraBRT = agora.toLocaleString('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
function tab(headers, rows, aligns) {
  const a = aligns ?? headers.map((_, i) => (i === 0 ? 'l' : 'r'))
  const sep = a.map((x) => (x === 'r' ? '---:' : x === 'c' ? ':---:' : '---'))
  return ['| ' + headers.join(' | ') + ' |', '| ' + sep.join(' | ') + ' |', ...rows.map((r) => '| ' + r.join(' | ') + ' |')].join('\n')
}
function quant(sorted, q) {
  if (!sorted.length) return 0
  const i = (sorted.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo)
}
function kish(ws, nBase) {
  const w = ws.filter((x) => x > 0).sort((a, b) => a - b)
  const sw = soma(w), sw2 = soma(w, (x) => x * x), nEff = (sw * sw) / sw2, media = sw / w.length
  return {
    n_peso_positivo: w.length, soma_w: sw, soma_w2: sw2, n_eff: nEff, deff: nBase / nEff,
    margem_n: 1.96 * Math.sqrt(0.25 / nBase), margem_n_eff: 1.96 * Math.sqrt(0.25 / nEff),
    min: w[0], p1: quant(w, 0.01), p5: quant(w, 0.05), p25: quant(w, 0.25), mediana: quant(w, 0.5), p75: quant(w, 0.75), p95: quant(w, 0.95), p99: quant(w, 0.99), max: w[w.length - 1],
    cv: Math.sqrt(Math.max(0, sw2 / w.length - media * media)) / media,
  }
}
const normNome = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\b(DE|DO|DA|DOS|DAS)\b/g, '').replace(/[^A-Z0-9]/g, '')
const ALIAS_MUN = { GRACHOCARDOSO: 'GRACCHOCARDOSO' }

// ------------------------------------------------------------ arquivo TSE
function mapFaixa(ds) {
  const s = ds.toUpperCase()
  if (/INV[ÁA]LID/.test(s)) return null
  const m = s.match(/(\d+)/)
  if (!m) return null
  const a = Number(m[1])
  if (a < 16) return null
  if (a <= 17) return '16-17'
  if (a <= 24) return '18-24'
  if (a <= 34) return '25-34'
  if (a <= 44) return '35-44'
  if (a <= 59) return '45-59'
  return '60+'
}
function mapEsc(ds) {
  const s = ds.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  if (/NAO INFORMADO/.test(s)) return null
  if (/SUPERIOR/.test(s)) return 'superior'
  if (/MEDIO/.test(s)) return 'medio'
  if (/FUNDAMENTAL|ANALFABETO|LE E ESCREVE/.test(s)) return 'fundamental'
  return null
}
function mapSexo(ds) {
  const s = ds.toUpperCase()
  if (s.startsWith('MASC')) return 'M'
  if (s.startsWith('FEM')) return 'F'
  return null
}
function lerTse(caminho, municipios) {
  let buf
  if (/\.zip$/i.test(caminho)) {
    const lista = execFileSync('unzip', ['-Z1', caminho], { encoding: 'utf8' }).split('\n').filter(Boolean)
    const csv = lista.find((f) => /\.csv$/i.test(f))
    if (!csv) throw new Error('zip sem .csv: ' + lista.join(', '))
    buf = execFileSync('unzip', ['-p', caminho, csv], { maxBuffer: 1 << 30 })
  } else buf = readFileSync(caminho)
  const texto = new TextDecoder('latin1').decode(buf)
  const linhas = texto.split(/\r?\n/).filter((l) => l.length)
  const parse = (l) => l.split(';').map((c) => c.replace(/^"|"$/g, '').trim())
  const cab = parse(linhas[0])
  // Aceita os dois leiautes do TSE: até 2024 (QT_ELEITORES_PERFIL, ANO_ELEICAO)
  // e 2026 (QT_ELEITORES, AA_ELEICAO).
  const idx = (...nomes) => {
    const i = nomes.map((n) => cab.indexOf(n)).find((k) => k >= 0)
    if (i == null) throw new Error(`coluna ausente no arquivo do TSE: ${nomes.join('/')} (cabeçalho: ${cab.join(',')})`)
    return i
  }
  const iUF = idx('SG_UF'), iMun = idx('NM_MUNICIPIO'), iCod = idx('CD_MUNICIPIO'), iGen = idx('DS_GENERO'), iFx = idx('DS_FAIXA_ETARIA'), iEsc = idx('DS_GRAU_ESCOLARIDADE'), iQt = idx('QT_ELEITORES_PERFIL', 'QT_ELEITORES')
  const iGer = cab.indexOf('DT_GERACAO'), iAno = Math.max(cab.indexOf('ANO_ELEICAO'), cab.indexOf('AA_ELEICAO'))
  const ibgeByNorm = new Map(municipios.map((m) => [normNome(m.nome), m.ibge_codigo]))
  const pop4 = new Map(), pop3 = new Map(), popMunTotal = new Map(), popMun = new Map()
  const cat = { genero: new Map(), faixa: new Map(), escolaridade: new Map() }
  const excl = { genero: 0, faixa: 0, escolaridade: 0 }
  const naoMapeados = new Map(), codTse = new Map()
  let total = 0, mapeado = 0, ufOutra = 0, geracao = null, ano = null
  for (let i = 1; i < linhas.length; i++) {
    const c = parse(linhas[i])
    if (c.length < cab.length) continue
    if (c[iUF] !== 'SE') { ufOutra += Number(c[iQt]); continue }
    if (geracao == null && iGer >= 0) geracao = c[iGer]
    if (ano == null && iAno >= 0) ano = c[iAno]
    const qt = Number(c[iQt])
    total += qt
    let n = normNome(c[iMun]); n = ALIAS_MUN[n] ?? n
    const ibge = ibgeByNorm.get(n)
    if (!ibge) { inc(naoMapeados, c[iMun], qt); continue }
    codTse.set(ibge, c[iCod])
    inc(popMunTotal, ibge, qt)
    const sexo = mapSexo(c[iGen]), fx = mapFaixa(c[iFx]), esc = mapEsc(c[iEsc])
    inc(cat.genero, `${c[iGen]} → ${sexo ?? '(excluído)'}`, qt)
    inc(cat.faixa, `${c[iFx]} → ${fx ?? '(excluído)'}`, qt)
    inc(cat.escolaridade, `${c[iEsc]} → ${esc ?? '(excluído)'}`, qt)
    if (!sexo) excl.genero += qt
    if (!fx) excl.faixa += qt
    if (!esc) excl.escolaridade += qt
    if (!sexo || !fx || !esc) continue
    mapeado += qt
    inc(popMun, ibge, qt)
    inc(pop3, `${ibge}|${fx}|${esc}`, qt)
    inc(pop4, `${ibge}|${fx}|${esc}|${sexo}`, qt)
  }
  const faltam = municipios.filter((m) => !popMunTotal.has(m.ibge_codigo)).map((m) => m.nome)
  if (naoMapeados.size || faltam.length) {
    throw new Error(`municípios do TSE sem correspondência: ${[...naoMapeados.keys()].join(', ') || '—'} · municípios do cadastro sem linha no TSE: ${faltam.join(', ') || '—'}`)
  }
  return { arquivo: basename(caminho), geracao, ano, total, mapeado, ufOutra, excl, cat, pop4, pop3, popMun, popMunTotal, codTse, linhas: linhas.length - 1 }
}

// ------------------------------------------------------------------ dados
const EDICAO_ARG = process.argv.includes('--edicao') ? process.argv[process.argv.indexOf('--edicao') + 1] : (process.env.EDICAO_ID || null)
const qEd = db.from('edicao').select('id, nome')
const { data: edicao, error: eEd } = EDICAO_ARG ? await qEd.eq('id', EDICAO_ARG).maybeSingle() : await qEd.eq('ativa', true).maybeSingle()
if (eEd || !edicao) throw new Error('edição não encontrada: ' + (EDICAO_ARG ?? 'ativa') + ' ' + (eEd?.message ?? ''))
const eid = edicao.id
console.log('edição:', edicao.nome)
const municipios = await all('municipios_se', 'ibge_codigo, nome, eleitorado', { order: 'ibge_codigo' })
const candidatos = await all('candidatos_pesquisa', 'id, cargo, numero, nome_urna, partido_id, coligacao', { eq: { edicao_id: eid } })
const partidos = await all('partidos', 'id, numero, sigla, nome')
console.log('baixando votos (token_hash/cargo/metodo/candidato/partido/município/sexo/faixa/instrução — sem colunas pessoais)…')
const votos = await all('votos_pesquisa', 'id, token_hash, cargo, metodo, candidato_id, partido_id, municipio_ibge, sexo, faixa_etaria, escolaridade', { eq: { edicao_id: eid } })
console.log(`votos ${votos.length}`)

const seSet = new Set(municipios.map((m) => m.ibge_codigo))
const munBy = new Map(municipios.map((m) => [m.ibge_codigo, m]))
const resp = new Map()
for (const v of votos) {
  let r = resp.get(v.token_hash)
  if (!r) { r = { mun: null, sexo: null, fx: null, esc: null }; resp.set(v.token_hash, r) }
  if (v.municipio_ibge != null) r.mun = v.municipio_ibge
  if (v.sexo) r.sexo = v.sexo
  if (v.faixa_etaria) r.fx = v.faixa_etaria
  if (v.escolaridade) r.esc = v.escolaridade
}
const emSE = (r) => r.mun != null && seSet.has(r.mun)
const respSE = new Map([...resp].filter(([, r]) => emSE(r)))
const N = respSE.size
const respFora = [...resp.values()].filter((r) => r.mun != null && !seSet.has(r.mun)).length
const respSemMun = [...resp.values()].filter((r) => r.mun == null).length
const incompletos = [...respSE.values()].filter((r) => !r.fx || !r.esc).length
if (incompletos) throw new Error(`${incompletos} respondentes de SE sem faixa etária ou instrução — regra não prevista`)
console.log(`respondentes ${resp.size} · em SE ${N} · fora de SE ${respFora} · sem município ${respSemMun}`)

// --------------------------------------------------- marginais da amostra
const amostra = {
  sexo: new Map(), faixa: new Map(), escolaridade: new Map(), municipio: new Map(),
}
for (const r of respSE.values()) {
  inc(amostra.sexo, r.sexo ?? 'NI'); inc(amostra.faixa, r.fx); inc(amostra.escolaridade, r.esc); inc(amostra.municipio, r.mun)
}
const k3 = (r) => `${r.mun}|${r.fx}|${r.esc}`
const n3 = new Map(), n4 = new Map()
for (const r of respSE.values()) { inc(n3, k3(r)); inc(n4, k3(r) + '|' + (r.sexo ?? 'NI')) }

// ----------------------------------------------------------- método A
// Reproduz v_peso_municipio: n_total = respondentes com município não nulo (inclui os de fora
// de SE, que recebem peso 0); e_total = eleitorado (cadastro municipios_se) dos municípios com resposta.
const nMun = new Map(); let nComMun = 0
for (const r of resp.values()) if (r.mun != null) { nComMun++; inc(nMun, r.mun) }
const munComResp = municipios.filter((m) => (nMun.get(m.ibge_codigo) ?? 0) > 0)
const eComResp = soma(munComResp, (m) => m.eleitorado)
const pesoMunA = new Map(munComResp.map((m) => [m.ibge_codigo, (m.eleitorado / eComResp) / (nMun.get(m.ibge_codigo) / nComMun)]))
const wA = new Map([...resp].map(([t, r]) => [t, emSE(r) ? pesoMunA.get(r.mun) : 0]))

// ----------------------------------------------------------- métodos B/B5/C
let tse = null, wB = null, wB5 = null, wC = null, wD = null, diagB = null, diagC = null, diagD = null, munCmp = null
const wGrade = {}
let alvosRaking = null
if (ARQ_TSE) {
  if (!existsSync(ARQ_TSE)) throw new Error('arquivo do TSE não encontrado: ' + ARQ_TSE)
  tse = lerTse(ARQ_TSE, municipios)
  console.log(`TSE: ${tse.arquivo} · geração ${tse.geracao} · ano ${tse.ano} · ${fmtInt(tse.linhas)} linhas · eleitores SE ${fmtInt(tse.total)} · mapeados ${fmtInt(tse.mapeado)}`)
  const P = tse.mapeado

  // B — célula literal. Sexo ausente: recebe o peso da célula município × faixa × instrução;
  // entre os que informaram, M/F ajustados à proporção do eleitorado da célula (quando ambos
  // os sexos têm respondentes na célula; senão, sem ajuste de sexo).
  let pCob = 0
  for (const [k, p] of tse.pop3) if (n3.has(k)) pCob += p
  const semAjusteSexo = new Set(); let respSemPop = 0
  wB = new Map()
  for (const [t, r] of resp) {
    if (!emSE(r)) { wB.set(t, 0); continue }
    const k = k3(r), P3 = tse.pop3.get(k) ?? 0
    if (!P3) { wB.set(t, 0); respSemPop++; continue }
    const w3 = (P3 / pCob) / (n3.get(k) / N)
    const nM = n4.get(k + '|M') ?? 0, nF = n4.get(k + '|F') ?? 0
    if (r.sexo && nM > 0 && nF > 0) {
      const Ps = tse.pop4.get(k + '|' + r.sexo) ?? 0
      wB.set(t, w3 * (Ps / P3) / ((r.sexo === 'M' ? nM : nF) / (nM + nF)))
    } else {
      wB.set(t, w3)
      if (r.sexo) semAjusteSexo.add(k)
    }
  }
  const cel4Pop = [...tse.pop4.keys()].filter((k) => tse.pop4.get(k) > 0)
  const cel4Am = [...n4.keys()].filter((k) => !k.endsWith('|NI'))
  const cel4AmSet = new Set(cel4Am)
  const popSemResp4 = soma(cel4Pop.filter((k) => !cel4AmSet.has(k)), (k) => tse.pop4.get(k))
  const cel3Pop = [...tse.pop3.keys()]
  diagB = {
    celulas_4dim_eleitorado: cel4Pop.length, celulas_4dim_amostra_com_sexo: cel4Am.length,
    celulas_4dim_amostra_n_lt5: cel4Am.filter((k) => n4.get(k) < 5).length, celulas_4dim_amostra_n_lt30: cel4Am.filter((k) => n4.get(k) < 30).length, celulas_4dim_amostra_n_ge30: cel4Am.filter((k) => n4.get(k) >= 30).length,
    eleitorado_em_celulas_4dim_sem_respondente: popSemResp4, eleitorado_em_celulas_4dim_sem_respondente_pct: popSemResp4 / P,
    celulas_3dim_eleitorado: cel3Pop.length, celulas_3dim_amostra: n3.size,
    eleitorado_coberto_3dim: pCob, eleitorado_coberto_3dim_pct: pCob / P, eleitorado_nao_coberto_3dim: P - pCob,
    celulas_3dim_sem_ajuste_sexo: semAjusteSexo.size, respondentes_sem_eleitorado_na_celula: respSemPop,
    respondentes_sem_sexo: amostra.sexo.get('NI') ?? 0,
  }

  // B5 — aparado em CAP_B5 × média dos pesos positivos, renormalizado
  const posB = [...wB.values()].filter((w) => w > 0)
  const mediaB = soma(posB) / posB.length, cap = CAP_B5 * mediaB
  let nCap = 0
  wB5 = new Map([...wB].map(([t, w]) => { if (w > cap) { nCap++; return [t, cap] } return [t, w] }))
  const somaB = soma(posB), somaB5 = soma([...wB5.values()])
  for (const [t, w] of wB5) wB5.set(t, (w * somaB) / somaB5)
  diagB.aparados_b5 = nCap; diagB.teto_b5 = cap

  // C — raking nas marginais. 16-17 (sem respondentes) agregado a 18-24; sexo não informado
  // mantido como categoria própria com alvo igual ao seu n (não ajustado); NI do TSE excluído.
  const pM = soma([...tse.pop4].filter(([k]) => k.endsWith('|M')), ([, v]) => v), pF = P - pM
  const popFx = new Map(), popEsc = new Map()
  for (const [k, v] of tse.pop3) { const [, fx, esc] = k.split('|'); inc(popFx, fx, v); inc(popEsc, esc, v) }
  const alvoFx = new Map(FAIXAS.filter((f) => f !== '16-17').map((f) => [f, (N * (popFx.get(f) ?? 0)) / P]))
  alvoFx.set('18-24', (N * ((popFx.get('16-17') ?? 0) + (popFx.get('18-24') ?? 0))) / P)
  const nNI = amostra.sexo.get('NI') ?? 0
  const dims = [
    { nome: 'municipio', cat: (r) => r.mun, alvo: new Map(municipios.map((m) => [m.ibge_codigo, (N * (tse.popMun.get(m.ibge_codigo) ?? 0)) / P])) },
    { nome: 'faixa', cat: (r) => r.fx, alvo: alvoFx },
    { nome: 'escolaridade', cat: (r) => r.esc, alvo: new Map(ESCOL.map((e) => [e, (N * (popEsc.get(e) ?? 0)) / P])) },
    { nome: 'sexo', cat: (r) => r.sexo ?? 'NI', alvo: new Map([['NI', nNI], ['M', ((N - nNI) * pM) / P], ['F', ((N - nNI) * pF) / P]]) },
  ]
  wC = new Map([...resp].map(([t, r]) => [t, emSE(r) ? 1 : 0]))
  let iter = 0, maxDev = Infinity
  for (; iter < 1000 && maxDev > 1e-10; iter++) {
    maxDev = 0
    for (const d of dims) {
      const cur = new Map()
      for (const [t, r] of respSE) inc(cur, d.cat(r), wC.get(t))
      const fac = new Map()
      for (const [c, alvo] of d.alvo) {
        const s = cur.get(c) ?? 0
        if (s > 0 && alvo > 0) { fac.set(c, alvo / s); maxDev = Math.max(maxDev, Math.abs(alvo - s) / alvo) } else fac.set(c, 0)
      }
      for (const [t, r] of respSE) wC.set(t, wC.get(t) * (fac.get(d.cat(r)) ?? 0))
    }
  }
  diagC = { iteracoes: iter, desvio_max_relativo: maxDev, alvos: Object.fromEntries(dims.map((d) => [d.nome, Object.fromEntries([...d.alvo].map(([k, v]) => [String(k), v]))])) }
  console.log(`raking: ${iter} iterações · desvio máximo ${maxDev.toExponential(2)}`)

  // D — raking com aparo dos pesos extremos e reajuste às marginais. Parte de C; a cada rodada
  // apara os pesos acima do teto (CAP × média dos pesos; como Σw = n e todos são positivos, a
  // média é 1 e o teto é o próprio CAP) e refaz o raking a partir dos pesos aparados; termina em
  // raking — as quatro marginais ficam exatas — quando o maior peso após o raking cabe no teto
  // (tolerância 0,1%). Tetos inviáveis (menores que o fator de uma marginal isolada) não convergem.
  const rakeFrom = (w0) => {
    const w = new Map(w0)
    let it = 0, dev = Infinity
    for (; it < 1000 && dev > 1e-10; it++) {
      dev = 0
      for (const d of dims) {
        const cur = new Map()
        for (const [t, r] of respSE) inc(cur, d.cat(r), w.get(t))
        const fac = new Map()
        for (const [c, alvo] of d.alvo) {
          const s = cur.get(c) ?? 0
          if (s > 0 && alvo > 0) { fac.set(c, alvo / s); dev = Math.max(dev, Math.abs(alvo - s) / alvo) } else fac.set(c, 0)
        }
        for (const [t, r] of respSE) w.set(t, w.get(t) * (fac.get(d.cat(r)) ?? 0))
      }
    }
    return { w, iteracoes: it, desvio: dev }
  }
  const maxDe = (m) => { let x = 0; for (const v of m.values()) if (v > x) x = v; return x }
  const rakeTrim = (mult, maxRodadas = 60) => {
    let w = new Map(wC)
    const pos0 = [...w.values()].filter((x) => x > 0)
    const teto = (mult * soma(pos0)) / pos0.length
    let rodadas = 0, aparadosUlt = 0, iterTot = 0, convergiu = maxDe(w) <= teto * 1.001
    for (; !convergiu && rodadas < maxRodadas; rodadas++) {
      let n = 0
      for (const [t, x] of w) if (x > teto) { w.set(t, teto); n++ }
      aparadosUlt = n
      const r = rakeFrom(w); w = r.w; iterTot += r.iteracoes
      convergiu = maxDe(w) <= teto * 1.001
    }
    let acima = 0; for (const x of w.values()) if (x > teto * 1.001) acima++
    return { w, teto_mult: mult, teto, rodadas, iteracoes_raking: iterTot, aparados_ultima_rodada: aparadosUlt, convergiu, max: maxDe(w), pesos_acima_do_teto: acima }
  }
  alvosRaking = Object.fromEntries(dims.map((d) => [d.nome, Object.fromEntries(d.alvo)]))
  diagD = { teto_mult: CAP_D, grade: {} }
  for (const mult of GRADE_D) {
    const r = rakeTrim(mult)
    wGrade['D' + mult] = r.w
    const { w: _w, ...resto } = r
    diagD.grade['D' + mult] = resto
    console.log(`D${mult}: ${r.convergiu ? 'convergiu' : 'NÃO convergiu'} em ${r.rodadas} rodadas (${r.iteracoes_raking} iterações) · máx ${r.max.toFixed(3)} · acima do teto ${r.pesos_acima_do_teto}`)
  }
  {
    const r = GRADE_D.includes(CAP_D) ? { w: wGrade['D' + CAP_D], ...diagD.grade['D' + CAP_D] } : rakeTrim(CAP_D)
    wD = r.w
    const { w: _w, ...resto } = r
    Object.assign(diagD, resto)
  }

  // comparação eleitorado cadastro × TSE por município
  const eCad = soma(municipios, (m) => m.eleitorado)
  munCmp = municipios.map((m) => {
    const t = tse.popMunTotal.get(m.ibge_codigo) ?? 0
    return { ibge: m.ibge_codigo, nome: m.nome, cadastro: m.eleitorado, tse: t, dif: t - m.eleitorado, dif_pct: m.eleitorado ? (t - m.eleitorado) / m.eleitorado : 0, share_cadastro: m.eleitorado / eCad, share_tse: t / tse.total }
  })
}

// ------------------------------------------------------------- Kish
const pesos = { A: wA, B: wB, B5: wB5, C: wC, D: wD, ...wGrade }
const stats = {}
for (const m of TODOS) if (pesos[m]) stats[m] = kish([...pesos[m].values()], N)

// marginais da amostra ponderada, por método (sexo, faixa, instrução)
const margPond = {}
for (const m of TODOS) if (pesos[m]) {
  const w = pesos[m]; let tot = 0; for (const t of respSE.keys()) tot += w.get(t) ?? 0
  margPond[m] = {}
  for (const [dim, cat] of [['sexo', (r) => r.sexo ?? 'NI'], ['faixa', (r) => r.fx], ['escolaridade', (r) => r.esc]]) {
    const acc = new Map(); for (const [t, r] of respSE) inc(acc, cat(r), w.get(t) ?? 0)
    margPond[m][dim] = Object.fromEntries([...acc].map(([k, v]) => [k, v / tot]))
  }
}
// distribuição dos respondentes por faixa de peso (C e D): n e fração da massa de peso
const BANDAS = [[0, 0.05], [0.05, 0.1], [0.1, 0.25], [0.25, 0.5], [0.5, 1], [1, 2], [2, 5], [5, 10], [10, Infinity]]
const bandas = {}
for (const m of TODOS) if (pesos[m]) {
  const ws = [...respSE.keys()].map((t) => pesos[m].get(t) ?? 0), tot = soma(ws)
  bandas[m] = BANDAS.map(([lo, hi]) => { const sel = ws.filter((w) => w >= lo && w < hi); return { de: lo, ate: hi === Infinity ? null : hi, n: sel.length, massa: soma(sel) / tot } })
}
const nAbaixo = (m, x) => soma(bandas[m].filter((b) => b.ate != null && b.ate <= x), (b) => b.n)
// pesos por célula município × faixa × instrução × sexo (constantes dentro da célula em todos os métodos)
const celulas = {}
for (const [t, r] of respSE) {
  const k = k3(r) + '|' + (r.sexo ?? 'NI')
  let c = celulas[k]
  if (!c) { c = celulas[k] = { n: 0, eleitores: r.sexo && tse ? (tse.pop4.get(k) ?? 0) : null, w: {} }; for (const m of TODOS) if (pesos[m]) c.w[m] = pesos[m].get(t) }
  c.n++
  for (const m of TODOS) if (pesos[m] && Math.abs(pesos[m].get(t) - c.w[m]) > 1e-9) throw new Error(`peso ${m} não constante na célula ${k}`)
}

// --------------------------------------------------------- resultados
const candById = new Map(candidatos.map((c) => [c.id, c]))
const partById = new Map(partidos.map((p) => [p.id, p]))
const resultados = {}
for (const [cargo, rotulo] of CARGOS) {
  const vs = votos.filter((v) => v.cargo === cargo)
  const zero = () => Object.fromEntries(['bruto', ...TODOS].map((m) => [m, 0]))
  const somar = (acc, v) => { acc.bruto++; for (const m of TODOS) if (pesos[m]) acc[m] += pesos[m].get(v.token_hash) ?? 0 }
  const cand = new Map(), leg = new Map()
  const base = { numero: zero(), nominal: zero(), branco: zero(), nao_sabe: zero(), total: zero() }
  const tokens = new Set()
  for (const v of vs) {
    tokens.add(v.token_hash)
    somar(base.total, v)
    if (v.metodo === 'numero') {
      // mesmas regras das views: candidato só com candidato_id; partido pelo partido_id do voto
      somar(base.numero, v)
      if (v.candidato_id != null) {
        somar(base.nominal, v)
        if (!cand.has(v.candidato_id)) cand.set(v.candidato_id, zero())
        somar(cand.get(v.candidato_id), v)
      }
      if (v.partido_id != null) {
        if (!leg.has(v.partido_id)) leg.set(v.partido_id, zero())
        somar(leg.get(v.partido_id), v)
      }
    } else if (v.metodo === 'branco') somar(base.branco, v)
    else if (v.metodo === 'nao_sabe') somar(base.nao_sabe, v)
  }
  const pcts = (acc, den) => Object.fromEntries(['bruto', ...TODOS].filter((m) => m === 'bruto' || pesos[m]).map((m) => [m, den[m] ? acc[m] / den[m] : 0]))
  const linhas = [...cand].map(([id, acc]) => {
    const c = candById.get(id), p = c?.partido_id ? partById.get(c.partido_id) : null
    return { nome: c?.nome_urna ?? id, numero: c?.numero ?? null, partido: p?.sigla ?? '—', votos: acc.bruto, pond: { ...acc }, pct: pcts(acc, base.nominal) }
  }).sort((a, b) => b.pct.A - a.pct.A || b.votos - a.votos)
  const legendas = [...leg].map(([pid, acc]) => {
    const p = partById.get(pid)
    return { sigla: p?.sigla ?? String(pid), numero: p?.numero ?? null, votos: acc.bruto, pond: { ...acc }, pct: pcts(acc, base.numero) }
  }).sort((a, b) => b.pct.A - a.pct.A || b.votos - a.votos)
  resultados[cargo] = {
    rotulo, respondentes: tokens.size, respostas: base.total.bruto, validas: base.numero.bruto, nominais: base.nominal.bruto, legenda: base.numero.bruto - base.nominal.bruto,
    base, candidatos: linhas, legendas,
    branco: { votos: base.branco.bruto, pct: pcts(base.branco, base.total) },
    nao_sabe: { votos: base.nao_sabe.bruto, pct: pcts(base.nao_sabe, base.total) },
  }
}

// --------------------------------------------- conferência com o publicado
let conferencia = null
if (existsSync(PUBLICADO)) {
  const pub = JSON.parse(readFileSync(PUBLICADO, 'utf8'))
  let maxDif = 0, n = 0
  const difs = []
  for (const [cargo] of CARGOS) {
    const byNome = new Map((pub.resultados?.[cargo]?.candidatos ?? []).map((c) => [c.nome, c]))
    for (const l of resultados[cargo].candidatos) {
      const p = byNome.get(l.nome)
      if (!p) continue
      n++
      const d = Math.abs(l.pct.A - p.pct_pond), db = Math.abs(l.pct.bruto - p.pct_bruto)
      maxDif = Math.max(maxDif, d, db)
      if (d > 1e-6 || db > 1e-6) difs.push({ cargo, nome: l.nome, pond_recalc: l.pct.A, pond_publicado: p.pct_pond, bruto_recalc: l.pct.bruto, bruto_publicado: p.pct_bruto })
    }
  }
  conferencia = { arquivo: PUBLICADO, gerado_em_publicado: pub.gerado_em_brt ?? pub.gerado_em ?? null, candidatos_comparados: n, desvio_maximo: maxDif, divergencias: difs, kish_publicado: pub.kish ?? null }
  console.log(`conferência com ${PUBLICADO}: ${n} candidatos · desvio máximo ${maxDif.toExponential(2)} · divergências ${difs.length}`)
}

// ------------------------------------------------------ efeito por cargo
const efeito = {}
for (const [cargo] of CARGOS) {
  const r = resultados[cargo]
  const rel = r.candidatos.filter((l) => l.pct.A >= 0.01)
  const e = {}
  for (const m of TODOS.filter((x) => x !== 'A' && pesos[x])) {
    const maior = rel.reduce((a, l) => (Math.abs(l.pct[m] - l.pct.A) > Math.abs(a.d) ? { nome: l.nome, d: l.pct[m] - l.pct.A } : a), { nome: null, d: 0 })
    const ordemA = [...r.candidatos].sort((a, b) => b.pct.A - a.pct.A).slice(0, 3).map((l) => l.nome)
    const ordemM = [...r.candidatos].sort((a, b) => b.pct[m] - a.pct[m]).slice(0, 3).map((l) => l.nome)
    e[m] = { maior_variacao_pp: maior.d, candidato: maior.nome, top3_igual: JSON.stringify(ordemA) === JSON.stringify(ordemM), top3_A: ordemA, top3_metodo: ordemM }
  }
  efeito[cargo] = e
}

// -------------------------------------------------------------- saída
const marg = (dim, ordem, popMap, rot = (k) => k) => ordem.filter((k) => amostra[dim].has(k) || (popMap && popMap.has(k))).map((k) => {
  const n = amostra[dim].get(k) ?? 0, p = popMap ? popMap.get(k) ?? 0 : null
  const sa = n / N, sp = p != null && tse ? p / tse.mapeado : null
  return [rot(k), fmtInt(n), fmtPct(sa), p != null ? fmtInt(p) : '—', sp != null ? fmtPct(sp) : '—', sp != null && sa > 0 ? fmtNum(sp / sa, 3) : '—']
})
const md = []
md.push(`# Ponderação completa — município × sexo × faixa etária × grau de instrução`)
md.push(`Representação nº 0601015-42.2026.6.25.0000 (TRE-SE) · registros TRE-SE SE-09441/2026 · TSE BR-04041/2026`)
md.push(`Gerado em ${dataHoraBRT} (BRT) por \`scripts/ponderacao-estratos.mjs\` sobre a edição ativa ("${edicao.nome}"). Só agregados; nenhum dado pessoal.`)
md.push('')
md.push(`## 1. Objeto`)
md.push(`O plano amostral registrado (PesqEle, campo 2) prevê "pesos por estrato município × sexo × faixa etária × grau de instrução, com fator peso = proporção do estrato no eleitorado TSE ÷ proporção do estrato na amostra". Até a divulgação de 06/09/2026 foi aplicada apenas a pós-estratificação por município (método A abaixo). Este documento aplica a ponderação completa prometida, com o parâmetro oficial do TSE, e mede o seu efeito sobre os resultados.`)
md.push('')
md.push(`## 2. Fontes`)
md.push(`- Amostra: ${fmtInt(resp.size)} respondentes distintos, dos quais ${fmtInt(N)} com município em Sergipe (${fmtInt(respFora)} de fora de Sergipe e ${fmtInt(respSemMun)} sem município recebem peso 0 em todos os métodos). Sexo ausente para ${fmtInt(amostra.sexo.get('NI') ?? 0)} respondentes (${fmtPct((amostra.sexo.get('NI') ?? 0) / N, 1)}); faixa etária e grau de instrução presentes em 100%.`)
{
  // Sexo não é perguntado: vem da consulta cadastral por CPF (base CDL ou SPC). O campo chega vazio
  // sobretudo para jovens — gradiente por faixa etária documentado aqui para a nota metodológica.
  const niFx = new Map(); const nFx = new Map()
  for (const r of respSE.values()) { inc(nFx, r.fx); if (!r.sexo) inc(niFx, r.fx) }
  const partes = FAIXAS.filter((f) => nFx.get(f)).map((f) => `${f}: ${fmtInt(niFx.get(f) ?? 0)} de ${fmtInt(nFx.get(f))} (${fmtPct((niFx.get(f) ?? 0) / nFx.get(f), 1)})`)
  md.push(`- Origem do sexo: não é perguntado no formulário; vem da consulta cadastral por CPF (base de cadastro da CDL ou consulta ao SPC, produto "Confirme PF"), que devolve nome, data de nascimento, situação do CPF e, quando consta da base cadastral consultada, o sexo. O campo veio vazio sobretudo para eleitores jovens — ${partes.join('; ')}. O mesmo gradiente por idade aparece no cache de todas as consultas ao SPC feitas pela plataforma (inclusive de quem não concluiu a participação), o que indica limitação de cobertura da fonte cadastral, e não falha de gravação. A plataforma não guarda a resposta do SPC nem o CPF em claro (apenas o hash), de modo que o sexo faltante não pode ser recuperado retroativamente por nova consulta.`)
}
if (tse) {
  md.push(`- Parâmetro: TSE, Portal de Dados Abertos, conjunto "Eleitorado – ${tse.ano ?? '2026'}", recurso "SE – Perfil do eleitorado por seção eleitoral" (arquivo \`${tse.arquivo}\`, data de geração ${tse.geracao ?? '—'}; licença CC-BY). Agregado por município × gênero × faixa etária × grau de escolaridade: ${fmtInt(tse.total)} eleitores em Sergipe, dos quais ${fmtInt(tse.mapeado)} (${fmtPct(tse.mapeado / tse.total, 2)}) com as três variáveis mapeáveis (excluídos: gênero não informado ${fmtInt(tse.excl.genero)}, faixa etária inválida ${fmtInt(tse.excl.faixa)}, escolaridade não informada ${fmtInt(tse.excl.escolaridade)}).`)
  md.push(`- Cadastro de municípios da pesquisa (\`municipios_se.eleitorado\`, usado no método A): ${fmtInt(soma(municipios, (m) => m.eleitorado))} eleitores em 75 municípios.`)
} else {
  md.push(`- Parâmetro TSE: **não fornecido nesta execução** — apenas o método A foi calculado.`)
}
md.push('')
if (tse) {
  md.push(`## 3. Mapeamento das categorias do TSE para as da pesquisa`)
  for (const [dim, titulo] of [['genero', 'Gênero → sexo'], ['faixa', 'Faixa etária'], ['escolaridade', 'Grau de escolaridade → grau de instrução']]) {
    md.push(`**${titulo}**`)
    md.push('')
    md.push(tab(['Categoria do TSE → pesquisa', 'Eleitores'], [...tse.cat[dim]].sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, fmtInt(v)])))
    md.push('')
  }
  md.push(`Municípios casados por nome normalizado (sem acentos/conectivos; alias Gracho → Graccho Cardoso); 75 de 75 casados, todos com código TSE registrado no JSON.`)
  md.push('')
}
md.push(`## ${tse ? 4 : 3}. Composição da amostra × eleitorado (marginais)`)
const popFxAll = new Map(), popEscAll = new Map(), popSexAll = new Map()
if (tse) for (const [k, v] of tse.pop4) { const [, fx, esc, s] = k.split('|'); inc(popFxAll, fx, v); inc(popEscAll, esc, v); inc(popSexAll, s, v) }
const cabM = ['Categoria', 'Amostra n', 'Amostra %', 'Eleitorado', 'Eleitorado %', 'Fator (eleit. ÷ amostra)']
md.push('**Sexo**'); md.push(''); md.push(tab(cabM, marg('sexo', ['M', 'F', 'NI'], tse ? popSexAll : null, (k) => ROT[k]))); md.push('')
md.push('**Faixa etária**'); md.push(''); md.push(tab(cabM, marg('faixa', FAIXAS, tse ? popFxAll : null))); md.push('')
md.push('**Grau de instrução**'); md.push(''); md.push(tab(cabM, marg('escolaridade', ESCOL, tse ? popEscAll : null, (k) => ROT[k]))); md.push('')
if (munCmp) {
  const top = [...munCmp].sort((a, b) => Math.abs(b.dif_pct) - Math.abs(a.dif_pct)).slice(0, 10)
  md.push(`**Eleitorado por município: cadastro da pesquisa × arquivo do TSE** (total cadastro ${fmtInt(soma(munCmp, (m) => m.cadastro))} · TSE ${fmtInt(tse.total)} · diferença ${fmtInt(tse.total - soma(munCmp, (m) => m.cadastro))}; maior diferença relativa em ${top[0].nome}, ${fmtPct(top[0].dif_pct, 2)}). Dez maiores diferenças relativas:`)
  md.push('')
  md.push(tab(['Município', 'Cadastro', 'TSE', 'Dif.', 'Dif. %'], top.map((m) => [m.nome, fmtInt(m.cadastro), fmtInt(m.tse), fmtInt(m.dif), fmtPct(m.dif_pct, 2)])))
  md.push('')
}
md.push(`## ${tse ? 5 : 4}. Métodos`)
md.push(`- **A — pós-estratificação por município (publicada).** peso = (eleitorado do município ÷ eleitorado total) ÷ (respondentes do município ÷ respondentes com município). Reproduz a view \`v_peso_municipio\` (memória de cálculo, doc. 11).`)
if (tse) {
  md.push(`- **B — pós-estratificação literal por célula município × sexo × faixa etária × grau de instrução**, exatamente a fórmula do registro (proporção do estrato no eleitorado ÷ proporção do estrato na amostra), com três regras necessárias para a sua aplicação: (i) o eleitorado das células sem nenhum respondente não é representado (a proporção é calculada sobre o eleitorado coberto); (ii) respondente sem sexo informado recebe o peso da célula município × faixa × instrução, e, entre os que informaram sexo nessa célula, M e F são ajustados à proporção do eleitorado da célula — quando a célula tem respondentes dos dois sexos; (iii) a faixa 16–17 anos, sem respondentes, fica sem representação.`)
  md.push(`- **B5 — B com pesos aparados** em ${CAP_B5}× a média (teto ${fmtNum(diagB.teto_b5, 3)}), renormalizados. Análise de sensibilidade aos pesos extremos.`)
  md.push(`- **C — raking (ajuste iterativo proporcional)** às quatro marginais do eleitorado: município (75), sexo (M/F; "não informado" mantido como categoria própria, com o seu próprio n), faixa etária (16–17 agregado a 18–24, por não haver respondentes de 16–17) e grau de instrução. Convergência em ${diagC.iteracoes} iterações (desvio máximo ${diagC.desvio_max_relativo.toExponential(1)}). É o procedimento padrão quando as células cruzadas são esparsas.`)
  md.push(`- **D — raking com aparo dos pesos extremos e reajuste às marginais (análise de sensibilidade; ver seção 10).** Parte de C; a cada rodada apara os pesos acima de ${fmtNum(CAP_D, 0)}× a média (teto ${fmtNum(diagD.teto, 3)}) e refaz o raking a partir dos pesos aparados, até que o maior peso após o raking caiba no teto (tolerância 0,1%); termina em raking, de modo que as quatro marginais ficam exatas. ${diagD.convergiu ? `Convergiu em ${fmtInt(diagD.rodadas)} rodadas (${fmtInt(diagD.iteracoes_raking)} iterações de raking); ${fmtInt(diagD.aparados_ultima_rodada)} pesos aparados na última rodada; peso máximo final ${fmtNum(diagD.max, 3)}.` : `**Não convergiu** em ${fmtInt(diagD.rodadas)} rodadas (peso máximo ${fmtNum(diagD.max, 3)}, ${fmtInt(diagD.pesos_acima_do_teto)} pesos acima do teto).`} Sensibilidade ao teto na seção 6.`)
  md.push(`- Nível econômico: não ponderado, como consta do registro (inexiste parâmetro oficial; instrução como proxy).`)
}
md.push('')
md.push(`## ${tse ? 6 : 5}. Diagnóstico dos pesos (respondentes em Sergipe, n = ${fmtInt(N)})`)
md.push(tab(['Método', 'Σw', 'mín.', 'p5', 'mediana', 'p95', 'máx.', 'CV', 'n efetivo (Kish)', 'deff', 'margem (n)', 'margem (n efetivo)'],
  METODOS.filter((m) => stats[m]).map((m) => { const s = stats[m]; return [m, fmtNum(s.soma_w, 2), fmtNum(s.min, 3), fmtNum(s.p5, 3), fmtNum(s.mediana, 3), fmtNum(s.p95, 3), fmtNum(s.max, 3), fmtNum(s.cv, 3), fmtNum(s.n_eff, 1), fmtNum(s.deff, 3), '±' + fmtNum(100 * s.margem_n, 2) + ' p.p.', '±' + fmtNum(100 * s.margem_n_eff, 2) + ' p.p.'] })))
md.push('')
md.push(`Margem = 1,96 × √(0,25 ÷ n), 95% de confiança, pior caso (p = 0,5). Σw do método A segue a convenção da view (n_total inclui os ${fmtInt(respFora)} respondentes de fora de SE, com peso 0).`)
md.push('')
if (diagB) {
  md.push(`**Esparsidade das células (base do método B)**`)
  md.push('')
  md.push(tab(['Indicador', 'Valor'], [
    ['Células município × sexo × faixa × instrução com eleitores (TSE)', fmtInt(diagB.celulas_4dim_eleitorado)],
    ['Células com respondentes (sexo informado)', fmtInt(diagB.celulas_4dim_amostra_com_sexo)],
    ['— com menos de 5 respondentes', fmtInt(diagB.celulas_4dim_amostra_n_lt5)],
    ['— com menos de 30 respondentes', fmtInt(diagB.celulas_4dim_amostra_n_lt30)],
    ['— com 30 ou mais respondentes', fmtInt(diagB.celulas_4dim_amostra_n_ge30)],
    ['Eleitorado em células 4-dim sem nenhum respondente', `${fmtInt(diagB.eleitorado_em_celulas_4dim_sem_respondente)} (${fmtPct(diagB.eleitorado_em_celulas_4dim_sem_respondente_pct, 1)})`],
    ['Células município × faixa × instrução com eleitores / com respondentes', `${fmtInt(diagB.celulas_3dim_eleitorado)} / ${fmtInt(diagB.celulas_3dim_amostra)}`],
    ['Eleitorado coberto por células 3-dim com respondentes', `${fmtInt(diagB.eleitorado_coberto_3dim)} (${fmtPct(diagB.eleitorado_coberto_3dim_pct, 1)})`],
    ['Células 3-dim sem ajuste de sexo (só um sexo informado)', fmtInt(diagB.celulas_3dim_sem_ajuste_sexo)],
    ['Respondentes em célula sem eleitores no TSE (peso 0)', fmtInt(diagB.respondentes_sem_eleitorado_na_celula)],
    ['Pesos aparados no método B5', fmtInt(diagB.aparados_b5)],
  ], ['l', 'r']))
  md.push('')
}
if (diagD) {
  md.push(`**Variante D — sensibilidade ao teto de aparo** (cada linha é o procedimento completo com o teto indicado; "não converge" = o teto é menor do que o fator exigido por alguma marginal isolada, e o maior peso após o raking não cabe nele)`)
  md.push('')
  md.push(tab(['Teto (× média)', 'Convergiu', 'Rodadas', 'máx.', 'n efetivo (Kish)', 'deff', 'margem (n efetivo)', 'Maior variação vs A (p.p.)', 'Ordem dos 3 primeiros alterada'],
    GRADE_D.map((mult) => {
      const k = 'D' + mult, g = diagD.grade[k], s = stats[k]
      let maior = { d: 0, nome: null, cargo: null }
      const alt = []
      for (const [cargo, rotulo] of CARGOS) {
        const e = efeito[cargo][k]
        if (Math.abs(e.maior_variacao_pp) > Math.abs(maior.d)) maior = { d: e.maior_variacao_pp, nome: e.candidato, cargo: rotulo }
        if (e.top3_igual === false) alt.push(rotulo)
      }
      return [`${mult}×${mult === CAP_D ? ' (D)' : ''}`, g.convergiu ? 'sim' : 'não', fmtInt(g.rodadas), fmtNum(g.max, 3), fmtNum(s.n_eff, 1), fmtNum(s.deff, 3), '±' + fmtNum(100 * s.margem_n_eff, 2) + ' p.p.', `${fmtPP(maior.d)} (${maior.cargo}: ${maior.nome})`, alt.length ? alt.join(', ') : 'nenhum cargo']
    }), ['l', 'l', 'r', 'r', 'r', 'r', 'r', 'l', 'l']))
  md.push('')
  const cats = [['sexo', 'M', 'Masculino', popSexAll], ['sexo', 'F', 'Feminino', popSexAll], ['sexo', 'NI', 'Sexo não informado', null], ...FAIXAS.filter((f) => f !== '16-17').map((f) => ['faixa', f, `Faixa ${f}`, popFxAll]), ...ESCOL.map((e) => ['escolaridade', e, `Instrução ${ROT[e]}`, popEscAll])]
  md.push(`**Marginais da amostra ponderada, por método × eleitorado** (mostra o que cada método efetivamente entrega: B e B5 não reproduzem as marginais; C e D, sim. Eleitorado de 18-24 inclui os 16-17, alvo do raking; sexo do eleitorado sobre M+F)`)
  md.push('')
  md.push(tab(['Categoria', 'Eleitorado %', ...METODOS], cats.map(([dim, k, rot, pop]) => {
    let pe = '—'
    if (pop) {
      if (dim === 'faixa' && k === '18-24') pe = fmtPct(((popFxAll.get('16-17') ?? 0) + (popFxAll.get('18-24') ?? 0)) / tse.mapeado)
      else pe = fmtPct((pop.get(k) ?? 0) / tse.mapeado)
    }
    return [rot, pe, ...METODOS.map((m) => margPond[m] ? fmtPct(margPond[m][dim][k] ?? 0) : '—')]
  })))
  md.push('')
  md.push(`**Respondentes por faixa de peso e fração da massa de peso, C × D** (mostra o efeito do aparo: em D o teto concentra a massa nos respondentes aparados e comprime os demais)`)
  md.push('')
  md.push(tab(['Faixa de peso', 'C: respondentes', 'C: massa', 'D: respondentes', 'D: massa'], BANDAS.map(([lo, hi], i) => [hi === Infinity ? `≥ ${fmtNum(lo, 2)}` : `${fmtNum(lo, 2)} a ${fmtNum(hi, 2)}`, fmtInt(bandas.C[i].n), fmtPct(bandas.C[i].massa, 1), fmtInt(bandas.D[i].n), fmtPct(bandas.D[i].massa, 1)]), ['l', 'r', 'r', 'r', 'r']))
  md.push('')
}
md.push(`## ${tse ? 7 : 6}. Resultados por cargo — bruto × A (publicado)${tse ? ' × B × B5 × C × D' : ''}`)
md.push(`Candidatos: percentuais sobre os votos nominais do cargo; partidos: sobre nominais + legenda; branco e não sabe: sobre o total de respostas do cargo — as mesmas bases das views publicadas (doc. 11). Δ = C − A em pontos percentuais.`)
md.push('')
const cabR = ['Candidato', 'Partido', 'Votos', 'Bruto', 'A', ...(tse ? ['B', 'B5', 'C', 'D', 'Δ C−A'] : [])]
const linhaR = (l, nome) => [nome, l.partido ?? l.sigla, fmtInt(l.votos), fmtPct(l.pct.bruto), fmtPct(l.pct.A), ...(tse ? [fmtPct(l.pct.B), fmtPct(l.pct.B5), fmtPct(l.pct.C), fmtPct(l.pct.D), fmtPP(l.pct.C - l.pct.A)] : [])]
for (const [cargo, rotulo] of CARGOS) {
  const r = resultados[cargo]
  const lim = cargo === 'federal' || cargo === 'estadual' ? 15 : r.candidatos.length
  md.push(`### ${rotulo}`)
  md.push(`Respondentes ${fmtInt(r.respondentes)} · respostas ${fmtInt(r.respostas)} · votos nominais ${fmtInt(r.nominais)}${r.legenda ? ` · votos só de legenda ${fmtInt(r.legenda)} (contados apenas por partido)` : ''}${lim < r.candidatos.length ? ` · exibidos os ${lim} primeiros de ${r.candidatos.length} (todos no JSON)` : ''}`)
  md.push('')
  md.push(tab(cabR, [
    ...r.candidatos.slice(0, lim).map((l) => linhaR(l, l.nome)),
    [`*Branco*`, '', fmtInt(r.branco.votos), fmtPct(r.branco.pct.bruto), fmtPct(r.branco.pct.A), ...(tse ? [fmtPct(r.branco.pct.B), fmtPct(r.branco.pct.B5), fmtPct(r.branco.pct.C), fmtPct(r.branco.pct.D), fmtPP(r.branco.pct.C - r.branco.pct.A)] : [])],
    [`*Não sabe / não respondeu*`, '', fmtInt(r.nao_sabe.votos), fmtPct(r.nao_sabe.pct.bruto), fmtPct(r.nao_sabe.pct.A), ...(tse ? [fmtPct(r.nao_sabe.pct.B), fmtPct(r.nao_sabe.pct.B5), fmtPct(r.nao_sabe.pct.C), fmtPct(r.nao_sabe.pct.D), fmtPP(r.nao_sabe.pct.C - r.nao_sabe.pct.A)] : [])],
  ]))
  md.push('')
  if (cargo === 'federal' || cargo === 'estadual') {
    md.push(`Por partido (soma dos candidatos; 10 primeiros):`)
    md.push('')
    md.push(tab(['Partido', 'Nº', 'Votos', 'Bruto', 'A', ...(tse ? ['B', 'B5', 'C', 'D', 'Δ C−A'] : [])], r.legendas.slice(0, 10).map((l) => [l.sigla, l.numero ?? '', fmtInt(l.votos), fmtPct(l.pct.bruto), fmtPct(l.pct.A), ...(tse ? [fmtPct(l.pct.B), fmtPct(l.pct.B5), fmtPct(l.pct.C), fmtPct(l.pct.D), fmtPP(l.pct.C - l.pct.A)] : [])])))
    md.push('')
  }
  if (tse) {
    const e = efeito[cargo]
    md.push(`Efeito (candidatos com ≥ 1% em A): maior variação B − A ${fmtPP(e.B.maior_variacao_pp)} p.p. (${e.B.candidato}); C − A ${fmtPP(e.C.maior_variacao_pp)} p.p. (${e.C.candidato}); D − A ${fmtPP(e.D.maior_variacao_pp)} p.p. (${e.D.candidato}). Ordem dos três primeiros ${(() => { const alt = ['B', 'B5', 'C', 'D'].filter((m) => e[m] && e[m].top3_igual === false); return alt.length === 0 ? 'inalterada em B, B5, C e D' : `alterada (${alt.length === 1 ? alt[0] : alt.slice(0, -1).join(', ') + ' e ' + alt[alt.length - 1]})` })()}.`)
    md.push('')
  }
}
md.push(`## ${tse ? 8 : 7}. Conferência com os números publicados`)
if (conferencia) {
  md.push(`Método A recalculado aqui × \`anexo-tecnico-numeros.json\` (gerado ${conferencia.gerado_em_publicado}): ${conferencia.candidatos_comparados} candidatos comparados, desvio máximo ${conferencia.desvio_maximo.toExponential(1)} (${conferencia.divergencias.length} divergências acima de 1e-6; as views publicadas arredondam Σw a 4 casas). Kish publicado: n efetivo ${fmtNum(conferencia.kish_publicado?.n_eff ?? 0, 1)} · recalculado ${fmtNum(stats.A.n_eff, 1)}.`)
} else md.push(`Arquivo \`${PUBLICADO}\` não encontrado — sem conferência.`)
md.push('')
md.push(`## ${tse ? 9 : 8}. Observações para o estatístico responsável e para o advogado`)
md.push(`- Este documento é memória de cálculo. A escolha do método a adotar na retificação (B literal, B5, C ou D) e a assinatura são do estatístico responsável; nada aqui deve ser protocolado sem a sua conferência. A seção 10 traz a recomendação técnica de quem fez o cálculo.`)
md.push(`- ${fmtPct((amostra.sexo.get('NI') ?? 0) / N, 1)} dos respondentes estão sem sexo porque a fonte cadastral (SPC/base CDL) não devolveu o dado — concentrado nos jovens (seção 2). Tratamento adotado: no método B o respondente sem sexo recebe o peso da célula município × faixa × instrução e o ajuste M/F é feito só entre quem tem sexo na célula; no método C "não informado" é categoria própria, com alvo igual ao seu próprio n. A regra deve constar da nota metodológica. Alternativa a decidir pelo estatístico responsável: imputação do sexo pelo primeiro nome (base de nomes do Censo 2010 do IBGE), que precisa ser declarada como inferência; nova consulta ao SPC é inviável (não há CPF armazenado).`)
if (tse) {
  md.push(`- A ponderação literal por célula (B) é aplicável, mas com ${fmtInt(diagB.celulas_4dim_amostra_n_lt5)} das ${fmtInt(diagB.celulas_4dim_amostra_com_sexo)} células com menos de 5 respondentes, o que produz pesos extremos (máximo ${fmtNum(stats.B.max, 2)}) e reduz o n efetivo a ${fmtNum(stats.B.n_eff, 0)}. O raking (C) atinge as mesmas marginais com n efetivo ${fmtNum(stats.C.n_eff, 0)}; com aparo e reajuste (D, teto ${fmtNum(CAP_D, 0)}×), n efetivo ${fmtNum(stats.D.n_eff, 0)}, mantidas as marginais.`)
  md.push(`- O maior fator de correção está no grau de instrução (fundamental: eleitorado ${fmtPct((popEscAll.get('fundamental') ?? 0) / tse.mapeado, 1)} × amostra ${fmtPct((amostra.escolaridade.get('fundamental') ?? 0) / N, 1)}). Qualquer método completo amplia a margem de erro efetiva em relação à publicada (A: ±${fmtNum(100 * stats.A.margem_n_eff, 2)} p.p.).`)
}
md.push('')
if (tse && diagD) {
  const pf = (m) => fmtPct(margPond[m].escolaridade.fundamental ?? 0, 1)
  const inviaveis = GRADE_D.filter((c) => !diagD.grade['D' + c].convergiu), viaveis = GRADE_D.filter((c) => diagD.grade['D' + c].convergiu)
  const fFund = ((popEscAll.get('fundamental') ?? 0) / tse.mapeado) / ((amostra.escolaridade.get('fundamental') ?? 0) / N)
  const altD = CARGOS.filter(([c]) => efeito[c].D.top3_igual === false).map(([, r]) => r)
  const nFund = amostra.escolaridade.get('fundamental') ?? 0
  const maxCD = (() => { let d = 0, quem = null; for (const [cargo, rotulo] of CARGOS) for (const l of resultados[cargo].candidatos) if (l.pct.A >= 0.01) for (const m of METODOS_GRADE) if (pesos[m] && diagD.grade[m].convergiu) { const x = Math.abs(l.pct[m] - l.pct.C); if (x > d) { d = x; quem = `${rotulo}: ${l.nome}, ${m.replace('D', '')}×` } } return { d, quem } })()
  const altC = CARGOS.filter(([c]) => efeito[c].C.top3_igual === false).map(([, r]) => r)
  const iguaisC = CARGOS.filter(([c]) => efeito[c].C.top3_igual !== false).map(([, r]) => r)
  const massaTeto = bandas.D[bandas.D.length - 1].massa
  md.push(`## 10. Recomendação técnica (de quem fez o cálculo, para validação e assinatura do estatístico responsável)`)
  md.push(`1. **Variante recomendada: C — raking (ajuste iterativo proporcional) às quatro marginais do eleitorado do TSE (município, sexo, faixa etária e grau de instrução), sem aparo de pesos**, para a retificação dos resultados desta edição e para toda divulgação futura, sempre com a margem de erro efetiva (±${fmtNum(100 * stats.C.margem_n_eff, 1)} p.p.; n efetivo ${fmtNum(stats.C.n_eff, 0)}; deff ${fmtNum(stats.C.deff, 2)}) ao lado da nominal (±${fmtNum(100 * stats.C.margem_n, 1)} p.p.). É o método padrão para calibrar uma amostra às marginais de estratos cruzados quando as células do cruzamento são esparsas, não tem parâmetro discricionário e entrega exatamente as proporções do eleitorado que o plano registrado promete (tabela de marginais ponderadas, seção 6).`)
  md.push(`2. **Por que não B (célula literal).** A fórmula do registro é a de B, mas a amostra não a sustenta: ${fmtInt(diagB.celulas_4dim_amostra_n_lt5)} das ${fmtInt(diagB.celulas_4dim_amostra_com_sexo)} células com respondentes têm menos de 5; ${fmtPct(diagB.eleitorado_em_celulas_4dim_sem_respondente_pct, 1)} do eleitorado está em células sem nenhum respondente e fica fora do alvo (${fmtPct(1 - diagB.eleitorado_coberto_3dim_pct, 1)} mesmo agregando os sexos); ${fmtInt(diagB.celulas_3dim_sem_ajuste_sexo)} células não admitem ajuste de sexo; o peso máximo é ${fmtNum(stats.B.max, 1)} (um único respondente vale ${fmtPct(stats.B.max / stats.B.soma_w, 2)} do total) e o n efetivo cai a ${fmtNum(stats.B.n_eff, 0)}. O resultado é que B não entrega as marginais que promete: ${pf('B')} de instrução fundamental contra ${fmtPct((popEscAll.get('fundamental') ?? 0) / tse.mapeado, 1)} do eleitorado, ${fmtPct(margPond.B.faixa['60+'] ?? 0, 1)} de 60+ contra ${fmtPct((popFxAll.get('60+') ?? 0) / tse.mapeado, 1)} (seção 6).`)
  md.push(`3. **Por que não B5.** O aparo em ${CAP_B5}× a média corta o próprio fator do grau de instrução fundamental (${fmtNum(fFund, 1)}): a amostra ponderada por B5 tem ${pf('B5')} de instrução fundamental contra ${fmtPct((popEscAll.get('fundamental') ?? 0) / tse.mapeado, 1)} do eleitorado e ${fmtPct(margPond.B5.faixa['60+'] ?? 0, 1)} de 60+ contra ${fmtPct((popFxAll.get('60+') ?? 0) / tse.mapeado, 1)} — abandona, na prática, a calibração por instrução e idade que o plano registrado promete. Vale como análise de sensibilidade, não como método de divulgação.`)
  md.push(`4. **Por que não aparar os pesos de C (variante D).** Foi testado o procedimento usual (aparar acima de um teto e reajustar às marginais, repetido até convergir), com tetos de ${GRADE_D[0]}× a ${GRADE_D[GRADE_D.length - 1]}× a média (seção 6). Tetos de ${inviaveis.map((c) => c + '×').join(', ')} não convergem: são menores do que o fator isolado da instrução fundamental (${fmtNum(fFund, 1)}) — com ${fmtInt(nFund)} respondentes sustentando ${fmtPct((popEscAll.get('fundamental') ?? 0) / tse.mapeado, 1)} do peso, nenhum peso médio abaixo de ${fmtNum(fFund, 1)} nesse estrato respeita a marginal. No menor teto viável (${fmtNum(CAP_D, 0)}×), o procedimento leva ${fmtInt(bandas.D[bandas.D.length - 1].n)} respondentes ao teto (${fmtPct(massaTeto, 1)} de toda a massa de peso), comprime ${fmtInt(nAbaixo('D', 0.1))} respondentes (${fmtPct(nAbaixo('D', 0.1) / N, 1)} da amostra) abaixo de 0,1 — contra ${fmtInt(nAbaixo('C', 0.1))} em C — e achata a estrutura interna do estrato de instrução fundamental (praticamente todos os seus respondentes no teto, independentemente de município e idade), afastando-se do cruzamento que o plano registrado descreve. O ganho é de n efetivo ${fmtNum(stats.C.n_eff, 0)} → ${fmtNum(stats.D.n_eff, 0)} (margem ±${fmtNum(100 * stats.C.margem_n_eff, 1)} → ±${fmtNum(100 * stats.D.margem_n_eff, 1)}), e os resultados se deslocam em até ${fmtNum(100 * maxCD.d, 1)} p.p. em relação a C (${maxCD.quem}), dentro da margem efetiva. O aparo acrescentaria um parâmetro discricionário (o teto) sem ganho que o justifique; fica registrado como análise de sensibilidade.`)
  md.push(`5. **Efeito nos resultados (C × divulgação de 06/09, A).** Ordem dos três primeiros igual à publicada em ${iguaisC.join(', ')}${altC.length ? `; alterada em ${altC.join(' e ')}, onde os candidatos se separam por décimos de ponto, dentro da margem efetiva` : ''}. Maiores variações C − A por cargo: ${CARGOS.map(([c, r]) => `${r}, ${fmtPP(efeito[c].C.maior_variacao_pp)} p.p. (${efeito[c].C.candidato})`).join('; ')} (seção 7).`)
  md.push(`6. **Robustez.** Em todas as variantes viáveis (B, B5, C e D com tetos de ${viaveis.map((c) => c + '×').join(', ')}), a ordem dos três primeiros para Presidente e Governador é a da divulgação de 06/09; a maior diferença entre C e qualquer variante D, entre candidatos com pelo menos 1% em A, é ${fmtNum(100 * maxCD.d, 1)} p.p. (${maxCD.quem}).`)
  md.push(`7. **Limitações a declarar na retificação e em qualquer divulgação:** amostra autosselecionada por adesão (não probabilística), de modo que a margem de erro efetiva é a do pior caso sob amostragem aleatória simples equivalente, não uma garantia probabilística; instrução fundamental com ${fmtInt(nFund)} respondentes (${fmtPct(nFund / N, 1)} da amostra) sustentando ${fmtPct((popEscAll.get('fundamental') ?? 0) / tse.mapeado, 1)} do peso, e 60+ com ${fmtInt(amostra.faixa.get('60+') ?? 0)} (${fmtPct((amostra.faixa.get('60+') ?? 0) / N, 1)}) sustentando ${fmtPct((popFxAll.get('60+') ?? 0) / tse.mapeado, 1)}; peso máximo ${fmtNum(stats.C.max, 1)} (um respondente = ${fmtPct(stats.C.max / stats.C.soma_w, 2)} do total; ${fmtInt(bandas.C[bandas.C.length - 1].n)} respondentes com peso ≥ 10 respondem por ${fmtPct(bandas.C[bandas.C.length - 1].massa, 1)} da massa); sexo não devolvido pela fonte cadastral para ${fmtPct((amostra.sexo.get('NI') ?? 0) / N, 1)} (categoria própria no raking, ver seção 9); nenhum respondente de 16–17 anos (${fmtPct(((popFxAll.get('16-17') ?? 0)) / tse.mapeado, 2)} do eleitorado, agregado a 18–24); nível econômico não ponderado.`)
  md.push(`8. **O que muda nos documentos se C for adotada:** a retificação substitui os percentuais de 06/09 (A) pelos de C com a margem efetiva; o relatório do § 7º-C nos dois registros do PesqEle é substituído pelo retificado; a tabela de estratos (doc. 05) passa a descrever o procedimento efetivamente aplicado (raking às marginais dos estratos registrados), não a célula literal.`)
}
md.push('')

const out = {
  gerado_em: agora.toISOString(), gerado_em_brt: dataHoraBRT, edicao: { id: eid, nome: edicao.nome }, arquivo_tse: tse ? { arquivo: tse.arquivo, geracao: tse.geracao, ano: tse.ano, linhas: tse.linhas, eleitores_se: tse.total, eleitores_mapeados: tse.mapeado, excluidos: tse.excl, codigos_tse: Object.fromEntries(tse.codTse), categorias: Object.fromEntries(Object.entries(tse.cat).map(([k, m]) => [k, Object.fromEntries(m)])) } : null,
  amostra: { respondentes: resp.size, em_se: N, fora_se: respFora, sem_municipio: respSemMun, sexo: Object.fromEntries(amostra.sexo), faixa: Object.fromEntries(amostra.faixa), escolaridade: Object.fromEntries(amostra.escolaridade), municipio: Object.fromEntries(amostra.municipio) },
  eleitorado_marginais: tse ? { sexo: Object.fromEntries(popSexAll), faixa: Object.fromEntries(popFxAll), escolaridade: Object.fromEntries(popEscAll) } : null,
  municipios: munCmp ?? municipios.map((m) => ({ ibge: m.ibge_codigo, nome: m.nome, cadastro: m.eleitorado })),
  pesos_municipio_A: Object.fromEntries([...pesoMunA].map(([k, v]) => [String(k), v])),
  kish: stats, diagnostico_b: diagB, raking: diagC, diagnostico_d: diagD, alvos_raking: alvosRaking, marginais_ponderadas: margPond, bandas_peso: bandas, celulas, resultados, efeito, conferencia,
}
if (tse || process.env.SAIDA_DIR) {
  writeFileSync(join(OUT_DIR, 'ponderacao-completa.md'), md.join('\n') + '\n')
  writeFileSync(join(OUT_DIR, 'ponderacao-completa.json'), JSON.stringify(out, null, 2) + '\n')
  console.log(`escrito ${join(OUT_DIR, 'ponderacao-completa.md')} e .json`)
} else {
  console.log('\n' + md.join('\n'))
  console.log('\n(sem arquivo do TSE: nada escrito em ' + OUT_DIR + ')')
}
