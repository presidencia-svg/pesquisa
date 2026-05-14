/**
 * GET /api/biografia?nome=Fatima+Bezerra[&partido=PT]
 *
 * Proxy pra Wikipedia REST API. Faz:
 *   1. opensearch pra achar a página mais relevante (usa nome + partido se ajuda)
 *   2. summary da página pra trazer extract + thumbnail + link
 *
 * Cache Edge: 24h (s-maxage=86400) — biografia raramente muda; se mudar,
 * 1 dia de defasagem é aceitável.
 *
 * Respostas:
 *   200 { titulo, extrato, thumbnail, url } — encontrou
 *   404 { erro: 'nao_encontrado' }          — sem página na Wikipédia
 *   400 { erro: 'parametro_invalido' }      — falta `nome`
 *   502 { erro: 'wikipedia_falhou' }        — Wikipedia retornou erro
 */

import { NextResponse } from 'next/server'

const WIKI_API = 'https://pt.wikipedia.org/w/api.php'
const WIKI_REST = 'https://pt.wikipedia.org/api/rest_v1/page/summary'
const UA =
  'PesquisaSergipe2026/1.0 (https://pesquisa.cdlaju.com.br; contato@cdlaju.com.br)'

type OpenSearchResp = [string, string[], string[], string[]]

type WikiSummary = {
  type?: string
  title?: string
  extract?: string
  thumbnail?: { source: string; width: number; height: number }
  content_urls?: { desktop?: { page?: string } }
}

async function buscarTitulo(termo: string): Promise<string | null> {
  const url = new URL(WIKI_API)
  url.searchParams.set('action', 'opensearch')
  url.searchParams.set('search', termo)
  url.searchParams.set('limit', '1')
  url.searchParams.set('namespace', '0')
  url.searchParams.set('format', 'json')
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const data = (await res.json()) as OpenSearchResp
    return data[1]?.[0] ?? null
  } catch {
    return null
  }
}

async function buscarSummary(titulo: string): Promise<WikiSummary | null> {
  const url = `${WIKI_REST}/${encodeURIComponent(titulo)}?redirect=true`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    return (await res.json()) as WikiSummary
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const nome = searchParams.get('nome')?.trim()
  const partido = searchParams.get('partido')?.trim()

  if (!nome) {
    return NextResponse.json(
      { erro: 'parametro_invalido' },
      { status: 400 },
    )
  }

  // Tenta variações na ordem de especificidade. Para nomes comuns, o partido
  // ajuda a resolver desambiguação (ex: 'André Moura' tem múltiplas pessoas).
  const termos = [
    partido ? `${nome} ${partido}` : null,
    `${nome} (político)`,
    nome,
  ].filter((t): t is string => Boolean(t))

  let titulo: string | null = null
  for (const termo of termos) {
    titulo = await buscarTitulo(termo)
    if (titulo) break
  }

  if (!titulo) {
    return NextResponse.json(
      { erro: 'nao_encontrado' },
      {
        status: 404,
        headers: { 'Cache-Control': 'public, s-maxage=86400' },
      },
    )
  }

  const summary = await buscarSummary(titulo)
  if (!summary || summary.type === 'disambiguation' || !summary.extract) {
    return NextResponse.json(
      { erro: 'nao_encontrado' },
      {
        status: 404,
        headers: { 'Cache-Control': 'public, s-maxage=86400' },
      },
    )
  }

  return NextResponse.json(
    {
      titulo: summary.title ?? titulo,
      extrato: summary.extract,
      thumbnail: summary.thumbnail?.source ?? null,
      url: summary.content_urls?.desktop?.page ?? null,
    },
    {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    },
  )
}
