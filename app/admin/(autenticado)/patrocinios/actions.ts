'use server'

import { revalidatePath } from 'next/cache'

import { registrarAcessoAdmin } from '@/lib/admin-audit'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function atualizarStatus(
  id: string,
  novo: 'novo' | 'em_contato' | 'firmado' | 'recusado',
): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin()

  const db = supabaseAdmin()
  const { error } = await db
    .from('interessados_patrocinio')
    .update({ status: novo, atualizado_em: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('[patrocinios] erro update status:', error)
    return { ok: false, message: error.message }
  }

  await registrarAcessoAdmin(
    'patrocinio_status',
    { id, novo },
    `interessado:${id}`,
  )

  revalidatePath('/admin/patrocinios')
  return { ok: true }
}
