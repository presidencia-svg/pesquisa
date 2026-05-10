'use server'

import { redirect } from 'next/navigation'

import { DEV_MODE } from '@/lib/env'
import { clearPreVoto, clearVotoToken } from '@/lib/sessao'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Wipe completo dos dados de teste. Apenas em DEV_MODE.
 *
 * Apaga:
 *   - votos_pesquisa
 *   - tokens_emitidos
 *   - whatsapp_codigos
 *   - eleitores_pesquisa
 *   - rate_limit_ip
 *
 * Mantem: edicao, municipios_se, partidos, candidatos_pesquisa, cdl_base.
 *
 * Limpa cookies pre_voto e voto da sessao atual.
 */
export async function resetarTudo(): Promise<void> {
  if (!DEV_MODE) {
    throw new Error('Reset disponivel apenas em DEV_MODE.')
  }

  const db = supabaseAdmin()

  // Ordem importa por causa de FKs:
  // votos_pesquisa -> tokens_emitidos -> (eleitores_pesquisa, whatsapp_codigos sao independentes)
  // .gte('id', '00000000-0000-0000-0000-000000000000') = "todas as linhas".
  await db
    .from('votos_pesquisa')
    .delete()
    .gte('id', '00000000-0000-0000-0000-000000000000')

  await db
    .from('tokens_emitidos')
    .delete()
    .neq('token_hash', '')

  await db
    .from('whatsapp_codigos')
    .delete()
    .gte('id', '00000000-0000-0000-0000-000000000000')

  await db
    .from('eleitores_pesquisa')
    .delete()
    .gte('id', '00000000-0000-0000-0000-000000000000')

  await db
    .from('rate_limit_ip')
    .delete()
    .gte('id', 0)

  await clearPreVoto()
  await clearVotoToken()

  redirect('/')
}
