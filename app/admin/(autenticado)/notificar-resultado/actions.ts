'use server'

import { revalidatePath } from 'next/cache'

import { registrarAcessoAdmin } from '@/lib/admin-audit'
import { requireAdmin } from '@/lib/admin-auth'

import { processarLoteNotificacao } from '@/lib/notificar-resultado'

export type NotificarResultadoState = {
  ok: boolean
  message?: string
  resumo?: {
    processados: number
    enviados: number
    falhas: number
    pendentes_restantes: number
  }
}

/**
 * Server Action chamada pelo botão "Disparar lote" no painel admin.
 * Encaminha pra `processarLoteNotificacao` (compartilhada com o cron
 * em /api/cron/notificar-resultados).
 */
export async function dispararLoteNotificacao(): Promise<NotificarResultadoState> {
  await requireAdmin()
  const r = await processarLoteNotificacao()
  await registrarAcessoAdmin('notificar_resultado_manual', {
    ok: r.ok,
    ...(r.resumo ?? {}),
  })
  if (r.ok) revalidatePath('/admin/notificar-resultado')
  return r
}
