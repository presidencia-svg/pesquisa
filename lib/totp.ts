/**
 * TOTP (Google Authenticator / Authy / 1Password) — RFC 6238.
 *
 * Funcoes puras (base32, hotp, otpauthUrl) ficam em `lib/totp-core.ts`
 * pra serem reaproveitadas por scripts CLI. Esta interface server-only
 * adiciona apenas `verifyTotp`, que faz a comparacao em tempo constante
 * contra o codigo enviado pelo usuario.
 */
import 'server-only'

import { timingSafeEqual } from 'node:crypto'

import { base32Decode, hotp } from './totp-core'

/**
 * Verifica codigo de 6 digitos contra o segredo Base32. Aceita codigo
 * da janela atual e ±1 step (30s antes/depois) pra absorver clock skew.
 *
 * Comparacao final em tempo constante (timingSafeEqual).
 */
export function verifyTotp(
  secretBase32: string,
  code: string,
  opts: { periodSec?: number; window?: number; digits?: number } = {},
): boolean {
  const periodSec = opts.periodSec ?? 30
  const window = opts.window ?? 1
  const digits = opts.digits ?? 6

  if (!new RegExp(`^\\d{${digits}}$`).test(code)) return false

  const secret = base32Decode(secretBase32)
  if (secret.length === 0) return false

  const now = Math.floor(Date.now() / 1000)
  const counter = Math.floor(now / periodSec)

  const codeBuf = Buffer.from(code, 'utf8')
  for (let w = -window; w <= window; w++) {
    const expected = Buffer.from(hotp(secret, counter + w, digits), 'utf8')
    try {
      if (timingSafeEqual(expected, codeBuf)) return true
    } catch {
      // tamanhos diferentes — codigo invalido, ja' rejeitado pelo regex
    }
  }
  return false
}
