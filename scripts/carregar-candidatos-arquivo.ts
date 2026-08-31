#!/usr/bin/env tsx
/**
 * Carrega candidatos de um arquivo JSON (baixado do DivulgaCand via browser,
 * pois o TSE bloqueia requisições do servidor) numa edição específica.
 *
 *   npx tsx scripts/carregar-candidatos-arquivo.ts <arquivo.json> <edicaoId> [--gravar]
 *
 * Formato do arquivo: { presidente:[{n,u,f,p,s}], governador:[...], ... }
 *   n=numero, u=nomeUrna, f=nomeCompleto, p=siglaPartido, s=descricaoSituacao
 */
import { config } from 'dotenv'
import path from 'node:path'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

config({ path: path.resolve(process.cwd(), '.env.local') })

const arquivo = process.argv[2]
const edicaoId = process.argv[3]
const gravar = process.argv.includes('--gravar')
if (!arquivo || !edicaoId) throw new Error('uso: <arquivo.json> <edicaoId> [--gravar]')

const NEG = /indefer|cassad|ineleg|impugna|renunc|falecid|nao conhec|não conhec|sub judice/i
const numeroPartido = (n: number) => Number(String(n).slice(0, 2))

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const db = createClient(url, key, { auth: { persistSession: false } })

  const { data: ed } = await db.from('edicao').select('id, nome').eq('id', edicaoId).maybeSingle()
  if (!ed) throw new Error(`Edição ${edicaoId} não encontrada`)
  console.log(`Edição alvo: ${ed.nome} (${ed.id})`)
  console.log(gravar ? 'Modo: GRAVAR' : 'Modo: dry-run')

  const raw = JSON.parse(readFileSync(arquivo, 'utf8')) as Record<string, Array<{ n: number; u: string; f: string; p: string; s: string }>>

  // cache de partidos (numero -> id)
  const { data: pts } = await db.from('partidos').select('id, numero')
  const cache = new Map<number, string>((pts ?? []).map((p) => [p.numero as number, p.id as string]))

  async function partidoId(num: number, sigla: string): Promise<string> {
    const ex = cache.get(num)
    if (ex) return ex
    if (!gravar) { cache.set(num, `dry-${num}`); return `dry-${num}` }
    const { data, error } = await db.from('partidos').insert({ numero: num, sigla: sigla || `P${num}`, nome: sigla || `Partido ${num}` }).select('id').single()
    if (error) throw new Error(`partido ${num} ${sigla}: ${error.message}`)
    cache.set(num, data.id); return data.id
  }

  let total = 0, comImped = 0
  for (const cargo of ['presidente', 'governador', 'senador', 'federal', 'estadual']) {
    const lista = raw[cargo] ?? []
    console.log(`\n=== ${cargo.toUpperCase()} — ${lista.length} ===`)
    for (const c of lista) {
      const pnum = numeroPartido(c.n)
      const pid = await partidoId(pnum, c.p)
      const imped = NEG.test(c.s || '') ? `${c.s} (TSE)` : null
      if (imped) comImped++
      total++
      if (gravar) {
        const { error } = await db.from('candidatos_pesquisa').insert({
          edicao_id: edicaoId, cargo, numero: c.n, nome_urna: c.u, nome_completo: c.f || null,
          partido_id: pid, ativo: true, ano_referencia: 2026, impedimento: imped,
        })
        if (error) console.error(`  ERRO ${cargo} ${c.n} ${c.u}: ${error.message}`)
      }
    }
    // amostra
    for (const c of lista.slice(0, 3)) console.log(`  ${c.n} ${c.u} (${c.p})${NEG.test(c.s||'')?' ⚠ '+c.s:''}`)
    if (lista.length > 3) console.log(`  … +${lista.length - 3}`)
  }
  console.log(`\nTotal: ${total} candidatos${gravar ? ' GRAVADOS' : ' (dry-run)'} · com impedimento: ${comImped}`)
}
main().catch((e) => { console.error(e); process.exit(1) })
