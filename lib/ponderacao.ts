/**
 * Ponderacao por peso amostral (post-stratification) — corrige
 * distorcao de adesao geografica desigual.
 *
 * Sem ponderacao: se Aracaju adere mais que Lagarto, a pesquisa
 * superestima preferencias dos eleitores de Aracaju e subestima as de
 * Lagarto, gerando vies estadual.
 *
 * Com ponderacao: cada resposta de um municipio recebe peso =
 *
 *     w(M) = (N(M) / N_total) / (n(M) / n_total)
 *          = (N(M) * n_total) / (n(M) * N_total)
 *
 * onde:
 *     N(M)     = eleitorado oficial do municipio (TSE 2024)
 *     N_total  = soma dos eleitorados (Sergipe inteiro)
 *     n(M)     = numero de respostas validas que vieram desse municipio
 *     n_total  = total de respostas
 *
 * Propriedade: SUM_M [ n(M) * w(M) ] = n_total — o tamanho amostral
 * efetivo permanece o mesmo, so' redistribui o peso.
 *
 * Exemplo: Aracaju tem 29.4% do eleitorado SE mas trouxe 50% das
 * respostas. Cada voto de Aracaju vale w = 29.4 / 50 = 0.588.
 * Pedra Mole tem 0.25% do eleitorado mas trouxe 0.05% das respostas.
 * Voto de Pedra Mole vale w = 0.25 / 0.05 = 5.0.
 *
 * Resultado: a projecao estadual passa a refletir o estado, nao o
 * "viral" da campanha de divulgacao. Padrao metodologico (DataFolha,
 * Quaest, Genial/Quaest etc).
 */

export type MunicipioPeso = {
  ibgeCodigo: number
  nome: string
  eleitorado: number
  respostas: number
  peso: number
}

/**
 * Calcula pesos por municipio dado:
 *   - municipios[]: lista de todos os municipios com eleitorado oficial
 *   - respostasPorMunicipio: map ibge -> count de votos validos do municipio
 *
 * Municipios com 0 respostas tem peso 0 (nao contribuem, sem distorcao).
 * Municipios com eleitorado 0 ou null sao ignorados (peso 0).
 */
export function calcularPesos(
  municipios: Array<{ ibgeCodigo: number; nome: string; eleitorado: number | null }>,
  respostasPorMunicipio: Map<number, number>,
): Map<number, MunicipioPeso> {
  const nTotal = Array.from(respostasPorMunicipio.values()).reduce(
    (a, b) => a + b,
    0,
  )
  const nTotalMunicipios = municipios.filter(
    (m) => (respostasPorMunicipio.get(m.ibgeCodigo) ?? 0) > 0,
  )
  const NTotal = nTotalMunicipios.reduce(
    (acc, m) => acc + (m.eleitorado ?? 0),
    0,
  )

  const out = new Map<number, MunicipioPeso>()
  for (const m of municipios) {
    const respostas = respostasPorMunicipio.get(m.ibgeCodigo) ?? 0
    const eleitorado = m.eleitorado ?? 0
    let peso = 0
    if (respostas > 0 && eleitorado > 0 && nTotal > 0 && NTotal > 0) {
      // peso = (N(M) / N_total) / (n(M) / n_total)
      peso = (eleitorado / NTotal) / (respostas / nTotal)
    }
    out.set(m.ibgeCodigo, {
      ibgeCodigo: m.ibgeCodigo,
      nome: m.nome,
      eleitorado,
      respostas,
      peso,
    })
  }
  return out
}

/**
 * Aplica pesos a uma contagem `(chave, municipio) -> votos`.
 * Retorna `chave -> votos_ponderados (float)`. Soma de
 * todos os votos_ponderados deve ser ≈ n_total (igual a soma bruta).
 */
export function ponderarVotos<K>(
  votosPorChaveEMunicipio: Map<string, { chave: K; ibgeCodigo: number; votos: number }>,
  pesos: Map<number, MunicipioPeso>,
): Map<K, number> {
  const out = new Map<K, number>()
  for (const reg of votosPorChaveEMunicipio.values()) {
    const w = pesos.get(reg.ibgeCodigo)?.peso ?? 0
    const ponderado = reg.votos * w
    out.set(reg.chave, (out.get(reg.chave) ?? 0) + ponderado)
  }
  return out
}
