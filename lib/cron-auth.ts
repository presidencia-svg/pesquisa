/**
 * Validação timing-safe do Bearer dos crons.
 *
 * Comparar strings com `!==` vaza, por timing, quantos caracteres batem —
 * o que teoricamente permite adivinhar o CRON_SECRET byte a byte. Usa
 * timingSafeEqual (tempo constante) com guarda de tamanho.
 *
 * Server-only.
 */
import 'server-only'

import { timingSafeEqual } from 'node:crypto'

export function bearerValido(
  authorization: string | null,
  segredo: string,
): boolean {
  if (!authorization) return false
  const esperado = `Bearer ${segredo}`
  const a = Buffer.from(authorization)
  const b = Buffer.from(esperado)
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
