import type { MetadataRoute } from 'next'

/**
 * robots.txt — liberado em 14/09/2026 (2ª edição em coleta).
 *
 * Indexáveis: home, /votar, /transparencia, /privacidade, /patrocinio.
 * Fora do Google: admin, API, TV, fluxo interno do voto e RESULTADOS
 * (trancados até a divulgação e sob a tutela da Rp 0601015-42 TRE-SE).
 * O header X-Robots-Tag no next.config repete a mesma lista.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/api/',
        '/dev/',
        '/tv',
        '/resultados',
        '/previa',
        '/manutencao',
        '/teste-ficticio',
        '/votar/',
      ],
    },
    sitemap: 'https://pesquisa.cdlaju.com.br/sitemap.xml',
  }
}
