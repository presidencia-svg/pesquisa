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
 * Para reativar o site: SITE_DESABILITADO_NO_CODIGO = false, commit, push
 * (e conferir que a env SITE_DESABILITADO não está definida na Vercel).
 */
export const SITE_DESABILITADO_NO_CODIGO = true

export function siteDesabilitado(): boolean {
  return SITE_DESABILITADO_NO_CODIGO || process.env.SITE_DESABILITADO === '1'
}
