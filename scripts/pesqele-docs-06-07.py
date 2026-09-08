#!/usr/bin/env python3
"""Gera os docs. 06 e 07 da defesa na Rp 0601015-42 (TRE-SE):

  doc06 = telas do lançamento da complementação no PesqEle Empresa (capturas recortadas,
          sem a barra lateral com dados do usuário), uma por página, com legenda;
  doc07 = reprodução textual dos espelhos públicos (PesqEle Público) dos dois registros.

Uso: python3 scripts/pesqele-docs-06-07.py
Entradas (docs/juridico/rp-0601015-42/): capturas-pesqele-2026-09-08/*.png e espelho-publico-*.txt.
Saídas (.html/.pdf, ignoradas pelo git): doc06-telas-pesqele-2026-09-08.pdf,
doc07a-espelho-publico-SE-09441-2026.pdf, doc07b-espelho-publico-BR-04041-2026.pdf.
Só agregados — nenhum dado pessoal.
"""
import html
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
D = ROOT / 'docs/juridico/rp-0601015-42'
CAP = D / 'capturas-pesqele-2026-09-08'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
RODAPE = ('CDL Aracaju · CNPJ 13.045.935/0001-36 · Pesquisa Eleitoral Sergipe 2026 · '
          'Registros TRE-SE SE-09441/2026 e TSE BR-04041/2026 · Rp 0601015-42.2026.6.25.0000')

CSS = """
body{font-family:Helvetica,Arial,sans-serif;font-size:11pt;color:#111;margin:0}
h1{font-size:16pt;margin:0 0 4mm}
h2{font-size:12.5pt;margin:6mm 0 2mm}
p{margin:0 0 2.5mm;line-height:1.35}
.nota{background:#f3f3f3;border:1px solid #ccc;padding:3mm;font-size:9.5pt}
.rodape{font-size:8pt;color:#555;border-top:1px solid #999;margin-top:6mm;padding-top:1.5mm}
table{border-collapse:collapse;width:100%;margin:0 0 3mm}
td{border:1px solid #bbb;padding:1.2mm 2mm;vertical-align:top;font-size:10pt}
td.l{font-weight:bold;background:#f6f6f6;width:22%}
.campo{font-weight:bold;margin-top:4mm}
.texto{white-space:pre-wrap;text-align:justify;font-size:10pt}
.pg{page-break-before:always}
figure{margin:0;text-align:center}
figure img{max-width:100%;max-height:150mm;border:1px solid #999}
figcaption{font-size:10pt;text-align:left;margin:2mm 0 0}
"""


def page(title, body, landscape=False):
    size = 'A4 landscape' if landscape else 'A4'
    return (f'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>{html.escape(title)}</title>'
            f'<style>@page{{size:{size};margin:14mm 14mm 12mm}}{CSS}</style></head><body>{body}'
            f'<div class="rodape">{html.escape(RODAPE)}</div></body></html>')


def to_pdf(html_path: Path, pdf_path: Path):
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--no-sandbox', '--no-pdf-header-footer',
                    f'--print-to-pdf={pdf_path}', html_path.as_uri()], check=True, capture_output=True)
    print('ok', pdf_path.name, pdf_path.stat().st_size, 'bytes')


# ---------------------------------------------------------------- doc. 06
CAPTURAS = [
    ('14.06.44.png', '14h06',
     'Tela "Editar bairro/município e/ou resultado da pesquisa" (Res.-TSE 23.600/2019, art. 2º, § 7º-C): '
     'texto da complementação (incisos III e IV do § 7º) colado no campo "Dados relativos aos municípios e '
     'bairros abrangidos pela pesquisa"; arquivo de detalhamento geográfico ainda não anexado.'),
    ('14.08.30.png', '14h08',
     'Envio do arquivo de detalhamento geográfico em andamento (aviso "Carregando").'),
    ('14.15.18.png', '14h15',
     'Arquivo pesqele-anexo-detalhamento-e-complementacao-art2-par7.pdf anexado no campo "Arquivo do '
     'detalhamento geográfico"; campo "Arquivo do relatório completo com os resultados da pesquisa" ainda vazio.'),
    ('14.33.02.png', '14h33',
     'Substituição do arquivo de detalhamento (diálogo "O arquivo anterior será substituído pelo atual. Deseja '
     'continuar?"). O texto gravado na primeira inclusão exibia o caractere "¿" no lugar dos travessões; '
     'foi regravado em seguida com hífens, como consta dos espelhos públicos (doc. 07).'),
    ('14.51.08.png', '14h51',
     'Formulário com o texto corrigido e os dois arquivos anexados — detalhamento geográfico e '
     'pesqele-relatorio-completo-resultados.pdf (relatório completo com os resultados) —, antes de acionar ALTERAR.'),
    ('14.51.29.png', '14h51',
     'Cabeçalho do mesmo formulário: "Número de identificação: BR-04041/2026", com o texto da complementação.'),
]


