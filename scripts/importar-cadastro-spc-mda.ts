#!/usr/bin/env tsx
/**
 * Carga em lote do cadastro integral do SPC a partir do Melhores do Ano
 * (spc_cache.raw_response) pro cadastro unificado `cdl_base` (migration
 * 051 — bloco SPC + `cadastro_spc_fonte = 'spc_mda'`).
 *
 * Por quê: desde 12/09/2026 o fluxo /votar guarda tudo que o SPC devolve,
 * mas quem entrou pelo cdl_base (passe livre, sem consulta) não gera essa
 * linha. Os ~44k CPFs do MdA já foram consultados lá, com o mesmo produto
 * ("Confirme PF", 11) — este script copia o payload e os campos derivados.
 *
 * Mesmo desenho de importar-sexo-mda.ts: lê votantes (cpf em claro +
 * cpf_hash do MdA), junta com spc_cache pelo hash do MdA, re-hasheia o
 * CPF com o NOSSO CPF_HASH_SECRET e grava aqui. Idempotente. Nunca sobrescreve
 * uma linha cuja consulta foi feita por ESTA pesquisa (cadastro_spc_fonte =
 * 'spc'), que é mais recente que o cache do MdA.
 *
 *   npx tsx scripts/importar-cadastro-spc-mda.ts --dry-run [--limit=N]
 *   npx tsx scripts/importar-cadastro-spc-mda.ts
 */
import { config as dotenvConfig } from 'dotenv'
import { createHmac } from 'node:crypto'
import path from 'node:path'

import { createClient } from '@supabase/supabase-js'

dotenvConfig({ path: path.resolve(process.cwd(), '.env.local') })

