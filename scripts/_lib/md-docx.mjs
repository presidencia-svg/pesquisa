/**
 * Markdown → .docx (pacote `docx` GLOBAL, mesmo padrão de build-ata-dpo.mjs /
 * build-brief-juridico.mjs). Headings, tabelas (N colunas), listas, negrito,
 * citações, hr. Retorna Buffer.
 */
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const docxPath = process.execPath.replace(/\/bin\/node$/, '/lib/node_modules/docx')
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, BorderStyle,
} = require(docxPath)

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

function cell(text, ncols, { header = false } = {}) {
  return new TableCell({
    width: { size: 100 / ncols, type: WidthType.PERCENTAGE },
    shading: header ? { fill: 'E7ECF5' } : undefined,
    margins: { top: 40, bottom: 40, left: 70, right: 70 },
    children: [new Paragraph({ children: runs(text, { size: 17, ...(header ? { bold: true } : {}) }) })],
  })
}

export async function mdToDocxBuffer(md, { title = 'Documento', creator = 'CDL Aracaju' } = {}) {
  const children = []
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('|') && lines[i + 1] && /^\|[\s:|-]+\|$/.test(lines[i + 1].trim())) {
      const header = line.split('|').slice(1, -1).map((c) => c.trim())
      const n = header.length
      const rows = [new TableRow({ tableHeader: true, children: header.map((c) => cell(c, n, { header: true })) })]
      i += 2
      while (i < lines.length && lines[i].startsWith('|')) {
        const cells = lines[i].split('|').slice(1, -1).map((c) => c.trim())
        while (cells.length < n) cells.push('')
        rows.push(new TableRow({ children: cells.slice(0, n).map((c) => cell(c, n)) }))
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
    if (line.startsWith('#### ')) children.push(new Paragraph({ heading: HeadingLevel.HEADING_4, spacing: { before: 160, after: 60 }, children: runs(line.slice(5)) }))
    else if (line.startsWith('### ')) children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 80 }, children: runs(line.slice(4)) }))
    else if (line.startsWith('## ')) children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 260, after: 100 }, children: runs(line.slice(3)) }))
    else if (line.startsWith('# ')) children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { after: 160 }, children: runs(line.slice(2)) }))
    else if (line.startsWith('> ')) children.push(new Paragraph({
      spacing: { after: 60 }, indent: { left: 360 },
      border: { left: { style: BorderStyle.SINGLE, size: 12, color: 'B45309', space: 120 } },
      children: runs(line.slice(2), { italics: true, color: '555555' }),
    }))
    else if (/^\s*[-*]\s+/.test(line)) children.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: runs(line.replace(/^\s*[-*]\s+/, '')) }))
    else if (/^\s*\d+[.)]\s+/.test(line)) children.push(new Paragraph({ numbering: undefined, spacing: { after: 40 }, indent: { left: 360 }, children: runs(line.trim()) }))
    else if (line.trim() === '---') children.push(new Paragraph({ text: '', border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' } }, spacing: { before: 120, after: 120 } }))
    else if (line.trim() === '') children.push(new Paragraph({ text: '' }))
    else children.push(new Paragraph({ spacing: { after: 80 }, alignment: 'both', children: runs(line) }))
    i++
  }
  const doc = new Document({
    creator, title,
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    sections: [{ properties: { page: { margin: { top: 1100, bottom: 1100, left: 1200, right: 1200 } } }, children }],
  })
  return Packer.toBuffer(doc)
}
