import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { SERVER_ENV } from './env'
import { supabaseAdmin } from './supabase/admin'

/**
 * Convite por WhatsApp para a 2ª edição (coleta 13–20/09/2026), rodando
 * como cron da Vercel — não depende de máquina local ligada.
 *
 * Autorização: presidência da CDL, 12/09/2026 — "a partir de 8h mandar
 * zap até as 15h para todos do nosso banco de dados". Por isso a janela é
 * FIXA no código: só envia em 13/09/2026 entre 08h00 e 15h00
 * (America/Recife). Fora dela, o cron só faz a pré-checagem (token,
 * número, template, fila) e registra em cron_log.
 *
 * Bases (mesma regra de scripts/disparar-convite-pesquisa.mjs):
 *   1. mda — votantes do Melhores do Ano (banco MELHORES_*), marca
 *      votantes.convite_pesquisa2_enviado_em;
 *   2. pesquisa — cdl_base com whatsapp_e164, marca
 *      cdl_base.convite_pesquisa2_enviado_em (migration 054). Quem já
 *      recebeu pela base mda é marcado e pulado (uma mensagem por número).
 *
 * Idempotência: a coluna é marcada logo após a Meta aceitar a mensagem.
 * Falha permanente do destinatário (número sem WhatsApp etc.) também marca
 * — com o motivo em cdl_base.convite_pesquisa2_erro (migration 055) — para
 * a fila não travar no mesmo número o dia inteiro. Falha sistêmica (token,
 * template, limite de envio da Meta) interrompe o tick sem marcar nada; o
 * tick seguinte tenta de novo.
 *
 * Kill switch: env CONVITE_PAUSADO=1 na Vercel (sem redeploy necessário
 * para crons? não — variável de ambiente exige redeploy; use a página
 * Settings → Cron Jobs → Disable como parada imediata).
 */

export const CONVITE = {
  template: process.env.META_TEMPLATE_CONVITE ?? 'convite_pesquisa',
  lang: 'pt_BR',
  /** Número do Melhores do Ano (mesmo do script local). */
  phoneId: process.env.META_CONVITE_PHONE_ID ?? '1031179760086462',
  imagem:
    process.env.CONVITE_IMAGEM ??
    'https://pesquisa.cdlaju.com.br/convite-whatsapp.png',
  coluna: 'convite_pesquisa2_enviado_em',
  dia: '2026-09-13',
  inicioMin: 8 * 60,
  fimMin: 15 * 60,
  fuso: 'America/Recife',
} as const

const PARAMS = (nome: string) => [
  nome,
  'Sergipe',
  'CDL Aracaju',
  '*2ª edição da Pesquisa Eleitoral Sergipe 2026*',
  '20 de setembro',
  'pesquisa.cdlaju.com.br/votar',
  'sergipano',
]

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/* ------------------------------------------------------------------ */
/* Janela                                                              */
/* ------------------------------------------------------------------ */

export type Agora = { data: string; hora: string; minutos: number }

export function agoraRecife(d = new Date()): Agora {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CONVITE.fuso,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const p = (t: string) => parts.find((x) => x.type === t)?.value ?? '00'
  const hh = Number(p('hour')) % 24
  const mm = Number(p('minute'))
  return {
    data: `${p('year')}-${p('month')}-${p('day')}`,
    hora: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
    minutos: hh * 60 + mm,
  }
}

export function dentroDaJanela(a = agoraRecife()): boolean {
  return (
    a.data === CONVITE.dia &&
    a.minutos >= CONVITE.inicioMin &&
    a.minutos < CONVITE.fimMin
  )
}

/* ------------------------------------------------------------------ */
/* Utilidades de nome/número (iguais ao script local)                  */
/* ------------------------------------------------------------------ */

