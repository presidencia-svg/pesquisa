/**
 * Configuracao das 6 cedulas da pesquisa (5 cargos + 1 consulta extra).
 *
 * Tipos:
 *   - 'candidato'  → eleitor digita NUMERO DO CANDIDATO (Pres/Gov/Sen).
 *                    Voto guarda candidato_id em votos_pesquisa.
 *   - 'legenda'    → eleitor digita LEGENDA estilo urna (Fed/Est).
 *                    Voto guarda partido_id (2 primeiros digitos).
 *   - 'consulta'   → pergunta sim/nao ou opcoes fixas (zona_expansao).
 *                    Voto guarda `resposta` text.
 *
 * `zona_expansao` so e' apresentada a eleitores de Aracaju (2800308)
 * ou Sao Cristovao (2806701) — roteamento condicional via municipio
 * carregado no cookie `voto`.
 *
 * Pure, importavel em Client Component.
 */

export const CARGOS = [
  'presidente',
  'governador',
  'senador',
  'federal',
  'estadual',
  'zona_expansao',
] as const

export type Cargo = (typeof CARGOS)[number]

export type CargoConfig = {
  label: string
  tipo: 'candidato' | 'legenda' | 'consulta'
  vagas: number
  /** Quantos digitos. Em 'consulta' nao tem teclado, ignorado. */
  digitos: number
  proximo: Cargo | null
  ordem: number
  /** Pra consultas: opcoes valid as de resposta. */
  opcoesConsulta?: ReadonlyArray<{ valor: string; label: string }>
  /**
   * Municipios IBGE em que esta cedula e' apresentada. Vazio/ausente =
   * todos. Util pra zona_expansao (so Aracaju + Sao Cristovao).
   */
  municipiosAplicaveis?: ReadonlyArray<number>
}

export const ARACAJU_IBGE = 2800308
export const SAO_CRISTOVAO_IBGE = 2806701

export const CARGO_CONFIG: Record<Cargo, CargoConfig> = {
  presidente: {
    label: 'Presidente',
    tipo: 'candidato',
    vagas: 1,
    digitos: 2,
    proximo: 'governador',
    ordem: 1,
  },
  governador: {
    label: 'Governador',
    tipo: 'candidato',
    vagas: 1,
    digitos: 2,
    proximo: 'senador',
    ordem: 2,
  },
  senador: {
    label: 'Senador',
    tipo: 'candidato',
    vagas: 2,
    digitos: 3,
    proximo: 'federal',
    ordem: 3,
  },
  federal: {
    label: 'Deputado Federal',
    tipo: 'legenda',
    vagas: 1,
    digitos: 4,
    proximo: 'estadual',
    ordem: 4,
  },
  estadual: {
    label: 'Deputado Estadual',
    tipo: 'legenda',
    vagas: 1,
    digitos: 5,
    // Estadual e o ultimo cargo geral. zona_expansao e' apresentada
    // condicionalmente — a transicao acontece no submeterVoto, nao via
    // este `proximo` (pq depende de municipio do eleitor).
    proximo: null,
    ordem: 5,
  },
  zona_expansao: {
    label: 'Zona de Expansão',
    tipo: 'consulta',
    vagas: 1,
    digitos: 0,
    proximo: null,
    ordem: 6,
    opcoesConsulta: [
      { valor: 'aracaju', label: 'Aracaju' },
      { valor: 'sao_cristovao', label: 'São Cristóvão' },
    ],
    municipiosAplicaveis: [ARACAJU_IBGE, SAO_CRISTOVAO_IBGE],
  },
}

export const isCargo = (raw: string): raw is Cargo =>
  (CARGOS as readonly string[]).includes(raw)

/**
 * Decide o proximo cargo (ou null = fim) baseado no cargo atual e no
 * municipio do eleitor. zona_expansao so aparece pra Aracaju + Sao
 * Cristovao; outros pulam direto pra /obrigado.
 *
 * `zonaAtiva` reflete o flag `edicao.consulta_zona_ativa` — quando o
 * admin desliga a consulta, ela some do fluxo mesmo pra Aracaju/SC.
 */
/**
 * Município de Sergipe = código IBGE começando com 28.
 * null (sessão antiga, sem município no cookie) conta como SE: até
 * 01/09 só existiam eleitores de Sergipe — não podemos encurtar a
 * cédula de quem já estava no meio do fluxo.
 */
export const municipioEhDeSergipe = (municipioIbge: number | null): boolean =>
  municipioIbge == null || String(municipioIbge).startsWith('28')

/**
 * Cargos que o eleitor pode votar conforme o domicílio eleitoral.
 * Fora de Sergipe: SÓ presidente (disputa nacional). Sergipe: todos.
 */
export const cargoPermitidoParaMunicipio = (
  cargo: Cargo,
  municipioIbge: number | null,
): boolean => municipioEhDeSergipe(municipioIbge) || cargo === 'presidente'

export const proximoCargoConsiderandoMunicipio = (
  cargoAtual: Cargo,
  municipioIbge: number | null,
  zonaAtiva = true,
): Cargo | null => {
  // Eleitor de FORA de Sergipe vota só pra presidente — as demais
  // disputas (governador, senador, federal, estadual) são estaduais.
  if (!municipioEhDeSergipe(municipioIbge)) return null

  // Sequencia normal pra todos os cargos exceto estadual
  const cfg = CARGO_CONFIG[cargoAtual]
  if (cfg.proximo) return cfg.proximo

  // Estadual e o ultimo. Apos ele, ve se aplica zona_expansao.
  if (cargoAtual === 'estadual') {
    const z = CARGO_CONFIG.zona_expansao
    if (
      zonaAtiva &&
      municipioIbge &&
      z.municipiosAplicaveis?.includes(municipioIbge)
    ) {
      return 'zona_expansao'
    }
    return null
  }

  return null
}
