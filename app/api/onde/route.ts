import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { ipEmSergipe } from '@/lib/geo-sergipe'

// Diagnóstico: o que a Vercel resolve do IP de quem chama.
// Não grava nada — só devolve pro próprio visitante.
export const dynamic = 'force-dynamic'

export async function GET() {
  const h = await headers()
  const pais = h.get('x-vercel-ip-country')
  const estado = h.get('x-vercel-ip-country-region')
  const cidadeRaw = h.get('x-vercel-ip-city')
  return NextResponse.json({
    pais,
    estado,
    cidade: cidadeRaw ? decodeURIComponent(cidadeRaw) : null,
    entra_direto_por_ip: ipEmSergipe(pais, estado),
    dica: ipEmSergipe(pais, estado)
      ? 'IP resolve pra Sergipe: o /votar pula o GPS e vai direto pro CPF.'
      : 'IP NÃO resolve pra Sergipe: o /votar vai pedir o GPS (plano B).',
  })
}
