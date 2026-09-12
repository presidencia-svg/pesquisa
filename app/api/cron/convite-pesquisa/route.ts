/**
 * GET /api/cron/convite-pesquisa
 *
 * Cron Vercel (vercel.json): a cada 5 min em 13/09/2026, 11h–17h55 UTC
 * (= 08h00–14h55 America/Recife). Cada tick envia até ~450 convites da 2ª
 * edição (base mda e depois cdl_base) e registra o resumo em cron_log.
 *
 * Fora da janela autorizada (08h–15h de 13/09/2026) o tick NÃO envia:
 * roda a pré-checagem (token, número, template, imagem, fila) e registra.
 * `?preflight=1` força a pré-checagem mesmo dentro da janela. A rota
 * ./preflight faz só a pré-checagem, de hora em hora.
 *
 * Auth: Authorization: Bearer ${CRON_SECRET} (a Vercel injeta no cron).
 */

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { preflightConvite, processarLoteConvite } from '@/lib/convite-pesquisa'
import { bearerValido } from '@/lib/cron-auth'
import { SERVER_ENV } from '@/lib/env'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const h = await headers()
  const segredo = SERVER_ENV.CRON_SECRET
  if (!segredo) {
    return NextResponse.json({ erro: 'CRON_SECRET não configurado' }, { status: 500 })
  }
  if (!bearerValido(h.get('authorization'), segredo)) {
    return NextResponse.json({ erro: 'unauthorized' }, { status: 401 })
  }

  const preflight = new URL(req.url).searchParams.get('preflight') === '1'
  const inicio = Date.now()
  let status: 'ok' | 'erro' = 'ok'
  let erro: string | null = null
  let resultado: unknown = null
  let nome = 'convite-pesquisa'

  try {
    if (preflight) {
      nome = 'convite-pesquisa-preflight'
      resultado = await preflightConvite()
    } else {
      const r = await processarLoteConvite()
      if (r.modo !== 'envio') {
        nome = 'convite-pesquisa-preflight'
        resultado = { tick: r, preflight: await preflightConvite() }
      } else {
        resultado = r
        if (r.parou) {
          status = 'erro'
          erro = r.parou
        }
      }
    }
  } catch (e) {
    status = 'erro'
    erro = e instanceof Error ? e.message : String(e)
    resultado = { ok: false, message: erro }
  }

  try {
    await supabaseAdmin().from('cron_log').insert({
      nome,
      status,
      resultado: resultado as object,
      erro,
      duracao_ms: Date.now() - inicio,
    })
  } catch (logErr) {
    console.error('[cron convite-pesquisa] erro logando:', logErr)
  }

  return NextResponse.json(
    { ok: status === 'ok', resultado },
    { status: status === 'ok' ? 200 : 500 },
  )
}
