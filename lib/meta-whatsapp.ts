/**
 * Cliente Meta WhatsApp Cloud API.
 *
 * Adaptado do projeto Melhores do Ano (lib/meta-whatsapp/client.ts), com
 * mesmos nomes de env var pra reuso direto das credenciais. Suporta
 * round-robin entre multiplos `phone_number_id` quando o token tiver
 * acesso a varios numeros.
 *
 * Server-only.
 */
import 'server-only'

import { SERVER_ENV } from './env'

export type MetaSendResult =
  | { ok: true; phoneId: string }
  | { ok: false; detalhe: string }

const TIMEOUT_MS = 12_000

const getPhoneIds = (): string[] =>
  SERVER_ENV.META_WHATSAPP_PHONE_IDS
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

export const metaWhatsappConfigurada = (): boolean =>
  !!SERVER_ENV.META_WHATSAPP_TOKEN && getPhoneIds().length > 0

const normalizarTelefone = (raw: string): string => {
  const digits = raw.replace(/\D/g, '')
  return digits.startsWith('55') ? digits : `55${digits}`
}

/** Round-robin entre phone IDs em memoria. Reset no reload do processo. */
let proximoIdx = 0

/**
 * Envia o template de OTP (categoria AUTHENTICATION da Meta) com botao
 * "Copiar codigo".
 *
 * O template precisa estar APROVADO no Meta Business Manager. Nome e
 * idioma vem das envs META_TEMPLATE_OTP / META_TEMPLATE_OTP_LANG. Pra
 * esta pesquisa o nome esperado e `otp_pesquisa_sergipe` em pt_BR — se
 * vc reusar `otp_melhores_do_ano` ja' aprovado, troque a env e pronto.
 *
 * O `codigo` aparece tanto no corpo `{{1}}` quanto no botao de copy.
 */
export async function enviarOtpWhatsApp(
  numero: string,
  codigo: string,
): Promise<MetaSendResult> {
  const token = SERVER_ENV.META_WHATSAPP_TOKEN
  const phoneIds = getPhoneIds()

  if (!token) return { ok: false, detalhe: 'META_WHATSAPP_TOKEN ausente.' }
  if (phoneIds.length === 0) {
    return { ok: false, detalhe: 'META_WHATSAPP_PHONE_IDS vazio.' }
  }

  const to = normalizarTelefone(numero)
  const baseStart = proximoIdx % phoneIds.length
  proximoIdx++

  const body = JSON.stringify({
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: SERVER_ENV.META_TEMPLATE_OTP,
      language: { code: SERVER_ENV.META_TEMPLATE_OTP_LANG },
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: codigo }],
        },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [{ type: 'text', text: codigo }],
        },
      ],
    },
  })

  let ultimoErro: string | undefined
  for (let i = 0; i < phoneIds.length; i++) {
    const phoneId = phoneIds[(baseStart + i) % phoneIds.length] as string
    const url = `https://graph.facebook.com/${SERVER_ENV.META_API_VERSION}/${phoneId}/messages`

    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body,
        signal: ctrl.signal,
        cache: 'no-store',
      })
      clearTimeout(timer)

      if (res.ok) {
        return { ok: true, phoneId }
      }

      const errPayload = (await res.json().catch(() => ({}))) as {
        error?: { message?: string }
      }
      ultimoErro = `[${phoneId}] ${
        errPayload.error?.message ?? `HTTP ${res.status}`
      }`
    } catch (err) {
      ultimoErro = `[${phoneId}] ${
        err instanceof Error ? err.message : 'falha de rede'
      }`
    }
  }

  console.error('[meta-wa] todos os phone IDs falharam:', ultimoErro)
  return { ok: false, detalhe: ultimoErro ?? 'falha desconhecida' }
}

/**
 * Envia o template de resultado consolidado da pesquisa (categoria
 * UTILITY na Meta), com link pros resultados públicos.
 *
 * O template precisa estar APROVADO no Meta Business Manager. Nome
 * vem de META_TEMPLATE_RESULTADO (default 'resultado_pesquisa_sergipe').
 * Idioma reusa META_TEMPLATE_OTP_LANG (default 'pt_BR') porque é a
 * mesma WABA.
 *
 * Body recebe 1 parâmetro: a URL pública dos resultados.
 *
 * Use SOMENTE para eleitores com opt_in_resultados_wa = true. A
 * verificação de opt-in é responsabilidade do chamador (admin action).
 */
export async function enviarResultadoWhatsApp(
  numero: string,
  urlResultados: string,
): Promise<MetaSendResult> {
  const token = SERVER_ENV.META_WHATSAPP_TOKEN
  const phoneIds = getPhoneIds()

  if (!token) return { ok: false, detalhe: 'META_WHATSAPP_TOKEN ausente.' }
  if (phoneIds.length === 0) {
    return { ok: false, detalhe: 'META_WHATSAPP_PHONE_IDS vazio.' }
  }

  const to = normalizarTelefone(numero)
  const baseStart = proximoIdx % phoneIds.length
  proximoIdx++

  const body = JSON.stringify({
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: SERVER_ENV.META_TEMPLATE_RESULTADO,
      language: { code: SERVER_ENV.META_TEMPLATE_OTP_LANG },
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: urlResultados }],
        },
      ],
    },
  })

  let ultimoErro: string | undefined
  for (let i = 0; i < phoneIds.length; i++) {
    const phoneId = phoneIds[(baseStart + i) % phoneIds.length] as string
    const url = `https://graph.facebook.com/${SERVER_ENV.META_API_VERSION}/${phoneId}/messages`

    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body,
        signal: ctrl.signal,
        cache: 'no-store',
      })
      clearTimeout(timer)
      if (res.ok) {
        return { ok: true, phoneId }
      }
      const errPayload = (await res.json().catch(() => ({}))) as {
        error?: { message?: string }
      }
      ultimoErro = `[${phoneId}] ${
        errPayload.error?.message ?? `HTTP ${res.status}`
      }`
    } catch (err) {
      ultimoErro = `[${phoneId}] ${
        err instanceof Error ? err.message : 'falha de rede'
      }`
    }
  }

  console.error('[meta-wa] resultado: todos os phone IDs falharam:', ultimoErro)
  return { ok: false, detalhe: ultimoErro ?? 'falha desconhecida' }
}
