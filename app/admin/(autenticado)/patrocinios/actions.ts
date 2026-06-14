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

const MIMES_OK = new Set([
  'image/png',
  'image/jpeg',
  'image/svg+xml',
  'image/webp',
])

const MAX_BYTES = 2 * 1024 * 1024 // 2 MB

/**
 * Recebe FormData com `file` + `patrocinioId`, faz upload pra bucket
 * 'patrocinadores' e retorna a URL pública. Não atualiza
 * interessados_patrocinio — quem atualiza é o caller depois.
 */
export async function uploadLogo(
  formData: FormData,
): Promise<{ ok: boolean; url?: string; message?: string }> {
  await requireAdmin()

  const file = formData.get('file')
  const patrocinioId = String(formData.get('patrocinioId') ?? '')
  if (!(file instanceof File) || !patrocinioId) {
    return { ok: false, message: 'Arquivo ou ID ausente.' }
  }
  if (file.size === 0) {
    return { ok: false, message: 'Arquivo vazio.' }
  }
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      message: `Arquivo grande demais (${Math.round(file.size / 1024)}KB). Limite: 2MB.`,
    }
  }
  if (!MIMES_OK.has(file.type)) {
    return {
      ok: false,
      message: `Tipo não suportado: ${file.type || 'desconhecido'}. Use PNG, JPG, SVG ou WebP.`,
    }
  }

  // Nome único: patrocinioId/timestamp.ext (evita colisão se admin
  // trocar o logo várias vezes)
  const ext =
    file.type === 'image/png'
      ? 'png'
      : file.type === 'image/jpeg'
        ? 'jpg'
        : file.type === 'image/svg+xml'
          ? 'svg'
          : 'webp'
  const path = `${patrocinioId}/${Date.now()}.${ext}`

  const db = supabaseAdmin()
  const buffer = Buffer.from(await file.arrayBuffer())
  const { error } = await db.storage
    .from('patrocinadores')
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    console.error('[patrocinios] erro upload logo:', error)
    return { ok: false, message: `Erro no upload: ${error.message}` }
  }

  const { data } = db.storage.from('patrocinadores').getPublicUrl(path)
  await registrarAcessoAdmin(
    'patrocinio_upload_logo',
    { patrocinioId, tamanho_kb: Math.round(file.size / 1024), mime: file.type },
    `interessado:${patrocinioId}`,
  )
  return { ok: true, url: data.publicUrl }
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
