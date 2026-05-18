/**
 * GET /api/cron/retencao
 *
 * Job diário de retenção LGPD. Agendado pela Vercel (`vercel.json`) pra
 * rodar todo dia às 03h UTC (= 00h BRT). Cumpre os prazos do art. 15 e
 * art. 16 LGPD (eliminação após fim da finalidade ou prazo legal).
 *
 * Limpezas:
 *   1. `whatsapp_codigos` com mais de 30 dias  — OTP é prova de envio
 *      pro art. 7º V (consentimento), mas 30 dias passa do contestável.
 *   2. `rate_limit_ip` com mais de 24 horas    — rate limit usa janela
 *      de 15min/60min; nada útil depois de 24h.
 *   3. `eleitores_pesquisa` (Sala 1, identidade) cujo `edicao.fim` foi
 *      há mais de 6 meses — política de retenção declarada em
 *      `docs/lgpd.md` e `/privacidade`.
 *   4. `cron_log` com mais de 1 ano  — evidência ANPD basta 1 ano.
 *
 * Auth:
 *   - Em produção, Vercel injeta header `Authorization: Bearer
 *     ${CRON_SECRET}` automaticamente quando dispara o cron (se CRON_SECRET
 *     existir nas envs). Validamos esse Bearer.
 *   - Pra acionar manualmente (admin/curl), passar o mesmo Bearer.
 *
 * Registra cada execução em `cron_log` (ok ou erro) — fonte de verdade
 * pro admin verificar que a retenção está rodando.
 */

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { SERVER_ENV } from '@/lib/env'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const DIA_MS = 86_400_000

type Resultado = {
  whatsapp_codigos: number
  rate_limit_ip: number
  eleitores_pesquisa: number
  cron_log: number
}

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
  if (auth !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: 'unauthorized' }, { status: 401 })
  }

  const inicio = Date.now()
  const db = supabaseAdmin()
  const resultado: Resultado = {
    whatsapp_codigos: 0,
    rate_limit_ip: 0,
    eleitores_pesquisa: 0,
    cron_log: 0,
  }

  try {
    // 1. OTP > 30d
    const cutoff30d = new Date(Date.now() - 30 * DIA_MS).toISOString()
    const { count: c1, error: e1 } = await db
      .from('whatsapp_codigos')
      .delete({ count: 'exact' })
      .lt('criado_em', cutoff30d)
    if (e1) throw new Error(`whatsapp_codigos: ${e1.message}`)
    resultado.whatsapp_codigos = c1 ?? 0

    // 2. Rate limit > 24h
    const cutoff24h = new Date(Date.now() - DIA_MS).toISOString()
    const { count: c2, error: e2 } = await db
      .from('rate_limit_ip')
      .delete({ count: 'exact' })
      .lt('criado_em', cutoff24h)
    if (e2) throw new Error(`rate_limit_ip: ${e2.message}`)
    resultado.rate_limit_ip = c2 ?? 0

    // 3. Identidade Sala 1 — 6 meses após edicao.fim
    const cutoff6m = new Date(Date.now() - 180 * DIA_MS).toISOString()
    const { data: edicoesAntigas, error: e3a } = await db
      .from('edicao')
      .select('id')
      .lt('fim', cutoff6m)
    if (e3a) throw new Error(`edicao select: ${e3a.message}`)

    if (edicoesAntigas && edicoesAntigas.length > 0) {
      const ids = edicoesAntigas.map((e) => e.id as string)
      const { count: c3, error: e3b } = await db
        .from('eleitores_pesquisa')
        .delete({ count: 'exact' })
        .in('edicao_id', ids)
      if (e3b) throw new Error(`eleitores_pesquisa: ${e3b.message}`)
      resultado.eleitores_pesquisa = c3 ?? 0
    }

    // 4. cron_log > 1 ano
    const cutoff1y = new Date(Date.now() - 365 * DIA_MS).toISOString()
    const { count: c4, error: e4 } = await db
      .from('cron_log')
      .delete({ count: 'exact' })
      .lt('executado_em', cutoff1y)
    if (e4) throw new Error(`cron_log: ${e4.message}`)
    resultado.cron_log = c4 ?? 0

    // 5. Registra sucesso
    await db.from('cron_log').insert({
      nome: 'retencao_lgpd',
      status: 'ok',
      resultado,
      duracao_ms: Date.now() - inicio,
    })

    return NextResponse.json({ ok: true, resultado })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await db.from('cron_log').insert({
      nome: 'retencao_lgpd',
      status: 'erro',
      resultado,
      erro: msg,
      duracao_ms: Date.now() - inicio,
    })
    console.error('[cron/retencao] falha:', msg)
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 })
  }
}