const onlyDigits = (s: string): string => s.replace(/\D/g, '')
const cpfValido = (raw: string): boolean => {
  const cpf = onlyDigits(raw)
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false
  const calcDigito = (slice: string, fatorInicial: number): number => {
    let soma = 0
    for (let i = 0; i < slice.length; i++) soma += Number(slice[i]) * (fatorInicial - i)
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

const isoData = (ms: unknown): string | null => {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return null
  const d = new Date(ms)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}
const calcularIdade = (iso: string | null): number | null => {
  if (!iso) return null
  const nasc = new Date(iso + 'T00:00:00Z')
  const hoje = new Date()
  let idade = hoje.getUTCFullYear() - nasc.getUTCFullYear()
  const m = hoje.getUTCMonth() - nasc.getUTCMonth()
  if (m < 0 || (m === 0 && hoje.getUTCDate() < nasc.getUTCDate())) idade--
  return idade < 0 || idade > 120 ? null : idade
}

type Pf = {
  nome?: string
  nomeMae?: string
  dataNascimento?: number
  idade?: number
  sexo?: string
  estadoCivil?: string
  situacaoCpf?: { descricaoSituacao?: string; dataSituacao?: number }
}
type Raw = {
  result?: { return_object?: { resultado?: { consumidor?: { consumidorPessoaFisica?: Pf } } } }
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
  const MELHORES_URL = env.MELHORES_SUPABASE_URL
  const MELHORES_KEY = env.MELHORES_SUPABASE_SERVICE_ROLE_KEY
  if (!PESQUISA_URL || !PESQUISA_KEY || !MELHORES_URL || !MELHORES_KEY) {
    throw new Error('Faltam chaves do Supabase (pesquisa e/ou Melhores do Ano) no .env.local')
  }
  const melhores = createClient(MELHORES_URL, MELHORES_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const pesquisa = createClient(PESQUISA_URL, PESQUISA_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log(`🔍 Copiando cadastro SPC do Melhores do Ano${dryRun ? ' (DRY RUN)' : ''}…`)
  const PAGE = 200
  let offset = 0
  const stats = {
    lidos: 0,
    sem_cache: 0,
    sem_pf: 0,
    cpf_invalido: 0,
    ja_consultado_aqui: 0,
    sem_cdl_base: 0,
    gravados: 0,
    erros: 0,
  }

  while (offset < LIMIT) {
    const take = Math.min(PAGE, LIMIT - offset)
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

    const { data: cache, error: e2 } = await melhores
      .from('spc_cache')
      .select('cpf_hash, raw_response')
      .in('cpf_hash', votantes.map((v) => v.cpf_hash))
      .returns<{ cpf_hash: string; raw_response: unknown }[]>()
    if (e2) {
      console.error('❌ Erro lendo spc_cache:', e2)
      stats.erros++
      offset += take
      continue
    }
    const cachePorHash = new Map((cache ?? []).map((r) => [r.cpf_hash, r.raw_response]))

    const linhas: Record<string, unknown>[] = []
    for (const v of votantes) {
      stats.lidos++
      if (!v.cpf) continue
      const cpf = onlyDigits(v.cpf)
      if (!cpfValido(cpf)) {
        stats.cpf_invalido++
        continue
      }
      const raw = cachePorHash.get(v.cpf_hash) as Raw | undefined
      if (!raw) {
        stats.sem_cache++
        continue
      }
      const pf = raw.result?.return_object?.resultado?.consumidor?.consumidorPessoaFisica
      if (!pf?.nome) {
        stats.sem_pf++
        continue
      }
      const dataNascimento = isoData(pf.dataNascimento)
      linhas.push({
        cpf_hash: hashCpf(cpf, SECRET),
        nome_completo: pf.nome.trim(),
        nome_mae: pf.nomeMae?.trim() || null,
        data_nascimento: dataNascimento,
        idade_consulta:
          typeof pf.idade === 'number' && Number.isFinite(pf.idade)
            ? pf.idade
            : calcularIdade(dataNascimento),
        estado_civil: pf.estadoCivil ?? null,
        cpf_situacao: pf.situacaoCpf?.descricaoSituacao ?? null,
        cpf_situacao_data: isoData(pf.situacaoCpf?.dataSituacao),
        spc_produto: 'confirme_pf_11',
        spc_payload: raw,
        spc_consultado_em: null, // MdA não guarda a data da consulta
        cadastro_spc_fonte: 'spc_mda',
        atualizado_em: new Date().toISOString(),
      })
    }

    if (linhas.length > 0) {
      // Só atualiza linhas existentes e que não tenham consulta própria desta
      // pesquisa. CPF do MdA sem linha em cdl_base = importar-cdl-base.ts
      // não rodou pra ele; conta e pula (não inventa origem).
      const { data: existentes, error: e3 } = await pesquisa
        .from('cdl_base')
        .select('cpf_hash, cadastro_spc_fonte')
        .in('cpf_hash', linhas.map((l) => l.cpf_hash as string))
        .returns<{ cpf_hash: string; cadastro_spc_fonte: string | null }[]>()
      if (e3) {
        console.error('❌ Erro lendo cdl_base:', e3)
        stats.erros++
        offset += take
        continue
      }
      const fontePorHash = new Map((existentes ?? []).map((r) => [r.cpf_hash, r.cadastro_spc_fonte]))
      const gravar = linhas.filter((l) => {
        if (!fontePorHash.has(l.cpf_hash as string)) {
          stats.sem_cdl_base++
          return false
        }
        if (fontePorHash.get(l.cpf_hash as string) === 'spc') {
          stats.ja_consultado_aqui++
          return false
        }
        return true
      })
      if (gravar.length > 0 && !dryRun) {
        // upsert com onConflict na PK = UPDATE das colunas enviadas; as demais
        // (origem, sexo, whatsapp…) ficam como estão.
        const { error: errUp } = await pesquisa
          .from('cdl_base')
          .upsert(gravar, { onConflict: 'cpf_hash' })
        if (errUp) {
          console.error('❌ Erro upsert lote:', errUp)
          stats.erros++
        } else {
          stats.gravados += gravar.length
        }
      } else if (dryRun) {
        stats.gravados += gravar.length
      }
    }
    process.stdout.write(
      `📦 ${stats.lidos} lidos | ${stats.gravados} ${dryRun ? 'seriam gravados' : 'gravados'} | ${stats.sem_cache} sem cache | ${stats.sem_pf} sem PF\r`,
    )
    offset += take
    if (votantes.length < take) break
  }

  console.log('\n')
  console.log(`✅ Concluído${dryRun ? ' (DRY RUN — nada foi escrito)' : ''}.`)
  console.log(`   Lidos:               ${stats.lidos}`)
  console.log(`   Gravados:            ${stats.gravados}`)
  console.log(`   Sem cache no MdA:    ${stats.sem_cache}`)
  console.log(`   Cache sem PF/nome:   ${stats.sem_pf}`)
  console.log(`   CPF inválido:        ${stats.cpf_invalido}`)
  console.log(`   Sem linha em cdl_base: ${stats.sem_cdl_base}`)
  console.log(`   Já consultado aqui:  ${stats.ja_consultado_aqui}`)
  console.log(`   Erros:               ${stats.erros}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
