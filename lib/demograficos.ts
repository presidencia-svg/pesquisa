/**
 * Vocabulário das variáveis demográficas perguntadas em /votar/confirma.
 *
 * Fonte única pra formulário (client), validação (server action), cookies
 * (lib/sessao.ts) e rótulos do admin. Os valores gravados no banco são os
 * daqui — ver migrations 026 (vocabulário original) e 053 (2ª edição:
 * detalhe da escolaridade e renda em salários mínimos).
 */

// ---------------------------------------------------------------------------
// Escolaridade
//
// O estrato de ponderação continua sendo o de três níveis (o mesmo agregado
// do TSE e o que consta do registro no PesqEle). O formulário, porém, mostra
// quatro opções em linguagem corrente: quem "não estudou ou só sabe ler e
// escrever" não se reconhecia em "Ensino fundamental" (1ª edição). A opção
// marcada fica em `escolaridade_detalhe`; o estrato derivado, em
// `escolaridade`.
// ---------------------------------------------------------------------------

export const ESCOLARIDADES = ['fundamental', 'medio', 'superior'] as const
export type Escolaridade = (typeof ESCOLARIDADES)[number]

export const ESCOLARIDADE_DETALHES = [
  'sem_estudo',
  'fundamental',
  'medio',
  'superior',
] as const
export type EscolaridadeDetalhe = (typeof ESCOLARIDADE_DETALHES)[number]

/** Rótulo mostrado no formulário, na ordem em que aparece. */
export const ESCOLARIDADE_DETALHE_ROTULO: Record<EscolaridadeDetalhe, string> = {
  sem_estudo: 'Não estudei, ou só sei ler e escrever',
  fundamental: 'Ensino fundamental (1ª a 8ª série ou 9º ano), completo ou não',
  medio: 'Ensino médio (antigo 2º grau), completo ou não',
  superior: 'Ensino superior (faculdade), completo ou não',
}

/**
 * Detalhe → estrato de ponderação. "sem_estudo" e "fundamental" caem no
 * mesmo estrato, exatamente como o TSE agrega ANALFABETO / LÊ E ESCREVE /
 * FUNDAMENTAL INCOMPLETO / FUNDAMENTAL COMPLETO.
 */
export const estratoEscolaridade = (d: EscolaridadeDetalhe): Escolaridade =>
  d === 'sem_estudo' ? 'fundamental' : d

/**
 * Estrato → detalhe pra pré-preencher o formulário quando só existe o
 * valor de três níveis (1ª edição). Fundamental é ambíguo (pode ter sido
 * "sem estudo"), então volta sem seleção e o eleitor marca de novo.
 */
export const detalheDeEstrato = (
  e: Escolaridade | null | undefined,
): EscolaridadeDetalhe | undefined =>
  e === 'medio' || e === 'superior' ? e : undefined

export const isEscolaridade = (v: unknown): v is Escolaridade =>
  typeof v === 'string' && (ESCOLARIDADES as readonly string[]).includes(v)
export const isEscolaridadeDetalhe = (v: unknown): v is EscolaridadeDetalhe =>
  typeof v === 'string' && (ESCOLARIDADE_DETALHES as readonly string[]).includes(v)

// ---------------------------------------------------------------------------
// Nível econômico (renda familiar)
//
// 2ª edição: faixas em salários mínimos (linguagem corrente e padrão
// IBGE/PNAD), com "Não sei" separado de "Prefiro não informar". Na 1ª
// edição a pergunta era em classes ABEP disfarçadas de faixas de R$
// (A/B/C/D_E) e 36,7% preferiram não informar. A variável NÃO pondera
// (não há parâmetro oficial do eleitorado por renda) — serve à composição
// da amostra exigida pela Resolução TSE (art. 2º §7º, IV).
// ---------------------------------------------------------------------------

/** Salário mínimo nacional vigente em 2026 (R$). Conferir no decreto. */
export const SALARIO_MINIMO_2026 = 1621

export const NIVEIS_ECONOMICOS = [
  'ate_1_sm',
  '1_a_2_sm',
  '2_a_5_sm',
  '5_a_10_sm',
  'mais_10_sm',
  'nao_sei',
  'nao_informado',
] as const
export type NivelEconomico = (typeof NIVEIS_ECONOMICOS)[number]

/** Valores da 1ª edição (migration 026). Só leitura/rótulo; o formulário não os oferece mais. */
export const NIVEIS_ECONOMICOS_LEGADO = ['A', 'B', 'C', 'D_E'] as const
export type NivelEconomicoLegado = (typeof NIVEIS_ECONOMICOS_LEGADO)[number]

const brl = (n: number): string => `R$ ${n.toLocaleString('pt-BR')}`
const sm = (k: number): number => SALARIO_MINIMO_2026 * k

/** Rótulo mostrado no formulário, com o equivalente em R$ do ano. */
export const NIVEL_ECONOMICO_ROTULO: Record<NivelEconomico, string> = {
  ate_1_sm: `Até 1 salário mínimo (até ${brl(sm(1))})`,
  '1_a_2_sm': `De 1 a 2 salários mínimos (${brl(sm(1))} a ${brl(sm(2))})`,
  '2_a_5_sm': `De 2 a 5 salários mínimos (${brl(sm(2))} a ${brl(sm(5))})`,
  '5_a_10_sm': `De 5 a 10 salários mínimos (${brl(sm(5))} a ${brl(sm(10))})`,
  mais_10_sm: `Mais de 10 salários mínimos (acima de ${brl(sm(10))})`,
  nao_sei: 'Não sei',
  nao_informado: 'Prefiro não informar',
}

/** Rótulo curto pra tabelas do admin (inclui os valores da 1ª edição). */
export const NIVEL_ECONOMICO_ROTULO_CURTO: Record<
  NivelEconomico | NivelEconomicoLegado,
  string
> = {
  ate_1_sm: 'Até 1 SM',
  '1_a_2_sm': '1 a 2 SM',
  '2_a_5_sm': '2 a 5 SM',
  '5_a_10_sm': '5 a 10 SM',
  mais_10_sm: 'Mais de 10 SM',
  nao_sei: 'Não sabe',
  nao_informado: 'Não declarado',
  A: 'Classe A (> R$ 25.000) — 1ª edição',
  B: 'Classe B (R$ 7.000 – 25.000) — 1ª edição',
  C: 'Classe C (R$ 2.800 – 7.000) — 1ª edição',
  D_E: 'Classe D-E (até R$ 2.800) — 1ª edição',
}

export const isNivelEconomico = (v: unknown): v is NivelEconomico =>
  typeof v === 'string' && (NIVEIS_ECONOMICOS as readonly string[]).includes(v)
