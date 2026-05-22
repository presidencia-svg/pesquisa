import 'server-only'

import { headers } from 'next/headers'

import { supabaseAdmin } from './supabase/admin'

/**
 * Registra uma ação do admin no log de auditoria.
 *
 * Falha silenciosamente em erro (logging não pode quebrar UX). Caso a
 * gravação falhe, o erro vai pros logs do Vercel pra investigação.
 *
 * LGPD art. 37: registros de operações de tratamento devem ser
 * mantidos pelo controlador. Esta função é a fonte primária.
 *
 * Uso típico em Server Component:
 *   await registrarAcessoAdmin('view_resultados_pre_divulgacao', {
 *     edicao_id: edicao.id,
 *     antes_divulgacao: !edicao.divulgada_em,
 *   })
 */
export async function registrarAcessoAdmin(
  acao: string,
  detalhe?: Record<string, unknown>,
  recurso?: string,
): Promise<void> {
  try {
    const h = await headers()
    const xff = h.get('x-forwarded-for')
    const ip = xff ? (xff.split(',')[0]?.trim() ?? null) : null
    const userAgent = h.get('user-agent') ?? null

    const db = supabaseAdmin()
    const { error } = await db.from('admin_audit_log').insert({
      acao,
      recurso: recurso ?? null,
      detalhe: detalhe ?? null,
      ip,
      user_agent: userAgent,
    })
    if (error) {
      console.error('[admin-audit] erro gravando', { acao, error })
    }
  } catch (e) {
    console.error('[admin-audit] exceção', { acao, e })
  }
}
