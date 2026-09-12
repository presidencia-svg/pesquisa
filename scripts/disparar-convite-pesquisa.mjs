/**
 * Disparo do convite da Pesquisa Eleitoral Sergipe 2026 por WhatsApp
 * (template Meta), para a base do Melhores do Ano e para uma lista de
 * extras mantida FORA do git.
 *
 * Edições (--edicao N, padrão 2):
 *   1  template `convite_pesquisa_sergipe` (1 parâmetro: primeiro nome),
 *      idempotência em votantes.convite_pesquisa_enviado_em.
 *   2  template `convite_pesquisa`, aprovado pela Meta em 12/09/2026
 *      (7 parâmetros — texto em docs/convite-whatsapp-2a-edicao.md),
 *      idempotência em votantes.convite_pesquisa2_enviado_em. Essa coluna
 *      precisa existir no banco do Melhores do Ano antes do primeiro --gravar:
 *        alter table votantes add column if not exists convite_pesquisa2_enviado_em timestamptz;
 *
 * Canal: número do Melhores do Ano (CDL Aracaju, +55 79 3212-7701) —
 * SEPARADO do número que envia o OTP da pesquisa, pra que um eventual
 * problema de qualidade no marketing nunca derrube o login do eleitor.
 * META_TOKEN é o token desse número (NÃO é o META_WA_ACCESS_TOKEN do OTP).
 *
 * Env (lê .env.local se existir): MDA_SUPABASE_URL | MELHORES_SUPABASE_URL,
 * MDA_SERVICE_KEY | MELHORES_SUPABASE_SERVICE_ROLE_KEY, META_TOKEN.
 *
 * Uso:
 *   node scripts/disparar-convite-pesquisa.mjs --teste 79999724554        # seu número, sem marcar
 *   node scripts/disparar-convite-pesquisa.mjs --extras                    # docs/confidencial/convite-extras.json
 *   node scripts/disparar-convite-pesquisa.mjs --lote 20
 *   node scripts/disparar-convite-pesquisa.mjs --lote 2000 --gravar
 *   node scripts/disparar-convite-pesquisa.mjs --edicao 1 --lote 20        # comportamento antigo
 *
 * Sem --gravar é DRY-RUN (não envia nada). --sem-imagem omite o cabeçalho
 * de imagem (use se o template aprovado não tiver cabeçalho).
 *
 * Opt-out: docs/confidencial/optout-whatsapp.txt (um número por linha, com
 * ou sem 55) — quem respondeu SAIR nunca recebe, em nenhum modo.
 *
 * Bases (--base mda|pesquisa, padrão mda) — edição 2:
 *   mda       votantes do Melhores do Ano (whatsapp_validado), idempotência em
 *             votantes.convite_pesquisa2_enviado_em.
 *   pesquisa  cdl_base da PRÓPRIA pesquisa (participantes da 1ª edição e
 *             cadastros com WhatsApp), idempotência em
 *             cdl_base.convite_pesquisa2_enviado_em (migration 054). Quem já
 *             recebeu pela base mda é marcado e pulado — rode a base mda
 *             ANTES. Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 *   Quem pediu exclusão (/privacidade/excluir) já saiu da cdl_base e nunca
 *   entra na fila.
 */
