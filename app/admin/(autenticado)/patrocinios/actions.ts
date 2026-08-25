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

// SVG fora do allowlist de propósito: SVG é HTML executável e o bucket é
// público — um <script> dentro do logo viraria stored XSS servido do
// domínio de storage. Só formatos raster.
const MIMES_OK = new Set(['image/png', 'image/jpeg', 'image/webp'])

// Assinaturas (magic bytes) — não confiar no file.type enviado pelo cliente.
function tipoRealValido(buf: Buffer, mime: string): boolean {
  if (mime === 'image/png') {
    return buf.length > 8 && buf.subarray(0, 8).toString('hex') === '89504e470d0a1a0a'
  }
  if (mime === 'image/jpeg') {
    return buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
  }
  if (mime === 'image/webp') {
    return (
      buf.length > 12 &&
      buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buf.subarray(8, 12).toString('ascii') === 'WEBP'
    )
  }
  return false
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
  if (!UUID_RE.test(patrocinioId)) {
    return { ok: false, message: 'ID de patrocínio inválido.' }
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
      message: `Tipo não suportado: ${file.type || 'desconhecido'}. Use PNG, JPG ou WebP.`,
    }
  }

  const db = supabaseAdmin()
  const buffer = Buffer.from(await file.arrayBuffer())

  // Valida o conteúdo real (magic bytes), não o file.type do cliente.
  if (!tipoRealValido(buffer, file.type)) {
    return {
      ok: false,
      message: 'O conteúdo do arquivo não corresponde a uma imagem PNG, JPG ou WebP válida.',
    }
  }

  // Nome único: patrocinioId/timestamp.ext (evita colisão se admin
  // trocar o logo várias vezes)
  const ext =
    file.type === 'image/png' ? 'png' : file.type === 'image/jpeg' ? 'jpg' : 'webp'
  const path = `${patrocinioId}/${Date.now()}.${ext}`
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
