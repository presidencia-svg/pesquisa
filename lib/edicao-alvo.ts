/**
 * Resolve a edição-alvo do fluxo de voto.
 *
 * Normalmente é a edição ATIVA. Mas se o cookie `edicao_teste` estiver
 * setado (via link secreto /teste-ficticio?k=…), usa aquela edição —
 * permite testar o fluxo completo com uma base FICTÍCIA (a demo) sem
 * tocar na edição real, e sem afetar quem não tem o cookie.
 *
 * Server-only.
 */
import 'server-only'

import { cookies } from 'next/headers'

import { supabaseAdmin } from '@/lib/supabase/admin'

export const COOKIE_EDICAO_TESTE = 'edicao_teste'

export type EdicaoAlvo = {
  id: string
  inicio: string
  fim: string
  teste: boolean
}

export async function resolverEdicaoAlvo(): Promise<EdicaoAlvo | null> {
  const db = supabaseAdmin()
  const jar = await cookies()
  const testeId = jar.get(COOKIE_EDICAO_TESTE)?.value

  // O override por cookie de teste só vale quando PERMITIR_EDICAO_TESTE=true.
  // Depois que a coleta real começa, deixamos DESLIGADO (default) pra que
  // NINGUÉM caia na edição demo por causa de um cookie de teste antigo —
  // todo mundo vai pra edição ativa (a real).
  const testeHabilitado = process.env.PERMITIR_EDICAO_TESTE === 'true'

  if (testeId && testeHabilitado) {
    const { data } = await db
      .from('edicao')
      .select('id, inicio, fim')
      .eq('id', testeId)
      .maybeSingle()
    if (data) {
      return { id: data.id as string, inicio: data.inicio as string, fim: data.fim as string, teste: true }
    }
  }

  const { data } = await db
    .from('edicao')
    .select('id, inicio, fim')
    .eq('ativa', true)
    .maybeSingle()
  if (!data) return null
  return { id: data.id as string, inicio: data.inicio as string, fim: data.fim as string, teste: false }
}
