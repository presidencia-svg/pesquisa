#!/usr/bin/env node
/**
 * Anexo técnico — Representação nº 0601015-42.2026.6.25.0000 (TRE-SE).
 *
 * Gera, a partir do banco da pesquisa (edição ativa), os "números
 * solicitados" pela decisão de 07/09/2026 (Res.-TSE 23.600/2019, art. 2º,
 * §7º, III e IV) e os textos prontos pra complementação no PesqEle:
 *
 *   docs/juridico/rp-0601015-42/anexo-tecnico-numeros.md   (+ .json)
 *   docs/juridico/rp-0601015-42/complementacao-pesqele-<data>.md
 *
 * SÓ AGREGADOS: nenhuma coluna pessoal (cpf_hash, whatsapp, ip, nome,
 * user_agent, fingerprint) é sequer selecionada. token_hash é um hash
 * opaco usado apenas pra contar respondentes distintos.
 *
 * Uso:  node --env-file=.env.local scripts/anexo-rp-0601015.mjs
 *       META_AMOSTRA=20000 node --env-file=.env.local scripts/anexo-rp-0601015.mjs   (20.000 = entrevistas previstas no registro)
 */
import { createClient } from '@supabase/supabase-js'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) {
  throw new Error('faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (rode com --env-file=.env.local)')
}
const db = createClient(URL, KEY, { auth: { persistSession: false } })

const OUT_DIR = 'docs/juridico/rp-0601015-42'
const TZ = 'America/Recife'
const PAGE = 1000
const RP = '0601015-42.2026.6.25.0000'
const REGISTROS = 'TRE-SE SE-09441/2026 · TSE BR-04041/2026'

