#!/usr/bin/env tsx
/**
 * Bulk-import de sexo (e faixa etária) do Melhores do Ano pra cdl_base.
 *
 * Contexto:
 *   Quando o /votar resolve sexo via SPC on-demand, gasta uma chamada SPC
 *   por eleitor. Como os 44k CPFs em cdl_base já foram consultados no SPC
 *   durante o Melhores do Ano, o sexo está em spc_cache.raw_response do
 *   projeto MdA — podemos extrair em bulk e pular o SPC pra esses.
 *
 * Como funciona:
 *   1. No MdA: SELECT v.cpf, sexo, dataNascimento FROM votantes v
 *      JOIN spc_cache c ON c.cpf_hash = v.cpf_hash
 *      WHERE raw_response tem .consumidor.consumidorPessoaFisica.sexo
 *   2. Pra cada linha: extrai sexo (M/F), calcula faixa_etaria via idade
 *      → data nascimento, hasheia CPF com NOSSO secret CPF_HASH_SECRET
 *   3. UPDATE em cdl_base do projeto Eleições 2026 setando sexo +
 *      faixa_etaria onde cpf_hash bate (UPSERT preserva campos existentes).
 *
 * Idempotente. Roda quantas vezes quiser.
 *
 * Pra rodar:
 *   1. .env.local precisa ter:
 *        NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (Eleições)
 *        MELHORES_SUPABASE_URL, MELHORES_SUPABASE_SERVICE_ROLE_KEY (MdA)
 *        CPF_HASH_SECRET (mesmo do projeto Eleições)
 *   2. npx tsx scripts/importar-sexo-mda.ts
 *
 * Flags opcionais:
 *   --dry-run    Mostra o que faria sem escrever.
 *   --limit=N    Limita ao primeiro N votantes (debug).
 *
 * Segurança: este script lê CPFs em claro do MdA. Rode apenas em ambiente
 * local controlado. Service role keys ficam só em memória durante run.
 */
import { config as dotenvConfig } from 'dotenv'
import { createHmac } from 'node:crypto'
import path from 'node:path'

import { createClient } from '@supabase/supabase-js'

dotenvConfig({ path: path.resolve(process.cwd(), '.env.local') })

// ─── Helpers ────────────────────────────────────────────────────────────

const onlyDigits = (s: string): string => s.replace(/\D/g, '')

