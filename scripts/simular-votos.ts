#!/usr/bin/env tsx
/**
 * Gera votos sinteticos pra testar a projecao de cadeiras (Fed/Est).
 *
 * Distribuicao weighted pela coluna `votos_referencia` (eleicao 2022 real)
 * — assim a simulacao reflete a realidade eleitoral em vez de ser
 * uniforme. Candidato que tirou 100k em 2022 tem peso ~3x maior que
 * um que tirou 30k.
 *
 * Pra cada "eleitor sintetico":
 *   - Cria token aleatorio em tokens_emitidos (usado=true)
 *   - Vota em Pres, Gov, Sen (2 candidatos), Fed, Est
 *   - Fed/Est: 80% das vezes digita numero completo (resolve candidato_id),
 *              20% digita so' legenda (candidato_id=null)
 *   - 5% de chance de votar branco em cada cargo
 *   - 5% de chance de "nao sabe"
 *
 * Uso:
 *   npm run simular -- 500     # 500 eleitores sinteticos
 *   npm run simular -- 5000    # 5k pra ver projecao com volume realista
 *
 * Pra LIMPAR a simulacao depois:
 *   delete from votos_pesquisa
 *    where token_hash in (
 *      select token_hash from tokens_emitidos
 *       where criado_hora >= 'YYYY-MM-DD HH:00:00+00'
 *    );
 *   delete from tokens_emitidos
 *    where criado_hora >= 'YYYY-MM-DD HH:00:00+00';
 *
 * Por padrao escreve na edicao ATIVA — confere antes de rodar em producao.
 */
import { config as dotenvConfig } from 'dotenv'
import path from 'node:path'
import { randomBytes, createHmac } from 'node:crypto'

import { createClient } from '@supabase/supabase-js'

dotenvConfig({ path: path.resolve(process.cwd(), '.env.local') })

type Candidato = {
  id: string
  cargo: string
  numero: number
  partido_id: string
  votos_referencia: number | null
}

type Partido = {
  id: string
  numero: number
}

type Municipio = {
  ibge_codigo: number
  nome: string
  eleitorado: number | null
}

const N = Number(process.argv[2] ?? '500')
if (!Number.isFinite(N) || N < 1) {
  console.error('Uso: npm run simular -- <N>   (ex: 500)')
  process.exit(1)
}

const env = process.env
const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
const tokenSecret = env.TOKEN_VOTO_SECRET
if (!url || !key || !tokenSecret) {
  console.error('Faltam variaveis no .env.local')
  process.exit(1)
}

const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function hashTokenVoto(token: string): string {
  return createHmac('sha256', tokenSecret as string).update(token).digest('hex')
}

function gerarToken(): { claro: string; hash: string } {
  const claro = randomBytes(24).toString('base64url')
  return { claro, hash: hashTokenVoto(claro) }
}

/** Sorteia 1 elemento com peso. weights[i] >= 1 (forca minima). */
function sortearPonderado<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}

/**
 * Demograficos sinteticos com distribuicao aproximada do eleitorado
 * de Sergipe (IBGE 2022, TSE 2024). Usado em eleitores_pesquisa E
 * copiado pra votos_pesquisa pra os cruzamentos demograficos × voto
 * funcionarem na pagina /admin/resultados/cruzamentos.
 */
type Demograficos = {
  sexo: 'M' | 'F'
  faixa_etaria: '16-17' | '18-24' | '25-34' | '35-44' | '45-59' | '60+'
  escolaridade: 'fundamental' | 'medio' | 'superior'
  nivel_economico: 'A' | 'B' | 'C' | 'D_E' | 'nao_informado'
}

