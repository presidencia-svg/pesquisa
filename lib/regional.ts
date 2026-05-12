/**
 * Agregacao de votos por mesorregiao (Leste / Agreste / Sertao).
 *
 * Recebe a lista de votos (candidato_id + municipio_ibge + cargo) e os
 * mapas auxiliares pra reconstruir lider por regiao por cargo.
 *
 * Funcao pura, sem DB — pra usar em Server Component que ja' fetchou.
 */

export type RegiaoKey = 'grande_aracaju' | 'leste' | 'agreste' | 'sertao'

/** Ordem de exibicao: Grande Aracaju primeiro (dominante), depois IBGE. */
export const REGIAO_ORDEM: RegiaoKey[] = [
  'grande_aracaju',
  'leste',
  'agreste',
  'sertao',
]

export const ROTULO_REGIAO: Record<RegiaoKey, string> = {
  grande_aracaju: 'Grande Aracaju',
  leste: 'Leste Sergipano',
  agreste: 'Agreste Sergipano',
  sertao: 'Sertão Sergipano',
}

export const SUBTITULO_REGIAO: Record<RegiaoKey, string> = {
  grande_aracaju: 'Capital + cidades-dormitório (RMA)',
  leste: 'Cotinguiba + baixo S. Francisco + litoral',
  agreste: 'Centro-sul: Itabaiana, Lagarto, Estância',
  sertao: 'Norte/noroeste: Glória, Canindé, Porto da Folha',
}

export type CandidatoLeve = {
  id: string
  nome: string
  partido: string
  cor: string
  foto?: string | null
}

export type RegiaoResultado = {
  regiao: RegiaoKey
  rotulo: string
  subtitulo: string
  municipios: number
  totalVotos: number
  lider: CandidatoLeve | null
  liderVotos: number
  liderPct: number
}

/**
 * Constroi resultado regional pra um cargo.
 *
 * @param votos     Linhas {candidato_id, municipio_ibge, votos} do cargo
 * @param regiaoPorMunicipio  Map ibge_codigo -> RegiaoKey
 * @param municipiosPorRegiao Map RegiaoKey -> count (pra exibir "X municipios")
 * @param candidatos Map candidato_id -> CandidatoLeve
 */
export function montaRegionais(
  votos: Array<{ candidato_id: string; municipio_ibge: number; votos: number }>,
  regiaoPorMunicipio: Map<number, RegiaoKey>,
  municipiosPorRegiao: Map<RegiaoKey, number>,
  candidatos: Map<string, CandidatoLeve>,
): RegiaoResultado[] {
  // Agrega votos por (regiao, candidato_id)
  const agregado = new Map<string, Map<string, number>>()
  const totalPorRegiao = new Map<RegiaoKey, number>()
  for (const reg of REGIAO_ORDEM) {
    agregado.set(reg, new Map())
    totalPorRegiao.set(reg, 0)
  }

  for (const v of votos) {
    const regiao = regiaoPorMunicipio.get(v.municipio_ibge)
    if (!regiao) continue
    const inner = agregado.get(regiao)!
    inner.set(v.candidato_id, (inner.get(v.candidato_id) ?? 0) + v.votos)
    totalPorRegiao.set(regiao, (totalPorRegiao.get(regiao) ?? 0) + v.votos)
  }

  return REGIAO_ORDEM.map((regiao) => {
    const inner = agregado.get(regiao)!
    let melhorId: string | null = null
    let melhorVotos = 0
    for (const [candId, votos] of inner) {
      if (votos > melhorVotos) {
        melhorVotos = votos
        melhorId = candId
      }
    }
    const total = totalPorRegiao.get(regiao) ?? 0
    return {
      regiao,
      rotulo: ROTULO_REGIAO[regiao],
      subtitulo: SUBTITULO_REGIAO[regiao],
      municipios: municipiosPorRegiao.get(regiao) ?? 0,
      totalVotos: total,
      lider: melhorId ? (candidatos.get(melhorId) ?? null) : null,
      liderVotos: melhorVotos,
      liderPct: total === 0 ? 0 : (melhorVotos / total) * 100,
    }
  })
}
