#!/usr/bin/env tsx
/**
 * Importa CPFs da tabela `votantes` do projeto Melhores do Ano pra
 * tabela `cdl_base` desta pesquisa.
 *
 * Como funciona:
 *   1. Conecta no Supabase do Melhores do Ano (read-only) usando
 *      MELHORES_SUPABASE_URL + MELHORES_SUPABASE_SERVICE_ROLE_KEY.
 *   2. Conecta no Supabase desta pesquisa (read-write) usando o
 *      .env.local local.
 *   3. Pagina sobre `votantes` em batches de 1000.
 *   4. Pra cada votante: lê CPF em texto, hasheia com NOSSO
 *      CPF_HASH_SECRET, mascara o nome, normaliza WhatsApp pra E.164.
 *   5. Insere em `cdl_base` com ON CONFLICT DO UPDATE — re-rodar atualiza
 *      campos sem duplicar.
 *
* Filtros aplicados:
 *   - SPC validado no Melhores (so esses ganham passe livre na cdl_base —
 *     CPFs sem SPC vao consultar SPC no fluxo da pesquisa, como deve ser).
 *   - CPF com checksum válido.
 *   - Nome com pelo menos 2 caracteres.
 *
 * Pra rodar:
 *   1. Adicione no .env.local:
 *        MELHORES_SUPABASE_URL=https://___.supabase.co
 *        MELHORES_SUPABASE_SERVICE_ROLE_KEY=<service_role do Melhores>
 *   2. npm run import:cdl
 *
 * Idempotente — pode rodar de novo. Atualiza linhas já existentes.
 *
 * IMPORTANTE: este script usa SERVICE ROLE keys de DOIS bancos. Rode
 * apenas em ambiente local controlado (sua máquina), nunca em servidor
 * compartilhado. As keys ficam em memoria so durante a execucao.
 */
import { config as dotenvConfig } from 'dotenv'
import { createHmac } from 'node:crypto'
import path from 'node:path'

import { createClient } from '@supabase/supabase-js'

// Carrega .env.local (o padrao do dotenv eh apenas .env). Em scripts
// fora do Next, precisamos apontar explicitamente.
dotenvConfig({ path: path.resolve(process.cwd(), '.env.local') })

// ─── Helpers (replicados do app pra evitar dependencias circulares) ────────

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

const mascararNome = (nomeCompleto: string): string => {
  const partes = nomeCompleto.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '***'
  if (partes.length === 1) return partes[0]!
  const primeiro = partes[0]
  const segundo = partes[1]?.[0]?.toUpperCase()
  return segundo ? `${primeiro} ${segundo}. ***` : `${primeiro} ***`
}

const normalizarWhatsapp = (raw: string | null): string | null => {
  if (!raw) return null
  const digits = onlyDigits(raw)
  if (digits.length === 11) return `+55${digits}`
  if (digits.length === 13 && digits.startsWith('55')) return `+${digits}`
  if (digits.length === 12 && digits.startsWith('55')) return `+${digits}`
  return null
}

// ─── Tipos da tabela votantes (lado Melhores) ──────────────────────────────