function gerarDemograficos(): Demograficos {
  // Sexo: TSE 2024 SE — 52,3% F, 47,7% M
  const sexo: 'M' | 'F' = Math.random() < 0.523 ? 'F' : 'M'

  // Faixa etaria: aproximacao TSE 2024 SE (sem 16-17 muito raro)
  const rFaixa = Math.random()
  let faixa_etaria: Demograficos['faixa_etaria']
  if (rFaixa < 0.02) faixa_etaria = '16-17'
  else if (rFaixa < 0.18) faixa_etaria = '18-24'
  else if (rFaixa < 0.42) faixa_etaria = '25-34'
  else if (rFaixa < 0.62) faixa_etaria = '35-44'
  else if (rFaixa < 0.85) faixa_etaria = '45-59'
  else faixa_etaria = '60+'

  // Escolaridade: PNAD 2022 SE — ~40% fundamental, 45% medio, 15% superior
  const rEscol = Math.random()
  let escolaridade: Demograficos['escolaridade']
  if (rEscol < 0.40) escolaridade = 'fundamental'
  else if (rEscol < 0.85) escolaridade = 'medio'
  else escolaridade = 'superior'

  // Nivel economico ABEP (4 classes + opt-out 8%)
  const rNivel = Math.random()
  let nivel_economico: Demograficos['nivel_economico']
  if (rNivel < 0.08) nivel_economico = 'nao_informado'
  else if (rNivel < 0.12) nivel_economico = 'A'
  else if (rNivel < 0.32) nivel_economico = 'B'
  else if (rNivel < 0.68) nivel_economico = 'C'
  else nivel_economico = 'D_E'

  return { sexo, faixa_etaria, escolaridade, nivel_economico }
}

function gerarCpfHashSintetico(): string {
  return randomBytes(32).toString('hex')
}

function gerarWhatsAppSintetico(i: number): string {
  // +55 79 9 XXXX XXXX — DDD 79 (SE), nono digito 9, 8 digitos sequenciais
  const seq = (90000000 + i).toString().padStart(8, '0')
  return `+55799${seq}`
}

function horaCheia(): Date {
  const dt = new Date()
  dt.setMinutes(0, 0, 0)
  return dt
}

