/**
 * Cookies de sessao do fluxo do eleitor.
 *
 * Sao DOIS cookies bem distintos, e a separacao deles e uma garantia da
 * arquitetura "duas salas":
 *
 *   1. `pre_voto` — Sala 1. Carrega um RASCUNHO do cadastro: cpf_hash,
 *      fonte da validacao, municipio (se conhecido pela cdl_base), whatsapp
 *      (idem), edicao_id. Some assim que o eleitor entra na capsula.
 *
 *      Ate o momento em que o OTP e confirmado, NAO criamos linha em
 *      `eleitores_pesquisa` — a linha so entra com todos os campos prontos
 *      (incluindo municipio, que e NOT NULL). O cookie carrega o rascunho.
 *
 *   2. `voto` — Sala 2. Carrega o TOKEN em claro, gerado no momento da
 *      entrada na capsula. So existe DENTRO da capsula. Nao tem nenhuma
 *      referencia ao CPF.
 *
 * Nunca os dois cookies devem coexistir no mesmo response. Quem entra na
 * capsula limpa o `pre_voto` e seta o `voto`.
 *
 * Server-only.
 */
import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

import { SERVER_ENV } from './env'

const COOKIE_PRE = 'pre_voto'
const COOKIE_VOTO = 'voto'

const COMMON_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/votar',
} as const

const sign = (payload: string): string =>
  createHmac('sha256', SERVER_ENV.JWT_SECRET).update(payload).digest('hex')

const verify = (payload: string, sig: string): boolean => {
  if (sig.length !== 64) return false
  try {
    return timingSafeEqual(
      Buffer.from(sign(payload), 'hex'),
      Buffer.from(sig, 'hex'),
    )
  } catch {
    return false
  }
}

const encodePayload = (value: string): string => `${value}.${sign(value)}`

const decodePayload = (raw: string | undefined): string | null => {
  if (!raw) return null
  const dot = raw.lastIndexOf('.')
  if (dot < 1) return null
  const value = raw.slice(0, dot)
  const sig = raw.slice(dot + 1)
  return verify(value, sig) ? value : null
}

const toBase64Url = (s: string): string =>
  Buffer.from(s, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

const fromBase64Url = (s: string): string => {
  const padded = s + '='.repeat((4 - (s.length % 4)) % 4)
  return Buffer.from(
    padded.replace(/-/g, '+').replace(/_/g, '/'),
    'base64',
  ).toString('utf8')
}

// ─── pre_voto (Sala 1, rascunho) ───────────────────────────────────────────

/**
 * Rascunho do cadastro do eleitor antes da linha em `eleitores_pesquisa`
 * existir de fato. So vira linha real depois que OTP for confirmado.
 */
export type PreVotoDraft = {
  cpfHash: string
  cpfMascarado: string
  edicaoId: string
  fonte: 'cdl_base' | 'spc'
  spcValidado: boolean
  // Dados de pre-preenchimento (cdl_base ou SPC). Sempre opcionais.
  municipioIbge?: number
  whatsappE164?: string
  nomeMascarado?: string
  sexo?: 'M' | 'F'
  faixaEtaria?: '16-17' | '18-24' | '25-34' | '35-44' | '45-59' | '60+'
  escolaridade?: 'fundamental' | 'medio' | 'superior'
}

export const setPreVoto = async (draft: PreVotoDraft): Promise<void> => {
  const jar = await cookies()
  const encoded = toBase64Url(JSON.stringify(draft))
  jar.set(COOKIE_PRE, encodePayload(encoded), COMMON_OPTIONS)
}

export const getPreVoto = async (): Promise<PreVotoDraft | null> => {
  const jar = await cookies()
  const decoded = decodePayload(jar.get(COOKIE_PRE)?.value)
  if (!decoded) return null
  try {
    const parsed = JSON.parse(fromBase64Url(decoded)) as Partial<PreVotoDraft>
    if (
      typeof parsed.cpfHash !== 'string' ||
      typeof parsed.cpfMascarado !== 'string' ||
      typeof parsed.edicaoId !== 'string' ||
      (parsed.fonte !== 'cdl_base' && parsed.fonte !== 'spc') ||
      typeof parsed.spcValidado !== 'boolean'
    ) {
      return null
    }
    return parsed as PreVotoDraft
  } catch {
    return null
  }
}

export const clearPreVoto = async (): Promise<void> => {
  const jar = await cookies()
  jar.set(COOKIE_PRE, '', { ...COMMON_OPTIONS, maxAge: 0 })
}

// ─── voto (Sala 2, capsula) ────────────────────────────────────────────────

/** TTL do cookie da capsula. 24h cobre os casos comuns de eleitor que
 *  fechou o navegador sem querer e quer retomar — sem alargar demais a
 *  janela em que cookie roubado/dispositivo emprestado seriam um problema.
 */
const VOTO_COOKIE_TTL_SEGUNDOS = 24 * 60 * 60

/**
 * Salva o token em claro pra Sala 2. Persiste por 24h (Fix A) pra
 * permitir recuperacao se o eleitor fechar o navegador antes de
 * terminar todas as cedulas. Path restrito a /votar.
 */
export const setVotoToken = async (token: string): Promise<void> => {
  const jar = await cookies()
  jar.set(COOKIE_VOTO, encodePayload(token), {
    ...COMMON_OPTIONS,
    maxAge: VOTO_COOKIE_TTL_SEGUNDOS,
  })
}

export const getVotoToken = async (): Promise<string | null> => {
  const jar = await cookies()
  return decodePayload(jar.get(COOKIE_VOTO)?.value)
}

export const clearVotoToken = async (): Promise<void> => {
  const jar = await cookies()
  jar.set(COOKIE_VOTO, '', { ...COMMON_OPTIONS, maxAge: 0 })
}
