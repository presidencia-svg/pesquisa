/**
 * Converte os .md de docs/juridico/<pasta>/ em .html, .pdf (Chrome headless)
 * e .docx (pacote docx global). Uso:
 *   node scripts/build-juridico.mjs docs/juridico/rp-0601015-42
 * Só agregados e texto jurídico — nunca dados pessoais.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

import { mdToDocxBuffer } from './_lib/md-docx.mjs'
import { htmlDocument, mdToHtml } from './_lib/md-lite.mjs'

const dir = process.argv[2]
if (!dir) throw new Error('uso: node scripts/build-juridico.mjs <pasta com .md>')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const RODAPE = 'CDL Aracaju · CNPJ 13.045.935/0001-36 · Pesquisa Eleitoral Sergipe 2026 · Registros TRE-SE SE-09441/2026 e TSE BR-04041/2026 · Documento com dados agregados; nenhum dado pessoal.'

for (const f of readdirSync(dir).filter((x) => x.endsWith('.md') && !x.startsWith('._')).sort()) {
  const md = readFileSync(join(dir, f), 'utf8')
  const title = (md.split('\n').find((l) => l.startsWith('# ')) ?? '# Documento').slice(2).trim()
  const base = join(dir, basename(f, '.md'))
  writeFileSync(base + '.html', htmlDocument({ title, bodyHtml: mdToHtml(md), rodape: RODAPE }))
  if (existsSync(CHROME)) {
    execFileSync(CHROME, [
      '--headless=new', '--disable-gpu', '--no-sandbox', '--no-pdf-header-footer',
      `--print-to-pdf=${resolve(base + '.pdf')}`, 'file://' + resolve(base + '.html'),
    ], { stdio: 'ignore', timeout: 120000 })
  }
  try {
    writeFileSync(base + '.docx', await mdToDocxBuffer(md, { title }))
  } catch (e) {
    console.warn(`docx pulado (${f}): ${e.message}`)
  }
  console.log('ok', f, '→ html' + (existsSync(base + '.pdf') ? ' + pdf' : '') + (existsSync(base + '.docx') ? ' + docx' : ''))
}
