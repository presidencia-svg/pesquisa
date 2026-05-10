/**
 * Helpers criptograficos do projeto.
 *
 * Todos os segredos vem de variaveis de ambiente. Este arquivo so deve ser
 * importado em codigo server-only (Server Actions, Route Handlers,
 * scripts de import).
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

import { SERVER_ENV } from './env'

/**
 * Hash deterministico de CPF.
 *
 * Usado em duas situacoes:
 * 1. Procurar CPF na tabela `cdl_base` (mesmo HMAC do import garante match).
 * 2. Persistir o CPF em `eleitores_pesquisa.cpf_hash` sem nunca guardar
 *    o numero em claro.
 *
 * IMPORTANTE: o segredo CPF_HASH_SECRET nunca pode mudar depois que a
 * cdl_base for importada — se mudar, perde-se o match com a allowlist.
 */
export const hashCpf = (cpfDigits: string): string => {
  if (!/^\d{11}$/.test(cpfDigits)) {
    throw new Error('hashCpf espera 11 digitos numericos sem formatacao')
  }
  return createHmac('sha256', SERVER_ENV.CPF_HASH_SECRET)
    .update(cpfDigits)
    .digest('hex')
}

/**
 * Gera um token de voto aleatorio (32 bytes hex = 64 chars).
 *
 * O token em claro vai pro cookie httpOnly do navegador. O HASH dele e o
 * que persiste em `tokens_emitidos`. Nao guardamos a ligacao token<->CPF.
 */
export const gerarTokenVoto = (): string => randomBytes(32).toString('hex')

/**
 * Hash do token de voto pra persistir em `tokens_emitidos.token_hash`.
 *
 * Usa um secret diferente do CPF_HASH_SECRET pra que vazamento de um
 * banco de hashes nao permita correlacionar tokens com CPFs.
 */
export const hashTokenVoto = (token: string): string =>
  createHmac('sha256', SERVER_ENV.TOKEN_VOTO_SECRET).update(token).digest('hex')

/**
 * Gera um codigo OTP de 6 digitos pro WhatsApp.
 * Usa `randomInt` via randomBytes pra evitar Math.random.
 */
export const gerarOtp = (): string => {
  const buf = randomBytes(4)
  const num = buf.readUInt32BE(0) % 1_000_000
  return num.toString().padStart(6, '0')
}

/**
 * Hash do codigo OTP pra persistir em `whatsapp_codigos.codigo_hash`.
 * SHA-256 simples com salt do CPF_HASH_SECRET — suficiente porque
 * codigos expiram em minutos.
 */
export const hashOtp = (codigo: string): string =>
  createHash('sha256')
    .update(`${SERVER_ENV.CPF_HASH_SECRET}:${codigo}`)
    .digest('hex')

/**
 * Comparacao constant-time pra hashes hex. Evita timing attacks no
 * compare de OTP e token.
 */
export const compararHashes = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
  } catch {
    return false
  }
}
