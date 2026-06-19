#!/usr/bin/env node
/**
 * Converte o GeoJSON dos municípios de Sergipe (IBGE malhas) em paths
 * SVG prontos pra renderizar no MapaSergipe.
 *
 * Input:  data/sergipe-municipios-raw.geojson
 * Output: lib/sergipe-paths.generated.ts
 *
 * Estratégia:
 *   1. Calcula bounding box global (lon/lat min/max) dos 75 municípios
 *   2. ViewBox SVG = (lonMin, -latMax, lonRange, latRange)
 *      — Y negativo porque SVG cresce pra baixo e latitude cresce pra
 *        cima. Multiplica lat por -1 pra inverter.
 *   3. Pra cada feature: gera path "M x1,y1 L x2,y2 ... Z" arredondado
 *      a 4 casas (precisão suficiente pra visualização em telas).
 *   4. MultiPolygon vira múltiplos subpaths concatenados.
 *
 * Rodar uma vez: node scripts/gerar-paths-sergipe.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = process.cwd()
const INPUT = resolve(ROOT, 'data/sergipe-municipios-raw.geojson')
const OUTPUT = resolve(ROOT, 'lib/sergipe-paths.generated.ts')

const raw = JSON.parse(readFileSync(INPUT, 'utf-8'))
const features = raw.features ?? []
console.log(`📐 Lidas ${features.length} features.`)

// ── 1. Bounding box global ──────────────────────────────────────────────
let lonMin = +Infinity, lonMax = -Infinity, latMin = +Infinity, latMax = -Infinity
for (const f of features) {
  const flat = (coords) => {
    for (const c of coords) {
      if (typeof c[0] === 'number') {
        const [lon, lat] = c
        if (lon < lonMin) lonMin = lon
        if (lon > lonMax) lonMax = lon
        if (lat < latMin) latMin = lat
        if (lat > latMax) latMax = lat
      } else {
        flat(c)
      }
    }
  }
  flat(f.geometry.coordinates)
}
const lonRange = lonMax - lonMin
const latRange = latMax - latMin
console.log(
  `📐 BBox: lon [${lonMin}..${lonMax}] lat [${latMin}..${latMax}]`,
)
console.log(`📐 ViewBox: 0 0 ${lonRange.toFixed(4)} ${latRange.toFixed(4)}`)

// ── 2. Projeção lon/lat → SVG x/y ───────────────────────────────────────
// Origem do SVG no canto superior esquerdo. Sergipe inteira cabe em
// [0..lonRange] horizontal e [0..latRange] vertical.
const proj = ([lon, lat]) => {
  const x = lon - lonMin
  const y = latMax - lat // inverte Y
  return [x.toFixed(4), y.toFixed(4)]
}

// ── 3. Polygon → path "M ... L ... Z" ───────────────────────────────────
const ringToPath = (ring) => {
  let d = ''
  for (let i = 0; i < ring.length; i++) {
    const [x, y] = proj(ring[i])
    d += (i === 0 ? 'M' : 'L') + x + ',' + y + ' '
  }
  return d.trim() + 'Z'
}

const polygonToPath = (poly) => poly.map(ringToPath).join(' ')

const featureToPath = (f) => {
  if (f.geometry.type === 'Polygon') {
    return polygonToPath(f.geometry.coordinates)
  }
  if (f.geometry.type === 'MultiPolygon') {
    return f.geometry.coordinates.map(polygonToPath).join(' ')
  }
  return ''
}

// ── 4. Output TS ────────────────────────────────────────────────────────
const paths = features.map((f) => ({
  ibge_codigo: Number(f.properties.codarea),
  d: featureToPath(f),
}))

const ts = `/* eslint-disable */
// AUTO-GERADO por scripts/gerar-paths-sergipe.mjs
// Fonte: IBGE malhas estados/SE qualidade=intermediaria intrarregiao=municipio
// 75 municípios de Sergipe.

export const SERGIPE_VIEWBOX = {
  width: ${lonRange.toFixed(4)},
  height: ${latRange.toFixed(4)},
} as const

export type MunicipioPath = {
  ibge_codigo: number
  d: string
}

export const SERGIPE_PATHS: MunicipioPath[] = ${JSON.stringify(paths, null, 2)}
`

writeFileSync(OUTPUT, ts)
const { size } = await import('node:fs').then((m) => m.promises.stat(OUTPUT))
console.log(`✅ ${paths.length} paths gravados em ${OUTPUT} (${(size / 1024).toFixed(1)} KB)`)
