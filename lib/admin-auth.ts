/**
 * Auth do admin. Cookie unico assinado com JWT_SECRET.
 *
 * Mecanismo simples: ADMIN_PASSWORD do .env e a chave; quem acerta a
 * senha recebe um cookie httpOnly assinado, com timestamp de emissao.
 * Validade de 8 horas.
 *
 * Quando precisar de multi-usuario admin, migrar pra Supabase Auth ou
 * tabela `admins` com bcrypt — sem mexer nas paginas (substituir so o
 * miolo de `verificarSenha`).
 *
 * Server-only.
 */
import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { SERVER_ENV } from './env'

const COOKIE_NAME = 'admin_sess'
const TTL_SEGUNDOS = 8 * 60 * 60 // 8 horas

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/admin',
  maxAge: TTL_SEGUNDOS,
} as const

const sign = (payload: string): string =>
  createHmac('sha256', SERVER_ENV.JWT_SECRET).update(payload).digest('hex')

const verifySig = (payload: string, sig: string): boolean => {
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

/** Compara senha com ADMIN_PASSWORD em tempo constante. */
export const verificarSenha = (senhaInformada: string): boolean => {
  const correta = SERVER_ENV.ADMIN_PASSWORD
  if (senhaInformada.length === 0) return false
  // timingSafeEqual exige buffers de mesmo tamanho — pad ate o maior.
  const a = Buffer.from(senhaInformada)
  const b = Buffer.from(correta)
  const len = Math.max(a.length, b.length)
  const padA = Buffer.concat([a, Buffer.alloc(len - a.length)])
  const padB = Buffer.concat([b, Buffer.alloc(len - b.length)])
  try {
    return timingSafeEqual(padA, padB) && a.length === b.length
  } catch {
    return false
  }
}

export const setAdminSessao = async (): Promise<void> => {
  const jar = await cookies()
  const issued = Date.now().toString()
  jar.set(COOKIE_NAME, `${issued}.${sign(issued)}`, COOKIE_OPTIONS)
}

export const clearAdminSessao = async (): Promise<void> => {
  const jar = await cookies()
  jar.set(COOKIE_NAME, '', { ...COOKIE_OPTIONS, maxAge: 0 })
}

/** Retorna true se o cookie admin existir, estiver valido e nao expirado. */
export const isAdmin = async (): Promise<boolean> => {
  const jar = await cookies()
  const raw = jar.get(COOKIE_NAME)?.value
  if (!raw) return false
  const dot = raw.lastIndexOf('.')
  if (dot < 1) return false
  const payload = raw.slice(0, dot)
  const sig = raw.slice(dot + 1)
  if (!verifySig(payload, sig)) return false
  const issuedAt = Number(payload)
  if (!Number.isFinite(issuedAt)) return false
  if (Date.now() - issuedAt > TTL_SEGUNDOS * 1000) return false
  return true
}

/** Bloqueia o render se nao for admin. Use no inicio de cada Server Component protegido. */
export const requireAdmin = async (): Promise<void> => {
  if (!(await isAdmin())) {
    redirect('/admin/login')
  }
}
