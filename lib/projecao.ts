/**
 * Projeção de cadeiras pra cargos proporcionais (Deputado Federal e
 * Estadual), como o TSE apura — Código Eleitoral arts. 106 a 109 (com a
 * redação das Leis 13.165/2015, 14.211/2021) e federações partidárias
 * (Lei 14.208/2021).
 *
 * Passos:
 *   1. Votos válidos = legenda + nominais de quem recebeu número. Branco e
 *      nulo NÃO entram.
 *   2. Agremiação = federação (se o partido está numa) ou o partido sozinho.
 *      A federação soma os votos de todos os seus partidos e disputa como
 *      um partido só (art. 11-A da Lei 9.096/95).
 *   3. QE (quociente eleitoral) = válidos ÷ vagas, desprezada a fração se
 *      igual ou inferior a meio, arredondada pra cima se superior (art. 106).
 *   4. QP (quociente partidário) = parte inteira de votos ÷ QE (art. 107).
 *      As vagas do QP vão pros candidatos mais votados da agremiação —
 *      lista única, sem cota por partido dentro da federação — desde que
 *      cada um tenha pelo menos 10% do QE (art. 108). Vaga que não
 *      encontra candidato com 10% vai pras sobras (art. 108, p. único).
 *   5. Sobras pelas maiores médias (art. 109): média = votos ÷ (cadeiras
 *      já obtidas + 1). Só disputam agremiações com pelo menos 80% do QE
 *      e só entra candidato com pelo menos 20% do QE (§ 2º). Repete até
 *      preencher. Se ninguém atender às travas, as vagas restantes vão
 *      pelas maiores médias sem as travas (fallback do § 2º-A / art. 111).
 *
 * Pure (sem DB). Recebe os dados já agregados; a federação de cada
 * partido vem de lib/federacoes.ts pela sigla.
 */
import { federacaoDe } from '@/lib/federacoes'

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

export type EleitoProjetado = {
  candidatoId: string
  numero: number
  nomeUrna: string
  votos: number
  /** 'qp' = vaga do quociente partidário; 'sobra' = maiores médias */
  via: 'qp' | 'sobra'
}

export type CadeirasPorPartido = {
  partidoId: string
  numero: number
  sigla: string
  nome: string
  corHex: string | null
  votos: number
  pctValidos: number
  /** Federação a que o partido pertence (null = concorre sozinho). */
  federacao: string | null
  /** Chave da agremiação (federação ou o próprio partido) — pra agrupar na UI. */
  agremiacaoChave: string
  cadeirasIniciais: number // via QP (dos candidatos DESTE partido)
  cadeirasSobras: number // via maiores médias (dos candidatos DESTE partido)
  cadeirasTotal: number
  /** A agremiação atingiu 80% do QE (pode disputar sobras). */
  atingiuClausula: boolean
  eleitosProjetados: EleitoProjetado[]
}

export type Agremiacao = {
  chave: string
  nome: string
  federacao: string | null
  siglas: string[]
  votos: number
  pctValidos: number
  cadeirasIniciais: number
  cadeirasSobras: number
  cadeirasTotal: number
  atingiuClausula: boolean
}

export type Projecao = {
  totalValidos: number
  vagas: number
  qe: number // Quociente Eleitoral (art. 106)
  clausulaBarreira: number // 80% do QE — disputa das sobras (art. 109 § 2º)
  minimoNominalQP: number // 10% do QE (art. 108)
  minimoNominalSobra: number // 20% do QE (art. 109 § 2º)
  agremiacoes: Agremiacao[]
  partidos: CadeirasPorPartido[]
  cadeirasDistribuidas: number
  /** true se alguma vaga só foi preenchida ignorando as travas de 80%/20%. */
  fallbackSemTravas: boolean
}

/** Art. 106: fração ≤ 0,5 desprezada; > 0,5 equivale a um. */
export function quocienteEleitoral(totalValidos: number, vagas: number): number {
  if (vagas <= 0 || totalValidos <= 0) return 0
  const q = totalValidos / vagas
  const inteiro = Math.floor(q)
  return q - inteiro > 0.5 ? inteiro + 1 : inteiro
}

type Cand = {
  candidatoId: string
  numero: number
  nomeUrna: string
  votos: number
  partidoId: string
}

/**
 * Calcula a projeção de cadeiras pra um cargo proporcional.
 */