const cpfValido = (raw: string): boolean => {
  const cpf = onlyDigits(raw)
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false
  const calcDigito = (slice: string, fatorInicial: number): number => {
    let soma = 0
    for (let i = 0; i < slice.length; i++) {
      soma += Number(slice[i]) * (fatorInicial - i)
    }
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  return (
    calcDigito(cpf.slice(0, 9), 10) === Number(cpf[9]) &&
    calcDigito(cpf.slice(0, 10), 11) === Number(cpf[10])
  )
}

const hashCpf = (cpfDigits: string, secret: string): string =>
  createHmac('sha256', secret).update(cpfDigits).digest('hex')

/**
 * Idade → faixa etária do esquema cdl_base.faixa_etaria
 * ('16-17','18-24','25-34','35-44','45-59','60+')
 */
const idadeParaFaixa = (idade: number): string | null => {
  if (idade < 16) return null
  if (idade < 18) return '16-17'
  if (idade < 25) return '18-24'
  if (idade < 35) return '25-34'
  if (idade < 45) return '35-44'
  if (idade < 60) return '45-59'
  return '60+'
}

/**
 * Calcula idade atual a partir de timestamp UNIX (ms) de nascimento.
 * Trata data inválida.
 */
const calcularIdade = (dataNascMs: number | null): number | null => {
  if (!dataNascMs || dataNascMs < 0) return null
  const nasc = new Date(dataNascMs)
  if (Number.isNaN(nasc.getTime())) return null
  const hoje = new Date()
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
  if (idade < 0 || idade > 120) return null
  return idade
}

// ─── Main ────────────────────────────────────────────────────────────────

type SpcRow = {
  cpf: string | null
  raw_response: unknown
}

async function main() {
  const env = process.env
  const dryRun = process.argv.includes('--dry-run')
  const limitArg = process.argv.find((a) => a.startsWith('--limit='))
  const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : Infinity

  const SECRET = env.CPF_HASH_SECRET
  if (!SECRET) throw new Error('CPF_HASH_SECRET ausente no .env.local')

  const PESQUISA_URL = env.NEXT_PUBLIC_SUPABASE_URL
  const PESQUISA_KEY = env.SUPABASE_SERVICE_ROLE_KEY
  if (!PESQUISA_URL || !PESQUISA_KEY) {
    throw new Error('Supabase da pesquisa ausente no .env.local')
  }

  const MELHORES_URL = env.MELHORES_SUPABASE_URL
  const MELHORES_KEY = env.MELHORES_SUPABASE_SERVICE_ROLE_KEY
  if (!MELHORES_URL || !MELHORES_KEY) {
    throw new Error(
      'Defina MELHORES_SUPABASE_URL e MELHORES_SUPABASE_SERVICE_ROLE_KEY no .env.local',
    )
  }

  const melhores = createClient(MELHORES_URL, MELHORES_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const pesquisa = createClient(PESQUISA_URL, PESQUISA_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log(
    `🔍 Lendo cache SPC do Melhores do Ano${dryRun ? ' (DRY RUN)' : ''}…`,
  )

  // SQL no MdA: JOIN votantes ↔ spc_cache via cpf_hash do MdA (mesmo
  // secret nos dois). Retorna CPF em claro (de votantes) + payload SPC.
  // Batch de 200 — IN(cpf_hash) com hashes hex de 64 chars estoura URL
  // do PostgREST acima de ~300 elementos.
  const PAGE = 200
  let offset = 0
  const stats = {
    lidos: 0,
    com_sexo: 0,
    com_faixa: 0,
    atualizados: 0,
    sem_match_cdl: 0,
    pulados_cpf_invalido: 0,
    erros: 0,
  }

  while (offset < LIMIT) {
    const take = Math.min(PAGE, LIMIT - offset)

    // RPC seria mais elegante mas evita criar funções server-side só
    // pra script one-shot. Buscamos em duas queries: 1) cpfs validados,
    // 2) raw_response correspondente. Junta no JS.
    const { data: votantes, error: e1 } = await melhores
      .from('votantes')
      .select('cpf, cpf_hash')
      .eq('spc_validado', true)
      .order('criado_em', { ascending: true })
      .range(offset, offset + take - 1)
      .returns<{ cpf: string | null; cpf_hash: string }[]>()

    if (e1) {
      console.error(`❌ Erro lendo votantes offset ${offset}:`, e1)
      stats.erros++
      break
    }
    if (!votantes || votantes.length === 0) break

    const hashes = votantes.map((v) => v.cpf_hash)
    const { data: cache, error: e2 } = await melhores
      .from('spc_cache')
      .select('cpf_hash, raw_response')
      .in('cpf_hash', hashes)
      .returns<{ cpf_hash: string; raw_response: unknown }[]>()

    if (e2) {
      console.error(`❌ Erro lendo spc_cache:`, e2)
      stats.erros++
      offset += take
      continue
    }
    const cachePorHash = new Map<string, unknown>(
      (cache ?? []).map((r) => [r.cpf_hash, r.raw_response]),
    )

    type LinhaUpsert = {
      cpf_hash: string
      sexo?: 'M' | 'F'
      faixa_etaria?: string
    }
    const upserts: LinhaUpsert[] = []

    for (const v of votantes) {
      stats.lidos++
      if (!v.cpf) continue
      const cpfLimpo = onlyDigits(v.cpf)
      if (!cpfValido(cpfLimpo)) {
        stats.pulados_cpf_invalido++
        continue
      }

      const raw = cachePorHash.get(v.cpf_hash) as
        | {
            result?: {
              return_object?: {
                resultado?: {
                  consumidor?: {
                    consumidorPessoaFisica?: {
                      sexo?: string
                      dataNascimento?: number
                    }
                  }
                }
              }
            }
          }
        | undefined

      const pf =
        raw?.result?.return_object?.resultado?.consumidor
          ?.consumidorPessoaFisica
      const sexoRaw = pf?.sexo
      const dataNascMs = pf?.dataNascimento ?? null

      const linha: LinhaUpsert = {
        cpf_hash: hashCpf(cpfLimpo, SECRET),
      }
      if (sexoRaw === 'MASCULINO') {
        linha.sexo = 'M'
        stats.com_sexo++
      } else if (sexoRaw === 'FEMININO') {
        linha.sexo = 'F'
        stats.com_sexo++
      }

      const idade = calcularIdade(dataNascMs)
      const faixa = idade !== null ? idadeParaFaixa(idade) : null
      if (faixa) {
        linha.faixa_etaria = faixa
        stats.com_faixa++
      }

      // Só vale a pena upsert se trouxer algo útil.
      if (linha.sexo || linha.faixa_etaria) {
        upserts.push(linha)
      }
    }

    if (upserts.length > 0 && !dryRun) {
      // UPSERT em chunks de 500 pro Postgres não rejeitar payload gigante.
      const CHUNK = 500
      for (let i = 0; i < upserts.length; i += CHUNK) {
        const chunk = upserts.slice(i, i + CHUNK)
        // ATENÇÃO: NÃO usar ignoreDuplicates — queremos sobrescrever campos
        // quando o cdl_base já tem a linha mas sem sexo/faixa. PostgREST
        // upsert default faz INSERT...ON CONFLICT DO UPDATE — exatamente
        // o que queremos. Os campos não enviados ficam intocados.
        const { error: errUp } = await pesquisa
          .from('cdl_base')
          .upsert(chunk, { onConflict: 'cpf_hash' })
        if (errUp) {
          console.error(`❌ Erro upsert lote:`, errUp)
          stats.erros++
        } else {
          stats.atualizados += chunk.length
        }
      }
    } else if (dryRun) {
      stats.atualizados += upserts.length
    }

    process.stdout.write(
      `📦 ${stats.lidos} lidos | ${stats.com_sexo} c/sexo | ${stats.com_faixa} c/faixa | ${stats.atualizados} ${
        dryRun ? 'seriam atualizados' : 'atualizados'
      }\r`,
    )

    offset += take
    if (votantes.length < take) break
  }

  console.log('\n')
  console.log(`✅ Concluído${dryRun ? ' (DRY RUN — nada foi escrito)' : ''}.`)
  console.log('   ────────────────────────────────────────')
  console.log(`   Lidos:                  ${stats.lidos}`)
  console.log(`   Com sexo no SPC:        ${stats.com_sexo}`)
  console.log(`   Com data nascimento:    ${stats.com_faixa}`)
  console.log(`   Atualizados cdl_base:   ${stats.atualizados}`)
  console.log(`   Pulados (CPF inválido): ${stats.pulados_cpf_invalido}`)
  console.log(`   Erros:                  ${stats.erros}`)
  console.log('')

  if (!dryRun) {
    const { count: cobertura } = await pesquisa
      .from('cdl_base')
      .select('cpf_hash', { count: 'exact', head: true })
      .not('sexo', 'is', null)
    console.log(`📊 cdl_base agora tem ${cobertura ?? 0} CPFs com sexo.\n`)
  }
}

main().catch((err) => {
  console.error('💥 Falha fatal:', err)
  process.exit(1)
})
