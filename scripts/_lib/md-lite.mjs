/**
 * Conversor Markdown → HTML minimalista (sem dependências), usado pelos
 * builders de documentos jurídicos/PesqEle (docs/juridico).
 * Cobre: # títulos, parágrafos, listas - e 1., tabelas |, > citação, ---,
 * **negrito**, *itálico*, `código`, [texto](url).
 */
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
export function inline(text) {
  let s = esc(text)
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>')
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
  s = s.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2">$1</a>')
  return s
}
export function mdToHtml(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const out = []
  let i = 0
  const isTableSep = (l) => /^\|[\s:|-]+\|$/.test((l ?? '').trim())
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('|') && isTableSep(lines[i + 1])) {
      const header = line.split('|').slice(1, -1).map((c) => c.trim())
      const aligns = lines[i + 1].split('|').slice(1, -1).map((c) => {
        const t = c.trim()
        if (t.endsWith(':') && t.startsWith(':')) return 'center'
        if (t.endsWith(':')) return 'right'
        return 'left'
      })
      out.push('<table><thead><tr>' + header.map((c, k) => `<th style="text-align:${aligns[k] ?? 'left'}">${inline(c)}</th>`).join('') + '</tr></thead><tbody>')
      i += 2
      while (i < lines.length && lines[i].startsWith('|')) {
        const cells = lines[i].split('|').slice(1, -1).map((c) => c.trim())
        out.push('<tr>' + cells.map((c, k) => `<td style="text-align:${aligns[k] ?? 'left'}">${inline(c)}</td>`).join('') + '</tr>')
        i++
      }
      out.push('</tbody></table>')
      continue
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line)
    if (h) { out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue }
    if (/^\s*[-*]\s+/.test(line)) {
      out.push('<ul>')
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { out.push(`<li>${inline(lines[i].replace(/^\s*[-*]\s+/, ''))}</li>`); i++ }
      out.push('</ul>'); continue
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const olStart = Number((lines[i].match(/^\s*(\d+)[.)]\s+/) ?? [0, '1'])[1])
      out.push(olStart === 1 ? '<ol>' : `<ol start="${olStart}">`)
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) { out.push(`<li>${inline(lines[i].replace(/^\s*\d+[.)]\s+/, ''))}</li>`); i++ }
      out.push('</ol>'); continue
    }
    if (line.startsWith('> ')) {
      const buf = []
      while (i < lines.length && lines[i].startsWith('> ')) { buf.push(inline(lines[i].slice(2))); i++ }
      out.push(`<blockquote>${buf.join('<br/>')}</blockquote>`); continue
    }
    if (line.trim() === '---') { out.push('<hr/>'); i++; continue }
    if (line.trim() === '') { i++; continue }
    const buf = []
    while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,4}\s|\||>\s|\s*[-*]\s|\s*\d+[.)]\s|---$)/.test(lines[i])) { buf.push(inline(lines[i])); i++ }
    out.push(`<p>${buf.join(' ')}</p>`)
  }
  return out.join('\n')
}
export const PRINT_CSS = `
  @page { size: A4; margin: 18mm 16mm 18mm 16mm; }
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 11pt; line-height: 1.45; color: #111; max-width: 180mm; margin: 0 auto; }
  h1 { font-size: 17pt; margin: 0 0 6pt; line-height: 1.2; }
  h2 { font-size: 13.5pt; margin: 18pt 0 6pt; border-bottom: 1px solid #999; padding-bottom: 2pt; }
  h3 { font-size: 12pt; margin: 14pt 0 4pt; }
  h4 { font-size: 11pt; margin: 10pt 0 3pt; }
  p { margin: 0 0 7pt; text-align: justify; }
  blockquote { margin: 6pt 0 8pt 14pt; padding-left: 8pt; border-left: 3px solid #b45309; color: #333; font-style: italic; }
  table { border-collapse: collapse; width: 100%; margin: 6pt 0 10pt; font-size: 9pt; font-family: Helvetica, Arial, sans-serif; page-break-inside: auto; }
  th, td { border: 1px solid #bbb; padding: 2.5pt 4pt; vertical-align: top; }
  th { background: #e7ecf5; }
  tr { page-break-inside: avoid; }
  code { font-family: Menlo, Consolas, monospace; font-size: 9pt; background: #f3f3f3; padding: 0 2pt; }
  ul, ol { margin: 0 0 7pt 18pt; padding: 0; }
  li { margin-bottom: 2pt; }
  hr { border: 0; border-top: 1px solid #ccc; margin: 12pt 0; }
  .rodape { margin-top: 24pt; font-size: 8.5pt; color: #555; border-top: 1px solid #ccc; padding-top: 4pt; font-family: Helvetica, Arial, sans-serif; }
`
export function htmlDocument({ title, bodyHtml, rodape }) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${PRINT_CSS}</style></head><body>${bodyHtml}${rodape ? `<div class="rodape">${inline(rodape)}</div>` : ''}</body></html>`
}
