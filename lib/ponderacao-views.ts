/**
 * FONTE ÚNICA do resultado ponderado: qual conjunto de views do banco vale
 * pra edição, conforme edicao.ponderacao_metodo (migration 048).
 *
 *   'municipio'       → views *_pond (pós-estratificação por município, 045)
 *   'estratos_raking' → views *_pond_estratos (raking município × sexo × faixa
 *                       × instrução, pesos da execução em ponderacao_execucao_id)
 *
 * Toda tela que mostra número ponderado (resultados, TV, apresentação, prévia,
 * projeção de cadeiras do admin) lê DESTAS views — nenhuma recalcula peso em
 * memória. Duas telas com métodos diferentes dão eleitos diferentes.
 */
export type PonderacaoMetodo = 'municipio' | 'estratos_raking'

export type ViewsPonderadas = {
  metodo: PonderacaoMetodo
  candidato: string
  legenda: string
  brancoNaoSabe: string
}

export function viewsPonderadas(edicao: {
  ponderacao_metodo: string | null
  ponderacao_execucao_id: string | null
}): ViewsPonderadas {
  const metodo: PonderacaoMetodo =
    edicao.ponderacao_metodo === 'estratos_raking' ? 'estratos_raking' : 'municipio'
  // Estratos SEM execução apontada é erro de configuração: falha em vez de
  // publicar número sem peso.
  if (metodo === 'estratos_raking' && !edicao.ponderacao_execucao_id) {
    throw new Error(
      'resultados: edição com ponderacao_metodo=estratos_raking sem ponderacao_execucao_id — rode a ponderação antes',
    )
  }
  const sufixo = metodo === 'estratos_raking' ? '_pond_estratos' : '_pond'
  return {
    metodo,
    candidato: `v_resultados_candidato${sufixo}`,
    legenda: `v_resultados_legenda${sufixo}`,
    brancoNaoSabe: `v_votos_branco_nao_sabe${sufixo}`,
  }
}
