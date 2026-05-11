#!/usr/bin/env tsx
/**
 * Importa fotos dos candidatos da Wikipedia (pt) pra `candidatos_pesquisa.foto_url`.
 *
 * Funciona assim:
 *   1. Le todos os candidatos da edicao ativa com foto_url null.
 *   2. Pra cada, consulta a API do Wikipedia pelo nome_completo (e
 *      depois pelo nome_urna se nao achar).
 *   3. Se a pagina existir e tiver foto principal, pega a URL do
 *      thumbnail (400px) e atualiza foto_url.
 *   4. Reporta quem teve sucesso, quem ficou null, e estatisticas.
 *
 * Candidatos sem Wikipedia (lesser-known SE candidatos) ficam com
 * foto_url=null — o componente FotoOuInicial cai no fallback de
 * iniciais coloridas. Voce pode preencher manualmente via
 * /admin/candidatos depois.
 *
 * Pra rodar:
 *   npm run import:fotos
 *
 * Idempotente — so atualiza linhas com foto_url null. Rodar de novo
 * pra tentar de novo apos manter null por algum tempo.
 */
import { config as dotenvConfig } from 'dotenv'
import path from 'node:path'

import { createClient } from '@supabase/supabase-js'

dotenvConfig({ path: path.resolve(process.cwd(), '.env.local') })

type Candidato = {
  id: string
  cargo: string
  numero: number
  nome_urna: string
  nome_completo: string | null
}

type WikiResponse = {
  query?: {
    pages?: Record<
      string,
      {
        title: string
        thumbnail?: { source: string; width: number; height: number }
        missing?: string
      }
    >
  }
}

const WIKIPEDIA_API = 'https://pt.wikipedia.org/w/api.php'
const THUMB_SIZE = 600
const UA =
  'PesquisaSergipe2026/1.0 (https://pesquisa.cdlaju.com.br; contato@cdlaju.com.br)'

/**
 * Busca o titulo mais relevante no Wikipedia pra um termo.
 * Usa opensearch — mais flexivel que titles= que exige match exato.
 */
async function buscarTituloWikipedia(termo: string): Promise<string | null> {
  const url = new URL(WIKIPEDIA_API)
  url.searchParams.set('action', 'opensearch')
  url.searchParams.set('search', termo)
  url.searchParams.set('limit', '1')
  url.searchParams.set('namespace', '0')
  url.searchParams.set('format', 'json')

  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (!res.ok) return null
    const data = (await res.json()) as [string, string[], string[], string[]]
    return data[1]?.[0] ?? null
  } catch {
    return null
  }
}

/**
 * Pega thumbnail da pagina com o titulo dado.
 */
async function buscarFotoDoTitulo(titulo: string): Promise<string | null> {
  const url = new URL(WIKIPEDIA_API)
  url.searchParams.set('action', 'query')
  url.searchParams.set('prop', 'pageimages')
  url.searchParams.set('format', 'json')
  url.searchParams.set('pithumbsize', String(THUMB_SIZE))
  url.searchParams.set('pilicense', 'any')
  url.searchParams.set('redirects', '1')
  url.searchParams.set('titles', titulo)

  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (!res.ok) return null
    const data = (await res.json()) as WikiResponse
    const pages = data.query?.pages ?? {}
    for (const page of Object.values(pages)) {
      if (page.missing !== undefined) continue
      if (page.thumbnail?.source) return page.thumbnail.source
    }
    return null
  } catch {
    return null
  }
}

async function buscarFotoWikipedia(termo: string): Promise<string | null> {
  // 1. Tenta o titulo direto (mais rapido, funciona quando bate exato)
  const fotoDireta = await buscarFotoDoTitulo(termo)
  if (fotoDireta) return fotoDireta
  // 2. Fallback: usa opensearch pra achar o titulo certo e pega a foto
  const titulo = await buscarTituloWikipedia(termo)
  if (!titulo) return null
  return buscarFotoDoTitulo(titulo)
}

async function main() {
  const env = process.env
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_URL e SERVICE_ROLE_KEY ausentes no .env.local')
  }

  const db = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log('🔍 Buscando candidatos sem foto…')
  const { data: edicao } = await db
    .from('edicao')
    .select('id, nome')
    .eq('ativa', true)
    .maybeSingle()
  if (!edicao) throw new Error('Sem edicao ativa.')

  const { data: candidatos, error } = await db
    .from('candidatos_pesquisa')
    .select('id, cargo, numero, nome_urna, nome_completo')
    .eq('edicao_id', edicao.id)
    .is('foto_url', null)
    .returns<Candidato[]>()
  if (error) throw error

  if (!candidatos || candidatos.length === 0) {
    console.log('✅ Nenhum candidato sem foto. Nada pra fazer.')
    return
  }

  console.log(`   ${candidatos.length} candidatos sem foto. Buscando…\n`)

  const stats = { encontrados: 0, sem_foto: 0, erros: 0 }
  const semFoto: string[] = []

  for (const c of candidatos) {
    const termos = [c.nome_completo, c.nome_urna].filter(
      (t): t is string => typeof t === 'string' && t.length > 0,
    )

    let fotoUrl: string | null = null
    for (const termo of termos) {
      fotoUrl = await buscarFotoWikipedia(termo)
      if (fotoUrl) break
    }

    if (fotoUrl) {
      const { error: errUpd } = await db
        .from('candidatos_pesquisa')
        .update({ foto_url: fotoUrl })
        .eq('id', c.id)
      if (errUpd) {
        stats.erros++
        console.log(`❌ ${c.cargo} #${c.numero} ${c.nome_urna}: erro DB`)
      } else {
        stats.encontrados++
        console.log(`✓ ${c.cargo} #${c.numero} ${c.nome_urna}`)
      }
    } else {
      stats.sem_foto++
      semFoto.push(`${c.cargo} #${c.numero} ${c.nome_urna}`)
    }

    // Pausa pra nao saturar Wikipedia
    await new Promise((r) => setTimeout(r, 300))
  }

  console.log('')
  console.log('────────────────────────────────────────')
  console.log(`✅ Concluído.`)
  console.log(`   Fotos encontradas: ${stats.encontrados}`)
  console.log(`   Sem foto (Wikipedia não tem): ${stats.sem_foto}`)
  console.log(`   Erros: ${stats.erros}`)
  if (semFoto.length > 0) {
    console.log('')
    console.log('Candidatos sem foto (preencher manual via /admin/candidatos):')
    for (const nome of semFoto) console.log(`   • ${nome}`)
  }
}

main().catch((err) => {
  console.error('💥 Falha fatal:', err)
  process.exit(1)
})
