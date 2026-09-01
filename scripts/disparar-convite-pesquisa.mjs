/**
 * Disparo do convite da Pesquisa Eleitoral Sergipe 2026 para a base do
 * Melhores do Ano, via template Meta aprovado `convite_pesquisa_sergipe`.
 *
 * Canal: número do Melhores do Ano (CDL Aracaju, +55 79 3212-7701) —
 * SEPARADO do número que envia o OTP da pesquisa, pra que um eventual
 * problema de qualidade no marketing nunca derrube o login do eleitor.
 *
 * Idempotente: marca votantes.convite_pesquisa_enviado_em. Reexecutar
 * só pega quem ainda não recebeu.
 *
 * Uso (env obrigatórias: MDA_SUPABASE_URL, MDA_SERVICE_KEY, META_TOKEN):
 *   node scripts/disparar-convite-pesquisa.mjs --teste 79999724554
 *   node scripts/disparar-convite-pesquisa.mjs --lote 20
 *   node scripts/disparar-convite-pesquisa.mjs --lote 2000 --gravar
 *
 * Sem --gravar é DRY-RUN (não envia nada).
 */
import { createClient } from '@supabase/supabase-js'

const PHONE_ID = process.env.META_PHONE_ID ?? '1031179760086462'
const API = process.env.META_API_VERSION ?? 'v21.0'
const TEMPLATE = 'convite_pesquisa_sergipe'
const LANG = 'pt_BR'
const IMG = 'https://pesquisa.cdlaju.com.br/convite-whatsapp.png'
const TOKEN = process.env.META_TOKEN

const args = process.argv.slice(2)
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null }
const GRAVAR = args.includes('--gravar')
const TESTE = flag('--teste')
const LOTE = Number(flag('--lote') ?? 20)
const SLEEP_MS = Number(process.env.SLEEP_MS ?? 120) // ~8 msg/s, conservador

const db = createClient(process.env.MDA_SUPABASE_URL, process.env.MDA_SERVICE_KEY, {
  auth: { persistSession: false },
})

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

async function enviar(numero, nome) {
  const body = {
    messaging_product: 'whatsapp',
    to: numero,
    type: 'template',
    template: {
      name: TEMPLATE,
      language: { code: LANG },
      components: [
        { type: 'header', parameters: [{ type: 'image', image: { link: IMG } }] },
        { type: 'body', parameters: [{ type: 'text', text: nome }] },
      ],
    },
  }
  const r = await fetch(`https://graph.facebook.com/${API}/${PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await r.json().catch(() => ({}))
  if (!r.ok) {
    const e = json?.error ?? {}
    return { ok: false, erro: `${e.code ?? r.status}: ${e.message ?? 'falha'}`, code: e.code }
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
      out.push({ whatsapp: digits, nome: primeiroNome(v?.nome ?? v?.nome_autodeclarado) ?? 'Eleitor' })
    }
    return out
  }
  // Pendentes: whatsapp validado, ainda não convidado. Dedup por número.
  const { data, error } = await db
    .from('votantes')
    .select('whatsapp, nome, nome_autodeclarado')
    .eq('whatsapp_validado', true)
    .is('convite_pesquisa_enviado_em', null)
    .not('whatsapp', 'is', null)
    .order('whatsapp')
    .limit(LOTE * 4)
  if (error) throw new Error(`Supabase: ${error.message}`)
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

async function marcarEnviado(whats) {
  await db
    .from('votantes')
    .update({ convite_pesquisa_enviado_em: new Date().toISOString() })
    .eq('whatsapp', whats) // marca TODAS as linhas do mesmo número
}

async function main() {
  if (!TOKEN) throw new Error('META_TOKEN ausente')
  const alvos = await destinatarios()
  console.log(`${GRAVAR ? 'ENVIANDO' : 'DRY-RUN'} · ${alvos.length} destinatário(s) · numero ${PHONE_ID}`)
  let ok = 0, falha = 0
  const erros = new Map()
  for (const [i, alvo] of alvos.entries()) {
    const numero = e164(alvo.whatsapp)
    if (!numero) { falha++; continue }
    if (!GRAVAR) {
      console.log(`  [dry] ${numero} · "Olá, ${alvo.nome}!"`)
      continue
    }
    const r = await enviar(numero, alvo.nome)
    if (r.ok) {
      ok++
      await marcarEnviado(alvo.whatsapp)
    } else {
      falha++
      erros.set(r.erro, (erros.get(r.erro) ?? 0) + 1)
      // 131049/130472 = limite por qualidade/experiência: não insistir
      if (r.code === 4 || r.code === 80007) { console.log('  rate limit — pausa 30s'); await sleep(30000) }
    }
    if ((i + 1) % 50 === 0) console.log(`  ...${i + 1}/${alvos.length} (ok ${ok}, falha ${falha})`)
    await sleep(SLEEP_MS)
  }
  console.log(`\nFim: ${ok} enviados, ${falha} falhas`)
  if (erros.size) { console.log('Erros:'); for (const [e, n] of erros) console.log(`  ${n}x ${e}`) }
}

main().catch((e) => { console.error('ERRO:', e.message); process.exit(1) })
