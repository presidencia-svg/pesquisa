#!/usr/bin/env node
/**
 * Importa o "Perfil do eleitorado por seção eleitoral" (dados abertos do TSE,
 * UF = SE) pra tabela eleitorado_tse_estratos — parâmetro oficial da
 * ponderação por estratos (migration 048).
 *
 * Mesmo mapeamento de scripts/ponderacao-estratos.mjs (doc. 16 da Rp
 * 0601015-42): sexo M/F; faixa 16-17 / 18-24 / 25-34 / 35-44 / 45-59 / 60+;
 * instrução agregada em fundamental (analfabeto, lê e escreve, fundamental
 * incompleto/completo) / médio / superior. Linhas com faixa "Inválida" ou
 * sem categoria mapeável ficam de fora (contadas em `excluidos`).
 *
 * Não altera municipios_se.eleitorado (base da ponderação por município já
 * divulgada). Cada carga vira uma linha em eleitorado_tse_importacao; a
 * função ponderar_estratos_raking usa a mais recente por padrão.
 *
 * Uso: node --env-file=.env.local scripts/importar-eleitorado-tse.mjs ~/Downloads/perfil_eleitor_secao_2026_SE.zip [--por "Nome"]
 */
import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { basename } from 'node:path'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) throw new Error('faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (rode com --env-file=.env.local)')
const db = createClient(URL, KEY, { auth: { persistSession: false } })

const args = process.argv.slice(2)
const ARQ = args.find((a) => !a.startsWith('--'))
const POR = args.includes('--por') ? args[args.indexOf('--por') + 1] : null
if (!ARQ || !existsSync(ARQ)) throw new Error('informe o arquivo .zip/.csv do TSE (perfil_eleitor_secao_<ano>_SE)')

const inc = (m, k, v = 1) => m.set(k, (m.get(k) ?? 0) + v)
const fmtInt = (n) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 0 })
const normNome = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\b(DE|DO|DA|DOS|DAS)\b/g, '').replace(/[^A-Z0-9]/g, '')
const ALIAS_MUN = { GRACHOCARDOSO: 'GRACCHOCARDOSO' }

export function mapFaixa(ds) {
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
export function mapEsc(ds) {
  const s = ds.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  if (/NAO INFORMADO/.test(s)) return null
  if (/SUPERIOR/.test(s)) return 'superior'
  if (/MEDIO/.test(s)) return 'medio'
  if (/FUNDAMENTAL|ANALFABETO|LE E ESCREVE/.test(s)) return 'fundamental'
  return null
}
export function mapSexo(ds) {
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
  const idx = (...nomes) => {
    const i = nomes.map((n) => cab.indexOf(n)).find((k) => k >= 0)
    if (i == null) throw new Error(`coluna ausente no arquivo do TSE: ${nomes.join('/')} (cabeçalho: ${cab.join(',')})`)
    return i
  }
  const iUF = idx('SG_UF'), iMun = idx('NM_MUNICIPIO'), iGen = idx('DS_GENERO'), iFx = idx('DS_FAIXA_ETARIA'), iEsc = idx('DS_GRAU_ESCOLARIDADE'), iQt = idx('QT_ELEITORES_PERFIL', 'QT_ELEITORES')
  const iGer = cab.indexOf('DT_GERACAO'), iAno = Math.max(cab.indexOf('ANO_ELEICAO'), cab.indexOf('AA_ELEICAO'))
  const ibgeByNorm = new Map(municipios.map((m) => [normNome(m.nome), m.ibge_codigo]))
  const pop4 = new Map(), popMunTotal = new Map(), naoMapeados = new Map()
  const excl = { genero: 0, faixa: 0, escolaridade: 0 }
  let total = 0, mapeado = 0, geracao = null, ano = null
  for (let i = 1; i < linhas.length; i++) {
    const c = parse(linhas[i])
    if (c.length < cab.length) continue
    if (c[iUF] !== 'SE') continue
    if (geracao == null && iGer >= 0) geracao = c[iGer]
    if (ano == null && iAno >= 0) ano = c[iAno]
    const qt = Number(c[iQt])
    total += qt
    let n = normNome(c[iMun]); n = ALIAS_MUN[n] ?? n
    const ibge = ibgeByNorm.get(n)
    if (!ibge) { inc(naoMapeados, c[iMun], qt); continue }
    inc(popMunTotal, ibge, qt)
    const sexo = mapSexo(c[iGen]), fx = mapFaixa(c[iFx]), esc = mapEsc(c[iEsc])
    if (!sexo) excl.genero += qt
    if (!fx) excl.faixa += qt
    if (!esc) excl.escolaridade += qt
    if (!sexo || !fx || !esc) continue
    mapeado += qt
    inc(pop4, `${ibge}|${sexo}|${fx}|${esc}`, qt)
  }
  const faltam = municipios.filter((m) => !popMunTotal.has(m.ibge_codigo)).map((m) => m.nome)
  if (naoMapeados.size || faltam.length) {
    throw new Error(`municípios do TSE sem correspondência: ${[...naoMapeados.keys()].join(', ') || '—'} · municípios do cadastro sem linha no TSE: ${faltam.join(', ') || '—'}`)
  }
  return { arquivo: basename(caminho), geracao, ano, total, mapeado, excl, pop4, linhas: linhas.length - 1 }
}

const { data: municipios, error: eMun } = await db.from('municipios_se').select('ibge_codigo, nome').order('ibge_codigo')
if (eMun) throw new Error(eMun.message)
const tse = lerTse(ARQ, municipios)
console.log(`TSE: ${tse.arquivo} · geração ${tse.geracao} · ano ${tse.ano} · ${fmtInt(tse.linhas)} linhas · eleitores SE ${fmtInt(tse.total)} · mapeados ${fmtInt(tse.mapeado)} · excluídos ${JSON.stringify(tse.excl)} · células ${tse.pop4.size}`)

const { data: imp, error: eImp } = await db.from('eleitorado_tse_importacao').insert({
  arquivo: tse.arquivo, geracao: tse.geracao, ano: tse.ano, linhas: tse.linhas,
  total_se: tse.total, total_mapeado: tse.mapeado, excluidos: tse.excl, importado_por: POR,
}).select('id').single()
if (eImp) throw new Error(eImp.message)

const rows = [...tse.pop4].map(([k, v]) => {
  const [ibge, sexo, fx, esc] = k.split('|')
  return { importacao_id: imp.id, municipio_ibge: Number(ibge), sexo, faixa_etaria: fx, escolaridade: esc, eleitores: v }
})
for (let i = 0; i < rows.length; i += 500) {
  const { error } = await db.from('eleitorado_tse_estratos').insert(rows.slice(i, i + 500))
  if (error) {
    await db.from('eleitorado_tse_importacao').delete().eq('id', imp.id)
    throw new Error('falha ao gravar estratos (importação desfeita): ' + error.message)
  }
}
const { data: chk } = await db.from('v_eleitorado_marginais').select('dimensao, categoria, eleitores').eq('importacao_id', imp.id).neq('dimensao', 'municipio').order('dimensao').order('categoria')
console.log(`importação ${imp.id} · ${rows.length} células gravadas`)
for (const r of chk ?? []) console.log(`  ${r.dimensao.padEnd(12)} ${String(r.categoria).padEnd(12)} ${fmtInt(r.eleitores)}`)
