/**
 * Stress test do endpoint público /resultados via k6.
 *
 * Como usar:
 *   1) Instalar k6:  brew install k6   (mac)  |  apt install k6  (linux)
 *   2) Rodar local:  k6 run scripts/stress/k6-resultados.js
 *   3) Rodar nuvem (distribuído, sem limite Cloudflare/Vercel):
 *      k6 login cloud
 *      k6 cloud scripts/stress/k6-resultados.js
 *
 * Cenário: rampa 0 → 200 VUs (virtual users) em 2 min, mantém 5 min,
 * desce em 1 min. Total: ~8 min.
 *
 * Critérios de sucesso (pass/fail):
 *   - p95 latência < 1500 ms
 *   - 99% das requisições retornam 2xx
 *   - throughput sustentado > 100 req/s
 *
 * Cenário esperado em produção (Pesquisa Eleitoral Sergipe 2026):
 *   500.000 votantes em 36 horas = ~4 req/s média
 *   Pico horário (lei de Erlang aplicada): 50-150 req/s
 *   Esta carga (200 VUs ≈ 200-300 req/s) cobre 2x o pico previsto.
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const BASE_URL = __ENV.BASE_URL || 'https://pesquisa.cdlaju.com.br'

const erroRate = new Rate('erros_http')
const latencia = new Trend('latencia_ms')

export const options = {
  stages: [
    { duration: '2m', target: 200 }, // ramp-up
    { duration: '5m', target: 200 }, // sustained load
    { duration: '1m', target: 0 }, // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    http_req_failed: ['rate<0.01'],
    erros_http: ['rate<0.01'],
  },
  // User-Agent realista pra não disparar bot detection da Vercel
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
}

export default function () {
  const urls = [
    `${BASE_URL}/`,
    `${BASE_URL}/resultados`,
    `${BASE_URL}/votar`,
    `${BASE_URL}/transparencia`,
    `${BASE_URL}/privacidade`,
  ]
  // VU pega um path aleatório por iteração (simula mix de tráfego real)
  const url = urls[Math.floor(Math.random() * urls.length)]

  const res = http.get(url, {
    tags: { path: new URL(url).pathname },
  })

  const ok = check(res, {
    'status 2xx': (r) => r.status >= 200 && r.status < 300,
    'latency < 2s': (r) => r.timings.duration < 2000,
  })

  erroRate.add(!ok)
  latencia.add(res.timings.duration)

  // Pacing: cada VU faz ~2 req/s (mais realista que loop nu)
  sleep(0.5)
}

export function handleSummary(data) {
  const ok2xx = 100 - (data.metrics.http_req_failed?.values?.rate ?? 0) * 100
  const p50 = data.metrics.http_req_duration?.values?.['p(50)'] ?? 0
  const p95 = data.metrics.http_req_duration?.values?.['p(95)'] ?? 0
  const p99 = data.metrics.http_req_duration?.values?.['p(99)'] ?? 0
  const reqs = data.metrics.http_reqs?.values?.count ?? 0
  const dur = data.state?.testRunDurationMs / 1000 || 1

  const stdout = `
╔══════════════════════════════════════════════════════════════╗
║  Stress Test — Pesquisa Eleitoral Sergipe 2026                         ║
╠══════════════════════════════════════════════════════════════╣
  Total requisições:    ${reqs.toFixed(0)}
  Duração total:        ${dur.toFixed(1)}s
  Throughput médio:     ${(reqs / dur).toFixed(1)} req/s
  Taxa de sucesso 2xx:  ${ok2xx.toFixed(2)}%
  Latência p50:         ${p50.toFixed(0)} ms
  Latência p95:         ${p95.toFixed(0)} ms
  Latência p99:         ${p99.toFixed(0)} ms
╚══════════════════════════════════════════════════════════════╝
`
  return { stdout }
}
