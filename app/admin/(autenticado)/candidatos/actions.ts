'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { supabaseAdmin } from '@/lib/supabase/admin'

export type CandidatoState = { ok: boolean; message?: string }

const cargosCandidato = ['presidente', 'governador', 'senador'] as const

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

  revalidatePath('/admin/candidatos')
  return { ok: true }
}

export async function alternarAtivo(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')
  const ativarRaw = String(formData.get('ativo') ?? '')
  if (!id) return
  const ativo = ativarRaw === 'true'
  const db = supabaseAdmin()
  await db.from('candidatos_pesquisa').update({ ativo }).eq('id', id)
  revalidatePath('/admin/candidatos')
}
