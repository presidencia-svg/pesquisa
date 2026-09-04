/**
 * Federações partidárias — Eleições 2026 (Lei 14.208/2021).
 *
 * Na apuração proporcional (deputado federal e estadual) a federação é
 * tratada como UM partido: soma votos nominais + legenda de todos os
 * partidos que a compõem, entra no quociente eleitoral/partidário e nas
 * sobras como uma agremiação só, e as cadeiras vão pros candidatos mais
 * votados da federação inteira (sem cota por partido).
 *
 * Fonte: DivulgaCand/TSE, chapas registradas em Sergipe 2026
 * (campo `nomeColigacao` = "FEDERAÇÃO ..."). A federação é nacional —
 * mesma composição em todo o país — e vale mesmo pro partido que não
 * lançou candidato num cargo (o voto de legenda dele soma na federação).
 *
 * Siglas como estão em `partidos.sigla` no banco.
 */
export const FEDERACOES_2026: Readonly<Record<string, string>> = {
  'UNIÃO': 'União Progressista',
  PP: 'União Progressista',
  PT: 'Brasil da Esperança',
  PCDOB: 'Brasil da Esperança',
  PV: 'Brasil da Esperança',
  PSOL: 'PSOL-Rede',
  REDE: 'PSOL-Rede',
  PSDB: 'PSDB-Cidadania',
  CIDADANIA: 'PSDB-Cidadania',
  SOLIDARIEDADE: 'Renovação Solidária',
  PRD: 'Renovação Solidária',
}

/**
 * Nome da federação do partido, ou null se ele concorre sozinho.
 * Fallback pra partido SEM candidato no cargo (só voto de legenda), que
 * por isso não tem `candidatos_pesquisa.coligacao` gravada. A fonte
 * primária é sempre a coligação oficial do TSE.
 */
export function federacaoDe(sigla: string): string | null {
  return FEDERACOES_2026[sigla.trim().toUpperCase()] ?? null
}

/**
 * Versão curta da coligação oficial pra tela/TV:
 *   "FEDERAÇÃO UNIÃO PROGRESSISTA(UNIÃO/PP)" -> "União Progressista"
 *   "FEDERAÇÃO BRASIL DA ESPERANÇA - FE BRASIL(PT/PC do B/PV)" -> "Brasil da Esperança"
 *   "PSB" -> "PSB" · "SERGIPE CRESCE COM VOCÊ" -> "Sergipe Cresce Com Você"
 */
export function coligacaoCurta(oficial: string | null | undefined): string | null {
  if (!oficial) return null
  let s = oficial.replace(/\(.*$/, '').replace(/^FEDERA[ÇC][ÃA]O\s*/i, '').trim()
  s = s.replace(/\s*-\s*FE BRASIL$/i, '').trim()
  // Sigla de partido fica como está (maiúscula curta); nome longo vira Title Case.
  if (/^[A-ZÇÃÕÉÊÍÓÚÁÀÂ/ ]{2,14}$/.test(s) && !s.includes(' ')) return s
  return s
    .toLowerCase()
    .split(' ')
    .map((w) => (w.length > 2 || w === 'fé' ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ')
}
