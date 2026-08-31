import { NextResponse } from 'next/server'

import { COOKIE_EDICAO_TESTE } from '@/lib/edicao-alvo'

// Link secreto que liga o MODO TESTE (base fictícia = edição demo) só pra
// quem abrir com a chave certa. Não afeta o eleitor normal.
const CHAVE = 'sergipe-teste-2026'
const EDICAO_DEMO = '0a2a73d9-4ef2-4b55-9133-c9441017c9c8'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const k = url.searchParams.get('k')

  if (k === 'off') {
    const res = NextResponse.redirect(new URL('/votar', url))
    res.cookies.set(COOKIE_EDICAO_TESTE, '', { path: '/', maxAge: 0 })
    return res
  }
  if (k !== CHAVE) {
    return NextResponse.json({ erro: 'link de teste inválido' }, { status: 403 })
  }
  const res = NextResponse.redirect(new URL('/votar', url))
  res.cookies.set(COOKIE_EDICAO_TESTE, EDICAO_DEMO, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 24, // 24h
  })
  return res
}
