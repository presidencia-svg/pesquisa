/**
 * Carrega os patrocinadores firmados pra exibir na jornada do votante
 * (entrada, cabine, encerramento). NÃO é gateado por divulgação — a marca
 * do patrocinador aparece durante a coleta, independentemente de os
 * resultados já terem sido divulgados.
 */
import 'server-only'

import { supabaseAdmin } from '@/lib/supabase/admin'

export type CotaPatro = 'diamante' | 'ouro' | 'prata'

export type PatroFaixa = {
  empresa: string
  logoUrl: string
  cota: CotaPatro
}

/** Rótulo público de cada cota. */
export const ROTULO_COTA: Record<CotaPatro, string> = {
  diamante: 'Oferecimento',
  ouro: 'Patrocínio',
  prata: 'Apoio',
}

export async function carregarPatrocinadores(): Promise<PatroFaixa[]> {
  const db = supabaseAdmin()
  const { data } = await db
    .from('interessados_patrocinio')
    .select('empresa, logo_url, cota')
    .eq('status', 'firmado')
    .eq('mostrar_publico', true)
    .not('logo_url', 'is', null)
  const ordem: Record<CotaPatro, number> = { diamante: 0, ouro: 1, prata: 2 }
  return ((data ?? []) as Array<{ empresa: string; logo_url: string; cota: CotaPatro }>)
    .map((p) => ({ empresa: p.empresa, logoUrl: p.logo_url, cota: p.cota }))
    .sort((a, b) => ordem[a.cota] - ordem[b.cota])
}
