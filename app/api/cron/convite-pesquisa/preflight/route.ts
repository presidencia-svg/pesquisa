/**
 * GET /api/cron/convite-pesquisa/preflight
 *
 * Pré-checagem do convite da 2ª edição, SEM enviar nada: token, número da
 * Meta (tier de envio), template aprovado, imagem do cabeçalho e tamanho
 * da fila nas duas bases. Cron de hora em hora (vercel.json) — o resultado
 * fica em cron_log (nome convite-pesquisa-preflight).
 */

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { preflightConvite } from '@/lib/convite-pesquisa'
import { bearerValido } from '@/lib/cron-auth'
import { SERVER_ENV } from '@/lib/env'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function GET() {
  const h = await headers()
  const segredo = SERVER_ENV.CRON_SECRET
  if (!segredo) {
    return NextResponse.json({ erro: 'CRON_SECRET não configurado' }, { status: 500 })
  }
  if (!bearerValido(h.get('authorization'), segredo)) {
    return NextResponse.json({ erro: 'unauthorized' }, { status: 401 })
  }

  const inicio = Date.now()
  let status: 'ok' | 'erro' = 'ok'
  let erro: string | null = null
  let resultado: unknown = null
  try {
    resultado = await preflightConvite()
  } catch (e) {
    status = 'erro'
    erro = e instanceof Error ? e.message : String(e)
    resultado = { ok: false, message: erro }
  }
  try {
    await supabaseAdmin().from('cron_log').insert({
      nome: 'convite-pesquisa-preflight',
      status,
      resultado: resultado as object,
      erro,
      duracao_ms: Date.now() - inicio,
    })
  } catch (logErr) {
    console.error('[cron convite-pesquisa/preflight] erro logando:', logErr)
  }
  return NextResponse.json({ ok: status === 'ok', resultado }, { status: status === 'ok' ? 200 : 500 })
}
