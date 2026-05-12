/**
 * Projecao de cadeiras pra cargos proporcionais (Deputado Federal e
 * Estadual) conforme regras do TSE (Lei 9.504/97 art. 109, com a
 * redacao da Lei 13.165/2015 + 13.488/2017).
 *
 * Passos:
 *   1. Total de votos validos (legenda + nominais) e' a soma de tudo
 *      que recebeu numero. Branco e nulo NAO entram.
 *   2. QE (Quociente Eleitoral) = floor(total_validos / vagas)
 *   3. Clausula de barreira: partido SO concorre se atingir 80% do QE.
 *   4. QP (Quociente Partidario) = floor(votos_partido / QE) → cadeiras iniciais.
 *   5. Sobras: cadeiras nao distribuidas pelo QP vao por MAIORES MEDIAS.
 *      Pra cada partido elegivel: media = votos_partido / (cadeiras + 1).
 *      Partido com maior media leva a sobra. Repete ate' fechar as vagas.
 *      Limite: cada partido pode receber sobras enquanto tiver candidatos
 *      validos (mas pra pesquisa, ignoramos esse limite — usamos a forca
 *      eleitoral pura).
 *   6. Dentro de cada partido, candidatos sao ordenados por voto
 *      individual DECRESCENTE. Os N primeiros (N = cadeiras do partido)
 *      sao os "eleitos projetados".
 *
 * Pure (no DB calls). Recebe os dados ja' agregados.
 */

export type PartidoVotos = {
  partidoId: string
  numero: number
  sigla: string
  nome: string
  corHex: string | null
  votosLegenda: number // total = soma legenda + nominal
  candidatos: Array<{
    candidatoId: string
    numero: number
    nomeUrna: string
    votos: number
  }>
}

export type CadeirasPorPartido = {
  partidoId: string
  numero: number
  sigla: string
  nome: string
  corHex: string | null
  votos: number
  pctValidos: number
  cadeirasIniciais: number // via QP
  cadeirasSobras: number // via maiores médias
  cadeirasTotal: number
  atingiuClausula: boolean
  eleitosProjetados: Array<{
    candidatoId: string
    numero: number
    nomeUrna: string
    votos: number
  }>
}

export type Projecao = {
  totalValidos: number
  vagas: number
  qe: number // Quociente Eleitoral
  clausulaBarreira: number // 80% do QE
  partidos: CadeirasPorPartido[]
  cadeirasDistribuidas: number // soma de todas as cadeiras
}

/**
 * Calcula a projecao de cadeiras pra um cargo proporcional.
 */
export function projetarCadeiras(
  partidos: PartidoVotos[],
  vagas: number,
): Projecao {
  // 1. Total de validos
  const totalValidos = partidos.reduce((acc, p) => acc + p.votosLegenda, 0)

  // 2. QE
  const qe = vagas > 0 ? Math.floor(totalValidos / vagas) : 0
  const clausulaBarreira = Math.floor(qe * 0.8)

  // 3. Elegibilidade
  const elegiveis = partidos
    .map((p) => ({
      ...p,
      atingiuClausula: p.votosLegenda >= clausulaBarreira && qe > 0,
    }))

  // 4. QP — cadeiras iniciais
  const cadeirasIniciaisPorPartido = new Map<string, number>()
  for (const p of elegiveis) {
    cadeirasIniciaisPorPartido.set(
      p.partidoId,
      p.atingiuClausula && qe > 0 ? Math.floor(p.votosLegenda / qe) : 0,
    )
  }

  const cadeirasJaDistribuidas = Array.from(
    cadeirasIniciaisPorPartido.values(),
  ).reduce((a, b) => a + b, 0)
  let sobras = vagas - cadeirasJaDistribuidas

  // 5. Sobras por maiores medias — so' partidos elegiveis competem
  const cadeirasSobrasPorPartido = new Map<string, number>()
  while (sobras > 0) {
    let melhorId: string | null = null
    let melhorMedia = -1
    for (const p of elegiveis) {
      if (!p.atingiuClausula) continue
      const cadeirasAtual =
        (cadeirasIniciaisPorPartido.get(p.partidoId) ?? 0) +
        (cadeirasSobrasPorPartido.get(p.partidoId) ?? 0)
      const media = p.votosLegenda / (cadeirasAtual + 1)
      if (media > melhorMedia) {
        melhorMedia = media
        melhorId = p.partidoId
      }
    }
    if (!melhorId) break // ningum elegivel — para
    cadeirasSobrasPorPartido.set(
      melhorId,
      (cadeirasSobrasPorPartido.get(melhorId) ?? 0) + 1,
    )
    sobras--
  }

  // 6. Monta resultado final
  const partidosResultado: CadeirasPorPartido[] = elegiveis
    .map((p) => {
      const ci = cadeirasIniciaisPorPartido.get(p.partidoId) ?? 0
      const cs = cadeirasSobrasPorPartido.get(p.partidoId) ?? 0
      const total = ci + cs

      const eleitosProjetados = [...p.candidatos]
        .sort((a, b) => b.votos - a.votos)
        .slice(0, total)
        .map((c) => ({
          candidatoId: c.candidatoId,
          numero: c.numero,
          nomeUrna: c.nomeUrna,
          votos: c.votos,
        }))

      return {
        partidoId: p.partidoId,
        numero: p.numero,
        sigla: p.sigla,
        nome: p.nome,
        corHex: p.corHex,
        votos: p.votosLegenda,
        pctValidos:
          totalValidos === 0 ? 0 : (p.votosLegenda / totalValidos) * 100,
        cadeirasIniciais: ci,
        cadeirasSobras: cs,
        cadeirasTotal: total,
        atingiuClausula: p.atingiuClausula,
        eleitosProjetados,
      }
    })
    .sort((a, b) => b.votos - a.votos)

  return {
    totalValidos,
    vagas,
    qe,
    clausulaBarreira,
    partidos: partidosResultado,
    cadeirasDistribuidas: partidosResultado.reduce(
      (acc, p) => acc + p.cadeirasTotal,
      0,
    ),
  }
}
