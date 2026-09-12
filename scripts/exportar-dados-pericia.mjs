#!/usr/bin/env node
/**
 * Exportação de dados agregados para a perícia — Rp 0601015-42.2026.6.25.0000 (TRE-SE).
 *
 * Gera, a partir do banco da pesquisa (edição ativa), os arquivos CSV e JSON pedidos
 * pelo estatístico/perito ("exportações dos dados que geraram os anexos"):
 *
 *   docs/juridico/rp-0601015-42/exportacoes-pericia-<AAAA-MM-DD>/
 *     csv/    tabelas (separador ";", decimal com vírgula, UTF-8 com BOM)
 *     json/   as mesmas tabelas com tipos numéricos + resumo.json
 *     anexo/  cópias dos arquivos gerados por scripts/anexo-rp-0601015.mjs (doc. 11)
 *
 * As consultas SQL equivalentes a cada arquivo estão em sql/ (escritas à mão, com
 * o mesmo critério de cada tabela) e podem ser executadas diretamente no banco.
 *
 * PRIVACIDADE (arquitetura "duas salas")
 *   - Nunca lê: whatsapp_e164, ip, user_agent, nome_mascarado, cpf_mascarado, codigo_hash.
 *   - Lê em memória, apenas para contar, e descarta antes de qualquer gravação:
 *       cpf_hash          (liga cadastro <-> códigos OTP; duplicidade de CPF)
 *       device_fingerprint (histograma de aparelhos compartilhados)
 *     Nenhum dos dois é gravado em arquivo, nem em nível de linha nem hasheado.
 *   - token_hash é lido para contar respondentes distintos (sessões) e nunca gravado.
 *   - Saída: somente agregados. Sem nomes, CPFs, telefones, IPs ou senhas.
 *
 * Uso:  node --env-file=.env.local scripts/exportar-dados-pericia.mjs
 *       DATA=2026-09-09 META_AMOSTRA=20000 node --env-file=.env.local scripts/exportar-dados-pericia.mjs
 *
 * Edição: `--edicao <uuid>` (ou env EDICAO_ID); sem isso, usa a ativa. Desde
 * 12/09/2026 a ativa é a 2ª edição — pra regerar material da Rp use --edicao
 * 2c9211d1-6fd2-476d-8872-5952c12db5e9 (1ª edição).
 */
import { createClient } from '@supabase/supabase-js'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) {
  throw new Error('faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (rode com --env-file=.env.local)')
}
const db = createClient(URL, KEY, { auth: { persistSession: false } })

const TZ = 'America/Maceio' // Sergipe: UTC-3, sem horário de verão
const PAGE = 1000
const RP = '0601015-42.2026.6.25.0000'
const BASE_DIR = 'docs/juridico/rp-0601015-42'
const DATA = process.env.DATA ?? new Date().toISOString().slice(0, 10)
const OUT = join(BASE_DIR, `exportacoes-pericia-${DATA}`)
const META = Number(process.env.META_AMOSTRA ?? 20000) // entrevistas previstas no registro PesqEle
const CARGOS = ['presidente', 'governador', 'senador', 'federal', 'estadual', 'zona_expansao']
const CARGOS_SE = ['presidente', 'governador', 'senador', 'federal', 'estadual'] // cédula completa em SE
const CARGO_ROT = {
  presidente: 'Presidente da República', governador: 'Governador', senador: 'Senador (até duas opções por respondente)',
  federal: 'Deputado Federal', estadual: 'Deputado Estadual', zona_expansao: 'Zona de expansão (pergunta extra)',
}
const SINGLE_SHOT = new Set(['presidente', 'governador', 'federal', 'estadual', 'zona_expansao'])
const ORDEM = {
  sexo: ['F', 'M', 'nao_informado'],
  faixa_etaria: ['16-17', '18-24', '25-34', '35-44', '45-59', '60+', 'nao_informado'],
  escolaridade: ['fundamental', 'medio', 'superior', 'nao_informado'],
  nivel_economico: ['A', 'B', 'C', 'D_E', 'nao_informado'],
  regiao: ['grande_aracaju', 'leste', 'centro_sul', 'agreste', 'sertao', 'baixo_sao_francisco', 'fora_de_se', 'sem_municipio'],
}
const DIMS = ['sexo', 'faixa_etaria', 'escolaridade', 'nivel_economico', 'regiao']

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
function contar(arr, key) {
  const m = new Map()
  for (const x of arr) { const k = key(x); m.set(k, (m.get(k) ?? 0) + 1) }
  return m
}
const soma = (arr, f) => arr.reduce((s, x) => s + f(x), 0)
const pct = (a, b) => (b ? a / b : 0)
const horaUTC = (iso) => new Date(iso).toISOString().slice(0, 13) + ':00Z'
const dataHoraBRT = (iso) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''
const ordenar = (dim, chaves) => [...new Set([...(ORDEM[dim] ?? []), ...chaves])].filter((k) => chaves.includes(k))

// CSV: ";" como separador, vírgula decimal, UTF-8 com BOM (abre direto no Excel pt-BR).
function cell(v) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(v).replace('.', ',')
  if (typeof v === 'boolean') return v ? 'sim' : 'nao'
  const s = String(v)
  return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}
const escritos = []
function csv(nome, headers, rows) {
  const linhas = [headers.join(';'), ...rows.map((r) => headers.map((h) => cell(r[h])).join(';'))]
  writeFileSync(join(OUT, 'csv', nome + '.csv'), '﻿' + linhas.join('\r\n') + '\r\n')
  writeFileSync(join(OUT, 'json', nome + '.json'), JSON.stringify({ arquivo: nome, gerado_em: AGORA.toISOString(), colunas: headers, linhas: rows.length, dados: rows }, null, 1))
  escritos.push({ arquivo: nome, linhas: rows.length })
  console.log(`  ${nome}: ${rows.length} linhas`)
}

// ------------------------------------------------------------------- carga
const AGORA = new Date()
const EDICAO_ARG = process.argv.includes('--edicao') ? process.argv[process.argv.indexOf('--edicao') + 1] : (process.env.EDICAO_ID || null)
const qEd = db.from('edicao').select('*')
const { data: edicao, error: eEd } = EDICAO_ARG ? await qEd.eq('id', EDICAO_ARG).maybeSingle() : await qEd.eq('ativa', true).maybeSingle()
if (eEd || !edicao) throw new Error('edição não encontrada: ' + (EDICAO_ARG ?? 'ativa') + ' ' + (eEd?.message ?? ''))
const eid = edicao.id
const fimMs = new Date(edicao.fim).getTime()
console.log('edição:', edicao.nome, eid, '| saída:', OUT)
for (const d of ['csv', 'json', 'anexo']) mkdirSync(join(OUT, d), { recursive: true })

