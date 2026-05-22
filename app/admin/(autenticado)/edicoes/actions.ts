'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { registrarAcessoAdmin } from '@/lib/admin-audit'
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

/**
 * Marca a edicao como divulgada. A pagina publica /resultados passa a
 * exibir os numeros a partir deste momento. Exige que registro_tre
 * esteja preenchido (Resolucao TSE 23.747/2026 — minimo 5 dias antes
 * da divulgacao).
 */
export async function divulgarEdicao(formData: FormData): Promise<EdicaoState> {
  const id = String(formData.get('id') ?? '')
  if (!id) return { ok: false, message: 'ID invalido.' }

  const db = supabaseAdmin()
  const { data: ed } = await db
    .from('edicao')
    .select('id, registro_tre, divulgada_em')
    .eq('id', id)
    .maybeSingle()
  if (!ed) return { ok: false, message: 'Edição não encontrada.' }
  if (!ed.registro_tre || ed.registro_tre.trim().length === 0) {
    return {
      ok: false,
      message:
        'Preencha o nº de registro TRE/SE antes de divulgar (exigência da Res. 23.747/2026).',
    }
  }
  if (ed.divulgada_em) {
    return { ok: false, message: 'Edição já está divulgada.' }
  }

  const divulgadaEm = new Date().toISOString()
  const { error } = await db
    .from('edicao')
    .update({ divulgada_em: divulgadaEm })
    .eq('id', id)
  if (error) {
    return { ok: false, message: error.message }
  }

  await registrarAcessoAdmin(
    'marcar_divulgacao',
    { edicao_id: id, divulgada_em: divulgadaEm, registro_tre: ed.registro_tre },
    `edicao:${id}`,
  )

  revalidatePath('/admin/edicoes')
  revalidatePath('/admin')
  revalidatePath('/resultados')
  return { ok: true }
}

/**
 * Atualiza o turno da pesquisa (1 ou 2). Aparece como badge no
 * /resultados publico e no header.
 */
export async function atualizarTurno(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')
  const turnoRaw = String(formData.get('turno') ?? '1')
  const turno = turnoRaw === '2' ? 2 : 1
  if (!id) return
  const db = supabaseAdmin()
  await db.from('edicao').update({ turno }).eq('id', id)
  revalidatePath('/admin/edicoes')
  revalidatePath('/admin')
  revalidatePath('/resultados')
}

/**
 * Tira a divulgacao publica (volta /resultados pra o estado de
 * "aguarde"). Util pra corrigir erro ou desfazer durante o piloto.
 */
export async function retirarDivulgacao(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '')
  if (!id) return
  const db = supabaseAdmin()
  await db.from('edicao').update({ divulgada_em: null }).eq('id', id)
  await registrarAcessoAdmin(
    'retirar_divulgacao',
    { edicao_id: id },
    `edicao:${id}`,
  )
  revalidatePath('/admin/edicoes')
  revalidatePath('/admin')
  revalidatePath('/resultados')
}

/**
 * Salva nº de registro PesqEle + data prevista de divulgacao na
 * edicao. Esses dados aparecem na pagina publica /resultados.
 */
export async function salvarMetadadosDivulgacao(
  _prev: EdicaoState,
  formData: FormData,
): Promise<EdicaoState> {
  const id = String(formData.get('id') ?? '')
  if (!id) return { ok: false, message: 'ID inválido.' }
  const registro = String(formData.get('registro_tre') ?? '').trim()
  const previstaRaw = String(formData.get('divulgacao_prevista') ?? '').trim()

  const update: Record<string, string | null> = {}
  update.registro_tre = registro.length > 0 ? registro : null

  if (previstaRaw.length > 0) {
    const dt = new Date(previstaRaw)
    if (Number.isNaN(dt.getTime())) {
      return { ok: false, message: 'Data prevista inválida.' }
    }
    update.divulgacao_prevista = dt.toISOString()
  } else {
    update.divulgacao_prevista = null
  }

  const db = supabaseAdmin()
  const { error } = await db.from('edicao').update(update).eq('id', id)
  if (error) return { ok: false, message: error.message }

  revalidatePath('/admin/edicoes')
  revalidatePath('/admin')
  revalidatePath('/resultados')
  return { ok: true }
}
