import { NextResponse } from 'next/server'

import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Status público de divulgação da edição ativa — SEM nenhum número.
 *
 * Usado pelo pop-up do site da CDL (cdlaju.com.br) pra trocar sozinho de
 * "cronômetro" pra "Ver resultado" no momento em que o admin divulga
 * (TOTP em /admin/edicoes). Só expõe o que a página /resultados já mostra
 * publicamente: se foi divulgada, quando, e a previsão.
 *
 * CORS aberto de propósito: é informação pública e não identifica ninguém.
 */
export const dynamic = 'force-dynamic'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'no-store',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET() {
  const db = supabaseAdmin()
  const { data } = await db
    .from('edicao')
    .select('nome, divulgada_em, divulgacao_prevista, fim')
    .eq('ativa', true)
    .maybeSingle()

  return NextResponse.json(
    {
      edicao: data?.nome ?? null,
      divulgada: Boolean(data?.divulgada_em),
      divulgadaEm: data?.divulgada_em ?? null,
      prevista: data?.divulgacao_prevista ?? null,
      coletaFim: data?.fim ?? null,
      resultados: 'https://pesquisa.cdlaju.com.br/resultados',
    },
    { headers: CORS },
  )
}
