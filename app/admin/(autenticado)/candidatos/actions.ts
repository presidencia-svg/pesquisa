'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireAdmin } from '@/lib/admin-auth'
import { registrarAcessoAdmin } from '@/lib/admin-audit'
import { supabaseAdmin } from '@/lib/supabase/admin'

export type CandidatoState = { ok: boolean; message?: string }

const cargosCandidato = [
  'presidente',
  'governador',
  'senador',
  'federal',
  'estadual',
] as const

const schema = z.object({
  cargo: z.enum(cargosCandidato),
  numero: z.coerce.number().int().positive().max(99999),
  nome_urna: z.string().trim().min(2).max(100).toUpperCase(),
  nome_completo: z.string().trim().min(2).max(200).optional(),
  partido_id: z.string().uuid(),
  foto_url: z.string().url().or(z.literal('')).optional(),
})

export async function criarCandidato(
  _prev: CandidatoState,
  formData: FormData,
): Promise<CandidatoState> {
  await requireAdmin()
  const parsed = schema.safeParse({
    cargo: formData.get('cargo'),
    numero: formData.get('numero'),
    nome_urna: formData.get('nome_urna'),
    nome_completo: formData.get('nome_completo') || undefined,
    partido_id: formData.get('partido_id'),
    foto_url: formData.get('foto_url') || undefined,
  })
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? 'Dados inválidos.',
    }
  }

  const db = supabaseAdmin()
  const { data: edicao } = await db
    .from('edicao')
    .select('id')
    .eq('ativa', true)
    .maybeSingle()
  if (!edicao) {
    return {
      ok: false,
      message: 'Sem edição ativa. Crie uma edição em Edições primeiro.',
    }
  }

  const { error } = await db.from('candidatos_pesquisa').insert({
    edicao_id: edicao.id,
    cargo: parsed.data.cargo,
    numero: parsed.data.numero,
    nome_urna: parsed.data.nome_urna,
    nome_completo: parsed.data.nome_completo ?? null,
    partido_id: parsed.data.partido_id,
    foto_url: parsed.data.foto_url || null,
    ativo: true,
  })
  if (error) {
    console.error('[admin] erro criar candidato:', error)
    return { ok: false, message: error.message }
  }

  await registrarAcessoAdmin(
    'criar_candidato',
    {
      cargo: parsed.data.cargo,
      numero: parsed.data.numero,
      nome_urna: parsed.data.nome_urna,
    },
    `edicao:${edicao.id}`,
  )

  revalidatePath('/admin/candidatos')
  return { ok: true }
}

export async function alternarAtivo(formData: FormData): Promise<void> {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const ativarRaw = String(formData.get('ativo') ?? '')
  if (!id) return
  const ativo = ativarRaw === 'true'
  const db = supabaseAdmin()
  await db.from('candidatos_pesquisa').update({ ativo }).eq('id', id)
  await registrarAcessoAdmin(
    'alternar_ativo_candidato',
    { ativo },
    `candidato:${id}`,
  )
  revalidatePath('/admin/candidatos')
}

/**
 * Salva (ou apaga) o texto de impedimento de um candidato.
 *
 * Texto vazio -> NULL no banco (candidato sem impedimento).
 * Texto preenchido -> aparece como badge "sub judice" pra eleitor +
 * tooltip com o texto na pagina publica /resultados.
 */
export async function salvarImpedimento(formData: FormData): Promise<void> {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) return
  const raw = String(formData.get('impedimento') ?? '').trim()
  const valor = raw.length > 0 ? raw.slice(0, 500) : null

  const db = supabaseAdmin()
  await db
    .from('candidatos_pesquisa')
    .update({ impedimento: valor })
    .eq('id', id)
  await registrarAcessoAdmin(
    'editar_impedimento_candidato',
    { tem_impedimento: valor !== null, tamanho: valor?.length ?? 0 },
    `candidato:${id}`,
  )
  revalidatePath('/admin/candidatos')
  revalidatePath('/resultados')
}