type VotanteRow = {
  cpf: string | null
  nome: string | null
  whatsapp: string | null
  whatsapp_validado: boolean | null
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const env = process.env

  const SECRET = env.CPF_HASH_SECRET
  if (!SECRET) throw new Error('CPF_HASH_SECRET ausente no .env.local')

  const PESQUISA_URL = env.NEXT_PUBLIC_SUPABASE_URL
  const PESQUISA_KEY = env.SUPABASE_SERVICE_ROLE_KEY
  if (!PESQUISA_URL || !PESQUISA_KEY)
    throw new Error('Supabase da pesquisa ausente no .env.local')

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

  console.log('🔍 Contando votantes em Melhores do Ano…')
  const { count: totalMelhores, error: countErr } = await melhores
    .from('votantes')
    .select('id', { count: 'exact', head: true })
    .eq('spc_validado', true)
  if (countErr) {
    console.error('Erro contando votantes:', countErr)
    process.exit(1)
  }
  console.log(`   ${totalMelhores ?? 0} votantes com SPC validado.`)

  const PAGE = 1000
  const stats = {
    total: totalMelhores ?? 0,
    lidos: 0,
    importados: 0,
    pulados_cpf_invalido: 0,
    pulados_nome_curto: 0,
    duplicados_internos: 0,
    erros: 0,
  }

  const cpfHashesProcessados = new Set<string>()

  for (let offset = 0; offset < (totalMelhores ?? 0); offset += PAGE) {
    const { data: votantes, error: errPage } = await melhores
      .from('votantes')
      .select('cpf, nome, whatsapp, whatsapp_validado')
      .eq('spc_validado', true)
      .order('criado_em', { ascending: true })
      .range(offset, offset + PAGE - 1)
      .returns<VotanteRow[]>()

    if (errPage) {
      console.error(`❌ Erro lendo offset ${offset}:`, errPage)
      stats.erros++
      continue
    }
    if (!votantes || votantes.length === 0) break
    stats.lidos += votantes.length

    type LinhaCdl = {
      cpf_hash: string
      whatsapp_e164: string | null
      nome_mascarado: string
      origem: string
    }

    const lote: LinhaCdl[] = []

    for (const v of votantes) {
      const cpf = v.cpf ? onlyDigits(v.cpf) : ''
      if (!cpfValido(cpf)) {
        stats.pulados_cpf_invalido++
        continue
      }
      const nome = (v.nome ?? '').trim()
      if (nome.length < 2) {
        stats.pulados_nome_curto++
        continue
      }

      const cpf_hash = hashCpf(cpf, SECRET)
      if (cpfHashesProcessados.has(cpf_hash)) {
        stats.duplicados_internos++
        continue
      }
      cpfHashesProcessados.add(cpf_hash)

      const whatsapp = v.whatsapp_validado
        ? normalizarWhatsapp(v.whatsapp)
        : null

      lote.push({
        cpf_hash,
        whatsapp_e164: whatsapp,
        nome_mascarado: mascararNome(nome),
        origem: 'melhores_do_ano',
      })
    }

    if (lote.length === 0) continue

    // ignoreDuplicates pra preservar os ~10.5k que ja' tem whatsapp
    // populado de import anterior — nao sobrescrever com null caso o
    // votante mais recente nao tenha whatsapp_validado.
    const { error: errIns } = await pesquisa
      .from('cdl_base')
      .upsert(lote, { onConflict: 'cpf_hash', ignoreDuplicates: true })

    if (errIns) {
      console.error(`❌ Erro inserindo lote em cdl_base:`, errIns)
      stats.erros++
      continue
    }

    stats.importados += lote.length
    process.stdout.write(
      `📦 Lido ${stats.lidos}/${stats.total} | importados ${stats.importados}\r`,
    )
  }

  console.log('\n')
  console.log('✅ Concluído.')
  console.log('   ────────────────────────────────────────')
  console.log(`   Total Melhores (validados): ${stats.total}`)
  console.log(`   Lidos:                      ${stats.lidos}`)
  console.log(`   Importados em cdl_base:     ${stats.importados}`)
  console.log(`   Pulados (CPF inválido):     ${stats.pulados_cpf_invalido}`)
  console.log(`   Pulados (nome curto):       ${stats.pulados_nome_curto}`)
  console.log(`   Duplicados no batch:        ${stats.duplicados_internos}`)
  console.log(`   Erros:                      ${stats.erros}`)
  console.log('')

  // Conferencia final
  const { count: totalCdl } = await pesquisa
    .from('cdl_base')
    .select('cpf_hash', { count: 'exact', head: true })
  console.log(`📊 cdl_base agora tem ${totalCdl ?? 0} CPFs únicos.\n`)
}

main().catch((err) => {
  console.error('💥 Falha fatal:', err)
  process.exit(1)
})
