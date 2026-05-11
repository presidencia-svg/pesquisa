/**
 * Helpers TOTP isomorficos (Base32 + URL otpauth + HOTP).
 *
 * Sem 'server-only' pra poder ser importado por scripts CLI tambem
 * (ex.: `scripts/gerar-totp-secret.ts`). A verificacao real fica em
 * `lib/totp.ts`, que e' server-only.
 */
import { createHmac } from 'node:crypto'

const BASE32_ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** Decodifica Base32 RFC 4648 pra Buffer. Buffer vazio = invalido. */
export function base32Decode(input: string): Buffer {
  const s = input.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '')
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const c of s) {
    const idx = BASE32_ALPHA.indexOf(c)
    if (idx === -1) return Buffer.alloc(0)
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bits -= 8
      out.push((value >>> bits) & 0xff)
    }
  }
  return Buffer.from(out)
}

/** Codifica Buffer pra Base32 RFC 4648 (sem padding). */
export function base32Encode(buf: Buffer): string {
  let bits = 0
  let value = 0
  let out = ''
  for (const b of buf) {
    value = (value << 8) | b
    bits += 8
    while (bits >= 5) {
      bits -= 5
      out += BASE32_ALPHA[(value >>> bits) & 0x1f]
    }
  }
  if (bits > 0) out += BASE32_ALPHA[(value << (5 - bits)) & 0x1f]
  return out
}

/** HOTP (RFC 4226): HMAC-SHA1 + dynamic truncation. */
export function hotp(secret: Buffer, counter: number, digits = 6): string {
  const buf = Buffer.alloc(8)
  buf.writeUInt32BE(Math.floor(counter / 0x1_0000_0000), 0)
  buf.writeUInt32BE(counter >>> 0, 4)

  const hmac = createHmac('sha1', secret).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const num =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  return String(num % 10 ** digits).padStart(digits, '0')
}

/** Monta URL otpauth:// pra cadastrar no Authenticator. */
export function otpauthUrl(opts: {
  secretBase32: string
  issuer: string
  accountName: string
  periodSec?: number
  digits?: number
}): string {
  const period = opts.periodSec ?? 30
  const digits = opts.digits ?? 6
  const label = `${encodeURIComponent(opts.issuer)}:${encodeURIComponent(opts.accountName)}`
  const params = new URLSearchParams({
    secret: opts.secretBase32,
    issuer: opts.issuer,
    algorithm: 'SHA1',
    digits: String(digits),
    period: String(period),
  })
  return `otpauth://totp/${label}?${params.toString()}`
}