async function main() {
  console.log(`🎲 Simulando ${N} eleitores sinteticos…\n`)

  // 1. Edicao ativa
  const { data: edicao } = await db
    .from('edicao')
    .select('id, nome')
    .eq('ativa', true)
    .maybeSingle()
  if (!edicao) throw new Error('Sem edicao ativa.')
  console.log(`   Edicao: ${edicao.nome}`)

  // 2. Candidatos por cargo
  const cargos = ['presidente', 'governador', 'senador', 'federal', 'estadual']
  const candidatosPorCargo: Record<string, Candidato[]> = {}
  for (const cargo of cargos) {
    const { data } = await db
      .from('candidatos_pesquisa')
      .select('id, cargo, numero, partido_id, votos_referencia')
      .eq('edicao_id', edicao.id)
      .eq('cargo', cargo)
      .eq('ativo', true)
    candidatosPorCargo[cargo] = (data ?? []) as Candidato[]
    console.log(`   ${cargo}: ${candidatosPorCargo[cargo].length} candidatos`)
  }

  // 3. Lista de partidos com pelo menos 1 candidato fed ou est
  const partidosUsados = new Set<string>()
  for (const c of [
    ...candidatosPorCargo.federal,
    ...candidatosPorCargo.estadual,
  ]) {
    partidosUsados.add(c.partido_id)
  }
  const { data: partidosDb } = await db
    .from('partidos')
    .select('id, numero')
    .eq('ativo', true)
    .in('id', Array.from(partidosUsados))
  const partidos = (partidosDb ?? []) as Partido[]

  if (Object.values(candidatosPorCargo).some((arr) => arr.length === 0)) {
    console.log(
      '\n⚠️  Algum cargo sem candidatos — votos pra esse cargo serao "branco".',
    )
  }

  // 3.5. Municipios — pra simular distribuicao geografica realista.
  // Cada eleitor sintetico e' atribuido a um municipio sorteado proporcional
  // ao eleitorado. Pra simular vies de adesao (cidade grande responde mais),
  // multiplica o peso de Aracaju por 2 (super-representacao) e de cidades
  // < 10k eleitores por 0.5 (sub-representacao). Aproxima o que vai
  // acontecer na pesquisa real.
  const { data: municipiosDb } = await db
    .from('municipios_se')
    .select('ibge_codigo, nome, eleitorado')
  const municipios = (municipiosDb ?? []) as Municipio[]
  const municipioPesos = municipios.map((m) => {
    const base = m.eleitorado ?? 1
    let mult = 1
    if (m.ibge_codigo === 2800308) mult = 2 // Aracaju super-representada
    else if ((m.eleitorado ?? 0) < 10000) mult = 0.5 // cidades pequenas sub
    return Math.max(base * mult, 1)
  })
  console.log(`   municipios: ${municipios.length}\n`)

  // 4. Loop principal
  const tokensInsert: Array<{
    token_hash: string
    edicao_id: string
    usado: boolean
    criado_hora: string
  }> = []
  const votosInsert: Array<{
    token_hash: string
    edicao_id: string
    cargo: string
    candidato_id: string | null
    partido_id: string | null
    resposta: string | null
    metodo: string
    municipio_ibge: number
    criado_hora: string
    sexo: 'M' | 'F'
    faixa_etaria: string
    escolaridade: string
    nivel_economico: string
  }> = []
  const eleitoresInsert: Array<{
    edicao_id: string
    cpf_hash: string
    cpf_mascarado: string
    nome_mascarado: string
    municipio_ibge: number
    sexo: 'M' | 'F'
    faixa_etaria: string
    escolaridade: string
    nivel_economico: string
    whatsapp_e164: string
    spc_validado: boolean
    wa_validado: boolean
    fonte: string
    opt_in_resultados_wa: boolean
  }> = []

  const horaIso = horaCheia().toISOString()

  for (let i = 0; i < N; i++) {
    const { hash } = gerarToken()
    tokensInsert.push({
      token_hash: hash,
      edicao_id: edicao.id,
      usado: true,
      criado_hora: horaIso,
    })

    // Atribui um municipio ao eleitor sintetico (proporcional ao
    // eleitorado, com vies de Aracaju).
    const municipio = sortearPonderado(municipios, municipioPesos)
    const municipioIbge = municipio.ibge_codigo

    // Gera demograficos sinteticos pra ESTE eleitor — sao copiados pra
    // todos os votos dele (mesma pessoa, mesmo perfil) + viram linha
    // em eleitores_pesquisa pra ficha de amostra ficar realista.
    const demo = gerarDemograficos()
    eleitoresInsert.push({
      edicao_id: edicao.id,
      cpf_hash: gerarCpfHashSintetico(),
      cpf_mascarado: '***.***.***-**',
      nome_mascarado: 'Eleitor sintetico',
      municipio_ibge: municipioIbge,
      sexo: demo.sexo,
      faixa_etaria: demo.faixa_etaria,
      escolaridade: demo.escolaridade,
      nivel_economico: demo.nivel_economico,
      whatsapp_e164: gerarWhatsAppSintetico(i),
      spc_validado: true,
      wa_validado: true,
      fonte: 'manual',
      opt_in_resultados_wa: false,
    })

    // Cargos candidato (pres/gov/sen)
    for (const cargo of ['presidente', 'governador', 'senador'] as const) {
      const cands = candidatosPorCargo[cargo]
      const slots = cargo === 'senador' ? 2 : 1
      for (let slot = 0; slot < slots; slot++) {
        const r = Math.random()
        if (r < 0.05) {
          // 5% branco
          votosInsert.push({
            token_hash: hash,
            edicao_id: edicao.id,
            cargo,
            candidato_id: null,
            partido_id: null,
            resposta: null,
            metodo: 'branco',
            municipio_ibge: municipioIbge,
            sexo: demo.sexo,
            faixa_etaria: demo.faixa_etaria,
            escolaridade: demo.escolaridade,
            nivel_economico: demo.nivel_economico,
            criado_hora: horaIso,
          })
        } else if (r < 0.10) {
          // 5% nao sabe
          votosInsert.push({
            token_hash: hash,
            edicao_id: edicao.id,
            cargo,
            candidato_id: null,
            partido_id: null,
            resposta: null,
            metodo: 'nao_sabe',
            municipio_ibge: municipioIbge,
            sexo: demo.sexo,
            faixa_etaria: demo.faixa_etaria,
            escolaridade: demo.escolaridade,
            nivel_economico: demo.nivel_economico,
            criado_hora: horaIso,
          })
        } else if (cands.length > 0) {
          // Voto valido — escolhe candidato weighted
          // Pra senador 2o slot, evita repetir o 1o (a UI ja' bloqueia,
          // mas a simulacao tambem)
          const candidatos =
            cargo === 'senador' && slot === 1
              ? cands.filter(
                  (c) =>
                    !votosInsert.some(
                      (v) =>
                        v.token_hash === hash &&
                        v.cargo === 'senador' &&
                        v.candidato_id === c.id,
                    ),
                )
              : cands
          if (candidatos.length === 0) continue
          const weights = candidatos.map((c) =>
            Math.max(c.votos_referencia ?? 1, 100),
          )
          const escolhido = sortearPonderado(candidatos, weights)
          votosInsert.push({
            token_hash: hash,
            edicao_id: edicao.id,
            cargo,
            candidato_id: escolhido.id,
            partido_id: null,
            resposta: null,
            metodo: 'numero',
            municipio_ibge: municipioIbge,
            sexo: demo.sexo,
            faixa_etaria: demo.faixa_etaria,
            escolaridade: demo.escolaridade,
            nivel_economico: demo.nivel_economico,
            criado_hora: horaIso,
          })
        }
      }
    }

    // Cargos legenda (fed/est) — dupla contagem
    for (const cargo of ['federal', 'estadual'] as const) {
      const cands = candidatosPorCargo[cargo]
      const r = Math.random()
      if (r < 0.05) {
        votosInsert.push({
          token_hash: hash,
          edicao_id: edicao.id,
          cargo,
          candidato_id: null,
          partido_id: null,
          resposta: null,
          metodo: 'branco',
          municipio_ibge: municipioIbge,
          sexo: demo.sexo,
          faixa_etaria: demo.faixa_etaria,
          escolaridade: demo.escolaridade,
          nivel_economico: demo.nivel_economico,
          criado_hora: horaIso,
        })
      } else if (r < 0.10) {
        votosInsert.push({
          token_hash: hash,
          edicao_id: edicao.id,
          cargo,
          candidato_id: null,
          partido_id: null,
          resposta: null,
          metodo: 'nao_sabe',
          municipio_ibge: municipioIbge,
          sexo: demo.sexo,
          faixa_etaria: demo.faixa_etaria,
          escolaridade: demo.escolaridade,
          nivel_economico: demo.nivel_economico,
          criado_hora: horaIso,
        })
      } else if (cands.length > 0) {
        // 80% das vezes digita numero completo → candidato_id resolvido
        // 20% das vezes digita so' legenda → candidato_id=null
        const digitouCompleto = Math.random() < 0.8

        // Escolhe candidato weighted; o partido sai do candidato
        const weights = cands.map((c) =>
          Math.max(c.votos_referencia ?? 1, 100),
        )
        const escolhido = sortearPonderado(cands, weights)
        votosInsert.push({
          token_hash: hash,
          edicao_id: edicao.id,
          cargo,
          candidato_id: digitouCompleto ? escolhido.id : null,
          partido_id: escolhido.partido_id,
          resposta: null,
          metodo: 'numero',
          municipio_ibge: municipioIbge,
          sexo: demo.sexo,
          faixa_etaria: demo.faixa_etaria,
          escolaridade: demo.escolaridade,
          nivel_economico: demo.nivel_economico,
          criado_hora: horaIso,
        })
      } else if (partidos.length > 0) {
        // Sem candidato cadastrado mas tem partido — voto so' legenda
        const p = partidos[Math.floor(Math.random() * partidos.length)]
        votosInsert.push({
          token_hash: hash,
          edicao_id: edicao.id,
          cargo,
          candidato_id: null,
          partido_id: p.id,
          resposta: null,
          metodo: 'numero',
          municipio_ibge: municipioIbge,
          sexo: demo.sexo,
          faixa_etaria: demo.faixa_etaria,
          escolaridade: demo.escolaridade,
          nivel_economico: demo.nivel_economico,
          criado_hora: horaIso,
        })
      }
    }

    if ((i + 1) % 100 === 0) {
      process.stdout.write(`   ${i + 1}/${N}…\r`)
    }
  }

  console.log('')
  console.log(
    `   Inserindo ${tokensInsert.length} tokens + ${votosInsert.length} votos + ${eleitoresInsert.length} eleitores…`,
  )

  // 5. Insert em batches de 500. Ordem: tokens -> votos -> eleitores.
  // Tokens primeiro porque votos.token_hash referencia tokens. Eleitores
  // sao independentes, nao tem FK com tokens.
  const BATCH = 500
  for (let i = 0; i < tokensInsert.length; i += BATCH) {
    const slice = tokensInsert.slice(i, i + BATCH)
    const { error } = await db.from('tokens_emitidos').insert(slice)
    if (error) {
      console.error('   ❌ erro insert tokens:', error.message)
      process.exit(1)
    }
    process.stdout.write(
      `   tokens: ${Math.min(i + BATCH, tokensInsert.length)}/${tokensInsert.length}\r`,
    )
  }
  console.log('')
  for (let i = 0; i < votosInsert.length; i += BATCH) {
    const slice = votosInsert.slice(i, i + BATCH)
    const { error } = await db.from('votos_pesquisa').insert(slice)
    if (error) {
      console.error('   ❌ erro insert votos:', error.message)
      console.error('      primeiro voto problematico:', slice[0])
      process.exit(1)
    }
    process.stdout.write(
      `   votos: ${Math.min(i + BATCH, votosInsert.length)}/${votosInsert.length}\r`,
    )
  }
  console.log('')
  for (let i = 0; i < eleitoresInsert.length; i += BATCH) {
    const slice = eleitoresInsert.slice(i, i + BATCH)
    const { error } = await db.from('eleitores_pesquisa').insert(slice)
    if (error) {
      console.error('   ❌ erro insert eleitores:', error.message)
      console.error('      primeiro eleitor problematico:', slice[0])
      process.exit(1)
    }
    process.stdout.write(
      `   eleitores: ${Math.min(i + BATCH, eleitoresInsert.length)}/${eleitoresInsert.length}\r`,
    )
  }

  console.log('')
  console.log('')
  console.log('✅ Simulacao concluida.')
  console.log(`   ${tokensInsert.length} eleitores sinteticos`)
  console.log(`   ${votosInsert.length} votos (com demograficos)`)
  console.log(`   ${eleitoresInsert.length} linhas em eleitores_pesquisa`)
  console.log(`   Hora dos votos: ${horaIso}`)
  console.log('')
  console.log('Pra limpar depois:')
  console.log(`   delete from votos_pesquisa where token_hash in (select token_hash from tokens_emitidos where criado_hora = '${horaIso}');`)
  console.log(`   delete from tokens_emitidos where criado_hora = '${horaIso}';`)
  console.log(`   delete from eleitores_pesquisa where edicao_id = '<edicao_ativa>' and nome_mascarado = 'Eleitor sintetico';`)
}

main().catch((err) => {
  console.error('💥', err)
  process.exit(1)
})
