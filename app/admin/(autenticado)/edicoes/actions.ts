'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireAdmin } from '@/lib/admin-auth'
import { registrarAcessoAdmin } from '@/lib/admin-audit'
import { SERVER_ENV } from '@/lib/env'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyTotp } from '@/lib/totp'

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
  await requireAdmin()
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
  await requireAdmin()
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
  await requireAdmin()
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
  await requireAdmin()

  // Trava extra: a divulgação de resultado exige o código do Google
  // Authenticator (TOTP) NO MOMENTO de divulgar — não basta estar logado.
  const totpSecret = SERVER_ENV.ADMIN_TOTP_SECRET
  if (!totpSecret) {
    return {
      ok: false,
      message:
        'TOTP do responsável não configurado (ADMIN_TOTP_SECRET). A divulgação exige o código — configure antes.',
    }
  }
  const totp = String(formData.get('totp') ?? '').replace(/\s/g, '')
  if (!verifyTotp(totpSecret, totp)) {
    return {
      ok: false,
      message:
        'Código do Google Authenticator inválido ou vazio. A divulgação do resultado só é liberada com o código.',
    }
  }

  const id = String(formData.get('id') ?? '')
  if (!id) return { ok: false, message: 'ID invalido.' }

  const db = supabaseAdmin()
  const { data: ed } = await db
    .from('edicao')
    .select(
      'id, registro_tre, divulgada_em, numero_conre_responsavel, data_registro_pesqele',
    )
    .eq('id', id)
    .maybeSingle()
  if (!ed) return { ok: false, message: 'Edição não encontrada.' }
  if (ed.divulgada_em) {
    return { ok: false, message: 'Edição já está divulgada.' }
  }

  // --- Gate de compliance (Lei 9.504/97 art. 33 + Res. TSE 23.747/2026) ---
  // Formato do nº de registro PesqEle: UF/BR + dígitos + /ano (ex.: SE-06661/2026).
  const registro = (ed.registro_tre ?? '').trim()
  if (!/^[A-Za-z]{2}[-\s]?\d{1,6}\/\d{4}$/.test(registro)) {
    return {
      ok: false,
      message:
        'Nº de registro PesqEle inválido. Use o formato UF-NNNNN/AAAA (ex.: SE-06661/2026) antes de divulgar.',
    }
  }
  if (
    !ed.numero_conre_responsavel ||
    ed.numero_conre_responsavel.trim().length === 0
  ) {
    return {
      ok: false,
      message:
        'Informe o nº CONRE do estatístico responsável (Res. 23.747/2026 art. 2º IX) antes de divulgar.',
    }
  }
  if (!ed.data_registro_pesqele) {
    return {
      ok: false,
      message: 'Informe a data do registro no PesqEle antes de divulgar.',
    }
  }
  // Registro deve ter sido feito com pelo menos 5 dias de antecedência.
  const dataRegistro = new Date(ed.data_registro_pesqele + 'T00:00:00Z')
  const cincoDias = 5 * 24 * 60 * 60 * 1000
  if (Date.now() - dataRegistro.getTime() < cincoDias) {
    return {
      ok: false,
      message:
        'A divulgação só é liberada 5 dias após o registro no PesqEle (Lei 9.504/97 art. 33). Aguarde o prazo.',
    }
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
  await requireAdmin()
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
 * Liga/desliga a consulta "Zona de Expansão" (Aracaju × São Cristóvão)
 * nesta edicao. Quando desligada, a cedula some do fluxo de votacao
 * (mesmo pra eleitores de Aracaju/SC) e do bloco de resultados.
 */
/**
 * Liga/desliga o fator de LOCALIZAÇÃO do /votar (por edição).
 * Desligado (default): nenhuma checagem de localização — voto único fica
 * por CPF + WhatsApp. Ligado: IP do Brasil entra direto; IP estrangeiro
 * precisa de GPS em Sergipe.
 */
export async function alternarExigirLocalizacao(formData: FormData): Promise<void> {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const exigir = String(formData.get('exigir') ?? '') === 'true'
  if (!id) return
  const db = supabaseAdmin()
  await db.from('edicao').update({ exigir_localizacao: exigir }).eq('id', id)
  await registrarAcessoAdmin(
    'alternar_exigir_localizacao',
    { edicao_id: id, exigir_localizacao: exigir },
    `edicao:${id}`,
  )
  revalidatePath('/admin/edicoes')
  revalidatePath('/votar')
}

export async function alternarConsultaZona(formData: FormData): Promise<void> {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const ativa = String(formData.get('ativa') ?? '') === 'true'
  if (!id) return
  const db = supabaseAdmin()
  await db.from('edicao').update({ consulta_zona_ativa: ativa }).eq('id', id)
  await registrarAcessoAdmin(
    'alternar_consulta_zona',
    { edicao_id: id, consulta_zona_ativa: ativa },
    `edicao:${id}`,
  )
  revalidatePath('/admin/edicoes')
  revalidatePath('/resultados')
}

/**
 * Tira a divulgacao publica (volta /resultados pra o estado de
 * "aguarde"). Util pra corrigir erro ou desfazer durante o piloto.
 */
export async function retirarDivulgacao(formData: FormData): Promise<void> {
  await requireAdmin()
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
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) return { ok: false, message: 'ID inválido.' }
  const registro = String(formData.get('registro_tre') ?? '').trim()
  const previstaRaw = String(formData.get('divulgacao_prevista') ?? '').trim()
  const conre = String(formData.get('numero_conre_responsavel') ?? '').trim()
  const dataRegistroRaw = String(formData.get('data_registro_pesqele') ?? '').trim()

  const update: Record<string, string | null> = {}
  update.registro_tre = registro.length > 0 ? registro : null
  update.numero_conre_responsavel = conre.length > 0 ? conre : null
  update.data_registro_pesqele = dataRegistroRaw.length > 0 ? dataRegistroRaw : null

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
