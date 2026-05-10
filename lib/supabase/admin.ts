/**
 * Cliente Supabase com SERVICE ROLE KEY.
 *
 * Bypassa RLS. Use APENAS em codigo server-only:
 *   - Server Actions
 *   - Route Handlers
 *   - Scripts (import da cdl_base, seeds, jobs)
 *
 * NUNCA importar isso de um Client Component. O service role key da
 * acesso total ao banco — se vazar pro bundle do navegador, qualquer
 * usuario pode ler eleitores_pesquisa, votos_pesquisa, etc.
 *
 * Para acesso autenticado de admin (com cookies de sessao), criar depois
 * `lib/supabase/server-auth.ts` usando @supabase/ssr.
 */
import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { PUBLIC_ENV, SERVER_ENV } from '../env'

let cached: SupabaseClient | null = null

/**
 * Retorna o singleton do cliente admin. Lazy pra evitar inicializar em
 * tempo de import (e quebrar build se a env nao tiver service role).
 */
export const supabaseAdmin = (): SupabaseClient => {
  if (cached) return cached
  cached = createClient(PUBLIC_ENV.SUPABASE_URL, SERVER_ENV.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  return cached
}