const municipiosSE = await all('municipios_se', 'ibge_codigo, nome, regiao, eleitorado, cota_pesquisa, zona_expansao', { order: 'ibge_codigo' })
const municipiosBR = await all('municipios_br', 'ibge_codigo, nome, uf', { order: 'ibge_codigo' })
const pesosView = await all('v_peso_municipio', '*', { eq: { edicao_id: eid }, order: 'municipio_ibge' })
const { data: resumoView } = await db.from('v_resumo_edicao').select('*').eq('edicao_id', eid).maybeSingle()
const candidatos = await all('candidatos_pesquisa', 'id, cargo, numero, nome_urna, partido_id, coligacao, ativo', { eq: { edicao_id: eid } })
const partidos = await all('partidos', 'id, numero, sigla, nome')
console.log('baixando cadastros (cpf_hash e device_fingerprint só em memória)…')
const eleitoresRaw = await all(
  'eleitores_pesquisa',
  'id, criado_em, fonte, spc_validado, wa_validado, token_emitido, sexo, faixa_etaria, escolaridade, nivel_economico, municipio_ibge, cpf_hash, device_fingerprint',
  { eq: { edicao_id: eid } },
)
console.log('baixando códigos OTP (sem codigo_hash, sem whatsapp)…')
const codigosRaw = await all('whatsapp_codigos', 'id, cpf_hash, validado, tentativas, criado_em, expira_em', { eq: { edicao_id: eid } })
console.log('baixando tokens e votos…')
const tokens = await all('tokens_emitidos', 'token_hash, usado, criado_hora', { eq: { edicao_id: eid }, order: 'token_hash' })
const votos = await all(
  'votos_pesquisa',
  'id, token_hash, cargo, candidato_id, partido_id, metodo, resposta, criado_hora, municipio_ibge, sexo, faixa_etaria, escolaridade, nivel_economico',
  { eq: { edicao_id: eid } },
)
console.log(`cadastros ${eleitoresRaw.length} · códigos ${codigosRaw.length} · tokens ${tokens.length} · votos ${votos.length}`)

// ------------------------------------------------ cpf_hash / fingerprint: só contagem
const codigosPorCpf = new Map()
for (const c of codigosRaw) {
  if (!codigosPorCpf.has(c.cpf_hash)) codigosPorCpf.set(c.cpf_hash, [])
  codigosPorCpf.get(c.cpf_hash).push(c)
}
for (const lista of codigosPorCpf.values()) lista.sort((a, b) => a.criado_em.localeCompare(b.criado_em))
const cpfCount = contar(eleitoresRaw, (e) => e.cpf_hash)
const cpfDuplicados = [...cpfCount.values()].filter((n) => n > 1).length
const cpfCadastrados = new Set(cpfCount.keys())
const cpfValidados = new Set(eleitoresRaw.filter((e) => e.wa_validado).map((e) => e.cpf_hash))
const fpValidados = contar(eleitoresRaw.filter((e) => e.wa_validado && e.device_fingerprint), (e) => e.device_fingerprint)
const fpTodos = contar(eleitoresRaw.filter((e) => e.device_fingerprint), (e) => e.device_fingerprint)

const eleitores = eleitoresRaw.map((e) => {
  const cods = codigosPorCpf.get(e.cpf_hash) ?? []
  const ult = cods[cods.length - 1]
  const outrosValidadosMesmaDigital = e.device_fingerprint ? (fpValidados.get(e.device_fingerprint) ?? 0) - (e.wa_validado ? 1 : 0) : 0
  const { cpf_hash, device_fingerprint, ...resto } = e
  return {
    ...resto,
    n_codigos: cods.length,
    primeiro_codigo_em: cods[0]?.criado_em ?? null,
    ultimo_codigo_em: ult?.criado_em ?? null,
    ultimo_codigo_consumido: ult ? ult.validado : null,
    ultimo_codigo_tentativas: ult ? ult.tentativas : null,
    max_tentativas: cods.reduce((m, c) => Math.max(m, c.tentativas), 0),
    tem_digital: Boolean(device_fingerprint),
    digital_compartilhada_com_validado: outrosValidadosMesmaDigital > 0,
  }
})
const codigos = codigosRaw.map((c) => {
  const { cpf_hash, ...resto } = c
  return { ...resto, cadastro: cpfValidados.has(cpf_hash) ? 'validado' : cpfCadastrados.has(cpf_hash) ? 'nao_validado' : 'sem_cadastro' }
})
const cpfOrfaos = new Set(codigosRaw.filter((c) => !cpfCadastrados.has(c.cpf_hash)).map((c) => c.cpf_hash)).size
eleitoresRaw.length = 0
codigosRaw.length = 0
codigosPorCpf.clear()
// a partir daqui nenhum objeto carrega cpf_hash ou device_fingerprint

// ------------------------------------------------------- territórios e sessões
const seSet = new Set(municipiosSE.map((m) => m.ibge_codigo))
const munSE = new Map(municipiosSE.map((m) => [m.ibge_codigo, m]))
const munBR = new Map(municipiosBR.map((m) => [m.ibge_codigo, m]))
const E_TOTAL = soma(municipiosSE, (m) => m.eleitorado)
const classe = (ibge) => (ibge == null ? 'sem_municipio' : seSet.has(ibge) ? 'se' : 'fora_de_se')
const regiaoDe = (ibge) => (ibge == null ? 'sem_municipio' : munSE.get(ibge)?.regiao ?? 'fora_de_se')

const val = eleitores.filter((e) => e.wa_validado)
const naoVal = eleitores.filter((e) => !e.wa_validado)

// sessão = token com ao menos um voto (respondente)
const sessoes = new Map()
for (const v of votos) {
  let s = sessoes.get(v.token_hash)
  if (!s) {
    s = { cargos: new Set(), n_votos: 0, municipio_ibge: v.municipio_ibge, sexo: v.sexo, faixa_etaria: v.faixa_etaria, escolaridade: v.escolaridade, nivel_economico: v.nivel_economico, primeiro: v.criado_hora, ultimo: v.criado_hora, inconsistente: false, senador: 0 }
    sessoes.set(v.token_hash, s)
  }
  s.cargos.add(v.cargo)
  s.n_votos++
  if (v.cargo === 'senador') s.senador++
  if (v.criado_hora < s.primeiro) s.primeiro = v.criado_hora
  if (v.criado_hora > s.ultimo) s.ultimo = v.criado_hora
  if (s.municipio_ibge !== v.municipio_ibge || s.sexo !== v.sexo || s.faixa_etaria !== v.faixa_etaria || s.escolaridade !== v.escolaridade || s.nivel_economico !== v.nivel_economico) s.inconsistente = true
}
const tokenBy = new Map(tokens.map((t) => [t.token_hash, t]))
for (const [th, s] of sessoes) {
  s.classe = classe(s.municipio_ibge)
  s.completa = s.classe === 'se' ? CARGOS_SE.every((c) => s.cargos.has(c)) : s.cargos.has('presidente')
  s.n_cargos = [...s.cargos].filter((c) => c !== 'zona_expansao').length
  s.token_usado = tokenBy.get(th)?.usado ?? null
  s.token_existe = tokenBy.has(th)
}
const resp = [...sessoes.values()]
const respSE = resp.filter((s) => s.classe === 'se')
const respFora = resp.filter((s) => s.classe === 'fora_de_se')
const respSemMun = resp.filter((s) => s.classe === 'sem_municipio')
const valSE = val.filter((e) => classe(e.municipio_ibge) === 'se')
const valFora = val.filter((e) => classe(e.municipio_ibge) === 'fora_de_se')
const valSemMun = val.filter((e) => classe(e.municipio_ibge) === 'sem_municipio')
const tokensSemVoto = tokens.filter((t) => !sessoes.has(t.token_hash))

