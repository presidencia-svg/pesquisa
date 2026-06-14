/**
 * Especificações OFICIAIS de tamanho de logo por cota de patrocínio.
 *
 * Fonte da verdade pra:
 *  - CSS de /resultados (renderização real)
 *  - Mídia kit (informação ao patrocinador)
 *  - Painel admin (preview tamanho real)
 *  - Landing /patrocinio
 *
 * Política de encaixe:
 *  - max-width + max-height limitam tamanho máximo
 *  - object-fit: contain garante que a logo NUNCA sai do quadro
 *  - Logos em qualquer proporção (quadradas, horizontais, verticais)
 *    se encaixam preservando aspect ratio
 *  - Recomendação enviada ao patrocinador: PNG transparente nas
 *    dimensões "ideais" pra evitar serrilhado ou espaço excessivo
 */

export const COTA_SPECS = {
  diamante: {
    nome: 'Diamante',
    cor: '#0891b2',
    desktop: { width: 220, height: 90 },
    mobile: { width: 180, height: 70 },
    ideal: '220×90 px (PNG transparente, fundo neutro claro)',
    descricao:
      'Logo principal em destaque máximo, espaço amplo permite formato horizontal ou retangular alongado.',
  },
  ouro: {
    nome: 'Ouro',
    cor: '#ca8a04',
    desktop: { width: 160, height: 60 },
    mobile: { width: 130, height: 48 },
    ideal: '160×60 px (PNG transparente)',
    descricao:
      'Logo entre divisores, lado a lado com outros patrocinadores Ouro. Formato horizontal recomendado.',
  },
  prata: {
    nome: 'Prata',
    cor: '#64748b',
    desktop: { width: 120, height: 40 },
    mobile: { width: 100, height: 32 },
    ideal: '120×40 px (PNG transparente, opacidade 85% aplicada)',
    descricao:
      'Logo discreta em bloco "Apoiadores" no rodapé. Formato compacto recomendado.',
  },
} as const

export type CotaSpecKey = keyof typeof COTA_SPECS

/**
 * Estilo CSS inline pra reproduzir o slot real do /resultados.
 * Use no admin pra mostrar preview "tal qual aparecerá no ar".
 */
export function estiloSlotDesktop(cota: CotaSpecKey): React.CSSProperties {
  const spec = COTA_SPECS[cota]
  return {
    maxWidth: `${spec.desktop.width}px`,
    maxHeight: `${spec.desktop.height}px`,
    width: 'auto',
    height: 'auto',
    objectFit: 'contain',
  }
}