import { existsSync, readFileSync, appendFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { config as dotenvConfig } from 'dotenv'

dotenvConfig({ path: path.resolve(process.cwd(), '.env.local'), quiet: true })

const PHONE_ID = process.env.META_PHONE_ID ?? '1031179760086462'
const API = process.env.META_API_VERSION ?? 'v21.0'
const LANG = 'pt_BR'
const IMG = process.env.CONVITE_IMAGEM ?? 'https://pesquisa.cdlaju.com.br/convite-whatsapp.png'
const TOKEN = process.env.META_TOKEN
const MDA_URL = process.env.MDA_SUPABASE_URL ?? process.env.MELHORES_SUPABASE_URL
const MDA_KEY = process.env.MDA_SERVICE_KEY ?? process.env.MELHORES_SUPABASE_SERVICE_ROLE_KEY

const CONFIDENCIAL = path.resolve(process.cwd(), 'docs/confidencial')
const ARQ_EXTRAS = path.join(CONFIDENCIAL, 'convite-extras.json')
const ARQ_EXTRAS_ENVIADOS = path.join(CONFIDENCIAL, 'convite-extras-enviados.jsonl')
const ARQ_OPTOUT = path.join(CONFIDENCIAL, 'optout-whatsapp.txt')

const args = process.argv.slice(2)
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null }
const GRAVAR = args.includes('--gravar')
const EXTRAS = args.includes('--extras')
const SEM_IMAGEM = args.includes('--sem-imagem')
const TESTE = flag('--teste')
const LOTE = Number(flag('--lote') ?? 20)
const EDICAO = Number(flag('--edicao') ?? 2)
const BASE = flag('--base') ?? 'mda'
if (!['mda', 'pesquisa'].includes(BASE)) throw new Error(`--base ${BASE} desconhecida (use mda ou pesquisa)`)
if (BASE === 'pesquisa' && EDICAO !== 2) throw new Error('--base pesquisa só existe na edição 2')
const SLEEP_MS = Number(process.env.SLEEP_MS ?? 120) // ~8 msg/s, conservador

// Tudo que muda entre edições fica aqui. Os textos fixos da edição 2 são
// os exemplos aprovados junto com o template (docs/convite-whatsapp-2a-edicao.md).
const EDICOES = {
  1: {
    template: 'convite_pesquisa_sergipe',
    coluna: 'convite_pesquisa_enviado_em',
    params: (nome) => [nome],
  },
  2: {
    template: 'convite_pesquisa',
    coluna: 'convite_pesquisa2_enviado_em',
    params: (nome) => [
      nome,
      'Sergipe',
      'CDL Aracaju',
      '*2ª edição da Pesquisa Eleitoral Sergipe 2026*',
      '20 de setembro',
      'pesquisa.cdlaju.com.br/votar',
      'sergipano',
    ],
  },
}
const CFG = EDICOES[EDICAO]
if (!CFG) throw new Error(`--edicao ${EDICAO} desconhecida (use 1 ou 2)`)

if (!MDA_URL || !MDA_KEY) throw new Error('Faltam MDA_SUPABASE_URL/MDA_SERVICE_KEY (ou MELHORES_*) no ambiente')
const db = createClient(MDA_URL, MDA_KEY, { auth: { persistSession: false } })

