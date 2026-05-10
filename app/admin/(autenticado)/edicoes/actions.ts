'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { supabaseAdmin } from '@/lib/supabase/admin'

export type EdicaoState = { ok: boolean; message?: string }

const novaEdicaoSchema = z.object({
  nome: z.string().trim().min(3, 'Nome curto demais.').max(120),
  inicio: z.string().min(10),
  fim: z.string().min(10),
  registro_tre: z.string().trim().max(60).optional(),
})

export async function criarEdicao(
  _prev: EdicaoState,
  formData: FormData,
): Promise<EdicaoState> {
  const parsed = novaEdicaoSchema.safeParse({
    nome: formData.get('nome'),
    inicio: formData.get('inicio'),
    fim: formData.get('fim'),
    registro_tre: formData.get('registro_tre') || undefined,
  })
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? 'Dados inválidos.',
    }
  }

  const inicio = new Date(parsed.data.inicio)
  const fim = new Date(parsed.data.fim)
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
    return { ok: false, message: 'Datas inválidas.' }
  }
  if (fim <= inicio) {
    return { ok: false, message: 'Data de fim deve ser depois do início.' }
  }

  const db = supabaseAdmin()
  const { error } = await db.from('edicao').insert({
    nome: parsed.data.nome,
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
    ativa: false,
    registro_tre: parsed.data.registro_tre ?? null,
  })
  if (error) {
    console.error('[admin] erro criar edicao:', error)
    return { ok: false, message: error.message }
  }

  revalidatePath('/admin/edicoes')
  revalidatePath('/admin')
  return { ok: true }
}

export async function ativarEdicao(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')
  if (!id) return
  const db = supabaseAdmin()

  // Desativa qualquer outra edicao ativa primeiro (constraint unique
  // permite no maximo uma com ativa=true).
  await db.from('edicao').update({ ativa: false }).eq('ativa', true)
  await db.from('edicao').update({ ativa: true }).eq('id', id)

  revalidatePath('/admin/edicoes')
  revalidatePath('/admin')
}

export async function desativarEdicao(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')
  if (!id) return
  const db = supabaseAdmin()
  await db.from('edicao').update({ ativa: false }).eq('id', id)
  revalidatePath('/admin/edicoes')
  revalidatePath('/admin')
}
