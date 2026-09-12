import 'server-only'

import { cache } from 'react'

import { suspensaoJudicial } from '@/lib/ordem-judicial'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Há resultado público pra mostrar? Verdadeiro só quando a edição ativa
 * foi divulgada E não está sob suspensão judicial (banco ou trava do
 * código em lib/ordem-judicial.ts). Usado pra esconder o botão "Ver
 * resultados" da home — sem cookies, pra manter a página cacheável.
 */
export const divulgacaoPublicaLiberada = cache(async (): Promise<boolean> => {
  const { data } = await supabaseAdmin()
    .from('edicao')
    .select('id, divulgada_em, suspensa_em, suspensao_motivo')
    .eq('ativa', true)
    .maybeSingle<{
      id: string
      divulgada_em: string | null
      suspensa_em: string | null
      suspensao_motivo: string | null
    }>()
  if (!data?.divulgada_em) return false
  return suspensaoJudicial(data) === null
})