export function projetarCadeiras(
  partidos: PartidoVotos[],
  vagas: number,
): Projecao {
  // 1. Válidos
  const totalValidos = partidos.reduce((acc, p) => acc + p.votosLegenda, 0)

  // 2. Agremiações (federação ou partido isolado)
  type Ag = {
    chave: string
    nome: string
    federacao: string | null
    partidoIds: string[]
    siglas: string[]
    votos: number
    candidatos: Cand[]
    cadeirasQP: number
    obtidas: number
    eleitos: Array<{ cand: Cand; via: 'qp' | 'sobra' }>
  }
  const ags = new Map<string, Ag>()
  for (const p of partidos) {
    const fed = federacaoDe(p.sigla)
    const chave = fed ? `fed:${fed}` : `partido:${p.partidoId}`
    const ag =
      ags.get(chave) ??
      {
        chave,
        nome: fed ?? p.sigla,
        federacao: fed,
        partidoIds: [],
        siglas: [],
        votos: 0,
        candidatos: [],
        cadeirasQP: 0,
        obtidas: 0,
        eleitos: [],
      }
    ag.partidoIds.push(p.partidoId)
    ag.siglas.push(p.sigla)
    ag.votos += p.votosLegenda
    for (const c of p.candidatos) {
      ag.candidatos.push({ ...c, partidoId: p.partidoId })
    }
    ags.set(chave, ag)
  }
  // Ordem nominal única dentro da agremiação (empate: menor número)
  for (const ag of ags.values()) {
    ag.candidatos.sort((a, b) => b.votos - a.votos || a.numero - b.numero)
  }

  // 3. QE e travas
  const qe = quocienteEleitoral(totalValidos, vagas)
  const minimoNominalQP = qe * 0.1
  const minimoNominalSobra = qe * 0.2
  const clausulaBarreira = qe * 0.8

  const eleitoIds = new Set<string>()
  let distribuidas = 0

  // 4. QP + preenchimento com mínimo de 10% do QE (art. 107/108)
  for (const ag of ags.values()) {
    ag.cadeirasQP = qe > 0 ? Math.floor(ag.votos / qe) : 0
    for (const c of ag.candidatos) {
      if (ag.obtidas >= ag.cadeirasQP) break
      if (eleitoIds.has(c.candidatoId) || c.votos <= 0 || c.votos < minimoNominalQP) continue
      eleitoIds.add(c.candidatoId)
      ag.eleitos.push({ cand: c, via: 'qp' })
      ag.obtidas++
      distribuidas++
    }
  }

  // 5. Sobras pelas maiores médias (art. 109) — 80% QE + candidato com 20% QE
  let fallbackSemTravas = false
  const proximo = (ag: Ag, minimo: number): Cand | undefined =>
    ag.candidatos.find(
      (c) => !eleitoIds.has(c.candidatoId) && c.votos > 0 && c.votos >= minimo,
    )
  while (distribuidas < vagas && qe > 0) {
    let melhor: { ag: Ag; media: number; cand: Cand } | null = null
    for (const ag of ags.values()) {
      if (ag.votos < clausulaBarreira) continue
      const cand = proximo(ag, minimoNominalSobra)
      if (!cand) continue
      const media = ag.votos / (ag.obtidas + 1)
      if (!melhor || media > melhor.media || (media === melhor.media && ag.votos > melhor.ag.votos)) {
        melhor = { ag, media, cand }
      }
    }
    if (!melhor) {
      // Ninguém atende às travas: maiores médias sem as travas.
      for (const ag of ags.values()) {
        const cand = proximo(ag, 0)
        if (!cand) continue
        const media = ag.votos / (ag.obtidas + 1)
        if (!melhor || media > melhor.media) melhor = { ag, media, cand }
      }
      if (!melhor) break
      fallbackSemTravas = true
    }
    eleitoIds.add(melhor.cand.candidatoId)
    melhor.ag.eleitos.push({ cand: melhor.cand, via: 'sobra' })
    melhor.ag.obtidas++
    distribuidas++
  }

  // 6. Monta saída por partido (compatível com a UI) e por agremiação
  const agDoPartido = new Map<string, Ag>()
  for (const ag of ags.values()) for (const id of ag.partidoIds) agDoPartido.set(id, ag)

  const partidosResultado: CadeirasPorPartido[] = partidos
    .map((p) => {
      const ag = agDoPartido.get(p.partidoId)!
      const eleitosProjetados: EleitoProjetado[] = ag.eleitos
        .filter((e) => e.cand.partidoId === p.partidoId)
        .map((e) => ({
          candidatoId: e.cand.candidatoId,
          numero: e.cand.numero,
          nomeUrna: e.cand.nomeUrna,
          votos: e.cand.votos,
          via: e.via,
        }))
        .sort((a, b) => b.votos - a.votos)
      const ci = eleitosProjetados.filter((e) => e.via === 'qp').length
      const cs = eleitosProjetados.filter((e) => e.via === 'sobra').length
      return {
        partidoId: p.partidoId,
        numero: p.numero,
        sigla: p.sigla,
        nome: p.nome,
        corHex: p.corHex,
        votos: p.votosLegenda,
        pctValidos: totalValidos === 0 ? 0 : (p.votosLegenda / totalValidos) * 100,
        federacao: ag.federacao,
        agremiacaoChave: ag.chave,
        cadeirasIniciais: ci,
        cadeirasSobras: cs,
        cadeirasTotal: ci + cs,
        atingiuClausula: qe > 0 && ag.votos >= clausulaBarreira,
        eleitosProjetados,
      }
    })
    // Agremiação mais votada primeiro; dentro dela, partido mais votado primeiro
    .sort((a, b) => {
      const va = agDoPartido.get(a.partidoId)!.votos
      const vb = agDoPartido.get(b.partidoId)!.votos
      return vb - va || a.agremiacaoChave.localeCompare(b.agremiacaoChave) || b.votos - a.votos
    })

  const agremiacoes: Agremiacao[] = Array.from(ags.values())
    .map((ag) => ({
      chave: ag.chave,
      nome: ag.nome,
      federacao: ag.federacao,
      siglas: ag.siglas,
      votos: ag.votos,
      pctValidos: totalValidos === 0 ? 0 : (ag.votos / totalValidos) * 100,
      cadeirasIniciais: ag.eleitos.filter((e) => e.via === 'qp').length,
      cadeirasSobras: ag.eleitos.filter((e) => e.via === 'sobra').length,
      cadeirasTotal: ag.obtidas,
      atingiuClausula: qe > 0 && ag.votos >= clausulaBarreira,
    }))
    .sort((a, b) => b.votos - a.votos)

  return {
    totalValidos,
    vagas,
    qe,
    clausulaBarreira,
    minimoNominalQP,
    minimoNominalSobra,
    agremiacoes,
    partidos: partidosResultado,
    cadeirasDistribuidas: distribuidas,
    fallbackSemTravas,
  }
}
