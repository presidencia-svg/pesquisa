/**
 * Chave "site desabilitado" — Rp 0601015-42.2026.6.25.0000 (TRE-SE).
 *
 * Ligada em 08/09/2026 a pedido da presidência da CDL, para cumprir a tutela
 * de urgência de 07/09/2026 (suspensão da divulgação dos resultados).
 *
 * A chave fica NO CÓDIGO (e não só em variável de ambiente) de propósito:
 * cada mudança vira um commit datado, que serve de prova do momento em que o
 * site saiu e voltou ao ar. A variável de ambiente SITE_DESABILITADO=1 também
 * liga o modo, para o caso de precisar desligar o site sem commit.
 *
 * Religado em 13/09/2026 (2ª edição, coleta 13–20/09/2026): a divulgação da
 * 1ª edição segue suspensa por lib/ordem-judicial.ts e edicao.suspensa_em.
 *
 * Para reativar o site: SITE_DESABILITADO_NO_CODIGO = false, commit, push
 * (e conferir que a env SITE_DESABILITADO não está definida na Vercel).
 */
export const SITE_DESABILITADO_NO_CODIGO = false

export function siteDesabilitado(): boolean {
  // Só no `next dev` (NODE_ENV=development): SITE_DESABILITADO=0 no .env.local
  // libera o fluxo pra testar o formulário na máquina local sem mexer na
  // chave do código. Na Vercel (NODE_ENV=production) o override é ignorado.
  if (process.env.NODE_ENV === 'development' && process.env.SITE_DESABILITADO === '0') {
    return false
  }
  return SITE_DESABILITADO_NO_CODIGO || process.env.SITE_DESABILITADO === '1'
}
