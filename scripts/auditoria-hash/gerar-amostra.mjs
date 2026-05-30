#!/usr/bin/env node
/**
 * Gera amostra controlada pra auditoria de hash do cpf_hash.
 *
 * Saídas:
 *   amostra-cpfs-alvo.txt      - 10 CPFs aleatórios válidos (em claro)
 *   amostra-hashes.txt          - hashes correspondentes (com pepper REAL)
 *   wordlist-cpfs-validos.txt   - wordlist de N CPFs válidos com checksum,
 *                                 INCLUI os 10 alvos misturados
 *
 * NUNCA usar com CPF de pessoas reais. Esses são CPFs gerados sinteticamente,
 * com checksum válido mas sem ligação com pessoa real.
 */
import { createHmac, randomInt } from 'node:crypto'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, 'out')
mkdirSync(OUT_DIR, { recursive: true })

// --- ler pepper do .env.local sem importar dotenv ---
const envText = readFileSync(join(__dirname, '..', '..', '.env.local'), 'utf8')
const peppMatch = envText.match(/^CPF_HASH_SECRET=(.+)$/m)
if (!peppMatch) throw new Error('CPF_HASH_SECRET não encontrado em .env.local')
const PEPPER = peppMatch[1].trim()

// --- checksum CPF ---
const calcDigit = (digits, factor) => {
  let sum = 0
  for (let i = 0; i < digits.length; i++) sum += +digits[i] * (factor - i)
  const r = (sum * 10) % 11
  return (r === 10 ? 0 : r).toString()
}

const cpfValido = (cpf) => {
  if (!/^\d{11}$/.test(cpf)) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false
  const base = cpf.slice(0, 9)
  const d1 = calcDigit(base, 10)
  const d2 = calcDigit(base + d1, 11)
  return cpf[9] === d1 && cpf[10] === d2
}

const gerarCpfAleatorio = () => {
  const base = Array.from({ length: 9 }, () => randomInt(10)).join('')
  const d1 = calcDigit(base, 10)
  const d2 = calcDigit(base + d1, 11)
  return base + d1 + d2
}

const hashCpf = (cpf) =>
  createHmac('sha256', PEPPER).update(cpf).digest('hex')

// --- amostra alvo: 10 CPFs cujo hash vamos tentar quebrar ---
const N_ALVOS = 10
const alvos = new Set()
while (alvos.size < N_ALVOS) alvos.add(gerarCpfAleatorio())
const alvosArr = [...alvos]

writeFileSync(
  join(OUT_DIR, 'amostra-cpfs-alvo.txt'),
  alvosArr.join('\n') + '\n',
)
writeFileSync(
  join(OUT_DIR, 'amostra-hashes.txt'),
  alvosArr.map(hashCpf).join('\n') + '\n',
)

// --- wordlist: N CPFs aleatórios válidos misturados com os alvos ---
//    Demo: 100k CPFs (~3 MB). Suficiente pra mostrar o conceito.
//    Auditoria de verdade precisaria gerar 10^9 (~30 GB).
const N_WORDLIST = 100_000
const wordlist = new Set(alvosArr)
while (wordlist.size < N_WORDLIST) wordlist.add(gerarCpfAleatorio())

// Embaralha pra os alvos não ficarem em posição previsível
const shuffled = [...wordlist].sort(() => Math.random() - 0.5)
writeFileSync(
  join(OUT_DIR, 'wordlist-cpfs-validos.txt'),
  shuffled.join('\n') + '\n',
)

// --- sanidade ---
console.log('Amostra gerada em', OUT_DIR)
console.log(`  alvos: ${alvosArr.length}`)
console.log(`  wordlist: ${shuffled.length}`)
console.log(`  pepper presente: ${PEPPER.length} hex chars (${PEPPER.length * 4} bits)`)
console.log()
console.log('Primeiro alvo (sanity check):')
console.log(`  cpf:  ${alvosArr[0]}`)
console.log(`  hash: ${hashCpf(alvosArr[0])}`)
console.log()
console.log('IMPORTANTE: estes CPFs são SINTÉTICOS (passa checksum, mas')
console.log('nenhuma pessoa real). Usar só pra benchmark.')
