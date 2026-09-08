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
// Cache de 15 s: o pop-up do site da CDL consulta isto a cada 30 s em cada aba
// aberta — sem cache, cada consulta batia no banco.
export const revalidate = 15

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
    .select('nome, divulgada_em, divulgacao_prevista, fim, suspensa_em')
    .eq('ativa', true)
    .maybeSingle()

  return NextResponse.json(
    {
      edicao: data?.nome ?? null,
      // Suspensão judicial (Rp 0601015-42.2026.6.25.0000, TRE-SE): enquanto
      // suspensa_em estiver preenchido o pop-up do site da CDL não pode levar
      // ao resultado — `divulgada` volta a false e `suspensa` fica true.
      divulgada: Boolean(data?.divulgada_em) && !data?.suspensa_em,
      suspensa: Boolean(data?.suspensa_em),
      divulgadaEm: data?.divulgada_em ?? null,
      prevista: data?.divulgacao_prevista ?? null,
      coletaFim: data?.fim ?? null,
      resultados: 'https://pesquisa.cdlaju.com.br/resultados',
    },
    { headers: CORS },
  )
}
