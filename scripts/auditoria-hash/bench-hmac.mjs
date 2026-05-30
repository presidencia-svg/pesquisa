#!/usr/bin/env node
/**
 * Mede a taxa REAL de HMAC-SHA256 do hardware atual (Node usa OpenSSL).
 *
 * O número que importa é "quantos CPFs/segundo eu consigo testar contra
 * 1 hash alvo se o pepper vazou". Multiplicar pelo total de CPFs válidos
 * (~10^9 com checksum) dá o tempo de quebra.
 *
 * Não otimizo o loop com workers ou SIMD — assumimos atacante usaria
 * hashcat/john com 10-100x speedup em CPU + 1000-10000x em GPU.
 */
import { createHmac } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envText = readFileSync(join(__dirname, '..', '..', '.env.local'), 'utf8')
const PEPPER = envText.match(/^CPF_HASH_SECRET=(.+)$/m)[1].trim()

// Lê 1 hash alvo da amostra
const ALVOS = readFileSync(
  join(__dirname, 'out', 'amostra-hashes.txt'),
  'utf8',
).trim().split('\n')
const HASH_ALVO = ALVOS[0]

// Lê wordlist
const WORDLIST = readFileSync(
  join(__dirname, 'out', 'wordlist-cpfs-validos.txt'),
  'utf8',
).trim().split('\n')

console.log(`Pepper:        ${PEPPER.length} hex chars (${PEPPER.length * 4} bits)`)
console.log(`Hash alvo:     ${HASH_ALVO.slice(0, 16)}...`)
console.log(`Wordlist:      ${WORDLIST.length} CPFs`)
console.log(`Cenário:       atacante COM pepper vazado (worst case)`)
console.log()

const ITER_BENCH = 1_000_000
const inicio = performance.now()
let achou = null

// Bench: roda HMAC-SHA256(pepper, cpf) pra cada palavra ate match ou fim do limite
const limite = Math.min(ITER_BENCH, WORDLIST.length)
for (let i = 0; i < limite; i++) {
  const h = createHmac('sha256', PEPPER).update(WORDLIST[i]).digest('hex')
  if (h === HASH_ALVO) {
    achou = WORDLIST[i]
    break
  }
}
const dur = (performance.now() - inicio) / 1000
const hashesPorSeg = limite / dur

console.log(`Tentativas:    ${limite.toLocaleString('pt-BR')}`)
console.log(`Duração:       ${dur.toFixed(2)}s`)
console.log(`Taxa (CPU):    ${Math.round(hashesPorSeg).toLocaleString('pt-BR')} h/s`)
console.log(`CPF achado:    ${achou ?? 'não encontrado no limite'}`)
console.log()

// Extrapola tempo pra base completa de CPFs válidos
const CPF_VALIDOS_TOTAL = 1e9 // 10^11 raw - filtros checksum/repetidos ≈ 10^9
const segPorHashCpu = CPF_VALIDOS_TOTAL / hashesPorSeg

console.log('=== Extrapolação: tempo pra reverter 1 cpf_hash ===')
console.log(`Universo:      ~10^9 CPFs válidos (após checksum)`)
console.log()
console.log(`CPU (essa máquina, single-thread Node):`)
console.log(`  ${formatarTempo(segPorHashCpu)} por hash`)
console.log()

// Hashcat costuma dar 30-100x speedup em CPU multi-thread vs Node single-thread
const FATOR_HASHCAT_CPU = 80
const segHashcatCpu = segPorHashCpu / FATOR_HASHCAT_CPU
console.log(`Hashcat CPU multi-thread (estimativa ~80x):`)
console.log(`  ${formatarTempo(segHashcatCpu)} por hash`)
console.log()

// Benchmarks públicos hashcat — RTX 4090 ≈ 70 Ghashes/s SHA-256
// Pra HMAC-SHA256 o número é metade (2 SHA-256 por HMAC) ≈ 35 Ghashes/s
const TAXA_GPU_4090 = 35e9
const segGpu = CPF_VALIDOS_TOTAL / TAXA_GPU_4090
console.log(`Hashcat GPU RTX 4090 (~35 Gh/s HMAC-SHA256):`)
console.log(`  ${formatarTempo(segGpu)} por hash`)
console.log()
console.log(`44.554 hashes do cdl_base completo: ${formatarTempo(segGpu * 44554)}`)
console.log()

function formatarTempo(s) {
  if (s < 1) return `${(s * 1000).toFixed(1)}ms`
  if (s < 60) return `${s.toFixed(1)}s`
  if (s < 3600) return `${(s / 60).toFixed(1)}min`
  if (s < 86400) return `${(s / 3600).toFixed(1)}h`
  if (s < 86400 * 365) return `${(s / 86400).toFixed(1)} dias`
  return `${(s / (86400 * 365)).toFixed(1)} anos`
}