// ------------------------------------------------------------ 01 · funil
const fonte = contar(eleitores, (e) => e.fonte ?? 'nao_informado')
const nCargosSE = contar(respSE, (s) => s.n_cargos)
const funil = [
  { etapa: 'cadastros_iniciados', n: eleitores.length, base: 'eleitores_pesquisa (edição)', descricao: 'CPF verificado e dados confirmados; inclui quem não validou o WhatsApp' },
  ...[...fonte.entries()].sort().map(([f, n]) => ({ etapa: `cadastros_fonte_${f}`, n, base: 'eleitores_pesquisa.fonte', descricao: f === 'cdl_base' ? 'CPF encontrado na base de associados/clientes da CDL' : f === 'spc' ? 'CPF consultado no SPC' : f })),
  { etapa: 'cadastros_spc_validado', n: eleitores.filter((e) => e.spc_validado).length, base: 'eleitores_pesquisa.spc_validado', descricao: 'CPF confirmado (base CDL com faixa etária, ou consulta SPC); é true em todos os cadastros gravados' },
  { etapa: 'identidade_validada', n: val.length, base: 'eleitores_pesquisa.wa_validado = true', descricao: 'Código OTP do WhatsApp confirmado (= "participantes" do Anexo Técnico)' },
  { etapa: 'identidade_validada_se', n: valSE.length, base: 'wa_validado e município de Sergipe', descricao: '' },
  { etapa: 'identidade_validada_fora_se', n: valFora.length, base: 'wa_validado e município de outra UF', descricao: 'Peso 0; respondem só a pergunta de Presidente' },
  { etapa: 'identidade_validada_sem_municipio', n: valSemMun.length, base: 'wa_validado e municipio_ibge nulo', descricao: '' },
  { etapa: 'nao_validados', n: naoVal.length, base: 'eleitores_pesquisa.wa_validado = false', descricao: 'Cadastro sem confirmação do OTP; não recebeu token; não responde (ver 02-nao-validados)' },
  { etapa: 'tokens_emitidos', n: tokens.length, base: 'tokens_emitidos (edição)', descricao: 'Um token por validação; supera identidade_validada em ' + (tokens.length - val.length) + ' porque cadastros validados foram apagados a pedido do titular (LGPD) e o token, sem vínculo, permanece' },
  { etapa: 'tokens_usados', n: tokens.filter((t) => t.usado).length, base: 'tokens_emitidos.usado = true', descricao: 'Marcado ao concluir o último cargo da cédula' },
  { etapa: 'tokens_sem_voto', n: tokensSemVoto.length, base: 'tokens_emitidos sem linha em votos_pesquisa', descricao: 'Validou e não respondeu nenhuma pergunta (' + tokensSemVoto.filter((t) => t.usado).length + ' com usado = true)' },
  { etapa: 'respondentes', n: resp.length, base: 'count(distinct token_hash) em votos_pesquisa', descricao: 'Sessões com ao menos uma resposta (10.166 do Anexo Técnico)' },
  { etapa: 'respondentes_se', n: respSE.length, base: 'respondentes com município de Sergipe', descricao: 'Entram na ponderação' },
  { etapa: 'respondentes_fora_se', n: respFora.length, base: 'respondentes com município de outra UF', descricao: 'Peso 0; contam no bruto de Presidente' },
  { etapa: 'respondentes_sem_municipio', n: respSemMun.length, base: 'respondentes com municipio_ibge nulo', descricao: '' },
  ...[1, 2, 3, 4, 5].map((k) => ({ etapa: `respondentes_se_${k}_cargos`, n: nCargosSE.get(k) ?? 0, base: 'cargos distintos respondidos (sem zona_expansao)', descricao: k === 5 ? 'Cédula completa' : 'Abandonou antes do fim' })),
  { etapa: 'respondentes_se_cedula_completa', n: respSE.filter((s) => s.completa).length, base: '5 cargos respondidos', descricao: '' },
  { etapa: 'respondentes_fora_se_cedula_completa', n: respFora.filter((s) => s.completa).length, base: 'presidente respondido', descricao: '' },
  { etapa: 'votos_registrados', n: votos.length, base: 'votos_pesquisa (edição)', descricao: 'Linhas de resposta (senador tem até 2 por respondente)' },
  ...['numero', 'branco', 'nao_sabe'].map((m) => ({ etapa: `votos_metodo_${m}`, n: votos.filter((v) => v.metodo === m).length, base: 'votos_pesquisa.metodo', descricao: '' })),
  { etapa: 'view_v_resumo_edicao_eleitores_cadastrados', n: resumoView?.eleitores_cadastrados ?? null, base: 'v_resumo_edicao', descricao: 'Conferência com a view usada em /admin' },
  { etapa: 'view_v_resumo_edicao_tokens_emitidos', n: resumoView?.tokens_emitidos ?? null, base: 'v_resumo_edicao', descricao: '' },
  { etapa: 'view_v_resumo_edicao_tokens_usados', n: resumoView?.tokens_usados ?? null, base: 'v_resumo_edicao', descricao: '' },
]
console.log('gravando…')
csv('01-participacao-funil', ['etapa', 'n', 'base', 'descricao'], funil)

// ------------------------------------------------------ 02 · não validados
const cruzNV = contar(naoVal, (e) => `${Math.min(e.n_codigos, 4)}|${e.max_tentativas}|${e.digital_compartilhada_com_validado}`)
const linhasNV = [...cruzNV.entries()].map(([k, n]) => {
  const [c, t, d] = k.split('|')
  return { codigos_enviados: c === '4' ? '4 ou mais' : c, max_tentativas_erradas: Number(t), digital_compartilhada_com_validado: d === 'true', n }
}).sort((a, b) => String(a.codigos_enviados).localeCompare(String(b.codigos_enviados)) || a.max_tentativas_erradas - b.max_tentativas_erradas || Number(a.digital_compartilhada_com_validado) - Number(b.digital_compartilhada_com_validado))
csv('02-nao-validados', ['codigos_enviados', 'max_tentativas_erradas', 'digital_compartilhada_com_validado', 'n'], linhasNV)
const nvResumo = [
  { situacao: 'nao_validados_total', n: naoVal.length, descricao: 'Cadastros sem confirmação do código OTP' },
  { situacao: 'sem_codigo_registrado', n: naoVal.filter((e) => e.n_codigos === 0).length, descricao: 'Nenhum código OTP gravado para o CPF' },
  { situacao: 'um_codigo_enviado', n: naoVal.filter((e) => e.n_codigos === 1).length, descricao: 'Recebeu um código e não o confirmou em 10 min (expirou)' },
  { situacao: 'dois_ou_mais_codigos', n: naoVal.filter((e) => e.n_codigos >= 2).length, descricao: 'Pediu reenvio; os anteriores são marcados validado=true ("consumido/invalidado") pelo reenvio' },
  { situacao: 'ultimo_codigo_tentativas_esgotadas', n: naoVal.filter((e) => e.ultimo_codigo_tentativas >= 3).length, descricao: 'Errou 3 vezes o último código (limite TENTATIVAS_MAX = 3)' },
  { situacao: 'ultimo_codigo_consumido_sem_validar', n: naoVal.filter((e) => e.ultimo_codigo_consumido === true).length, descricao: 'Último código marcado consumido e cadastro não validado (esperado 0)' },
  { situacao: 'digital_compartilhada_com_validado', n: naoVal.filter((e) => e.digital_compartilhada_com_validado).length, descricao: 'Mesmo aparelho (fingerprint) de ao menos um cadastro validado' },
  { situacao: 'sem_digital', n: naoVal.filter((e) => !e.tem_digital).length, descricao: 'Sem fingerprint gravado' },
  { situacao: 'whatsapp_ja_validado_por_outro_cpf', n: null, descricao: 'Exige ler whatsapp_e164: só pela consulta sql/02-nao-validados.sql (resultado em 09/09/2026: 2)' },
  { situacao: 'codigos_otp_total', n: codigos.length, descricao: 'Linhas de whatsapp_codigos da edição' },
  { situacao: 'codigos_otp_cadastro_validado', n: codigos.filter((c) => c.cadastro === 'validado').length, descricao: '' },
  { situacao: 'codigos_otp_cadastro_nao_validado', n: codigos.filter((c) => c.cadastro === 'nao_validado').length, descricao: '' },
  { situacao: 'codigos_otp_sem_cadastro', n: codigos.filter((c) => c.cadastro === 'sem_cadastro').length, descricao: `Código cujo CPF não tem mais cadastro na edição (${cpfOrfaos} CPFs; exclusão LGPD com falha parcial ao apagar códigos)` },
  { situacao: 'codigos_otp_sem_cadastro_validado_true', n: codigos.filter((c) => c.cadastro === 'sem_cadastro' && c.validado).length, descricao: '' },
]
csv('02b-nao-validados-resumo', ['situacao', 'n', 'descricao'], nvResumo)

