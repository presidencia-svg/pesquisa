/**
 * GET /api/cron/notificar-resultados
 *
 * Cron Vercel a cada 5 minutos. Processa até 500 eleitores opt-in por
 * execução, com throttle interno de 50ms entre envios (~20 msgs/seg —
 * abaixo do limite Meta de 80/seg por phone_number_id).
 *
 * Comportamento:
 *   - Se não há edição ativa OU não há divulgada_em OU não há
 *     pendentes → no-op silencioso (registra em cron_log e retorna).
 *   - Se há pendentes → processa o lote, registra resumo.
 *   - Falhas individuais por destinatário não aborta o lote.
 *
 * Auth: header Authorization: Bearer ${CRON_SECRET} — Vercel injeta
 * automaticamente ao disparar o cron. Manual via curl também aceita.
 *
 * Throughput esperado:
 *   500 msgs * 0.05s = 25s por execução
 *   ~5 execuções/hora = 2.500 msgs/hora
 *   15.000 opt-in tipicos → ~6 horas pra zerar (mas pode ser muito
 *   mais rápido se Meta liberar tier alto; logs vão indicar)
 */

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { bearerValido } from '@/lib/cron-auth'
import { SERVER_ENV } from '@/lib/env'
import { processarLoteNotificacao } from '@/lib/notificar-resultado'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function GET() {
  const h = await headers()
  const auth = h.get('authorization')
  const segredo = SERVER_ENV.CRON_SECRET

  if (!segredo) {
    return NextResponse.json(
      { erro: 'CRON_SECRET não configurado nas envs' },
      { status: 500 },
    )
  }
  if (!bearerValido(auth, segredo)) {
    return NextResponse.json({ erro: 'unauthorized' }, { status: 401 })
  }

  const inicio = Date.now()
  let status: 'ok' | 'erro' = 'ok'
  let erro: string | null = null
  let resultado: unknown = null

  try {
    const r = await processarLoteNotificacao()
    resultado = r
    if (!r.ok) {
      status = 'erro'
      erro = r.message ?? 'sem mensagem'
    }
  } catch (e) {
    status = 'erro'
    erro = e instanceof Error ? e.message : String(e)
    resultado = { ok: false, message: erro }
  }

  // Registra no cron_log. Falha aqui não invalida o envio.
  try {
    const db = supabaseAdmin()
    await db.from('cron_log').insert({
      nome: 'notificar-resultados',
      status,
      resultado: resultado as object,
      erro,
      duracao_ms: Date.now() - inicio,
    })
  } catch (logErr) {
    console.error('[cron notificar-resultados] erro logando:', logErr)
  }

  return NextResponse.json(
    { ok: status === 'ok', resultado },
    { status: status === 'ok' ? 200 : 500 },
  )
}