// Banco da própria pesquisa (cdl_base) — só na --base pesquisa.
const PESQ_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const PESQ_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (BASE === 'pesquisa' && (!PESQ_URL || !PESQ_KEY)) {
  throw new Error('Faltam NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY (banco da pesquisa) no ambiente')
}
const dbPesq = BASE === 'pesquisa' ? createClient(PESQ_URL, PESQ_KEY, { auth: { persistSession: false } }) : null

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** "JOÃO PEDRO DA SILVA" -> "João" */
function primeiroNome(nome) {
  const bruto = String(nome ?? '').trim().split(/\s+/)[0] ?? ''
  const limpo = bruto.replace(/[^\p{L}'-]/gu, '')
  if (limpo.length < 2) return null
  return limpo.charAt(0).toUpperCase() + limpo.slice(1).toLowerCase()
}

/**
 * Normaliza pro formato E.164 do WhatsApp (55 + DDD + 9XXXXXXXX).
 * A base tem 3 casos: 11 dígitos OK, 10 dígitos (celular antigo, sem o
 * 9) e alguns com "0" de tronco na frente. Fixo/inválido volta null —
 * não adianta gastar envio em quem não tem WhatsApp.
 */
function e164(whats) {
  let d = String(whats ?? '').replace(/\D/g, '')
  if (!d) return null
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2) // tira DDI se veio junto
  d = d.replace(/^0+/, '')                                 // tira 0 de tronco
  if (d.length < 10 || d.length > 11) return null
  const ddd = d.slice(0, 2)
  let assinante = d.slice(2)
  if (Number(ddd) < 11 || Number(ddd) > 99) return null
  if (assinante.length === 8) {
    // celular antigo (6/7/8/9) ganha o nono dígito; 2-5 é fixo -> descarta
    if (!/^[6-9]/.test(assinante)) return null
    assinante = `9${assinante}`
  }
  if (assinante.length !== 9 || !assinante.startsWith('9')) return null
  return `55${ddd}${assinante}`
}

/** Números que responderam SAIR (arquivo fora do git). Vazio se não existir. */
function carregarOptOut() {
  if (!existsSync(ARQ_OPTOUT)) return new Set()
  return new Set(
    readFileSync(ARQ_OPTOUT, 'utf8')
      .split(/\r?\n/)
      .map((l) => e164(l.replace(/#.*$/, '')))
      .filter(Boolean),
  )
}

/** Extras já enviados nesta edição (log local, fora do git). */
function extrasJaEnviados() {
  if (!existsSync(ARQ_EXTRAS_ENVIADOS)) return new Set()
  const out = new Set()
  for (const linha of readFileSync(ARQ_EXTRAS_ENVIADOS, 'utf8').split(/\r?\n/)) {
    if (!linha.trim()) continue
    try {
      const r = JSON.parse(linha)
      if (r.edicao === EDICAO && r.numero) out.add(r.numero)
    } catch { /* linha corrompida: ignora */ }
  }
  return out
}

async function enviar(numero, nome) {
  const components = []
  if (!SEM_IMAGEM) {
    components.push({ type: 'header', parameters: [{ type: 'image', image: { link: IMG } }] })
  }
  components.push({
    type: 'body',
    parameters: CFG.params(nome).map((text) => ({ type: 'text', text })),
  })
  const body = {
    messaging_product: 'whatsapp',
    to: numero,
    type: 'template',
    template: { name: CFG.template, language: { code: LANG }, components },
  }
  const r = await fetch(`https://graph.facebook.com/${API}/${PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await r.json().catch(() => ({}))
  if (!r.ok) {
    const e = json?.error ?? {}
    let erro = `${e.code ?? r.status}: ${e.message ?? 'falha'}`
    if (e.error_data?.details) erro += ` — ${e.error_data.details}`
    // 132000 = número de parâmetros diferente do template; 132012 = formato
    // de parâmetro (ex.: cabeçalho de imagem num template sem cabeçalho).
    if (e.code === 132000 || e.code === 132012) {
      erro += ' [confira o template na Meta: quantidade de {{n}} e cabeçalho; --sem-imagem omite a imagem]'
    }
    return { ok: false, erro, code: e.code }
  }
  return { ok: true, id: json?.messages?.[0]?.id }
}

async function destinatarios() {
  if (TESTE) {
    const nums = TESTE.split(',').map((s) => s.trim()).filter(Boolean)
    const out = []
    for (const n of nums) {
      const digits = n.replace(/\D/g, '').replace(/^55/, '')
      const { data } = await db
        .from('votantes')
        .select('whatsapp, nome, nome_autodeclarado')
        .eq('whatsapp', digits)
        .limit(1)
      const v = data?.[0]
      out.push({ whatsapp: digits, nome: primeiroNome(v?.nome ?? v?.nome_autodeclarado) ?? 'Eleitor', extra: true })
    }
    return out
  }
  if (EXTRAS) {
    if (!existsSync(ARQ_EXTRAS)) throw new Error(`${ARQ_EXTRAS} não existe`)
    const lista = JSON.parse(readFileSync(ARQ_EXTRAS, 'utf8'))
    if (!Array.isArray(lista)) throw new Error('convite-extras.json deve ser uma lista [{nome, whatsapp}]')
    const ja = extrasJaEnviados()
    const out = []
    for (const e of lista) {
      const numero = e164(e.whatsapp)
      const nome = primeiroNome(e.nome)
      if (!numero || !nome) { console.log(`  extra ignorado (número/nome inválido): ${JSON.stringify(e)}`); continue }
      if (ja.has(numero)) { console.log(`  extra já enviado nesta edição: ${numero}`); continue }
      out.push({ whatsapp: numero.slice(2), nome, extra: true })
    }
    return out
  }
  if (BASE === 'pesquisa') return destinatariosPesquisa()
  // Pendentes: whatsapp validado, ainda não convidado NESTA edição. Dedup por número.
  const { data, error } = await db
    .from('votantes')
    .select('whatsapp, nome, nome_autodeclarado')
    .eq('whatsapp_validado', true)
    .is(CFG.coluna, null)
    .not('whatsapp', 'is', null)
    .order('whatsapp')
    .limit(LOTE * 4)
  if (error) {
    if (/column .* does not exist/i.test(error.message)) {
      throw new Error(
        `Supabase: ${error.message}\n  Crie a coluna no banco do Melhores do Ano:\n` +
        `  alter table votantes add column if not exists ${CFG.coluna} timestamptz;`,
      )
    }
    throw new Error(`Supabase: ${error.message}`)
  }
  const vistos = new Set()
  const lista = []
  for (const v of data ?? []) {
    const w = String(v.whatsapp ?? '').replace(/\D/g, '')
    if (!w || vistos.has(w)) continue
    const nome = primeiroNome(v.nome ?? v.nome_autodeclarado)
    if (!nome) continue // sem nome utilizável, pula (template exige {{1}})
    vistos.add(w)
    lista.push({ whatsapp: w, nome })
    if (lista.length >= LOTE) break
  }
  return lista
}

/**
 * Números que a base mda JÁ recebeu nesta edição (pra não mandar duas vezes
 * pra quem está nas duas bases). Pagina de 1.000 em 1.000 (teto do Supabase).
 */
async function numerosJaEnviadosMda() {
  const out = new Set()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('votantes')
      .select('whatsapp')
      .not(CFG.coluna, 'is', null)
      .not('whatsapp', 'is', null)
      .range(from, from + 999)
    if (error) throw new Error(`Supabase (mda): ${error.message}`)
    for (const v of data ?? []) { const n = e164(v.whatsapp); if (n) out.add(n) }
    if (!data || data.length < 1000) break
  }
  return out
}

/**
 * Base própria da pesquisa (cdl_base): quem tem WhatsApp e ainda não foi
 * convidado nesta edição. Nome: nome_completo (SPC) ou nome_mascarado
 * ("Maria S. ***" → "Maria"). Quem já recebeu pela base mda é marcado como
 * enviado aqui também e sai da fila sem nova mensagem.
 */
async function destinatariosPesquisa() {
  const jaMda = await numerosJaEnviadosMda()
  const { data, error } = await dbPesq
    .from('cdl_base')
    .select('whatsapp_e164, nome_completo, nome_mascarado, whatsapp_fonte')
    .is(CFG.coluna, null)
    .not('whatsapp_e164', 'is', null)
    .order('whatsapp_e164')
    .limit(LOTE * 4)
  if (error) {
    if (/column .* does not exist/i.test(error.message)) {
      throw new Error(`Supabase (pesquisa): ${error.message}\n  Aplique supabase/migrations/054-cdl-base-convite-pesquisa2.sql`)
    }
    throw new Error(`Supabase (pesquisa): ${error.message}`)
  }
  const vistos = new Set()
  const lista = []
  let pulados = 0
  for (const v of data ?? []) {
    const numero = e164(v.whatsapp_e164)
    if (!numero || vistos.has(numero)) continue
    vistos.add(numero)
    if (jaMda.has(numero)) {
      pulados++
      if (GRAVAR) await marcarEnviado(v.whatsapp_e164)
      continue
    }
    const nome = primeiroNome(v.nome_completo ?? v.nome_mascarado)
    if (!nome) continue // sem nome utilizável, pula (template exige {{1}})
    lista.push({ whatsapp: numero.slice(2), whatsappBruto: v.whatsapp_e164, nome })
    if (lista.length >= LOTE) break
  }
  if (pulados) console.log(`  ${pulados} número(s) já convidado(s) pela base mda — ${GRAVAR ? 'marcados e ' : ''}pulados`)
  return lista
}

// Depois que a Meta aceita a mensagem não dá pra "desenviar" — então marcar
// no banco não pode falhar silenciosamente, senão o numero fica pra sempre
// como "pendente" e uma proxima rodada manda a MESMA pessoa de novo.
// Tenta 3x antes de desistir.
async function marcarEnviado(whats) {
  const TENTATIVAS = 3
  for (let i = 1; i <= TENTATIVAS; i++) {
    const { error } = BASE === 'pesquisa'
      ? await dbPesq
          .from('cdl_base')
          .update({ [CFG.coluna]: new Date().toISOString() })
          .eq('whatsapp_e164', whats) // marca TODAS as linhas do mesmo número
      : await db
          .from('votantes')
          .update({ [CFG.coluna]: new Date().toISOString() })
          .eq('whatsapp', whats) // marca TODAS as linhas do mesmo número
    if (!error) return true
    if (i < TENTATIVAS) await sleep(500 * i)
  }
  return false
}

/** Extras e --teste não estão em `votantes`: registra num log local. */
function marcarExtraEnviado(numero, nome, id) {
  mkdirSync(CONFIDENCIAL, { recursive: true })
  appendFileSync(
    ARQ_EXTRAS_ENVIADOS,
    JSON.stringify({ edicao: EDICAO, numero, nome, id, em: new Date().toISOString() }) + '\n',
  )
}

async function main() {
  if (!TOKEN) throw new Error('META_TOKEN ausente (token do número do Melhores do Ano)')
  const optOut = carregarOptOut()
  const alvos = await destinatarios()
  const modo = TESTE ? 'TESTE' : EXTRAS ? 'EXTRAS' : `LOTE ${LOTE}`
  console.log(
    `${GRAVAR ? 'ENVIANDO' : 'DRY-RUN'} · edição ${EDICAO} · base ${BASE} · template ${CFG.template}${SEM_IMAGEM ? ' (sem imagem)' : ''} · ${modo} · ${alvos.length} destinatário(s) · numero ${PHONE_ID} · opt-out ${optOut.size}`,
  )
  let ok = 0, falha = 0, optouts = 0
  const erros = new Map()
  const enviadosNaoMarcados = []
  for (const [i, alvo] of alvos.entries()) {
    const numero = e164(alvo.whatsapp)
    if (!numero) { falha++; continue }
    if (optOut.has(numero)) {
      optouts++
      // Quem pediu pra sair fica marcado como "enviado" pra não voltar à fila.
      if (GRAVAR && !alvo.extra) await marcarEnviado(alvo.whatsappBruto ?? alvo.whatsapp)
      continue
    }
    if (!GRAVAR) {
      console.log(`  [dry] ${numero} · "Olá, ${alvo.nome}!"${alvo.extra ? ' (extra)' : ''}`)
      continue
    }
    // Falha de rede/Supabase não pode derrubar o lote inteiro: um erro
    // aqui antes fazia o script morrer sem imprimir o resumo, e o runner
    // lia isso como "fila vazia" e encerrava a campanha no meio.
    let r
    try {
      r = await enviar(numero, alvo.nome)
      if (r.ok) {
        if (alvo.extra) {
          marcarExtraEnviado(numero, alvo.nome, r.id)
        } else if (!(await marcarEnviado(alvo.whatsappBruto ?? alvo.whatsapp))) {
          // Mensagem SAIU pela Meta mas o banco não confirmou a marcação —
          // NÃO pode contar como falha (senão uma rodada futura reenvia pra
          // quem já recebeu). Registra à parte pra reconciliação manual.
          enviadosNaoMarcados.push(alvo.whatsapp)
          console.log(`  AVISO: enviado mas nao marcado — ${alvo.whatsapp} (id ${r.id})`)
        }
      }
    } catch (e) {
      r = { ok: false, erro: `excecao: ${e?.message ?? e}` }
    }
    if (r.ok) {
      ok++
    } else {
      falha++
      erros.set(r.erro, (erros.get(r.erro) ?? 0) + 1)
      // 131049/130472 = limite por qualidade/experiência: não insistir
      if (r.code === 4 || r.code === 80007) { console.log('  rate limit — pausa 30s'); await sleep(30000) }
    }
    if ((i + 1) % 50 === 0) console.log(`  ...${i + 1}/${alvos.length} (ok ${ok}, falha ${falha})`)
    await sleep(SLEEP_MS)
  }
  console.log(`\nFim: ${ok} enviados, ${falha} falhas, ${optouts} opt-out pulados`)
  if (erros.size) { console.log('Erros:'); for (const [e, n] of erros) console.log(`  ${n}x ${e}`) }
  if (enviadosNaoMarcados.length) {
    console.log(`\n${enviadosNaoMarcados.length} enviado(s) sem confirmar marcação — reconciliar manualmente:`)
    for (const w of enviadosNaoMarcados) console.log(`  ${w}`)
  }
}

main().catch((e) => { console.error('ERRO:', e.message); process.exit(1) })
