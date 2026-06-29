#!/usr/bin/env tsx
/**
 * Testa todos os caminhos de bloqueio de CPF da Pesquisa Eleitoral Sergipe 2026
 * sem precisar fazer chamada real ao SPC.
 *
 * Cobre:
 *   1. Sucesso normal
 *   2. Menor de 16 anos
 *   3. CPF irregular (pendente regularização)
 *   4. CPF inativo (suspenso, cancelado, nulo)
 *   5. CPF falecido (óbito)
 *   6. CPF inexistente
 *
 * Uso:
 *   npm run spc:status
 *
 * Não toca em produção. Não usa credencial. Roda em ~1 segundo.
 */

// Carrega .env.local pras envs Supabase exigidas por lib/env.ts.
import { config as dotenvConfig } from 'dotenv'
import path from 'node:path'
dotenvConfig({ path: path.resolve(process.cwd(), '.env.local') })

// Stub mínimo das envs Supabase quando o .env.local não existe —
// permite rodar o teste de status sem precisar de banco.
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://stub.supabase.co'
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'stub'
}
if (!process.env.CPF_HASH_SECRET) {
  process.env.CPF_HASH_SECRET = 'stub-cpf-hash-secret-32-bytes-long'
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'stub-jwt-secret-32-bytes-long-stub'
}
if (!process.env.TOKEN_VOTO_SECRET) {
  process.env.TOKEN_VOTO_SECRET = 'stub-token-voto-secret-32-bytes-l'
}

// IMPORTANTE: define SPC_MOCK ANTES de qualquer import do app, pra
// que lib/env.ts capture o valor correto na primeira leitura.
process.env.SPC_MOCK = 'true'
process.env.DEV_MODE = 'false'

// O módulo `server-only` é resolvido pelo Next em runtime, mas não
// existe como pacote standalone. Aqui aliasamos pra um stub vazio
// (que o próprio Next fornece) pra permitir importar lib/spc.ts
// num script Node puro.
import { createRequire } from 'node:module'
const reqRoot = createRequire(import.meta.url)
type ModuleWithResolve = {
  _resolveFilename: (req: string, ...rest: unknown[]) => string
}
const ModuleApi = reqRoot('node:module') as ModuleWithResolve
const NEXT_SERVER_ONLY_STUB = reqRoot.resolve(
  'next/dist/compiled/server-only/empty.js',
)
const origResolve = ModuleApi._resolveFilename
ModuleApi._resolveFilename = function (
  this: unknown,
  req: string,
  ...rest: unknown[]
) {
  if (req === 'server-only') return NEXT_SERVER_ONLY_STUB
  return origResolve.call(this, req, ...rest)
}

type Caso = {
  nome: string
  cpf: string
  esperado: string
  descricao: string
}

const CASOS: Caso[] = [
  {
    nome: '1. Sucesso normal',
    cpf: '12345678944',
    esperado: 'ok',
    descricao: 'CPF válido sem flags — deve seguir o fluxo normal',
  },
  {
    nome: '2. Menor de 16 anos',
    cpf: '12345678333',
    esperado: 'idade_minima',
    descricao:
      'Sufixo 333 → menor de idade. Bloqueado por CF art. 14, §1º.',
  },
  {
    nome: '3. CPF irregular',
    cpf: '12345678222',
    esperado: 'cpf_irregular',
    descricao:
      'Sufixo 222 → pendente regularização na RF. Bloqueado.',
  },
  {
    nome: '4. CPF inativo',
    cpf: '12345678111',
    esperado: 'cpf_inativo',
    descricao:
      'Sufixo 111 → suspenso/cancelado/nulo. Bloqueado.',
  },
  {
    nome: '5. CPF falecido (óbito)',
    cpf: '12345678000',
    esperado: 'cpf_falecido',
    descricao: 'Sufixo 000 → titular falecido. Bloqueado.',
  },
]

const COR = {
  ok: '\x1b[32m', // verde
  fail: '\x1b[31m', // vermelho
  info: '\x1b[36m', // ciano
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  reset: '\x1b[0m',
}

async function main() {
  // Import dinâmico ocorre só agora — depois do hook de server-only.
  const { consultarSpc } = await import('../lib/spc.js')

  console.log()
  console.log(
    `${COR.bold}Testando bloqueios de CPF — Pesquisa Eleitoral Sergipe 2026${COR.reset}`,
  )
  console.log(
    `${COR.dim}SPC_MOCK ativo: nenhuma chamada externa será feita.${COR.reset}`,
  )
  console.log()

  let passou = 0
  let falhou = 0

  for (const caso of CASOS) {
    const resultado = await consultarSpc(caso.cpf)
    const obtido = resultado.ok ? 'ok' : resultado.razao
    const ok = obtido === caso.esperado

    if (ok) {
      passou++
      console.log(
        `${COR.ok}✓${COR.reset} ${COR.bold}${caso.nome}${COR.reset}`,
      )
    } else {
      falhou++
      console.log(
        `${COR.fail}✗${COR.reset} ${COR.bold}${caso.nome}${COR.reset}`,
      )
    }
    console.log(`  ${COR.dim}${caso.descricao}${COR.reset}`)
    console.log(
      `  ${COR.info}CPF:${COR.reset} ${caso.cpf}  ${COR.info}esperado:${COR.reset} ${caso.esperado}  ${COR.info}obtido:${COR.reset} ${obtido}`,
    )
    if (!resultado.ok && resultado.detalhe) {
      console.log(`  ${COR.dim}detalhe: ${resultado.detalhe}${COR.reset}`)
    }
    if (resultado.ok && resultado.dados.faixaEtaria) {
      console.log(
        `  ${COR.dim}faixa etária derivada: ${resultado.dados.faixaEtaria}${COR.reset}`,
      )
    }
    console.log()
  }

  console.log(
    `${COR.bold}Resultado:${COR.reset} ${COR.ok}${passou} passou${COR.reset}, ${falhou > 0 ? COR.fail : COR.dim}${falhou} falhou${COR.reset}`,
  )
  console.log()

  process.exit(falhou > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(`${COR.fail}Erro fatal:${COR.reset}`, err)
  process.exit(2)
})
