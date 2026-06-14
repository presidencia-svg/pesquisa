'use server'

import { headers } from 'next/headers'
import { z } from 'zod'

import { supabaseAdmin } from '@/lib/supabase/admin'

export type InteressePatrocinioState = {
  ok: boolean
  message?: string
  field?: string
}

const schema = z.object({
  empresa: z.string().trim().min(2, { message: 'Informe o nome da empresa.' }).max(200),
  cnpj: z.string().trim().max(20).optional(),
  contato_nome: z
    .string()
    .trim()
    .min(2, { message: 'Informe seu nome.' })
    .max(120),
  contato_email: z
    .string()
    .trim()
    .email({ message: 'E-mail inválido.' })
    .max(200),
  contato_telefone: z.string().trim().max(20).optional(),
  cota: z.enum(['ouro', 'prata'], {
    message: 'Selecione uma cota.',
  }),
  mensagem: z.string().trim().max(2000).optional(),
})

export async function enviarInteresse(
  _prev: InteressePatrocinioState,
  formData: FormData,
): Promise<InteressePatrocinioState> {
  const parsed = schema.safeParse({
    empresa: formData.get('empresa'),
    cnpj: formData.get('cnpj') || undefined,
    contato_nome: formData.get('contato_nome'),
    contato_email: formData.get('contato_email'),
    contato_telefone: formData.get('contato_telefone') || undefined,
    cota: formData.get('cota'),
    mensagem: formData.get('mensagem') || undefined,
  })

  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors as Record<
      string,
      string[] | undefined
    >
    const firstField = Object.keys(flat)[0]
    const firstMsg = firstField ? flat[firstField]?.[0] : undefined
    return {
      ok: false,
      message: firstMsg ?? 'Dados inválidos.',
      ...(firstField ? { field: firstField } : {}),
    }
  }

  const h = await headers()
  const xff = h.get('x-forwarded-for')
  const ip = xff ? (xff.split(',')[0]?.trim() ?? null) : null
  const userAgent = h.get('user-agent') ?? null

  const db = supabaseAdmin()
  const { error } = await db.from('interessados_patrocinio').insert({
    empresa: parsed.data.empresa,
    cnpj: parsed.data.cnpj ?? null,
    contato_nome: parsed.data.contato_nome,
    contato_email: parsed.data.contato_email,
    contato_telefone: parsed.data.contato_telefone ?? null,
    cota: parsed.data.cota,
    mensagem: parsed.data.mensagem ?? null,
    ip,
    user_agent: userAgent,
  })

  if (error) {
    console.error('[patrocinio] erro insert:', error)
    return {
      ok: false,
      message: 'Erro ao registrar interesse. Tente novamente em instantes.',
    }
  }

  return {
    ok: true,
    message:
      'Interesse registrado. Nossa equipe entrará em contato em até 2 dias úteis no e-mail informado.',
  }
}
