import type { MetadataRoute } from 'next'

const BASE = 'https://pesquisa.cdlaju.com.br'

// Só as páginas públicas. /resultados entra quando a edição for divulgada
// (hoje trancada e sob tutela) — lembrar de incluir na divulgação.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date('2026-09-14T08:00:00-03:00')
  return [
    { url: `${BASE}/`, lastModified, changeFrequency: 'daily', priority: 1 },
    {
      url: `${BASE}/votar`,
      lastModified,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE}/transparencia`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE}/privacidade`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${BASE}/patrocinio`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ]
}
