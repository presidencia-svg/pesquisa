import { NextResponse } from 'next/server'

import { clearPreVoto, clearVotoToken } from '@/lib/sessao'

// Limpa resquícios de sessão de OUTRA edição (rascunho pre_voto e/ou
// cápsula de voto de um teste/demo antigo) e recomeça o fluxo do zero.
// Pra onde o /votar manda quem chega com sessão de edição diferente.
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  await clearPreVoto()
  await clearVotoToken()
  return NextResponse.redirect(new URL('/votar', request.url))
}