// ------------------------------------------------------ 03 · territorial
const valPorMun = contar(val, (e) => e.municipio_ibge ?? 'null')
const respPorMun = new Map()
for (const s of resp) { const k = s.municipio_ibge ?? 'null'; if (!respPorMun.has(k)) respPorMun.set(k, []); respPorMun.get(k).push(s) }
const votosPorMun = contar(votos, (v) => v.municipio_ibge ?? 'null')
const N_TOTAL = resp.length - respSemMun.length // = n_total da view (respondentes com município)
const E_COM_RESP = soma(municipiosSE.filter((m) => (respPorMun.get(m.ibge_codigo) ?? []).length > 0), (m) => m.eleitorado)
const todasCotas = municipiosSE.every((m) => m.cota_pesquisa != null)
const pesoBy = new Map(pesosView.map((p) => [p.municipio_ibge, p]))
const territorial = municipiosSE.map((m) => {
  const rs = respPorMun.get(m.ibge_codigo) ?? []
  const n = rs.length
  return {
    ibge: m.ibge_codigo, municipio: m.nome, uf: 'SE', regiao: m.regiao, eleitorado: m.eleitorado, pct_eleitorado: pct(m.eleitorado, E_TOTAL),
    cota_planejada: todasCotas ? m.cota_pesquisa : Math.round(META * m.eleitorado / E_TOTAL),
    cadastros_validados: valPorMun.get(m.ibge_codigo) ?? 0,
    respondentes: n, respondentes_cedula_completa: rs.filter((s) => s.completa).length, respondentes_parciais: rs.filter((s) => !s.completa).length,
    votos: votosPorMun.get(m.ibge_codigo) ?? 0, pct_amostra: pct(n, N_TOTAL), peso: pesoBy.get(m.ibge_codigo) ? Number(pesoBy.get(m.ibge_codigo).peso) : 0,
  }
}).sort((a, b) => b.eleitorado - a.eleitorado)
const foraUF = new Map()
for (const e of valFora) { const uf = munBR.get(e.municipio_ibge)?.uf ?? '??'; foraUF.set(uf, foraUF.get(uf) ?? { uf, cadastros_validados: 0, respondentes: 0, votos: 0 }); foraUF.get(uf).cadastros_validados++ }
for (const s of respFora) { const uf = munBR.get(s.municipio_ibge)?.uf ?? '??'; foraUF.set(uf, foraUF.get(uf) ?? { uf, cadastros_validados: 0, respondentes: 0, votos: 0 }); foraUF.get(uf).respondentes++; foraUF.get(uf).votos += s.n_votos }
territorial.push(
  { ibge: null, municipio: 'TOTAL SERGIPE', uf: 'SE', regiao: null, eleitorado: E_TOTAL, pct_eleitorado: 1, cota_planejada: soma(territorial, (r) => r.cota_planejada), cadastros_validados: valSE.length, respondentes: respSE.length, respondentes_cedula_completa: respSE.filter((s) => s.completa).length, respondentes_parciais: respSE.filter((s) => !s.completa).length, votos: soma(territorial, (r) => r.votos), pct_amostra: pct(respSE.length, N_TOTAL), peso: null },
  { ibge: null, municipio: 'FORA DE SERGIPE (outra UF)', uf: null, regiao: 'fora_de_se', eleitorado: null, pct_eleitorado: null, cota_planejada: 0, cadastros_validados: valFora.length, respondentes: respFora.length, respondentes_cedula_completa: respFora.filter((s) => s.completa).length, respondentes_parciais: respFora.filter((s) => !s.completa).length, votos: soma(respFora, (s) => s.n_votos), pct_amostra: pct(respFora.length, N_TOTAL), peso: 0 },
  { ibge: null, municipio: 'SEM MUNICÍPIO', uf: null, regiao: 'sem_municipio', eleitorado: null, pct_eleitorado: null, cota_planejada: 0, cadastros_validados: valSemMun.length, respondentes: respSemMun.length, respondentes_cedula_completa: 0, respondentes_parciais: respSemMun.length, votos: soma(respSemMun, (s) => s.n_votos), pct_amostra: null, peso: 0 },
)
csv('03-territorial-municipio', ['ibge', 'municipio', 'uf', 'regiao', 'eleitorado', 'pct_eleitorado', 'cota_planejada', 'cadastros_validados', 'respondentes', 'respondentes_cedula_completa', 'respondentes_parciais', 'votos', 'pct_amostra', 'peso'], territorial)
csv('03b-territorial-fora-se-uf', ['uf', 'cadastros_validados', 'respondentes', 'votos'], [...foraUF.values()].sort((a, b) => a.uf.localeCompare(b.uf)))

// ------------------------------------------------------ 04 · composição
const BASES = [
  ['identidade_validada', val, (e) => e.municipio_ibge],
  ['identidade_validada_se', valSE, (e) => e.municipio_ibge],
  ['respondentes', resp, (s) => s.municipio_ibge],
  ['respondentes_se', respSE, (s) => s.municipio_ibge],
]
const composicao = []
const cruzamento = []
const nivelSexo = []
for (const [base, arr, mun] of BASES) {
  for (const d of DIMS) {
    const m = contar(arr, (x) => (d === 'regiao' ? regiaoDe(mun(x)) : x[d] ?? 'nao_informado'))
    for (const k of ordenar(d, [...m.keys()])) composicao.push({ base, n_base: arr.length, dimensao: d, valor: k, n: m.get(k), pct: pct(m.get(k), arr.length) })
  }
  const cz = contar(arr, (x) => `${x.sexo ?? 'nao_informado'}|${x.faixa_etaria ?? 'nao_informado'}|${x.escolaridade ?? 'nao_informado'}`)
  for (const [k, n] of [...cz.entries()].sort()) { const [s, f, e] = k.split('|'); cruzamento.push({ base, sexo: s, faixa_etaria: f, escolaridade: e, n, pct: pct(n, arr.length) }) }
  const ns = contar(arr, (x) => `${x.nivel_economico ?? 'nao_informado'}|${x.sexo ?? 'nao_informado'}`)
  for (const [k, n] of [...ns.entries()].sort()) { const [ne, s] = k.split('|'); nivelSexo.push({ base, nivel_economico: ne, sexo: s, n, pct: pct(n, arr.length) }) }
}
csv('04-composicao', ['base', 'n_base', 'dimensao', 'valor', 'n', 'pct'], composicao)
csv('04b-composicao-cruzamento-sexo-faixa-instrucao', ['base', 'sexo', 'faixa_etaria', 'escolaridade', 'n', 'pct'], cruzamento)
csv('04c-composicao-nivel-x-sexo', ['base', 'nivel_economico', 'sexo', 'n', 'pct'], nivelSexo)
// composição por município (respondentes de SE) — só sexo/faixa/escolaridade/nível, sem cruzamento
const compMun = []
for (const m of municipiosSE) {
  const rs = respPorMun.get(m.ibge_codigo) ?? []
  for (const d of ['sexo', 'faixa_etaria', 'escolaridade', 'nivel_economico']) {
    const c = contar(rs, (s) => s[d] ?? 'nao_informado')
    for (const k of ordenar(d, [...c.keys()])) compMun.push({ ibge: m.ibge_codigo, municipio: m.nome, respondentes: rs.length, dimensao: d, valor: k, n: c.get(k) })
  }
}
csv('04d-composicao-respondentes-por-municipio', ['ibge', 'municipio', 'respondentes', 'dimensao', 'valor', 'n'], compMun)