// ----------------------------------------------------------------- helpers
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
const fmtInt = (n) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 0 })
const fmtNum = (n, d = 2) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })
const fmtPct = (x, d = 2) => fmtNum(100 * x, d) + '%'
const diaBRT = (iso) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: TZ })
const dataHoraBRT = (iso) =>
  new Date(iso).toLocaleString('pt-BR', {
    timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
function tab(headers, rows, aligns) {
  const a = aligns ?? headers.map((_, i) => (i === 0 ? 'l' : 'r'))
  const sep = a.map((x) => (x === 'r' ? '---:' : x === 'c' ? ':---:' : '---'))
  return ['| ' + headers.join(' | ') + ' |', '| ' + sep.join(' | ') + ' |', ...rows.map((r) => '| ' + r.join(' | ') + ' |')].join('\n')
}
function contar(arr, key) {
  const m = new Map()
  for (const x of arr) { const k = key(x); m.set(k, (m.get(k) ?? 0) + 1) }
  return m
}
const soma = (arr, f) => arr.reduce((s, x) => s + f(x), 0)

const ROT = {
  sexo: { F: 'Feminino', M: 'Masculino', nao_informado: 'Não informado' },
  escolaridade: { fundamental: 'Fundamental', medio: 'Médio', superior: 'Superior' },
  nivel_economico: { A: 'Classe A', B: 'Classe B', C: 'Classe C', D_E: 'Classes D/E', nao_informado: 'Não informado' },
  regiao: {
    grande_aracaju: 'Grande Aracaju', leste: 'Leste Sergipano', centro_sul: 'Centro-Sul', agreste: 'Agreste',
    sertao: 'Sertão', baixo_sao_francisco: 'Baixo São Francisco', fora_de_se: 'Fora de Sergipe (peso 0)',
  },
}
const ORDEM = {
  sexo: ['F', 'M', 'nao_informado'],
  faixa_etaria: ['16-17', '18-24', '25-34', '35-44', '45-59', '60+'],
  escolaridade: ['fundamental', 'medio', 'superior'],
  nivel_economico: ['A', 'B', 'C', 'D_E', 'nao_informado'],
}
const rot = (dim, v) => ROT[dim]?.[v] ?? v
const CARGOS = [
  ['presidente', 'Presidente da República'],
  ['governador', 'Governador'],
  ['senador', 'Senador (cada respondente indicou até duas opções)'],
  ['federal', 'Deputado Federal'],
  ['estadual', 'Deputado Estadual'],
]

// ------------------------------------------------------------------ dados
const { data: edicao, error: eEd } = await db.from('edicao').select('*').eq('ativa', true).maybeSingle()
if (eEd || !edicao) throw new Error('edição ativa não encontrada: ' + (eEd?.message ?? ''))
const eid = edicao.id
console.log('edição ativa:', edicao.nome, eid)

const municipios = await all('municipios_se', 'ibge_codigo, nome, regiao, eleitorado, cota_pesquisa, zona_expansao', { order: 'ibge_codigo' })
const pesos = await all('v_peso_municipio', '*', { eq: { edicao_id: eid }, order: 'municipio_ibge' })
const cobertura = await all('v_cobertura_municipio', '*', { eq: { edicao_id: eid }, order: 'ibge_codigo' })
const composicaoView = await all('v_amostra_composicao', '*', { eq: { edicao_id: eid }, order: 'dimensao' })
const candPond = await all('v_resultados_candidato_pond', '*', { eq: { edicao_id: eid }, order: 'candidato_id' })
const legPond = await all('v_resultados_legenda_pond', '*', { eq: { edicao_id: eid }, order: 'partido_id' })
const bnsPond = await all('v_votos_branco_nao_sabe_pond', '*', { eq: { edicao_id: eid }, order: 'cargo' })
const candidatos = await all('candidatos_pesquisa', 'id, cargo, numero, nome_urna, partido_id, coligacao, ativo', { eq: { edicao_id: eid } })
const partidos = await all('partidos', 'id, numero, sigla, nome')
const { data: resumo } = await db.from('v_resumo_edicao').select('*').eq('edicao_id', eid).maybeSingle()
const auditoria = await all('admin_audit_log', 'acao, recurso, detalhe, criado_em', { eq: { recurso: `edicao:${eid}` }, order: 'criado_em' })
console.log('baixando eleitores (agregação local, sem colunas pessoais)…')
const eleitores = await all(
  'eleitores_pesquisa',
  'id, criado_em, fonte, spc_validado, wa_validado, token_emitido, opt_in_resultados_wa, resultado_enviado_em, sexo, faixa_etaria, escolaridade, nivel_economico, municipio_ibge',
  { eq: { edicao_id: eid } },
)
console.log('baixando votos (só token_hash/cargo/metodo/hora/município)…')
const votos = await all('votos_pesquisa', 'id, token_hash, cargo, metodo, criado_hora, municipio_ibge', { eq: { edicao_id: eid } })
console.log(`eleitores ${eleitores.length} · votos ${votos.length}`)

// ------------------------------------------------------- unidades territoriais
const seSet = new Set(municipios.map((m) => m.ibge_codigo))
const munBy = new Map(municipios.map((m) => [m.ibge_codigo, m]))
const E_TOTAL = soma(municipios, (m) => m.eleitorado)
const todasCotas = municipios.every((m) => m.cota_pesquisa != null)
const META = todasCotas ? soma(municipios, (m) => m.cota_pesquisa) : Number(process.env.META_AMOSTRA ?? 20000) // 20.000 entrevistas previstas no registro PesqEle
const pesoBy = new Map(pesos.map((p) => [p.municipio_ibge, p]))
const cobBy = new Map(cobertura.map((c) => [c.ibge_codigo, c]))
const E_COM_RESP = soma(pesos, (p) => p.eleitorado)

const val = eleitores.filter((e) => e.wa_validado)
const tokensPorMun = new Map()
for (const v of votos) {
  const k = v.municipio_ibge ?? 'null'
  if (!tokensPorMun.has(k)) tokensPorMun.set(k, new Set())
  tokensPorMun.get(k).add(v.token_hash)
}
const respondentesTotal = new Set(votos.map((v) => v.token_hash)).size
let respFora = 0
for (const [k, s] of tokensPorMun) if (!seSet.has(k)) respFora += s.size
const respSE = respondentesTotal - respFora
const partFora = val.filter((e) => !seSet.has(e.municipio_ibge)).length
const partSE = val.length - partFora
// n_total da view = Σ respondentes com municipio_ibge não nulo (inclui os de fora de SE, que
// recebem peso 0 por não terem eleitorado no cadastro de municípios de SE).
const N_TOTAL_PESO = respondentesTotal - (tokensPorMun.get('null')?.size ?? 0)

const linhasMun = municipios
  .map((m) => {
    const p = pesoBy.get(m.ibge_codigo)
    const c = cobBy.get(m.ibge_codigo)
    const n = p ? Number(p.respostas) : 0
    const share = m.eleitorado / E_TOTAL
    return {
      ibge: m.ibge_codigo, nome: m.nome, regiao: m.regiao, eleitorado: m.eleitorado, share,
      planejado: todasCotas ? m.cota_pesquisa : Math.round(META * share),
      participantes: Number(c?.participantes ?? 0), respondentes: n, share_amostra: n / N_TOTAL_PESO,
      peso: p ? Number(p.peso) : 0,
      peso_recalc: n > 0 ? (m.eleitorado / E_COM_RESP) / (n / N_TOTAL_PESO) : 0,
    }
  })
  .sort((a, b) => b.eleitorado - a.eleitorado)
const PLANEJADO_TOTAL = soma(linhasMun, (r) => r.planejado)
const PART_TOTAL_SE = soma(linhasMun, (r) => r.participantes)

// ------------------------------------------------------------------ Kish
const comResp = linhasMun.filter((r) => r.respondentes > 0)
const sumNW = soma(comResp, (r) => r.respondentes * r.peso)
const sumNW2 = soma(comResp, (r) => r.respondentes * r.peso * r.peso)
const nEff = (sumNW * sumNW) / sumNW2
const deff = respSE / nEff
const margem = (n) => 1.96 * Math.sqrt(0.25 / n)
const pesoMin = comResp.reduce((a, r) => (r.peso < a.peso ? r : a))
const pesoMax = comResp.reduce((a, r) => (r.peso > a.peso ? r : a))
const desvioPeso = Math.max(...comResp.map((r) => Math.abs(r.peso - r.peso_recalc)))

// ---------------------------------------------------------------- composição
const dim = (campo, arr = val) => contar(arr, (e) => e[campo] ?? 'nao_informado')
const comp = {
  sexo: dim('sexo'), faixa_etaria: dim('faixa_etaria'), escolaridade: dim('escolaridade'), nivel_economico: dim('nivel_economico'),
  regiao: contar(val, (e) => munBy.get(e.municipio_ibge)?.regiao ?? 'fora_de_se'),
}
const chavesOrdenadas = (d, m) => [...new Set([...(ORDEM[d] ?? []), ...m.keys()])].filter((k) => m.has(k))
const cruz = contar(val, (e) => `${e.sexo ?? 'nao_informado'}|${e.faixa_etaria ?? 'nao_informado'}|${e.escolaridade ?? 'nao_informado'}`)
const nivelSexo = contar(val, (e) => `${e.nivel_economico ?? 'nao_informado'}|${e.sexo ?? 'nao_informado'}`)
// Conferência com a view v_amostra_composicao (a mesma que alimenta /transparencia)
const viewSexo = Object.fromEntries(composicaoView.filter((r) => r.dimensao === 'sexo').map((r) => [r.valor, r.n]))

// ----------------------------------------------------------------- resultados
const candById = new Map(candidatos.map((c) => [c.id, c]))
const partById = new Map(partidos.map((p) => [p.id, p]))
const porCargo = {}
for (const v of votos) {
  const c = (porCargo[v.cargo] ??= { numero: 0, branco: 0, nao_sabe: 0, outros: 0, total: 0, tokens: new Set() })
  c.total++
  c.tokens.add(v.token_hash)
  if (v.metodo === 'numero') c.numero++
  else if (v.metodo === 'branco') c.branco++
  else if (v.metodo === 'nao_sabe') c.nao_sabe++
  else c.outros++
}
const resultados = {}
for (const [cargo, rotulo] of CARGOS) {
  const linhas = candPond
    .filter((x) => x.cargo === cargo)
    .map((x) => {
      const c = candById.get(x.candidato_id)
      const p = c?.partido_id ? partById.get(c.partido_id) : null
      return { nome: c?.nome_urna ?? x.candidato_id, numero: c?.numero ?? null, partido: p?.sigla ?? '—', coligacao: c?.coligacao ?? null, votos: x.votos, pond: Number(x.votos_pond) }
    })
    .sort((a, b) => b.pond - a.pond || b.votos - a.votos)
  const baseB = soma(linhas, (l) => l.votos)
  const baseP = soma(linhas, (l) => l.pond)
  for (const l of linhas) { l.pct_bruto = baseB ? l.votos / baseB : 0; l.pct_pond = baseP ? l.pond / baseP : 0 }
  const legendas = legPond
    .filter((x) => x.cargo === cargo)
    .map((x) => { const p = partById.get(x.partido_id); return { sigla: p?.sigla ?? x.partido_id, numero: p?.numero ?? null, votos: x.votos, pond: Number(x.votos_pond) } })
    .sort((a, b) => b.pond - a.pond || b.votos - a.votos)
  const legB = soma(legendas, (l) => l.votos)
  const legP = soma(legendas, (l) => l.pond)
  for (const l of legendas) { l.pct_bruto = legB ? l.votos / legB : 0; l.pct_pond = legP ? l.pond / legP : 0 }
  const bns = bnsPond.filter((x) => x.cargo === cargo)
  const branco = bns.find((x) => x.metodo === 'branco') ?? { votos: 0, votos_pond: 0 }
  const naoSabe = bns.find((x) => x.metodo === 'nao_sabe') ?? { votos: 0, votos_pond: 0 }
  const tot = porCargo[cargo] ?? { numero: 0, branco: 0, nao_sabe: 0, total: 0, tokens: new Set() }
  const pondNumero = legendas.length ? legP : baseP
  const pondTotal = pondNumero + Number(branco.votos_pond) + Number(naoSabe.votos_pond)
  resultados[cargo] = {
    rotulo, candidatos: linhas, base_nominal_bruta: baseB, base_nominal_pond: baseP,
    legendas, base_partido_bruta: legB, base_partido_pond: legP,
    branco: { votos: branco.votos, pond: Number(branco.votos_pond), pct_bruto: tot.total ? branco.votos / tot.total : 0, pct_pond: pondTotal ? Number(branco.votos_pond) / pondTotal : 0 },
    nao_sabe: { votos: naoSabe.votos, pond: Number(naoSabe.votos_pond), pct_bruto: tot.total ? naoSabe.votos / tot.total : 0, pct_pond: pondTotal ? Number(naoSabe.votos_pond) / pondTotal : 0 },
    respostas_total: tot.total, respondentes: tot.tokens.size, votos_numero: tot.numero, votos_branco: tot.branco, votos_nao_sabe: tot.nao_sabe,
    votos_legenda_pura: Math.max(0, legB - baseB),
  }
}

// -------------------------------------------------------------- linha do tempo
const dias = [...new Set([...eleitores.map((e) => diaBRT(e.criado_em)), ...votos.map((v) => diaBRT(v.criado_hora))])].sort((a, b) => a.split('/').reverse().join('') .localeCompare(b.split('/').reverse().join('')))
const cadDia = contar(eleitores, (e) => diaBRT(e.criado_em))
const valDia = contar(val, (e) => diaBRT(e.criado_em))
const votDia = contar(votos, (v) => diaBRT(v.criado_hora))
const respDia = new Map()
for (const v of votos) { const d = diaBRT(v.criado_hora); if (!respDia.has(d)) respDia.set(d, new Set()); respDia.get(d).add(v.token_hash) }
const primeiroCadastro = eleitores.reduce((a, e) => (e.criado_em < a ? e.criado_em : a), eleitores[0]?.criado_em)
const ultimoCadastro = eleitores.reduce((a, e) => (e.criado_em > a ? e.criado_em : a), eleitores[0]?.criado_em)
const fimMs = new Date(edicao.fim).getTime()
const aposFim = votos.filter((v) => new Date(v.criado_hora).getTime() >= fimMs)
const sessoesAposFim = new Set(aposFim.map((v) => v.token_hash)).size
const ultimaHoraVoto = votos.reduce((a, v) => (v.criado_hora > a ? v.criado_hora : a), votos[0]?.criado_hora)
const optin = eleitores.filter((e) => e.opt_in_resultados_wa).length
const enviados = eleitores.filter((e) => e.resultado_enviado_em)
const envMin = enviados.reduce((a, e) => (e.resultado_enviado_em < a ? e.resultado_enviado_em : a), enviados[0]?.resultado_enviado_em)
const envMax = enviados.reduce((a, e) => (e.resultado_enviado_em > a ? e.resultado_enviado_em : a), enviados[0]?.resultado_enviado_em)

// ------------------------------------------------------------------- JSON
const agora = new Date()
const json = {
  gerado_em: agora.toISOString(), gerado_em_brt: dataHoraBRT(agora.toISOString()), representacao: RP, registros: REGISTROS,
  edicao: { id: eid, nome: edicao.nome, inicio: edicao.inicio, fim: edicao.fim, criado_em: edicao.criado_em, registro_tre: edicao.registro_tre, data_registro_pesqele: edicao.data_registro_pesqele, divulgacao_prevista: edicao.divulgacao_prevista, divulgada_em: edicao.divulgada_em, suspensa_em: edicao.suspensa_em ?? null, suspensao_motivo: edicao.suspensao_motivo ?? null, conre: edicao.numero_conre_responsavel, turno: edicao.turno },
  resumo, eleitorado_total_se: E_TOTAL, meta_amostra: META, planejado_total: PLANEJADO_TOTAL,
  participantes: { validados_total: val.length, validados_se: partSE, validados_fora_se: partFora },
  respondentes: { total: respondentesTotal, se: respSE, fora_se: respFora, sem_municipio: tokensPorMun.get('null')?.size ?? 0, n_total_peso: N_TOTAL_PESO },
  kish: { soma_nw: sumNW, soma_nw2: sumNW2, n_eff: nEff, deff, margem_n: margem(respSE), margem_n_eff: margem(nEff), peso_min: { municipio: pesoMin.nome, peso: pesoMin.peso }, peso_max: { municipio: pesoMax.nome, peso: pesoMax.peso }, desvio_max_recalculo: desvioPeso },
  municipios: linhasMun,
  composicao: Object.fromEntries(Object.entries(comp).map(([k, m]) => [k, Object.fromEntries(chavesOrdenadas(k, m).map((c) => [c, m.get(c)]))])),
  composicao_view_sexo: viewSexo,
  cruzamento_sexo_faixa_instrucao: Object.fromEntries([...cruz.entries()].sort()),
  nivel_x_sexo: Object.fromEntries([...nivelSexo.entries()].sort()),
  resultados: Object.fromEntries(Object.entries(resultados).map(([k, r]) => [k, { ...r }])),
  linha_do_tempo: { dias: dias.map((d) => ({ dia: d, cadastros: cadDia.get(d) ?? 0, validados: valDia.get(d) ?? 0, respondentes: respDia.get(d)?.size ?? 0, votos: votDia.get(d) ?? 0 })), primeiro_cadastro: primeiroCadastro, ultimo_cadastro: ultimoCadastro, ultima_hora_voto: ultimaHoraVoto, votos_apos_fim: aposFim.length, sessoes_apos_fim: sessoesAposFim },
  whatsapp_resultado: { optin, enviados: enviados.length, primeiro_envio: envMin ?? null, ultimo_envio: envMax ?? null },
  auditoria: auditoria.map((a) => ({ acao: a.acao, criado_em: a.criado_em, brt: dataHoraBRT(a.criado_em), detalhe: a.detalhe })),
}
mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(join(OUT_DIR, 'anexo-tecnico-numeros.json'), JSON.stringify(json, null, 2))

// --------------------------------------------------------------------- MD
const L = []
L.push(`# Anexo Técnico — Números solicitados (Rp ${RP})`)
L.push('')
L.push(`**Pesquisa Eleitoral Sergipe 2026 · CDL Aracaju (CNPJ 13.045.935/0001-36)** · Registros ${REGISTROS} · Registro no PesqEle em ${edicao.data_registro_pesqele ? diaBRT(edicao.data_registro_pesqele + 'T12:00:00Z') : '22/08/2026'} · Coleta ${diaBRT(edicao.inicio)} a ${diaBRT(new Date(fimMs - 1000).toISOString())} · Divulgação ${edicao.divulgada_em ? dataHoraBRT(edicao.divulgada_em) : '—'} (BRT).`)
L.push('')
L.push(`Gerado automaticamente em ${dataHoraBRT(agora.toISOString())} (BRT) a partir do banco de dados da pesquisa (edição "${edicao.nome}") pelo script \`scripts/anexo-rp-0601015.mjs\`, cujo código-fonte é público (github.com/presidencia-svg/pesquisa). Todos os números são agregados; nenhum dado pessoal é lido ou exibido. Os mesmos números constam de \`anexo-tecnico-numeros.json\` para conferência pericial.`)
L.push('')
L.push('## 1. Resumo da coleta')
L.push('')
L.push(tab(['Indicador', 'Valor'], [
  ['Eleitorado de Sergipe (TSE, base do cadastro de municípios)', fmtInt(E_TOTAL)],
  ['Municípios cobertos / total', `${comResp.length} / ${municipios.length}`],
  ['Amostra planejada (cota proporcional ao eleitorado)', fmtInt(PLANEJADO_TOTAL)],
  ['Cadastros iniciados (CPF verificado)', fmtInt(resumo?.eleitores_cadastrados ?? eleitores.length)],
  ['— via base CDL / via SPC', `${fmtInt(resumo?.via_cdl_base ?? 0)} / ${fmtInt(resumo?.via_spc ?? 0)}`],
  ['Participantes com WhatsApp validado (OTP)', fmtInt(val.length)],
  ['— residentes em Sergipe / fora de Sergipe', `${fmtInt(partSE)} / ${fmtInt(partFora)}`],
  ['Tokens de voto emitidos / usados', `${fmtInt(resumo?.tokens_emitidos ?? 0)} / ${fmtInt(resumo?.tokens_usados ?? 0)}`],
  ['Respondentes distintos (sessões com ao menos um voto)', fmtInt(respondentesTotal)],
  ['— em Sergipe (entram na ponderação) / fora de SE (peso 0)', `${fmtInt(respSE)} / ${fmtInt(respFora)}`],
  ['Respostas válidas (número) / brancas / não sabe', `${fmtInt(resumo?.votos_validos ?? 0)} / ${fmtInt(resumo?.votos_brancos ?? 0)} / ${fmtInt(resumo?.votos_nao_sabe ?? 0)}`],
  ['Primeiro cadastro (BRT)', primeiroCadastro ? dataHoraBRT(primeiroCadastro) : '—'],
  ['Encerramento programado da coleta (BRT)', dataHoraBRT(edicao.fim)],
  ['Divulgação (marcada com TOTP pelo responsável, BRT)', edicao.divulgada_em ? dataHoraBRT(edicao.divulgada_em) : '—'],
]))
L.push('')
L.push('## 2. Art. 2º, §7º, III — número de pesquisados por unidade territorial (município)')
L.push('')
L.push(`Unidade territorial adotada: **município** (${municipios.length} municípios de Sergipe), com a justificativa técnica prevista no art. 2º, §7º-F: a coleta foi integralmente digital e estadual (identidade verificada por CPF e WhatsApp), sem abordagem domiciliar, de modo que o setor censitário não é uma unidade operacional da coleta — o município é a menor unidade em que o participante é localizado e em que existe parâmetro oficial (eleitorado TSE) para controle e ponderação. "Planejado" é a cota proporcional ao eleitorado de cada município${todasCotas ? ' registrada no cadastro' : ` sobre uma meta de ${fmtInt(META)} participantes`}; "Validados" são os participantes com WhatsApp validado; "Respondentes" são as sessões distintas com ao menos um voto registrado (base da ponderação); "Peso" é o fator de pós-estratificação aplicado (seção 3).`)
L.push('')
L.push(tab(
  ['Município', 'Região', 'Eleitorado', '% eleit.', 'Planejado', 'Validados', 'Respondentes', '% amostra', 'Peso'],
  [
    ...linhasMun.map((r) => [r.nome, rot('regiao', r.regiao), fmtInt(r.eleitorado), fmtPct(r.share), fmtInt(r.planejado), fmtInt(r.participantes), fmtInt(r.respondentes), fmtPct(r.share_amostra), fmtNum(r.peso, 4)]),
    ['**Total Sergipe**', '', `**${fmtInt(E_TOTAL)}**`, '**100,00%**', `**${fmtInt(PLANEJADO_TOTAL)}**`, `**${fmtInt(PART_TOTAL_SE)}**`, `**${fmtInt(respSE)}**`, `**${fmtPct(respSE / N_TOTAL_PESO)}**`, ''],
    ['Fora de Sergipe (título eleitoral de outra UF)', '—', '—', '—', '—', fmtInt(partFora), fmtInt(respFora), fmtPct(respFora / N_TOTAL_PESO), '0,0000'],
  ],
  ['l', 'l', 'r', 'r', 'r', 'r', 'r', 'r', 'r'],
))
L.push('')
L.push('## 3. Ponderação aplicada (pós-estratificação por município) e amostra efetiva')
L.push('')
L.push('Fórmula do peso de cada município *i* (view `v_peso_municipio`):')
L.push('')
L.push('> peso_i = (eleitorado_i ÷ Σ eleitorado) ÷ (respondentes_i ÷ Σ respondentes)')
L.push('')
L.push(`Σ eleitorado é somado sobre os municípios com ao menos um respondente (${comResp.length} de ${municipios.length}; ${fmtInt(E_COM_RESP)} eleitores) e Σ respondentes sobre todas as sessões com município informado (${fmtInt(N_TOTAL_PESO)}, incluindo as ${fmtInt(respFora)} de fora de Sergipe, que recebem peso 0 por não pertencerem ao eleitorado sergipano). Cada voto é multiplicado pelo peso do município do respondente; os percentuais ponderados são a razão entre somas de pesos. Recalculando os pesos a partir das contagens desta tabela, o maior desvio em relação aos pesos armazenados na view é ${desvioPeso.toExponential(2)} (diferença de arredondamento).`)
L.push('')
L.push(tab(['Medida', 'Valor'], [
  ['Respondentes ponderados (n, Sergipe)', fmtInt(respSE)],
  ['Σ n_i·w_i', fmtNum(sumNW, 2)],
  ['Σ n_i·w_i²', fmtNum(sumNW2, 2)],
  ['Amostra efetiva de Kish — n_eff = (Σ n·w)² ÷ Σ n·w²', fmtNum(nEff, 1)],
  ['Efeito do desenho — deff = n ÷ n_eff', fmtNum(deff, 3)],
  ['Margem de erro nominal (95%, p = 0,5) sobre n', `± ${fmtNum(100 * margem(respSE), 2)} p.p.`],
  ['Margem de erro ajustada (95%) sobre n_eff', `± ${fmtNum(100 * margem(nEff), 2)} p.p.`],
  ['Menor peso', `${fmtNum(pesoMin.peso, 4)} (${pesoMin.nome})`],
  ['Maior peso', `${fmtNum(pesoMax.peso, 4)} (${pesoMax.nome})`],
]))
L.push('')
L.push('Nível econômico não é ponderado por inexistência de parâmetro oficial no eleitorado (conforme o plano amostral registrado). Sexo, faixa etária e grau de instrução foram coletados (seção 4) e as tabelas de estratos do plano acompanham o documento "Tabela de Estratos e Ponderação"; os resultados foram divulgados em 04/09/2026 pela contagem direta; a pós-estratificação por município acima descrita foi calculada e publicada ao lado dos valores brutos em 06/09/2026, e os cruzamentos por sexo × faixa etária × instrução ficam à disposição para a ponderação completa a critério do estatístico responsável e da perícia.')
L.push('')
L.push('## 4. Art. 2º, §7º, IV — composição da amostra final')
L.push('')
L.push(`Base: ${fmtInt(val.length)} participantes com identidade verificada (CPF + WhatsApp), conforme cadastro respondido pelo próprio participante. "Não informado" corresponde ao campo deixado em branco.`)
L.push('')
for (const [d, titulo] of [['sexo', 'Sexo'], ['faixa_etaria', 'Faixa etária'], ['escolaridade', 'Grau de instrução'], ['nivel_economico', 'Nível econômico (autodeclarado)'], ['regiao', 'Região de Sergipe']]) {
  const m = comp[d]
  const ks = chavesOrdenadas(d, m)
  L.push(`### 4.${['sexo', 'faixa_etaria', 'escolaridade', 'nivel_economico', 'regiao'].indexOf(d) + 1}. ${titulo}`)
  L.push('')
  L.push(tab([titulo, 'Participantes', '%'], [...ks.map((k) => [rot(d, k), fmtInt(m.get(k)), fmtPct(m.get(k) / val.length)]), ['**Total**', `**${fmtInt(val.length)}**`, '**100,00%**']]))
  L.push('')
}
L.push('### 4.6. Cruzamento sexo × faixa etária × grau de instrução')
L.push('')
{
  const sexos = chavesOrdenadas('sexo', comp.sexo)
  const faixas = chavesOrdenadas('faixa_etaria', comp.faixa_etaria)
  const escs = chavesOrdenadas('escolaridade', comp.escolaridade)
  const rows = []
  for (const s of sexos) for (const f of faixas) {
    const cells = escs.map((e) => cruz.get(`${s}|${f}|${e}`) ?? 0)
    const t = cells.reduce((a, b) => a + b, 0)
    if (t === 0) continue
    rows.push([rot('sexo', s), f, ...cells.map(fmtInt), fmtInt(t)])
  }
  L.push(tab(['Sexo', 'Faixa etária', ...escs.map((e) => rot('escolaridade', e)), 'Total'], rows, ['l', 'l', ...escs.map(() => 'r'), 'r']))
}
L.push('')
L.push('### 4.7. Nível econômico × sexo')
L.push('')
{
  const sexos = chavesOrdenadas('sexo', comp.sexo)
  const nivs = chavesOrdenadas('nivel_economico', comp.nivel_economico)
  L.push(tab(['Nível econômico', ...sexos.map((s) => rot('sexo', s)), 'Total'], nivs.map((n) => {
    const cells = sexos.map((s) => nivelSexo.get(`${n}|${s}`) ?? 0)
    return [rot('nivel_economico', n), ...cells.map(fmtInt), fmtInt(cells.reduce((a, b) => a + b, 0))]
  }), ['l', ...sexos.map(() => 'r'), 'r']))
}
L.push('')
L.push('## 5. Resultados por cargo — bruto × ponderado')
L.push('')
L.push('"Bruto" é a contagem simples de respostas; "Ponderado" aplica os pesos por município da seção 3 (a divulgação de 04/09/2026 apresentou a contagem direta; os percentuais ponderados foram publicados em 06/09/2026 ao lado dos brutos). Percentuais de candidatos calculados sobre os votos nominais válidos do cargo; percentuais de partido (nominais + legenda) sobre o total de votos com partido; brancos e "não sabe" sobre o total de respostas do cargo. Para Deputado Federal e Estadual, listados os 30 primeiros por resultado ponderado e os demais agregados.')
L.push('')
for (const [cargo] of CARGOS) {
  const r = resultados[cargo]
  if (!r) continue
  L.push(`### 5.${CARGOS.findIndex((c) => c[0] === cargo) + 1}. ${r.rotulo}`)
  L.push('')
  L.push(`Respondentes: ${fmtInt(r.respondentes)} · respostas: ${fmtInt(r.respostas_total)} (válidas ${fmtInt(r.votos_numero)}, brancas ${fmtInt(r.votos_branco)}, não sabe ${fmtInt(r.votos_nao_sabe)}${r.votos_legenda_pura ? `, das válidas ${fmtInt(r.votos_legenda_pura)} só de legenda` : ''}).`)
  L.push('')
  const TOPN = cargo === 'federal' || cargo === 'estadual' ? 30 : 999
  const top = r.candidatos.slice(0, TOPN)
  const resto = r.candidatos.slice(TOPN)
  const rows = top.map((c) => [`${c.nome}${c.numero ? ` (${c.numero})` : ''}`, c.partido, fmtInt(c.votos), fmtPct(c.pct_bruto), fmtNum(c.pond, 1), fmtPct(c.pct_pond)])
  if (resto.length) rows.push([`Demais (${resto.length} candidatos)`, '—', fmtInt(soma(resto, (c) => c.votos)), fmtPct(soma(resto, (c) => c.pct_bruto)), fmtNum(soma(resto, (c) => c.pond), 1), fmtPct(soma(resto, (c) => c.pct_pond))])
  rows.push(['**Total nominal**', '', `**${fmtInt(r.base_nominal_bruta)}**`, '**100,00%**', `**${fmtNum(r.base_nominal_pond, 1)}**`, '**100,00%**'])
  L.push(tab(['Candidato', 'Partido', 'Votos (bruto)', '% bruto', 'Votos pond.', '% pond.'], rows, ['l', 'l', 'r', 'r', 'r', 'r']))
  L.push('')
  if (r.legendas.length && (cargo === 'federal' || cargo === 'estadual')) {
    L.push(`Votos por partido (nominais + legenda) — ${r.rotulo}:`)
    L.push('')
    const lt = r.legendas.slice(0, 15)
    const lr = r.legendas.slice(15)
    const lrows = lt.map((l) => [l.sigla, fmtInt(l.votos), fmtPct(l.pct_bruto), fmtNum(l.pond, 1), fmtPct(l.pct_pond)])
    if (lr.length) lrows.push([`Demais (${lr.length} partidos)`, fmtInt(soma(lr, (l) => l.votos)), fmtPct(soma(lr, (l) => l.pct_bruto)), fmtNum(soma(lr, (l) => l.pond), 1), fmtPct(soma(lr, (l) => l.pct_pond))])
    lrows.push(['**Total**', `**${fmtInt(r.base_partido_bruta)}**`, '**100,00%**', `**${fmtNum(r.base_partido_pond, 1)}**`, '**100,00%**'])
    L.push(tab(['Partido', 'Votos (bruto)', '% bruto', 'Votos pond.', '% pond.'], lrows, ['l', 'r', 'r', 'r', 'r']))
    L.push('')
  }
  L.push(tab(['Resposta', 'Bruto', '% do total de respostas', 'Ponderado', '% pond.'], [
    ['Branco / nulo', fmtInt(r.branco.votos), fmtPct(r.branco.pct_bruto), fmtNum(r.branco.pond, 1), fmtPct(r.branco.pct_pond)],
    ['Não sabe / não respondeu', fmtInt(r.nao_sabe.votos), fmtPct(r.nao_sabe.pct_bruto), fmtNum(r.nao_sabe.pond, 1), fmtPct(r.nao_sabe.pct_pond)],
  ], ['l', 'r', 'r', 'r', 'r']))
  L.push('')
}
L.push('## 6. Linha do tempo registrada no banco de dados')
L.push('')
L.push(tab(['Dia (BRT)', 'Cadastros iniciados', 'WhatsApp validado', 'Respondentes', 'Votos registrados'], json.linha_do_tempo.dias.map((d) => [d.dia, fmtInt(d.cadastros), fmtInt(d.validados), fmtInt(d.respondentes), fmtInt(d.votos)])))
L.push('')
L.push(`- Edição criada em ${dataHoraBRT(edicao.criado_em)} (BRT); período de coleta configurado de ${dataHoraBRT(edicao.inicio)} a ${dataHoraBRT(edicao.fim)}.`)
L.push(`- Primeiro cadastro: ${primeiroCadastro ? dataHoraBRT(primeiroCadastro) : '—'}; último cadastro: ${ultimoCadastro ? dataHoraBRT(ultimoCadastro) : '—'}.`)
L.push(`- Votos com hora de registro igual ou posterior ao encerramento programado: ${fmtInt(aposFim.length)}, em ${fmtInt(sessoesAposFim)} sessões — sessões iniciadas antes do encerramento e concluídas minutos depois (o sistema bloqueia a emissão de novos tokens após o fim, mas deixa concluir a sessão já aberta; a hora é gravada truncada na hora cheia). Última hora com voto: ${ultimaHoraVoto ? dataHoraBRT(ultimaHoraVoto) : '—'}.`)
L.push(`- Divulgação prevista: ${edicao.divulgacao_prevista ? dataHoraBRT(edicao.divulgacao_prevista) : '—'}; divulgação efetiva (ação "marcar_divulgacao", exigindo o código TOTP do responsável): ${edicao.divulgada_em ? dataHoraBRT(edicao.divulgada_em) : '—'}.`)
L.push(`- Notificações de resultado por WhatsApp (só a quem optou, ${fmtInt(optin)} participantes): ${fmtInt(enviados.length)} enviadas${envMin ? `, entre ${dataHoraBRT(envMin)} e ${dataHoraBRT(envMax)}` : ''}.`)
if (edicao.suspensa_em) L.push(`- **Divulgação pública suspensa** (ordem judicial) desde ${dataHoraBRT(edicao.suspensa_em)} — ${edicao.suspensao_motivo ?? ''}.`)
L.push('')
L.push('Trilha de auditoria administrativa da edição (tabela `admin_audit_log`, sem dados pessoais):')
L.push('')
L.push(tab(['Data/hora (BRT)', 'Ação', 'Detalhe'], auditoria.map((a) => [dataHoraBRT(a.criado_em), a.acao, Object.entries(a.detalhe ?? {}).filter(([k]) => k !== 'edicao_id').map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('; ')]), ['l', 'l', 'l']))
L.push('')
L.push('## 7. Notas de conciliação')
L.push('')
L.push(`- A composição demográfica registrada na complementação de 04/09/2026 somava 10.310 participantes; a base atual soma ${fmtInt(val.length)}. A diferença de 4 participantes será conciliada pelo estatístico responsável [confirmar a causa antes de protocolar]; além disso, em 06/09/2026 foi corrigido um erro de paginação na leitura das views (limite de 1.000 linhas por consulta) que afetava a tabela de composição publicada. Os totais deste anexo, recalculados diretamente sobre os registros, substituem os anteriores.`)
L.push(`- ${fmtInt(partFora)} participantes validados (${fmtInt(respFora)} respondentes) informaram município de outra UF; recebem peso 0 e não integram os percentuais ponderados. Ficam listados por transparência.`)
L.push(`- Sexo é o único campo com "não informado" em volume relevante (${fmtInt(comp.sexo.get('nao_informado') ?? 0)}); faixa etária e instrução eram obrigatórios. Nível econômico "não informado": ${fmtInt(comp.nivel_economico.get('nao_informado') ?? 0)}.`)
L.push(`- Conferência: a view \`v_amostra_composicao\` (usada em /transparencia) reporta sexo F = ${fmtInt(viewSexo.F ?? 0)} e M = ${fmtInt(viewSexo.M ?? 0)}; este anexo, calculado sobre os mesmos registros, reporta F = ${fmtInt(comp.sexo.get('F') ?? 0)} e M = ${fmtInt(comp.sexo.get('M') ?? 0)}.`)
L.push('- O TSE não publica o eleitorado por sexo × faixa etária × instrução por município em formato aberto acessível a esta plataforma na data de geração; a pós-estratificação por município usa o eleitorado municipal total (Estatísticas do Eleitorado, TSE) carregado no cadastro `municipios_se`.')
L.push('')
L.push('## 8. Reprodutibilidade')
L.push('')
L.push('Este anexo é gerado por `scripts/anexo-rp-0601015.mjs` a partir das tabelas `eleitores_pesquisa`, `votos_pesquisa`, `municipios_se`, `candidatos_pesquisa`, `partidos` e das views `v_peso_municipio`, `v_cobertura_municipio`, `v_amostra_composicao`, `v_resultados_candidato_pond`, `v_resultados_legenda_pond`, `v_votos_branco_nao_sabe_pond` e `v_resumo_edicao`, cujas definições SQL constam do documento "Memória de cálculo (SQL)". O banco de dados anonimizado (sem CPF, telefone ou IP) fica à disposição da Justiça Eleitoral e da perícia (Res.-TSE 23.600/2019, art. 13).')
L.push('')
writeFileSync(join(OUT_DIR, 'anexo-tecnico-numeros.md'), L.join('\n'))

// ------------------------------------------------ textos pra complementação
const hoje = diaBRT(agora.toISOString())
const hojeISO = agora.toISOString().slice(0, 10)
const C = []
C.push(`# Complementação PesqEle — art. 2º, §7º, III e IV (Res.-TSE 23.600/2019)`)
C.push('')
C.push(`Data-base: ${hoje}. Vale para os dois registros — **SE-09441/2026 (TRE-SE)** e **BR-04041/2026 (TSE)** — porque o campo de coleta e a amostra são os mesmos. Números gerados por \`scripts/anexo-rp-0601015.mjs\` (ver Anexo Técnico). Copiar e colar os blocos abaixo nos campos correspondentes do PesqEle.`)
C.push('')
C.push('## A. Texto para o campo "III — número de pesquisados por unidade territorial"')
C.push('')
C.push('```')
C.push(`NÚMERO DE PESQUISADOS POR UNIDADE TERRITORIAL (art. 2º, §7º, III) — amostra final da coleta de ${diaBRT(edicao.inicio)} a ${diaBRT(new Date(fimMs - 1000).toISOString())}.`)
C.push(`Unidade territorial: MUNICÍPIO (art. 2º, §7º-F — coleta digital estadual com identidade verificada por CPF e WhatsApp, sem abordagem domiciliar; o setor censitário não é unidade operacional da coleta). Total de respondentes: ${fmtInt(respondentesTotal)}, sendo ${fmtInt(respSE)} em ${comResp.length} dos ${municipios.length} municípios de Sergipe (ponderados) e ${fmtInt(respFora)} com título de outra UF (peso zero, fora dos percentuais). Formato: Município — planejado / respondentes / peso.`)
C.push(linhasMun.map((r) => `${r.nome} — ${fmtInt(r.planejado)} / ${fmtInt(r.respondentes)} / ${fmtNum(r.peso, 3)}`).join('; ') + '.')
C.push(`Planejado = cota proporcional ao eleitorado TSE de cada município (total ${fmtInt(PLANEJADO_TOTAL)}). Peso = (eleitorado do município ÷ eleitorado total) ÷ (respondentes do município ÷ total de respondentes). Amostra efetiva (Kish): ${fmtNum(nEff, 0)}; deff ${fmtNum(deff, 2)}; margem de erro 95%: ±${fmtNum(100 * margem(respSE), 1)} p.p. nominal e ±${fmtNum(100 * margem(nEff), 1)} p.p. sobre a amostra efetiva.`)
C.push('```')
C.push('')
C.push('## B. Texto para o campo "IV — composição da amostra final"')
C.push('')
C.push('```')
C.push(`COMPOSIÇÃO DA AMOSTRA FINAL (art. 2º, §7º, IV) — ${fmtInt(val.length)} participantes com identidade verificada (CPF + WhatsApp), ${fmtInt(respondentesTotal)} respondentes.`)
for (const [d, titulo] of [['sexo', 'SEXO'], ['faixa_etaria', 'FAIXA ETÁRIA'], ['escolaridade', 'GRAU DE INSTRUÇÃO'], ['nivel_economico', 'NÍVEL ECONÔMICO (autodeclarado; sem ponderação por falta de parâmetro oficial)'], ['regiao', 'REGIÃO']]) {
  const m = comp[d]
  C.push(`${titulo}: ` + chavesOrdenadas(d, m).map((k) => `${rot(d, k)} ${fmtInt(m.get(k))} (${fmtPct(m.get(k) / val.length, 1)})`).join('; ') + '.')
}
C.push(`PONDERAÇÃO APLICADA: pós-estratificação por município (${comResp.length} estratos) pelo eleitorado TSE; pesos entre ${fmtNum(pesoMin.peso, 3)} (${pesoMin.nome}) e ${fmtNum(pesoMax.peso, 3)} (${pesoMax.nome}); amostra efetiva ${fmtNum(nEff, 0)}. Cruzamentos sexo × faixa etária × instrução constam do Anexo Técnico e da Tabela de Estratos e Ponderação anexada. Resultados divulgados em ${edicao.divulgada_em ? diaBRT(edicao.divulgada_em) : '—'} (contagem direta); percentuais ponderados por município publicados em 06/09/2026 ao lado dos brutos.`)
C.push('```')
C.push('')
C.push('## C. Passo a passo no PesqEle (área logada — usuário da CDL)')
C.push('')
C.push('1. Entrar em https://pesqele.tse.jus.br com o certificado/usuário da CDL e abrir a pesquisa **SE-09441/2026**; repetir tudo depois para **BR-04041/2026**.')
C.push('2. Usar a opção de **alteração/complementação de dados** da pesquisa registrada (art. 2º, §7º) e localizar os campos "número de pesquisados por unidade territorial" e "composição da amostra final". Se os campos não existirem separados, colar os blocos A e B no campo de "plano amostral / informações complementares".')
C.push('3. **Anexar** de novo `docs/Tabela-Estratos-Ponderacao.pdf` (a tabela de estratos que a decisão não localizou), o **Anexo Técnico** em PDF (`anexo-tecnico-numeros.pdf`) e a declaração do estatístico responsável (CONRE 8223) se o sistema pedir.')
C.push('4. Conferir e corrigir, se constar, o cargo **"Deputado Distrital"** (Sergipe não elege deputado distrital) e verificar a **data de divulgação** informada; se o sistema exibir 28/08/2026, registrar na justificativa que a divulgação efetiva foi 04/09/2026 09h14 (BRT) e que 28/08 era apenas a data mínima permitida (registro + 5 dias).')
C.push('5. Gerar/salvar o **recibo** da complementação e o **espelho** atualizado (Imprimir → PDF) dos dois registros.')
C.push('6. Juntar nos autos da Rp 0601015-42.2026.6.25.0000: recibo + espelho + Anexo Técnico + Tabela de Estratos + este texto, e pedir a reapreciação da tutela (a decisão diz que "a medida será reapreciada tão logo comprovada nos autos a complementação").')
C.push('')
writeFileSync(join(OUT_DIR, `complementacao-pesqele-${hojeISO}.md`), C.join('\n'))

console.log('ok →', join(OUT_DIR, 'anexo-tecnico-numeros.md'), '+ .json +', `complementacao-pesqele-${hojeISO}.md`)
console.log({ E_TOTAL, META, PLANEJADO_TOTAL, validados: val.length, partSE, partFora, respondentesTotal, respSE, respFora, N_TOTAL_PESO, nEff: +nEff.toFixed(1), deff: +deff.toFixed(3), sumNW: +sumNW.toFixed(1), aposFim: aposFim.length, sessoesAposFim, optin, enviados: enviados.length })
