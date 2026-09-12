/**
 * Edições com divulgação suspensa por ORDEM JUDICIAL — trava no código.
 *
 * O banco tem `edicao.suspensa_em` (botão "Suspender (ordem judicial)" no
 * /admin/edicoes, com TOTP e auditoria). Esta lista é a segunda trava,
 * independente do banco: mesmo que o campo esteja vazio (ou seja limpo por
 * engano), nenhuma página pública, API ou notificação mostra número da
 * edição listada aqui. Como em lib/site-desabilitado.ts, fica no código de
 * propósito — cada mudança vira um commit datado, prova de quando a trava
 * entrou e saiu.
 *
 * Para levantar a suspensão (só após decisão judicial que revogue a
 * tutela): remover a entrada daqui E clicar "Retomar" no admin.
 */
export type SuspensaoJudicial = {
  suspensa_em: string
  suspensao_motivo: string
}

export const EDICOES_SOB_ORDEM_JUDICIAL: Readonly<Record<string, SuspensaoJudicial>> = {
  // 1ª edição (1º turno) — Rp 0601015-42.2026.6.25.0000 (TRE-SE), tutela de
  // urgência de 07/09/2026: suspensão da divulgação, replicação e utilização
  // pública dos resultados. Site fora do ar desde 08/09/2026 10h47 BRT.
  '2c9211d1-6fd2-476d-8872-5952c12db5e9': {
    suspensa_em: '2026-09-07T03:00:00.000Z',
    suspensao_motivo:
      'Tutela de urgência de 07/09/2026 — Rp 0601015-42.2026.6.25.0000 (TRE-SE)',
  },
}

/**
 * Suspensão efetiva de uma edição: o que estiver no banco OU a trava do
 * código. `null` = não suspensa.
 */
export function suspensaoJudicial(
  edicao: { id: string; suspensa_em?: string | null; suspensao_motivo?: string | null } | null | undefined,
): SuspensaoJudicial | null {
  if (!edicao) return null
  if (edicao.suspensa_em) {
    return {
      suspensa_em: edicao.suspensa_em,
      suspensao_motivo: edicao.suspensao_motivo ?? '',
    }
  }
  return EDICOES_SOB_ORDEM_JUDICIAL[edicao.id] ?? null
}
