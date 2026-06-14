'use server'

import { revalidatePath } from 'next/cache'

import { registrarAcessoAdmin } from '@/lib/admin-audit'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export type StatusPatrocinio = 'novo' | 'em_contato' | 'firmado' | 'recusado'

export async function atualizarStatus(
  id: string,
  novo: StatusPatrocinio,
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

export async function atualizarExibicaoPublica(
  id: string,
  campos: {
    logo_url?: string | null
    site_url?: string | null
    mostrar_publico?: boolean
  },
): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin()

  const update: Record<string, string | boolean | null> = {
    atualizado_em: new Date().toISOString(),
  }
  if ('logo_url' in campos) update.logo_url = campos.logo_url ?? null
  if ('site_url' in campos) update.site_url = campos.site_url ?? null
  if ('mostrar_publico' in campos)
    update.mostrar_publico = campos.mostrar_publico ?? false

  const db = supabaseAdmin()
  const { error } = await db
    .from('interessados_patrocinio')
    .update(update)
    .eq('id', id)

  if (error) {
    console.error('[patrocinios] erro update exibição:', error)
    return { ok: false, message: error.message }
  }

  await registrarAcessoAdmin(
    'patrocinio_exibicao_publica',
    {
      id,
      mostrar_publico: campos.mostrar_publico,
      tem_logo: !!campos.logo_url,
    },
    `interessado:${id}`,
  )

  revalidatePath('/admin/patrocinios')
  revalidatePath('/resultados')
  return { ok: true }
}