// ------------------------------------------------------------ 05 · pesos
// peso_i = (eleitorado_i / E_COM_RESP) / (n_i / N_TOTAL) = (eleitorado_i * N_TOTAL) / (E_COM_RESP * n_i)  — fração exata em inteiros
const pesos = municipiosSE.map((m) => {
  const n = (respPorMun.get(m.ibge_codigo) ?? []).length
  const pv = pesoBy.get(m.ibge_codigo)
  const num = m.eleitorado * N_TOTAL
  const den = E_COM_RESP * n
  const peso = n ? num / den : 0
  return {
    ibge: m.ibge_codigo, municipio: m.nome, eleitorado: m.eleitorado, eleitorado_total_com_resposta: E_COM_RESP, respondentes: n, n_total: N_TOTAL,
    share_eleitorado: m.eleitorado / E_COM_RESP, share_amostra: n / N_TOTAL,
    peso_numerador: num, peso_denominador: den, peso: peso, peso_view: pv ? Number(pv.peso) : null, peso_view_texto: pv ? String(pv.peso) : null,
    dif_recalculo_view: pv ? peso - Number(pv.peso) : null, soma_pesos_municipio: n * peso, soma_pesos_quadrado: n * peso * peso,
  }
}).sort((a, b) => b.eleitorado - a.eleitorado)
csv('05-pesos-municipio', ['ibge', 'municipio', 'eleitorado', 'eleitorado_total_com_resposta', 'respondentes', 'n_total', 'share_eleitorado', 'share_amostra', 'peso_numerador', 'peso_denominador', 'peso', 'peso_view', 'peso_view_texto', 'dif_recalculo_view', 'soma_pesos_municipio', 'soma_pesos_quadrado'], pesos)
const comResp = pesos.filter((p) => p.respondentes > 0)
const sumNW = soma(comResp, (p) => p.soma_pesos_municipio)
const sumNW2 = soma(comResp, (p) => p.soma_pesos_quadrado)
const nEff = (sumNW * sumNW) / sumNW2
const deff = respSE.length / nEff
const margem = (n) => 1.96 * Math.sqrt(0.25 / n)
const pMin = comResp.reduce((a, p) => (p.peso < a.peso ? p : a))
const pMax = comResp.reduce((a, p) => (p.peso > a.peso ? p : a))
const pesosResumo = [
  { medida: 'municipios_com_respondente', valor: comResp.length, observacao: `de ${municipiosSE.length}` },
  { medida: 'eleitorado_total_se', valor: E_TOTAL, observacao: 'municipios_se.eleitorado (TSE)' },
  { medida: 'eleitorado_total_com_resposta', valor: E_COM_RESP, observacao: 'denominador do share de eleitorado (municípios com >= 1 respondente)' },
  { medida: 'n_total_ponderacao', valor: N_TOTAL, observacao: 'respondentes com município informado (inclui fora de SE, peso 0)' },
  { medida: 'respondentes_se', valor: respSE.length, observacao: 'n usado no deff e na margem nominal' },
  { medida: 'respondentes_fora_se_peso_zero', valor: respFora.length, observacao: '' },
  { medida: 'soma_n_w', valor: sumNW, observacao: 'Σ n_i·w_i' },
  { medida: 'soma_n_w2', valor: sumNW2, observacao: 'Σ n_i·w_i²' },
  { medida: 'n_eff_kish', valor: nEff, observacao: '(Σ n·w)² ÷ Σ n·w²' },
  { medida: 'deff', valor: deff, observacao: 'n_se ÷ n_eff' },
  { medida: 'margem_95_nominal', valor: margem(respSE.length), observacao: '1,96·√(0,25/n_se), em fração (×100 = p.p.)' },
  { medida: 'margem_95_n_eff', valor: margem(nEff), observacao: '1,96·√(0,25/n_eff)' },
  { medida: 'peso_min', valor: pMin.peso, observacao: pMin.municipio },
  { medida: 'peso_max', valor: pMax.peso, observacao: pMax.municipio },
  { medida: 'max_abs_dif_recalculo_vs_view', valor: Math.max(...comResp.map((p) => Math.abs(p.dif_recalculo_view ?? 0))), observacao: 'peso recalculado em JS × peso armazenado em v_peso_municipio' },
]
csv('05b-pesos-resumo', ['medida', 'valor', 'observacao'], pesosResumo)

// -------------------------------------------------------- 06/07 · resultados
const candById = new Map(candidatos.map((c) => [c.id, c]))
const partById = new Map(partidos.map((p) => [p.id, p]))
const pesoDe = (ibge) => (ibge != null && seSet.has(ibge) ? (pesos.find((p) => p.ibge === ibge)?.peso ?? 0) : 0)
const pesoCache = new Map(pesos.map((p) => [p.ibge, p.peso]))
const w = (v) => (v.municipio_ibge != null && pesoCache.has(v.municipio_ibge) ? pesoCache.get(v.municipio_ibge) : 0)
const cargosPresentes = CARGOS.filter((c) => votos.some((v) => v.cargo === c))
const resultadosUF = []
const denominadores = []
for (const cargo of cargosPresentes) {
  const vs = votos.filter((v) => v.cargo === cargo)
  const respondentesCargo = new Set(vs.map((v) => v.token_hash)).size
  const numero = vs.filter((v) => v.metodo === 'numero')
  const nominal = numero.filter((v) => v.candidato_id)
  const comPartido = numero.filter((v) => v.partido_id)
  const legendaPura = comPartido.filter((v) => !v.candidato_id)
  const branco = vs.filter((v) => v.metodo === 'branco')
  const naoSabe = vs.filter((v) => v.metodo === 'nao_sabe')
  const pondTotal = soma(vs, w)
  const baseNomB = nominal.length, baseNomP = soma(nominal, w)
  const basePartB = comPartido.length, basePartP = soma(comPartido, w)
  denominadores.push({
    cargo, rotulo: CARGO_ROT[cargo], respondentes: respondentesCargo, respostas: vs.length, respostas_fora_se: vs.filter((v) => classe(v.municipio_ibge) === 'fora_de_se').length,
    votos_numero: numero.length, votos_nominais: nominal.length, votos_legenda_pura: legendaPura.length, votos_com_partido: comPartido.length, votos_branco: branco.length, votos_nao_sabe: naoSabe.length,
    pond_total: pondTotal, pond_nominal: baseNomP, pond_com_partido: basePartP, pond_branco: soma(branco, w), pond_nao_sabe: soma(naoSabe, w),
  })
  const push = (tipo, chave, meta, arr) => {
    const votosB = arr.length, votosP = soma(arr, w)
    const baseB = tipo === 'candidato' ? baseNomB : tipo === 'partido' ? basePartB : vs.length
    const baseP = tipo === 'candidato' ? baseNomP : tipo === 'partido' ? basePartP : pondTotal
    resultadosUF.push({
      cargo, tipo, ...meta, votos_bruto: votosB, votos_pond: votosP, base_bruta: baseB, base_pond: baseP, pct_bruto: pct(votosB, baseB), pct_pond: pct(votosP, baseP),
      respostas_cargo: vs.length, respondentes_cargo: respondentesCargo, pct_bruto_sobre_respostas: pct(votosB, vs.length), pct_pond_sobre_total_pond: pct(votosP, pondTotal),
    })
  }
  const porCand = new Map()
  for (const v of nominal) { if (!porCand.has(v.candidato_id)) porCand.set(v.candidato_id, []); porCand.get(v.candidato_id).push(v) }
  for (const [id, arr] of porCand) {
    const c = candById.get(id); const p = c?.partido_id ? partById.get(c.partido_id) : null
    push('candidato', id, { numero: c?.numero ?? null, nome: c?.nome_urna ?? id, partido: p?.sigla ?? null, coligacao: c?.coligacao ?? null }, arr)
  }
  if (cargo === 'federal' || cargo === 'estadual') {
    const porPart = new Map()
    for (const v of comPartido) { if (!porPart.has(v.partido_id)) porPart.set(v.partido_id, []); porPart.get(v.partido_id).push(v) }
    for (const [id, arr] of porPart) { const p = partById.get(id); push('partido', id, { numero: p?.numero ?? null, nome: p?.nome ?? id, partido: p?.sigla ?? null, coligacao: null }, arr) }
    const porLeg = new Map()
    for (const v of legendaPura) { if (!porLeg.has(v.partido_id)) porLeg.set(v.partido_id, []); porLeg.get(v.partido_id).push(v) }
    for (const [id, arr] of porLeg) { const p = partById.get(id); push('legenda_pura', id, { numero: p?.numero ?? null, nome: p?.nome ?? id, partido: p?.sigla ?? null, coligacao: null }, arr) }
  }
  if (cargo === 'zona_expansao') {
    const porResp = new Map()
    for (const v of numero) { if (!porResp.has(v.resposta)) porResp.set(v.resposta, []); porResp.get(v.resposta).push(v) }
    for (const [r, arr] of porResp) push('resposta', r, { numero: null, nome: r, partido: null, coligacao: null }, arr)
  }
  push('branco', 'branco', { numero: null, nome: 'Branco / nulo', partido: null, coligacao: null }, branco)
  push('nao_sabe', 'nao_sabe', { numero: null, nome: 'Não sabe / não respondeu', partido: null, coligacao: null }, naoSabe)
}
const ordemTipo = { candidato: 0, partido: 1, legenda_pura: 2, resposta: 3, branco: 4, nao_sabe: 5 }
resultadosUF.sort((a, b) => CARGOS.indexOf(a.cargo) - CARGOS.indexOf(b.cargo) || ordemTipo[a.tipo] - ordemTipo[b.tipo] || b.votos_pond - a.votos_pond || b.votos_bruto - a.votos_bruto)
csv('06-resultados-cargo-uf', ['cargo', 'tipo', 'numero', 'nome', 'partido', 'coligacao', 'votos_bruto', 'votos_pond', 'base_bruta', 'base_pond', 'pct_bruto', 'pct_pond', 'respostas_cargo', 'respondentes_cargo', 'pct_bruto_sobre_respostas', 'pct_pond_sobre_total_pond'], resultadosUF)
csv('06b-resultados-cargo-denominadores', ['cargo', 'rotulo', 'respondentes', 'respostas', 'respostas_fora_se', 'votos_numero', 'votos_nominais', 'votos_legenda_pura', 'votos_com_partido', 'votos_branco', 'votos_nao_sabe', 'pond_total', 'pond_nominal', 'pond_com_partido', 'pond_branco', 'pond_nao_sabe'], denominadores)

