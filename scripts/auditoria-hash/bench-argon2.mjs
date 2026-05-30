#!/usr/bin/env node
/**
 * Mede latência do argon2id com parâmetros RFC 9106 recomendados.
 *
 * Argon2id é memory-hard: GPU não dá speedup linear porque a memória
 * vira o gargalo. Atacante precisa de muita VRAM, e múltiplos lanes
 * paralelos brigam por bandwidth.
 *
 * Parâmetros testados:
 *   - "interactive" (login real-time): m=64MB, t=3, p=2
 *   - "moderado"   (mais defensivo):   m=128MB, t=4, p=4
 *   - "paranoid"   (cofre offline):    m=256MB, t=5, p=4
 */
import { hash } from '@node-rs/argon2'
import { performance } from 'node:perf_hooks'

const cpf = '44177880140'

const presets = [
  { nome: 'interactive', memoryCost: 64 * 1024,  timeCost: 3, parallelism: 2 },
  { nome: 'moderado',    memoryCost: 128 * 1024, timeCost: 4, parallelism: 4 },
  { nome: 'paranoid',    memoryCost: 256 * 1024, timeCost: 5, parallelism: 4 },
]

console.log('Benchmark argon2id - hardware atual')
console.log('=' .repeat(60))
console.log()

for (const p of presets) {
  // Warmup
  await hash(cpf, p)

  const N = 5
  const inicio = performance.now()
  for (let i = 0; i < N; i++) {
    await hash(cpf, p)
  }
  const dur = (performance.now() - inicio) / 1000
  const segPorHash = dur / N
  const hps = 1 / segPorHash

  console.log(`Preset: ${p.nome.padEnd(12)} m=${p.memoryCost/1024}MB t=${p.timeCost} p=${p.parallelism}`)
  console.log(`  Latência login:  ${(segPorHash * 1000).toFixed(0)}ms`)
  console.log(`  Taxa CPU local:  ${hps.toFixed(1)} h/s`)

  // Extrapolação: hashcat em GPU pra argon2id (modo 13xxx) tem speedup
  // muito limitado por memória. Benchmarks públicos RTX 4090:
  //   - argon2id m=64MB t=3 p=4: ~5 kH/s (5.000 h/s)
  //   - argon2id m=128MB t=4 p=4: ~2 kH/s
  //   - argon2id m=256MB t=5 p=4: ~800 h/s
  const gpuHps = (
    p.memoryCost === 64 * 1024  ? 5000 :
    p.memoryCost === 128 * 1024 ? 2000 :
                                  800
  )
  const CPF_VALIDOS = 1e9
  const segPorHashGpu = CPF_VALIDOS / gpuHps
  console.log(`  GPU RTX 4090:    ${gpuHps.toLocaleString('pt-BR')} h/s estimado`)
  console.log(`  Tempo crackear 1 hash (pepper vazado):`)
  console.log(`    ${formatarTempo(segPorHashGpu)}`)
  console.log(`  Tempo crackear 44.554 hashes:`)
  console.log(`    ${formatarTempo(segPorHashGpu * 44554)}`)
  console.log()
}

console.log('=' .repeat(60))
console.log('Comparação rápida (worst case: pepper vazado + GPU 4090):')
console.log()
console.log('  HMAC-SHA256 (HOJE):     21 minutos pra todos os 44.554')
console.log('  argon2id interactive:   ver acima')
console.log('  argon2id paranoid:      ver acima')
console.log()
console.log('Recomendação interna: preset "moderado" pra cdl_base.')

function formatarTempo(s) {
  if (s < 1) return `${(s * 1000).toFixed(1)}ms`
  if (s < 60) return `${s.toFixed(1)}s`
  if (s < 3600) return `${(s / 60).toFixed(1)}min`
  if (s < 86400) return `${(s / 3600).toFixed(1)}h`
  if (s < 86400 * 365) return `${(s / 86400).toFixed(1)} dias`
  return `${(s / (86400 * 365)).toFixed(1)} anos`
}
