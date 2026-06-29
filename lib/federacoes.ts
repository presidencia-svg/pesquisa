/**
 * Federações partidárias válidas para a ELEIÇÃO DE 2026 (Lei 14.208/2021).
 *
 * Federação ≠ coligação: dura no mínimo 4 anos e atua como um único partido
 * em todo o país, inclusive na distribuição de cadeiras (Quociente Eleitoral).
 *
 * Fonte: TSE — Federações Partidárias Registradas (verificado em jun/2026 via
 * pesquisa multi-fonte: TSE, Poder360, CNN, Congresso em Foco). Há 5 federações
 * registradas; abaixo só as que contêm algum dos partidos presentes na pesquisa
 * (mais os membros completos, para referência). A 5ª — Renovação Solidária
 * (PRD + Solidariedade) — não tem partido no escopo desta pesquisa.
 *
 * ⚠️ Editável: para corrigir/atualizar o mapa, basta mexer aqui. As `siglas`
 * devem bater EXATAMENTE com `partidos.sigla` no banco (ex.: 'UNIAO', não 'UNIÃO').
 */

export type Federacao = {
  id: string
  /** Nome oficial completo */
  nome: string
  /** Rótulo curto para barra de TV / chip */
  nomeCurto: string
  /** Siglas dos membros (como no banco). Membros fora da pesquisa são ignorados no agrupamento. */
  partidos: string[]
  /** Cor representativa (chip/rótulo) */
  cor: string
}

export const FEDERACOES_2026: Federacao[] = [
  {
    id: 'uniao-progressista',
    nome: 'Federação União Progressista',
    nomeCurto: 'União Progressista',
    partidos: ['UNIAO', 'PP'],
    cor: '#1f4e9c',
  },
  {
    id: 'fe-brasil',
    nome: 'Federação Brasil da Esperança',
    nomeCurto: 'FE Brasil',
    partidos: ['PT', 'PV', 'PCDOB'],
    cor: '#cc0000',
  },
  {
    id: 'psdb-cidadania',
    nome: 'Federação PSDB Cidadania',
    nomeCurto: 'PSDB Cidadania',
    partidos: ['PSDB', 'CIDADANIA'],
    cor: '#0080c8',
  },
  {
    id: 'psol-rede',
    nome: 'Federação PSOL Rede',
    nomeCurto: 'PSOL Rede',
    partidos: ['PSOL', 'REDE'],
    cor: '#a3238e',
  },
]

const SIGLA_PARA_FEDERACAO = new Map<string, Federacao>()
for (const f of FEDERACOES_2026) {
  for (const s of f.partidos) SIGLA_PARA_FEDERACAO.set(s.toUpperCase(), f)
}

/** Federação de um partido pela sigla, ou null se concorre sozinho. */
export function federacaoDoPartido(sigla: string): Federacao | null {
  return SIGLA_PARA_FEDERACAO.get(sigla.toUpperCase()) ?? null
}

/** Uma legenda de entrada (partido com votos) para agrupar. */
export type LegendaEntrada = {
  sigla: string
  nome: string
  cor: string
  votos: number
  cadeiras?: number
}

/** Um grupo no modo "por federação": uma federação (soma de membros) ou um partido sozinho. */
export type GrupoFederacao = {
  id: string
  /** Rótulo da barra: nomeCurto da federação ou sigla do partido */
  label: string
  /** Nome completo (tooltip/subtítulo) */
  nomeCompleto: string
  /** Siglas dos membros presentes (ex.: "UNIÃO + PP") */
  membros: string[]
  cor: string
  votos: number
  cadeiras: number
  isFederacao: boolean
}

/**
 * Agrupa legendas (partidos) nas federações de 2026. Partidos sem federação
 * viram um grupo próprio (isFederacao=false). Ordenado por votos desc.
 */
export function agruparEmFederacoes(legendas: LegendaEntrada[]): GrupoFederacao[] {
  const grupos = new Map<string, GrupoFederacao>()
  for (const l of legendas) {
    const fed = federacaoDoPartido(l.sigla)
    if (fed) {
      const g = grupos.get(fed.id) ?? {
        id: fed.id,
        label: fed.nomeCurto,
        nomeCompleto: fed.nome,
        membros: [],
        cor: fed.cor,
        votos: 0,
        cadeiras: 0,
        isFederacao: true,
      }
      g.votos += l.votos
      g.cadeiras += l.cadeiras ?? 0
      g.membros.push(l.sigla)
      grupos.set(fed.id, g)
    } else {
      grupos.set(`p-${l.sigla}`, {
        id: `p-${l.sigla}`,
        label: l.sigla,
        nomeCompleto: l.nome,
        membros: [l.sigla],
        cor: l.cor,
        votos: l.votos,
        cadeiras: l.cadeiras ?? 0,
        isFederacao: false,
      })
    }
  }
  return [...grupos.values()].sort((a, b) => b.votos - a.votos)
}