// por município (SE) + "fora de SE" agregado + "sem município"
const resultadosMun = []
const grupoMun = (v) => (v.municipio_ibge == null ? 'sem_municipio' : seSet.has(v.municipio_ibge) ? v.municipio_ibge : 'fora_de_se')
const nomeGrupo = (g) => (g === 'fora_de_se' ? 'FORA DE SERGIPE (outra UF)' : g === 'sem_municipio' ? 'SEM MUNICÍPIO' : munSE.get(g)?.nome)
for (const cargo of cargosPresentes) {
  const vs = votos.filter((v) => v.cargo === cargo)
  const porGrupo = new Map()
  for (const v of vs) { const g = grupoMun(v); if (!porGrupo.has(g)) porGrupo.set(g, []); porGrupo.get(g).push(v) }
  for (const [g, arr] of porGrupo) {
    const peso = typeof g === 'number' ? pesoCache.get(g) ?? 0 : 0
    const respostas = arr.length
    const respondentes = new Set(arr.map((v) => v.token_hash)).size
    const chave = (v) => v.metodo !== 'numero' ? `${v.metodo}|` : v.candidato_id ? `candidato|${v.candidato_id}` : v.partido_id ? `legenda_pura|${v.partido_id}` : `resposta|${v.resposta}`
    const cont = contar(arr, chave)
    for (const [k, n] of cont) {
      const [tipo, id] = k.split('|')
      let numero = null, nome = null, partido = null
      if (tipo === 'candidato') { const c = candById.get(id); const p = c?.partido_id ? partById.get(c.partido_id) : null; numero = c?.numero ?? null; nome = c?.nome_urna ?? id; partido = p?.sigla ?? null }
      else if (tipo === 'legenda_pura') { const p = partById.get(id); numero = p?.numero ?? null; nome = p?.nome ?? id; partido = p?.sigla ?? null }
      else if (tipo === 'resposta') nome = id
      else nome = tipo === 'branco' ? 'Branco / nulo' : 'Não sabe / não respondeu'
      resultadosMun.push({ cargo, ibge: typeof g === 'number' ? g : null, municipio: nomeGrupo(g), tipo, numero, nome, partido, votos_bruto: n, peso, votos_pond: n * peso, respostas_cargo_municipio: respostas, respondentes_cargo_municipio: respondentes, pct_bruto_sobre_respostas: pct(n, respostas) })
    }
  }
}
resultadosMun.sort((a, b) => CARGOS.indexOf(a.cargo) - CARGOS.indexOf(b.cargo) || (a.ibge ?? 9e9) - (b.ibge ?? 9e9) || ordemTipo[a.tipo] - ordemTipo[b.tipo] || b.votos_bruto - a.votos_bruto || String(a.nome).localeCompare(String(b.nome)))
csv('07-resultados-cargo-municipio', ['cargo', 'ibge', 'municipio', 'tipo', 'numero', 'nome', 'partido', 'votos_bruto', 'peso', 'votos_pond', 'respostas_cargo_municipio', 'respondentes_cargo_municipio', 'pct_bruto_sobre_respostas'], resultadosMun)
// por partido e município (federal/estadual: nominal + legenda)
const partidoMun = []
for (const cargo of ['federal', 'estadual'].filter((c) => cargosPresentes.includes(c))) {
  const vs = votos.filter((v) => v.cargo === cargo && v.metodo === 'numero' && v.partido_id)
  const cont = contar(vs, (v) => `${grupoMun(v)}|${v.partido_id}`)
  const respMun = new Map()
  for (const v of votos.filter((v) => v.cargo === cargo)) { const g = grupoMun(v); respMun.set(g, (respMun.get(g) ?? 0) + 1) }
  for (const [k, n] of cont) {
    const [gs, pid] = k.split('|'); const g = /^\d+$/.test(gs) ? Number(gs) : gs
    const p = partById.get(pid); const peso = typeof g === 'number' ? pesoCache.get(g) ?? 0 : 0
    partidoMun.push({ cargo, ibge: typeof g === 'number' ? g : null, municipio: nomeGrupo(g), partido_numero: p?.numero ?? null, partido: p?.sigla ?? pid, votos_bruto: n, peso, votos_pond: n * peso, respostas_cargo_municipio: respMun.get(g) ?? 0 })
  }
}
partidoMun.sort((a, b) => CARGOS.indexOf(a.cargo) - CARGOS.indexOf(b.cargo) || (a.ibge ?? 9e9) - (b.ibge ?? 9e9) || b.votos_bruto - a.votos_bruto)
csv('07b-resultados-partido-municipio', ['cargo', 'ibge', 'municipio', 'partido_numero', 'partido', 'votos_bruto', 'peso', 'votos_pond', 'respostas_cargo_municipio'], partidoMun)

