/**
 * Configuracao das 5 cedulas da pesquisa.
 *
 * - presidente, governador, senador → eleitor digita NUMERO DO CANDIDATO.
 *   O voto guarda candidato_id em votos_pesquisa.
 * - federal, estadual → eleitor digita o numero como na urna real
 *   (4 digitos pra federal, 5 pra estadual). Mas a pesquisa armazena
 *   apenas a LEGENDA (partido_id) — os 2 primeiros digitos identificam
 *   o partido; os ultimos sao decorativos pra fidelidade da urna.
 *
 * Numero de digitos espelha a urna eletronica brasileira:
 *   Pres/Gov: 2 digitos (numero do partido).
 *   Senador:  3 digitos (partido + 1 digito de ordem do candidato).
 *   Federal:  4 digitos (partido + 2 digitos do candidato).
 *   Estadual: 5 digitos (partido + 3 digitos do candidato).
 *
 * Pure, importavel em Client Component.
 */

export const CARGOS = [
  'presidente',
  'governador',
  'senador',
  'federal',
  'estadual',
] as const

export type Cargo = (typeof CARGOS)[number]

export type CargoConfig = {
  label: string
  /** 'candidato' = ele digita numero do candidato; 'legenda' = numero do partido. */
  tipo: 'candidato' | 'legenda'
  /** Quantos votos o eleitor pode emitir nesta cedula. */
  vagas: number
  /** Quantidade exata de digitos do numero a digitar. */
  digitos: number
  /** Cargo seguinte na sequencia, ou null se for o ultimo. */
  proximo: Cargo | null
  /** Posicao na sequencia (1 a 5). */
  ordem: number
}

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
    vagas: 2, // SE elege 2 senadores em 2026
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
    proximo: null,
    ordem: 5,
  },
}

export const isCargo = (raw: string): raw is Cargo =>
  (CARGOS as readonly string[]).includes(raw)