function primeiroNome(nome: unknown): string | null {
  const bruto = String(nome ?? '').trim().split(/\s+/)[0] ?? ''
  const limpo = bruto.replace(/[^\p{L}'-]/gu, '')
  if (limpo.length < 2) return null
  return limpo.charAt(0).toUpperCase() + limpo.slice(1).toLowerCase()
}

function e164(whats: unknown): string | null {
  let d = String(whats ?? '').replace(/\D/g, '')
  if (!d) return null
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2)
  d = d.replace(/^0+/, '')
  if (d.length < 10 || d.length > 11) return null
  const ddd = d.slice(0, 2)
  let assinante = d.slice(2)
  if (Number(ddd) < 11 || Number(ddd) > 99) return null
  if (assinante.length === 8) {
    if (!/^[6-9]/.test(assinante)) return null
    assinante = `9${assinante}`
  }
  if (assinante.length !== 9 || !assinante.startsWith('9')) return null
  return `55${ddd}${assinante}`
}

/* ------------------------------------------------------------------ */
/* Clientes                                                            */
/* ------------------------------------------------------------------ */

function mdaClient(): SupabaseClient | null {
  const url = process.env.MELHORES_SUPABASE_URL
  const key = process.env.MELHORES_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

/* ------------------------------------------------------------------ */
/* Envio                                                               */
/* ------------------------------------------------------------------ */

type Envio =
  | { ok: true; id?: string }
  | { ok: false; code: number | string; erro: string; sistemico: boolean }

/**
 * Erros que afetam TODOS os envios (não marcar ninguém, parar o tick):
 * token/permissão, template/parâmetros, mídia do cabeçalho, limites de
 * envio da Meta, número não registrado.
 */
const SISTEMICOS = new Set<number>([
  0, 1, 2, 4, 10, 100, 190, 200, 80007, 130429, 131000, 131005, 131008,
  131009, 131016, 131031, 131042, 131045, 131048, 131052, 131053, 131056,
  132000, 132001, 132005, 132007, 132012, 132015, 132016, 133000, 133004,
  133005, 133006, 133008, 133009, 133010, 133015, 133016, 135000,
])

async function enviarConvite(numero: string, nome: string): Promise<Envio> {
  const token = SERVER_ENV.META_WHATSAPP_TOKEN
  if (!token) {
    return { ok: false, code: 'env', erro: 'META_WHATSAPP_TOKEN ausente', sistemico: true }
  }
  const body = {
    messaging_product: 'whatsapp',
    to: numero,
    type: 'template',
    template: {
      name: CONVITE.template,
      language: { code: CONVITE.lang },
      components: [
        {
          type: 'header',
          parameters: [{ type: 'image', image: { link: CONVITE.imagem } }],
        },
        {
          type: 'body',
          parameters: PARAMS(nome).map((text) => ({ type: 'text', text })),
        },
      ],
    },
  }
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 12_000)
  try {
    const r = await fetch(
      `https://graph.facebook.com/${SERVER_ENV.META_API_VERSION}/${CONVITE.phoneId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      },
    )
    const json = (await r.json().catch(() => ({}))) as {
      messages?: { id?: string }[]
      error?: { code?: number; message?: string; error_data?: { details?: string } }
    }
    if (!r.ok) {
      const e = json.error ?? {}
      const code = e.code ?? r.status
      let erro = `${code}: ${e.message ?? 'falha'}`
      if (e.error_data?.details) erro += ` — ${e.error_data.details}`
      const sistemico =
        r.status === 401 ||
        r.status === 403 ||
        r.status === 429 ||
        r.status >= 500 ||
        (typeof code === 'number' && SISTEMICOS.has(code))
      return { ok: false, code, erro, sistemico }
    }
    return { ok: true, id: json.messages?.[0]?.id }
  } catch (err) {
    return {
      ok: false,
      code: 'rede',
      erro: err instanceof Error ? err.message : String(err),
      sistemico: true,
    }
  } finally {
    clearTimeout(t)
  }
}

/* ------------------------------------------------------------------ */
/* Filas                                                               */
/* ------------------------------------------------------------------ */

type Alvo = {
  base: 'mda' | 'pesquisa'
  numero: string // 55DDD9XXXXXXXX
  nome: string
  /** valor cru da coluna whatsapp/whatsapp_e164, usado no UPDATE */
  chave: string
}

const LOTE = 600

async function filaMda(mda: SupabaseClient): Promise<Alvo[]> {
  const { data, error } = await mda
    .from('votantes')
    .select('whatsapp, nome, nome_autodeclarado')
    .eq('whatsapp_validado', true)
    .is(CONVITE.coluna, null)
    .not('whatsapp', 'is', null)
    .order('whatsapp')
    .limit(LOTE)
  if (error) throw new Error(`Supabase (mda): ${error.message}`)
  const vistos = new Set<string>()
  const out: Alvo[] = []
  for (const v of data ?? []) {
    const numero = e164(v.whatsapp)
    if (!numero) {
      // número inválido: marca pra sair da fila (não há como entregar)
      await mda
        .from('votantes')
        .update({ [CONVITE.coluna]: new Date().toISOString() })
        .eq('whatsapp', v.whatsapp)
      continue
    }
    if (vistos.has(numero)) continue
    const nome = primeiroNome(v.nome ?? v.nome_autodeclarado)
    if (!nome) {
      await mda
        .from('votantes')
        .update({ [CONVITE.coluna]: new Date().toISOString() })
        .eq('whatsapp', v.whatsapp)
      continue
    }
    vistos.add(numero)
    out.push({ base: 'mda', numero, nome, chave: String(v.whatsapp) })
  }
  return out
}

async function filaPesquisa(
  db: SupabaseClient,
  mda: SupabaseClient | null,
): Promise<{ alvos: Alvo[]; puladosDedup: number }> {
  const { data, error } = await db
    .from('cdl_base')
    .select('whatsapp_e164, nome_completo, nome_mascarado')
    .is(CONVITE.coluna, null)
    .not('whatsapp_e164', 'is', null)
    .order('whatsapp_e164')
    .limit(LOTE)
  if (error) throw new Error(`Supabase (pesquisa): ${error.message}`)

  const agora = new Date().toISOString()
  const candidatos: Alvo[] = []
  const vistos = new Set<string>()
  for (const v of data ?? []) {
    const numero = e164(v.whatsapp_e164)
    if (!numero) {
      await db
        .from('cdl_base')
        .update({ [CONVITE.coluna]: agora, convite_pesquisa2_erro: 'numero invalido' })
        .eq('whatsapp_e164', v.whatsapp_e164)
      continue
    }
    if (vistos.has(numero)) continue
    vistos.add(numero)
    const nome = primeiroNome(v.nome_completo ?? v.nome_mascarado)
    if (!nome) {
      await db
        .from('cdl_base')
        .update({ [CONVITE.coluna]: agora, convite_pesquisa2_erro: 'sem nome' })
        .eq('whatsapp_e164', v.whatsapp_e164)
      continue
    }
    candidatos.push({ base: 'pesquisa', numero, nome, chave: String(v.whatsapp_e164) })
  }

  // Dedup contra quem já recebeu pela base mda (votantes.whatsapp costuma
  // vir sem o 55; consulta as duas grafias).
  let puladosDedup = 0
  if (mda && candidatos.length) {
    const variantes = candidatos.flatMap((a) => [a.numero, a.numero.slice(2)])
    const jaMda = new Set<string>()
    for (let i = 0; i < variantes.length; i += 400) {
      const { data: ja, error: errJa } = await mda
        .from('votantes')
        .select('whatsapp')
        .in('whatsapp', variantes.slice(i, i + 400))
        .not(CONVITE.coluna, 'is', null)
      if (errJa) throw new Error(`Supabase (mda dedup): ${errJa.message}`)
      for (const r of ja ?? []) {
        const n = e164(r.whatsapp)
        if (n) jaMda.add(n)
      }
    }
    const restantes: Alvo[] = []
    for (const a of candidatos) {
      if (jaMda.has(a.numero)) {
        puladosDedup++
        await db
          .from('cdl_base')
          .update({ [CONVITE.coluna]: agora, convite_pesquisa2_erro: 'ja recebeu pela base mda' })
          .eq('whatsapp_e164', a.chave)
      } else {
        restantes.push(a)
      }
    }
    return { alvos: restantes, puladosDedup }
  }
  return { alvos: candidatos, puladosDedup }
}

async function marcar(
  db: SupabaseClient,
  mda: SupabaseClient | null,
  alvo: Alvo,
  erro?: string,
): Promise<boolean> {
  const agora = new Date().toISOString()
  if (alvo.base === 'mda') {
    if (!mda) return false
    const { error } = await mda
      .from('votantes')
      .update({ [CONVITE.coluna]: agora })
      .eq('whatsapp', alvo.chave)
    return !error
  }
  const { error } = await db
    .from('cdl_base')
    .update({ [CONVITE.coluna]: agora, convite_pesquisa2_erro: erro ?? null })
    .eq('whatsapp_e164', alvo.chave)
  return !error
}

async function pendentes(db: SupabaseClient, mda: SupabaseClient | null) {
  const { count: pesquisa } = await db
    .from('cdl_base')
    .select('whatsapp_e164', { count: 'exact', head: true })
    .is(CONVITE.coluna, null)
    .not('whatsapp_e164', 'is', null)
  let mdaCount: number | null = null
  if (mda) {
    const { count } = await mda
      .from('votantes')
      .select('whatsapp', { count: 'exact', head: true })
      .eq('whatsapp_validado', true)
      .is(CONVITE.coluna, null)
      .not('whatsapp', 'is', null)
    mdaCount = count ?? 0
  }
  return { mda: mdaCount, pesquisa: pesquisa ?? 0 }
}

/* ------------------------------------------------------------------ */
/* Tick do cron                                                        */
/* ------------------------------------------------------------------ */

export type ResumoConvite = {
  modo: 'envio' | 'fora_da_janela' | 'pausado'
  agora: Agora
  base?: 'mda' | 'pesquisa' | 'vazia'
  processados: number
  enviados: number
  falhas: number
  marcadosSemEnvio: number
  parou?: string
  erros: Record<string, number>
  pendentes: { mda: number | null; pesquisa: number }
  duracaoMs: number
}

export async function processarLoteConvite(opts?: {
  orcamentoMs?: number
  concorrencia?: number
}): Promise<ResumoConvite> {
  const inicio = Date.now()
  const agora = agoraRecife()
  const db = supabaseAdmin()
  const mda = mdaClient()
  const vazio = (modo: ResumoConvite['modo']): ResumoConvite => ({
    modo,
    agora,
    processados: 0,
    enviados: 0,
    falhas: 0,
    marcadosSemEnvio: 0,
    erros: {},
    pendentes: { mda: null, pesquisa: 0 },
    duracaoMs: Date.now() - inicio,
  })

  if (process.env.CONVITE_PAUSADO === '1') {
    return { ...vazio('pausado'), pendentes: await pendentes(db, mda) }
  }
  if (!dentroDaJanela(agora)) {
    return { ...vazio('fora_da_janela'), pendentes: await pendentes(db, mda) }
  }

  const ORCAMENTO = opts?.orcamentoMs ?? 45_000
  const CONC = opts?.concorrencia ?? 4

  let base: ResumoConvite['base'] = 'vazia'
  let alvos: Alvo[] = []
  let marcadosSemEnvio = 0
  if (mda) {
    alvos = await filaMda(mda)
    if (alvos.length) base = 'mda'
  }
  if (!alvos.length) {
    const f = await filaPesquisa(db, mda)
    alvos = f.alvos
    marcadosSemEnvio += f.puladosDedup
    if (alvos.length) base = 'pesquisa'
  }

  let processados = 0
  let enviados = 0
  let falhas = 0
  let parou: string | undefined
  let seguidas = 0
  const erros: Record<string, number> = {}
  let proximo = 0

  const worker = async () => {
    while (
      !parou &&
      proximo < alvos.length &&
      Date.now() - inicio < ORCAMENTO
    ) {
      const alvo = alvos[proximo++]
      processados++
      const r = await enviarConvite(alvo.numero, alvo.nome)
      if (r.ok) {
        seguidas = 0
        if (await marcar(db, mda, alvo)) enviados++
        else {
          falhas++
          erros['marcar'] = (erros['marcar'] ?? 0) + 1
          console.error('[convite] enviado mas não marcado', alvo.base, alvo.numero)
        }
      } else {
        falhas++
        erros[String(r.code)] = (erros[String(r.code)] ?? 0) + 1
        if (r.sistemico) {
          parou = `erro sistêmico ${r.erro}`
          console.error('[convite] parada:', r.erro)
          break
        }
        // falha do destinatário: marca pra não voltar à fila
        seguidas++
        await marcar(db, mda, alvo, r.erro.slice(0, 200))
        marcadosSemEnvio++
        if (seguidas >= 15) {
          parou = `15 falhas seguidas (${r.erro})`
          console.error('[convite] parada:', parou)
          break
        }
      }
      await sleep(100)
    }
  }
  await Promise.all(Array.from({ length: CONC }, () => worker()))

  return {
    modo: 'envio',
    agora,
    base,
    processados,
    enviados,
    falhas,
    marcadosSemEnvio,
    parou,
    erros,
    pendentes: await pendentes(db, mda),
    duracaoMs: Date.now() - inicio,
  }
}

/* ------------------------------------------------------------------ */
/* Pré-checagem (sem enviar nada)                                      */
/* ------------------------------------------------------------------ */

export async function preflightConvite() {
  const token = SERVER_ENV.META_WHATSAPP_TOKEN
  const api = SERVER_ENV.META_API_VERSION
  const out: Record<string, unknown> = {
    agora: agoraRecife(),
    janela: `${CONVITE.dia} ${CONVITE.inicioMin / 60}h–${CONVITE.fimMin / 60}h ${CONVITE.fuso}`,
    dentroDaJanela: dentroDaJanela(),
    pausado: process.env.CONVITE_PAUSADO === '1',
    template: CONVITE.template,
    phoneId: CONVITE.phoneId,
    tokenPresente: !!token,
    mdaConfigurado: !!mdaClient(),
  }
  const g = async (path: string) => {
    const r = await fetch(`https://graph.facebook.com/${api}/${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
    return { status: r.status, ...j }
  }
  if (token) {
    try {
      out.numero = await g(
        `${CONVITE.phoneId}?fields=id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,status`,
      )
      const dbg = await g(`debug_token?input_token=${encodeURIComponent(token)}`)
      const data = (dbg as { data?: { granular_scopes?: { scope: string; target_ids?: string[] }[]; expires_at?: number; is_valid?: boolean } }).data
      const wabas = new Set<string>()
      for (const s of data?.granular_scopes ?? []) {
        if (s.scope.startsWith('whatsapp_business')) for (const id of s.target_ids ?? []) wabas.add(id)
      }
      out.token = { valido: data?.is_valid, expiraEm: data?.expires_at, wabas: [...wabas] }
      const templates: unknown[] = []
      for (const waba of wabas) {
        const t = await g(
          `${waba}/message_templates?name=${CONVITE.template}&fields=name,status,category,language,components`,
        )
        templates.push({ waba, ...t })
      }
      out.templates = templates
    } catch (e) {
      out.erroGraph = e instanceof Error ? e.message : String(e)
    }
  }
  try {
    const img = await fetch(CONVITE.imagem, { method: 'HEAD' })
    out.imagem = { url: CONVITE.imagem, status: img.status, tipo: img.headers.get('content-type') }
  } catch (e) {
    out.imagem = { url: CONVITE.imagem, erro: e instanceof Error ? e.message : String(e) }
  }
  try {
    out.pendentes = await pendentes(supabaseAdmin(), mdaClient())
  } catch (e) {
    out.pendentesErro = e instanceof Error ? e.message : String(e)
  }
  return out
}