// ---------------------------------------------------------- 08 · unicidade
const dupTokenCargo = (() => { const c = contar(votos.filter((v) => SINGLE_SHOT.has(v.cargo)), (v) => `${v.token_hash}|${v.cargo}`); return [...c.values()].filter((n) => n > 1).length })()
const dupSenCand = (() => { const c = contar(votos.filter((v) => v.cargo === 'senador' && v.candidato_id), (v) => `${v.token_hash}|${v.candidato_id}`); return [...c.values()].filter((n) => n > 1).length })()
const histFP = contar([...fpValidados.values()], (n) => (n >= 10 ? '10+' : n >= 5 ? '5-9' : String(n)))
const fpMax = Math.max(0, ...fpValidados.values())
const unicidade = [
  { verificacao: 'cpf_duplicado_na_edicao', resultado: cpfDuplicados, detalhe: 'CPFs (hash) com mais de um cadastro na edição — garantido por UNIQUE (edicao_id, cpf_hash)' },
  { verificacao: 'token_emitido_sem_wa_validado', resultado: eleitores.filter((e) => e.token_emitido && !e.wa_validado).length, detalhe: 'flags gravadas na mesma atualização atômica (esperado 0)' },
  { verificacao: 'wa_validado_sem_token_emitido', resultado: eleitores.filter((e) => e.wa_validado && !e.token_emitido).length, detalhe: 'esperado 0' },
  { verificacao: 'whatsapp_repetido_entre_validados', resultado: null, detalhe: 'exige ler whatsapp_e164: só por sql/08-unicidade.sql; índice único parcial eleitores_wa_unico_validado_idx (resultado em 09/09/2026: 0)' },
  { verificacao: 'votos_duplicados_token_x_cargo', resultado: dupTokenCargo, detalhe: 'cargos de resposta única — índice único votos_unico_token_cargo_singleshot' },
  { verificacao: 'senador_mesmo_candidato_duas_vezes', resultado: dupSenCand, detalhe: 'índice único votos_unico_token_senador_candidato' },
  { verificacao: 'senador_mais_de_2_mencoes_por_token', resultado: resp.filter((s) => s.senador > 2).length, detalhe: 'limite de 2 aplicado na cédula' },
  { verificacao: 'sessoes_com_perfil_inconsistente', resultado: resp.filter((s) => s.inconsistente).length, detalhe: 'município/sexo/faixa/instrução/nível diferentes entre votos do mesmo token (esperado 0: cópia única do cookie)' },
  { verificacao: 'votos_com_token_inexistente', resultado: resp.filter((s) => !s.token_existe).length, detalhe: 'FK votos_pesquisa.token_hash → tokens_emitidos' },
  { verificacao: 'tokens_emitidos_menos_validados', resultado: tokens.length - val.length, detalhe: 'tokens sem cadastro correspondente = cadastros validados apagados a pedido (LGPD)' },
  { verificacao: 'tokens_sem_voto', resultado: tokensSemVoto.length, detalhe: 'validou e não respondeu nada' },
  { verificacao: 'tokens_usado_true_sem_voto', resultado: tokensSemVoto.filter((t) => t.usado).length, detalhe: tokensSemVoto.filter((t) => t.usado).map((t) => 'criado_hora ' + t.criado_hora).join('; ') },
  { verificacao: 'respondentes_usado_false', resultado: resp.filter((s) => s.token_usado === false).length, detalhe: 'respondeu ao menos um cargo e não concluiu a cédula (usado só é marcado no último cargo)' },
  { verificacao: 'respondentes_usado_false_cedula_completa', resultado: resp.filter((s) => s.token_usado === false && s.completa).length, detalhe: 'respondeu todos os cargos mas o flag não foi gravado (ex.: fechou antes do redirecionamento final)' },
  { verificacao: 'respondentes_usado_true_cedula_incompleta', resultado: resp.filter((s) => s.token_usado === true && !s.completa).length, detalhe: 'esperado 0' },
  { verificacao: 'validados_sem_municipio', resultado: valSemMun.length, detalhe: '' },
  { verificacao: 'respondentes_sem_municipio', resultado: respSemMun.length, detalhe: '' },
  { verificacao: 'validados_sem_digital', resultado: val.filter((e) => !e.tem_digital).length, detalhe: 'cadastros validados sem fingerprint' },
  { verificacao: 'digitais_distintas_entre_validados', resultado: fpValidados.size, detalhe: 'device_fingerprint distintos (só contagem; valores não exportados)' },
  { verificacao: 'digitais_com_2_ou_mais_validados', resultado: [...fpValidados.values()].filter((n) => n >= 2).length, detalhe: 'aparelho compartilhado (família, computador de loja, rede) — não bloqueado desde 01/09 08h16 (commit baa87ff); ver 08b' },
  { verificacao: 'validados_em_digital_compartilhada', resultado: val.filter((e) => e.digital_compartilhada_com_validado).length, detalhe: 'cadastros validados cujo fingerprint aparece em outro cadastro validado' },
  { verificacao: 'max_validados_na_mesma_digital', resultado: fpMax, detalhe: '' },
  { verificacao: 'codigos_otp_sem_cadastro', resultado: codigos.filter((c) => c.cadastro === 'sem_cadastro').length, detalhe: `${cpfOrfaos} CPFs (exclusão LGPD com falha ao apagar whatsapp_codigos)` },
]
csv('08-unicidade', ['verificacao', 'resultado', 'detalhe'], unicidade)
csv('08b-digital-histograma', ['cadastros_validados_por_digital', 'n_digitais', 'n_cadastros'], ['1', '2', '3', '4', '5-9', '10+'].filter((k) => histFP.has(k)).map((k) => ({ cadastros_validados_por_digital: k, n_digitais: histFP.get(k), n_cadastros: [...fpValidados.values()].filter((n) => (k === '10+' ? n >= 10 : k === '5-9' ? n >= 5 && n <= 9 : n === Number(k))).reduce((a, b) => a + b, 0) })))

