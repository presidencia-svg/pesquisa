/**
 * Gera docs/confidencial/brief-juridico-2026-08-25.docx a partir do .md.
 * Conversor markdown -> Word (headings, tabelas, listas, negrito, citações).
 * Usa o pacote `docx` global (mesmo padrão de build-ata-dpo.mjs).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const docxPath = process.execPath.replace(/\/bin\/node$/, '/lib/node_modules/docx')
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle,
} = require(docxPath)

const SRC = 'docs/confidencial/brief-juridico-2026-08-25.md'
const OUT = 'docs/confidencial/brief-juridico-2026-08-25.docx'
const md = readFileSync(SRC, 'utf8')

// --- inline: **negrito** e `código` ---
function runs(text, base = {}) {
  const out = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let last = 0, m
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), ...base }))
    const t = m[0]
    if (t.startsWith('**')) out.push(new TextRun({ text: t.slice(2, -2), bold: true, ...base }))
    else out.push(new TextRun({ text: t.slice(1, -1), font: 'Consolas', ...base }))
    last = re.lastIndex
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), ...base }))
  return out.length ? out : [new TextRun({ text: '', ...base })]
}

function cell(text, { header = false } = {}) {
  return new TableCell({
    width: { size: 100 / 4, type: WidthType.PERCENTAGE },
    shading: header ? { fill: 'E7ECF5' } : undefined,
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    children: [new Paragraph({ children: runs(text, header ? { bold: true } : {}) })],
  })
}

const children = []
const lines = md.split('\n')
let i = 0
while (i < lines.length) {
  const line = lines[i]

  // Tabela (linha de header seguida de |---|)
  if (line.startsWith('|') && lines[i + 1] && /^\|[\s:|-]+\|$/.test(lines[i + 1].trim())) {
    const rows = []
    const header = line.split('|').slice(1, -1).map((c) => c.trim())
    rows.push(new TableRow({ tableHeader: true, children: header.map((c) => cell(c, { header: true })) }))
    i += 2
    while (i < lines.length && lines[i].startsWith('|')) {
      const cells = lines[i].split('|').slice(1, -1).map((c) => c.trim())
      rows.push(new TableRow({ children: cells.map((c) => cell(c)) }))
      i++
    }
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 2, color: 'B8C4D8' },
        bottom: { style: BorderStyle.SINGLE, size: 2, color: 'B8C4D8' },
        left: { style: BorderStyle.SINGLE, size: 2, color: 'B8C4D8' },
        right: { style: BorderStyle.SINGLE, size: 2, color: 'B8C4D8' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'D6DEEA' },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'D6DEEA' },
      },
      rows,
    }))
    children.push(new Paragraph({ text: '', spacing: { after: 120 } }))
    continue
  }

  if (line.startsWith('### ')) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 80 }, children: runs(line.slice(4)) }))
  } else if (line.startsWith('## ')) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 260, after: 100 }, children: runs(line.slice(3)) }))
  } else if (line.startsWith('# ')) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { after: 160 }, children: runs(line.slice(2)) }))
  } else if (line.startsWith('> ')) {
    children.push(new Paragraph({
      spacing: { after: 60 }, indent: { left: 360 },
      border: { left: { style: BorderStyle.SINGLE, size: 12, color: 'B45309', space: 120 } },
      children: runs(line.slice(2), { italics: true, color: '555555' }),
    }))
  } else if (/^\s*-\s+/.test(line)) {
    children.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: runs(line.replace(/^\s*-\s+/, '')) }))
  } else if (line.trim() === '---') {
    children.push(new Paragraph({ text: '', border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' } }, spacing: { before: 120, after: 120 } }))
  } else if (line.trim() === '') {
    children.push(new Paragraph({ text: '' }))
  } else {
    children.push(new Paragraph({ spacing: { after: 80 }, children: runs(line) }))
  }
  i++
}

const doc = new Document({
  creator: 'CDL Aracaju',
  title: 'Briefing Jurídico — Pesquisa Eleitoral Sergipe 2026',
  styles: {
    default: { document: { run: { font: 'Calibri', size: 21 } } },
  },
  sections: [{
    properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } },
    children,
  }],
})

const buf = await Packer.toBuffer(doc)
writeFileSync(OUT, buf)
console.log('gerado:', OUT, `(${Math.round(buf.length / 1024)} KB)`)