def build_doc06():
    intro = (
        '<h1>Doc. 06 — Telas do lançamento da complementação no PesqEle Empresa (08/09/2026)</h1>'
        '<p>Capturas de tela feitas pelo presidente da CDL Aracaju em 08/09/2026, durante o lançamento da '
        'complementação do art. 2º, § 7º, III e IV, da Res.-TSE 23.600/2019 nos registros SE-09441/2026 (TRE-SE) e '
        'BR-04041/2026 (TSE), pela tela "Editar bairro/município e/ou resultado da pesquisa" do PesqEle Empresa '
        '(pesqele-empresa.tse.jus.br, versão 3.10.10). A hora de cada captura é a do relógio do sistema, visível no '
        'canto superior direito das capturas de tela inteira (horário de Brasília).</p>'
        '<p class="nota">A barra lateral esquerda do sistema, que exibe dados pessoais do usuário conectado, foi '
        'recortada de todas as capturas; nada mais foi alterado. Ao salvar, o sistema exibiu as mensagens '
        '"Dados alterados com sucesso" e "As informações foram incluídas fora do prazo Legal". A prova do conteúdo '
        'efetivamente gravado nos dois registros é o espelho público de cada um (doc. 07).</p>'
        '<table><tr><td class="l">Página</td><td class="l">Hora</td><td class="l">Conteúdo</td></tr>' +
        ''.join(f'<tr><td>{i + 2}</td><td>{h}</td><td>{html.escape(c)}</td></tr>' for i, (_, h, c) in enumerate(CAPTURAS)) +
        '</table>')
    figs = ''.join(
        f'<div class="pg"><figure><img src="{(CAP / f).as_uri()}" alt="captura {h}">'
        f'<figcaption><b>Captura {i + 1} — 08/09/2026, {h}.</b> {html.escape(c)}</figcaption></figure></div>'
        for i, (f, h, c) in enumerate(CAPTURAS))
    out = D / 'doc06-telas-pesqele-2026-09-08.html'
    out.write_text(page('Doc. 06 — Telas do PesqEle (08/09/2026)', intro + figs, landscape=True), encoding='utf-8')
    to_pdf(out, out.with_suffix('.pdf'))


# ---------------------------------------------------------------- doc. 07
ESPELHOS = [
    ('a', 'SE-09441/2026', 'TRE-SE', 'espelho-publico-SE-09441-2026-09-08.txt', '15h09',
     'doc07a-espelho-publico-SE-09441-2026'),
    ('b', 'BR-04041/2026', 'TSE', 'espelho-publico-BR-04041-2026-09-08.txt', '15h16',
     'doc07b-espelho-publico-BR-04041-2026'),
]


def render_espelho(txt: str) -> str:
    out = []
    for raw in txt.split('\n'):
        line = raw.rstrip()
        if not line:
            continue
        if '\t' in line:
            cells = [c.strip() for c in line.split('\t')]
            tds = ''
            for k, c in enumerate(cells):
                cls = ' class="l"' if k % 2 == 0 else ''
                tds += f'<td{cls}>{html.escape(c)}</td>'
            out.append(f'<tr>{tds}</tr>')
            continue
        if line.startswith('Visualizar Pesquisa Eleitoral'):
            out.append(f'<h2>{html.escape(line)}</h2>')
        elif line.endswith(':') and len(line) < 400:
            out.append(f'<p class="campo">{html.escape(line)}</p>')
        elif len(line) > 300:
            out.append(f'<p class="texto">{html.escape(line)}</p>')
        else:
            out.append(f'<p>{html.escape(line)}</p>')
    # agrupa linhas <tr> consecutivas em tabelas
    res, buf = [], []
    for x in out:
        if x.startswith('<tr>'):
            buf.append(x)
        else:
            if buf:
                res.append('<table>' + ''.join(buf) + '</table>')
                buf = []
            res.append(x)
    if buf:
        res.append('<table>' + ''.join(buf) + '</table>')
    return ''.join(res)


def build_doc07():
    for letra, num, trib, src, hora, base in ESPELHOS:
        txt = (D / src).read_text(encoding='utf-8')
        head = (
            f'<h1>Doc. 07-{letra.upper()} — Espelho público do registro {num} ({trib}), consultado em 08/09/2026</h1>'
            f'<p><b>Fonte:</b> PesqEle Público, https://pesqele-divulgacao.tse.jus.br/app/pesquisa/listar.xhtml → '
            f'"Consultar Pesquisas" → nº {num} → "Visualizar dados da pesquisa" (página detalhar.xhtml; sistema versão 3.9.2).</p>'
            f'<p><b>Consulta realizada em 08/09/2026, às {hora} (horário de Brasília)</b>, pela CDL Aracaju, após o '
            f'lançamento da complementação do art. 2º, § 7º, III e IV, da Res.-TSE 23.600/2019.</p>'
            '<p class="nota">Reprodução textual integral, sem edição, do conteúdo exibido pela página. Os caracteres '
            '"¿" constam da própria página do sistema. Na parte final, o sistema exibe os links dos arquivos anexados ao '
            'registro; os dois últimos ("Visualizar arquivo com detalhamento de bairros/municípios" e "Visualizar arquivo '
            'relatório completo com o resultado de pesquisa") correspondem aos arquivos lançados em 08/09/2026. '
            'A via oficial pode ser emitida a qualquer momento pelo botão "Imprimir" da mesma página.</p>')
        out = D / f'{base}.html'
        out.write_text(page(f'Doc. 07-{letra.upper()} — espelho {num}', head + render_espelho(txt)), encoding='utf-8')
        to_pdf(out, out.with_suffix('.pdf'))


if __name__ == '__main__':
    build_doc06()
    build_doc07()