// -------------------------------------------------------- 09 · conciliação
const ultimoCadastro = eleitores.reduce((a, e) => (e.criado_em > a ? e.criado_em : a), eleitores[0]?.criado_em)
const cadAposFim = eleitores.filter((e) => new Date(e.criado_em).getTime() >= fimMs)
const codAposFim = codigos.filter((c) => new Date(c.criado_em).getTime() >= fimMs)
const tokAposFim = tokens.filter((t) => new Date(t.criado_hora).getTime() >= fimMs)
const votAposFim = votos.filter((v) => new Date(v.criado_hora).getTime() >= fimMs)
const conciliacao = [
  { item: 'edicao_inicio', valor: edicao.inicio, observacao: dataHoraBRT(edicao.inicio) + ' BRT' },
  { item: 'edicao_fim', valor: edicao.fim, observacao: dataHoraBRT(edicao.fim) + ' BRT — após este instante /votar recusa novos cadastros' },
  { item: 'ultimo_cadastro', valor: ultimoCadastro, observacao: dataHoraBRT(ultimoCadastro) + ' BRT' },
  { item: 'cadastros_apos_fim', valor: cadAposFim.length, observacao: '' },
  { item: 'codigos_otp_apos_fim', valor: codAposFim.length, observacao: 'códigos criados após o fim (cadastro anterior ao fim; reenvio/validação em sessão aberta): ' + codAposFim.map((c) => c.criado_em + ' (' + c.cadastro + (c.validado ? ', consumido' : '') + ')').join('; ') },
  { item: 'tokens_apos_fim', valor: tokAposFim.length, observacao: tokAposFim.map((t) => t.criado_hora + (t.usado ? ' usado' : '')).join('; ') },
  { item: 'votos_apos_fim', valor: votAposFim.length, observacao: [...contar(votAposFim, (v) => v.criado_hora).entries()].sort().map(([h, n]) => `${h}: ${n}`).join('; ') },
  { item: 'sessoes_com_voto_apos_fim', valor: new Set(votAposFim.map((v) => v.token_hash)).size, observacao: '' },
  { item: 'identidade_validada', valor: val.length, observacao: 'pessoas (cadastros) — base da composição do Anexo Técnico' },
  { item: 'tokens_emitidos', valor: tokens.length, observacao: 'sessões de voto criadas' },
  { item: 'respondentes', valor: resp.length, observacao: 'sessões com >= 1 resposta' },
  { item: 'respondentes_se', valor: respSE.length, observacao: 'base da ponderação' },
  { item: 'respondentes_cedula_completa_se', valor: respSE.filter((s) => s.completa).length, observacao: 'responderam aos 5 cargos' },
  { item: 'dif_tokens_menos_validados', valor: tokens.length - val.length, observacao: 'cadastros validados removidos por exclusão LGPD (voto preservado)' },
  { item: 'dif_tokens_menos_respondentes', valor: tokens.length - resp.length, observacao: 'validou e não respondeu' },
  { item: 'dif_respondentes_menos_respondentes_se', valor: resp.length - respSE.length, observacao: 'fora de SE (peso 0) + sem município' },
  { item: 'gerado_em', valor: AGORA.toISOString(), observacao: dataHoraBRT(AGORA.toISOString()) + ' BRT' },
]
csv('09-conciliacao', ['item', 'valor', 'observacao'], conciliacao)

// ------------------------------------------------------ 10 · linha do tempo
const horas = new Map()
const bump = (h, k) => { if (!horas.has(h)) horas.set(h, { hora_utc: h, cadastros: 0, codigos_otp: 0, tokens_emitidos: 0, respondentes_primeiro_voto: 0, votos: 0 }); horas.get(h)[k]++ }
for (const e of eleitores) bump(horaUTC(e.criado_em), 'cadastros')
for (const c of codigos) bump(horaUTC(c.criado_em), 'codigos_otp')
for (const t of tokens) bump(horaUTC(t.criado_hora), 'tokens_emitidos')
for (const s of resp) bump(horaUTC(s.primeiro), 'respondentes_primeiro_voto')
for (const v of votos) bump(horaUTC(v.criado_hora), 'votos')
const linhaTempo = [...horas.values()].sort((a, b) => a.hora_utc.localeCompare(b.hora_utc)).map((r) => ({ ...r, hora_brt: dataHoraBRT(r.hora_utc).slice(0, 17) }))
csv('10-linha-do-tempo-hora', ['hora_utc', 'hora_brt', 'cadastros', 'codigos_otp', 'tokens_emitidos', 'respondentes_primeiro_voto', 'votos'], linhaTempo)
const dias = new Map()
for (const r of linhaTempo) {
  const d = dataHoraBRT(r.hora_utc).slice(0, 10)
  if (!dias.has(d)) dias.set(d, { dia_brt: d, cadastros: 0, codigos_otp: 0, tokens_emitidos: 0, respondentes_primeiro_voto: 0, votos: 0 })
  for (const k of ['cadastros', 'codigos_otp', 'tokens_emitidos', 'respondentes_primeiro_voto', 'votos']) dias.get(d)[k] += r[k]
}
csv('10b-linha-do-tempo-dia', ['dia_brt', 'cadastros', 'codigos_otp', 'tokens_emitidos', 'respondentes_primeiro_voto', 'votos'], [...dias.values()])

// ------------------------------------------- 11 · conferência com o anexo (08/09)
const anexoPath = join(BASE_DIR, 'anexo-tecnico-numeros.json')
if (existsSync(anexoPath)) {
  const A = JSON.parse(readFileSync(anexoPath, 'utf8'))
  const compVal = (d, k) => composicao.find((c) => c.base === 'identidade_validada' && c.dimensao === d && c.valor === k)?.n ?? 0
  const pares = [
    ['participantes.validados_total', A.participantes?.validados_total, val.length],
    ['participantes.validados_se', A.participantes?.validados_se, valSE.length],
    ['participantes.validados_fora_se', A.participantes?.validados_fora_se, valFora.length],
    ['respondentes.total', A.respondentes?.total, resp.length],
    ['respondentes.se', A.respondentes?.se, respSE.length],
    ['respondentes.fora_se', A.respondentes?.fora_se, respFora.length],
    ['resumo.eleitores_cadastrados', A.resumo?.eleitores_cadastrados, eleitores.length],
    ['resumo.tokens_emitidos', A.resumo?.tokens_emitidos, tokens.length],
    ['resumo.tokens_usados', A.resumo?.tokens_usados, tokens.filter((t) => t.usado).length],
    ['kish.n_eff', A.kish?.n_eff, nEff],
    ['kish.deff', A.kish?.deff, deff],
    ...Object.entries(A.composicao ?? {}).flatMap(([d, obj]) => (d === 'regiao' ? [] : Object.entries(obj).map(([k, v]) => [`composicao.${d}.${k}`, v, compVal(d, k)]))),
  ]
  csv('11-conferencia-anexo-2026-09-08', ['indicador', 'anexo_2026_09_08', 'exportacao', 'diferenca'], pares.map(([i, a, b]) => ({ indicador: i, anexo_2026_09_08: a ?? null, exportacao: b, diferenca: a == null ? null : b - a })))
  console.log('  anexo gerado em', A.gerado_em_brt)
}

// -------------------------------------------------- cópias do anexo (doc. 11)
for (const f of ['anexo-tecnico-numeros.json', 'anexo-tecnico-numeros.md', 'memoria-de-calculo-sql.md', 'complementacao-pesqele-2026-09-08.md']) {
  const src = join(BASE_DIR, f)
  if (existsSync(src)) copyFileSync(src, join(OUT, 'anexo', f))
}
copyFileSync('scripts/anexo-rp-0601015.mjs', join(OUT, 'anexo', 'anexo-rp-0601015.mjs'))
copyFileSync('scripts/exportar-dados-pericia.mjs', join(OUT, 'anexo', 'exportar-dados-pericia.mjs'))

// --------------------------------------------------------------- resumo
writeFileSync(join(OUT, 'json', 'resumo.json'), JSON.stringify({
  representacao: RP, gerado_em: AGORA.toISOString(), gerado_em_brt: dataHoraBRT(AGORA.toISOString()),
  edicao: { id: eid, nome: edicao.nome, inicio: edicao.inicio, fim: edicao.fim, divulgada_em: edicao.divulgada_em, suspensa_em: edicao.suspensa_em ?? null },
  script: 'scripts/exportar-dados-pericia.mjs', meta_amostra: META, colunas_pessoais_lidas_em_memoria: ['cpf_hash', 'device_fingerprint'], colunas_pessoais_gravadas: [],
  totais: {
    cadastros: eleitores.length, identidade_validada: val.length, validados_se: valSE.length, validados_fora_se: valFora.length, nao_validados: naoVal.length,
    tokens_emitidos: tokens.length, tokens_usados: tokens.filter((t) => t.usado).length, respondentes: resp.length, respondentes_se: respSE.length, respondentes_fora_se: respFora.length,
    respondentes_cedula_completa_se: respSE.filter((s) => s.completa).length, votos: votos.length, n_total_ponderacao: N_TOTAL, eleitorado_se: E_TOTAL, n_eff: nEff, deff,
  },
  arquivos: escritos,
}, null, 2))
console.log('ok →', OUT)
