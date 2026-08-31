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
  // Patrocinadores REMOVIDOS da jornada do votante (decisão do usuário).
  // Para reexibir: restaurar a query em interessados_patrocinio
  // (status='firmado', mostrar_publico=true, logo_url não nulo).
  return []
}
