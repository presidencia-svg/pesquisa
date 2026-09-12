/**
 * Rate limit por IP usando a tabela rate_limit_ip do Supabase.
 *
 * Server-only. Usa SERVICE_ROLE_KEY via supabaseAdmin.
 *
 * Uso:
 *   const rl = await checarRateLimit({ acao: 'otp_validar', max: 10, janelaMin: 15 })
 *   if (!rl.ok) return { ok: false, message: rl.message }
 *   // ... segue com a acao protegida
 */
import 'server-only'

import { headers } from 'next/headers'

import { obterIpCliente } from './ip'
import { supabaseAdmin } from './supabase/admin'

export type RateLimitResultado =
  | { ok: true; ip: string | null }
  | { ok: false; ip: string | null; message: string }

type Opts = {
  /** Identificador da acao (ex.: 'otp_validar', 'votar_cpf'). */
  acao: string
  /** Maximo de tentativas dentro da janela. */
  max: number
  /** Tamanho da janela em minutos. */
  janelaMin: number
}

/**
 * Checa quantas tentativas o IP fez nesta acao na janela. Se passou do
 * limite, retorna ok:false. Se ok, REGISTRA a tentativa atual e retorna
 * ok:true.
 *
 * Sem IP (raro, mas possivel em alguns proxies), passa sem checar mas
 * tampouco registra — pra nao bloquear silenciosamente.
 */
export async function checarRateLimit(
  opts: Opts,
): Promise<RateLimitResultado> {
  const h = await headers()
  const ip = obterIpCliente(h)

  if (!ip) {
    return { ok: true, ip: null }
  }

  const db = supabaseAdmin()
  const desde = new Date(Date.now() - opts.janelaMin * 60_000).toISOString()

  const { count } = await db
    .from('rate_limit_ip')
    .select('id', { count: 'exact', head: true })
    .eq('ip', ip)
    .eq('acao', opts.acao)
    .gte('criado_em', desde)

  if ((count ?? 0) >= opts.max) {
    return {
      ok: false,
      ip,
      message: `Muitas tentativas vindas da sua rede (outras pessoas no mesmo Wi-Fi podem ter acabado de usar). Aguarde ${opts.janelaMin} minutos ou desligue o Wi-Fi e use os dados móveis (4G/5G) pra tentar agora.`,
    }
  }

  // Registra a tentativa atual.
  await db.from('rate_limit_ip').insert({ ip, acao: opts.acao })
  return { ok: true, ip }
}

/**
 * Registra a tentativa do IP nesta ação SEM bloquear. Usado no fluxo do
 * eleitor (envio/validação/reenvio de OTP) desde 12/09/2026: no Brasil o
 * celular sai pra internet por CGNAT, e um IP público reúne milhares de
 * pessoas — um teto por IP barra eleitor legítimo em coleta de grande
 * volume. A defesa fica nos tetos por CPF, no TENTATIVAS_MAX por código
 * e no Turnstile; o rastro por IP continua gravado pra auditoria e pro
 * painel de anomalias.
 */
export async function registrarTentativaIp(
  acao: string,
): Promise<{ ip: string | null }> {
  const h = await headers()
  const ip = obterIpCliente(h)
  if (!ip) return { ip: null }
  const db = supabaseAdmin()
  await db.from('rate_limit_ip').insert({ ip, acao })
  return { ip }
}
