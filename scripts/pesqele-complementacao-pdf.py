#!/usr/bin/env python3
"""Gera o PDF de "detalhamento geográfico + complementação do art. 2º, §7º, III e IV"
para anexar no PesqEle (tela "Editar bairro/município e/ou resultado da pesquisa").
Fonte: docs/juridico/rp-0601015-42/anexo-tecnico-numeros.json (scripts/anexo-rp-0601015.mjs).
Só agregados — nenhum dado pessoal. Uso: python3 scripts/pesqele-complementacao-pdf.py
"""
import html, json, pathlib, subprocess, sys
ROOT = pathlib.Path(__file__).resolve().parents[1]
D = ROOT / 'docs/juridico/rp-0601015-42'
d = json.load(open(D / 'anexo-tecnico-numeros.json'))
municipios_txt = (ROOT / 'docs/pesqele-registro/SE-TRE_campo-4-municipios.txt').read_text().strip()
def n(x): return f'{x:,.0f}'.replace(',', '.')
def p(x, dec=1): return f'{x*100:.{dec}f}%'.replace('.', ',')
def f(x, dec=3): return f'{x:.{dec}f}'.replace('.', ',')
esc = html.escape
REG = {'grande_aracaju':'Grande Aracaju','centro_sul':'Centro-Sul','agreste':'Agreste','leste':'Leste Sergipano','sertao':'Sertão','baixo_sao_francisco':'Baixo São Francisco'}

mun = sorted(d['municipios'], key=lambda m: -m.get('eleitorado', 0))
def g(m, *keys, default=0):
    for k in keys:
        if k in m and m[k] is not None: return m[k]
    return default
rows = []
tot = {'eleitorado':0,'planejado':0,'participantes':0,'respondentes':0}
for m in mun:
    el = g(m,'eleitorado'); pl = g(m,'planejado'); pa = g(m,'participantes'); re_ = g(m,'respondentes','obtido'); pe = g(m,'peso', default=None)
    tot['eleitorado']+=el; tot['planejado']+=pl; tot['participantes']+=pa; tot['respondentes']+=re_
    rows.append(f"<tr><td>{esc(m['nome'])}</td><td>{esc(REG.get(m.get('regiao'), m.get('regiao') or ''))}</td><td class=r>{n(el)}</td><td class=r>{p(g(m,'share'),2)}</td><td class=r>{n(pl)}</td><td class=r>{n(pa)}</td><td class=r>{n(re_)}</td><td class=r>{f(pe) if pe is not None else '—'}</td></tr>")
r = d['respondentes']; k = d['kish']; c = d['composicao']
rows.append(f"<tr class=tot><td>Total — 75 municípios</td><td></td><td class=r>{n(tot['eleitorado'])}</td><td class=r>100%</td><td class=r>{n(tot['planejado'])}</td><td class=r>{n(tot['participantes'])}</td><td class=r>{n(tot['respondentes'])}</td><td class=r>—</td></tr>")
rows.append(f"<tr><td>Título eleitoral de outra UF (peso 0, fora dos percentuais)</td><td></td><td class=r>—</td><td class=r>—</td><td class=r>—</td><td class=r>{n(d['participantes']['validados_fora_se'])}</td><td class=r>{n(r['fora_se'])}</td><td class=r>0</td></tr>")

def tabela(titulo, itens, total, rot):
    t = [f"<table class=comp><caption>{esc(titulo)}</caption><tr><th>Categoria</th><th class=r>n</th><th class=r>%</th></tr>"]
    for key, val in itens:
        t.append(f"<tr><td>{esc(rot.get(key,key))}</td><td class=r>{n(val)}</td><td class=r>{p(val/total)}</td></tr>")
    t.append(f"<tr class=tot><td>Total</td><td class=r>{n(total)}</td><td class=r>100%</td></tr></table>")
    return ''.join(t)
ROT = {'F':'Feminino','M':'Masculino','nao_informado':'Não informado','fundamental':'Fundamental','medio':'Médio','superior':'Superior','A':'Classe A','B':'Classe B','C':'Classe C','D_E':'Classes D/E','fora_de_se':'Fora de Sergipe (peso 0)', **REG}
N = d['participantes']['validados_total']
comp_html = ''.join([
    tabela('Sexo', c['sexo'].items(), sum(c['sexo'].values()), ROT),
    tabela('Faixa etária', c['faixa_etaria'].items(), sum(c['faixa_etaria'].values()), ROT),
    tabela('Grau de instrução', c['escolaridade'].items(), sum(c['escolaridade'].values()), ROT),
    tabela('Nível econômico (autodeclarado)', c['nivel_economico'].items(), sum(c['nivel_economico'].values()), ROT),
    tabela('Região do estado', c['regiao'].items(), sum(c['regiao'].values()), ROT),
])
# cruzamento sexo x faixa x instrução
cz = d['cruzamento_sexo_faixa_instrucao']
faixas = ['18-24','25-34','35-44','45-59','60+']; instr = ['fundamental','medio','superior']; sexos = ['F','M','nao_informado']
cr = ["<table class=cruz><caption>Cruzamento sexo × faixa etária × grau de instrução (n)</caption><tr><th>Faixa etária</th><th>Instrução</th><th class=r>Feminino</th><th class=r>Masculino</th><th class=r>Não informado</th><th class=r>Total</th></tr>"]
for fx in faixas:
    for i in instr:
        vals = [cz.get(f'{s}|{fx}|{i}', 0) for s in sexos]
        cr.append(f"<tr><td>{fx}</td><td>{ROT[i]}</td>" + ''.join(f"<td class=r>{n(v)}</td>" for v in vals) + f"<td class=r>{n(sum(vals))}</td></tr>")
cr.append('</table>')

doc = f"""<!doctype html><html lang=pt-BR><meta charset=utf-8><title>Detalhamento geográfico e complementação art. 2º §7º — SE-09441/2026 e BR-04041/2026</title>
<style>
@page {{ size: A4; margin: 16mm 14mm; }}
body {{ font: 10.5pt/1.4 -apple-system, "Helvetica Neue", Arial, sans-serif; color:#111; }}
h1 {{ font-size:15pt; margin:0 0 2mm; }} h2 {{ font-size:12pt; margin:7mm 0 2mm; border-bottom:1px solid #999; }}
.id td {{ padding:1px 8px 1px 0; vertical-align:top; }} .id td:first-child {{ font-weight:600; white-space:nowrap; }}
table {{ border-collapse:collapse; width:100%; font-size:9pt; margin:2mm 0 4mm; page-break-inside:auto; }}
th, td {{ border:1px solid #bbb; padding:2px 5px; }} th {{ background:#eef; text-align:left; }} .r {{ text-align:right; }}
tr.tot td {{ font-weight:700; background:#f4f4f4; }} tr {{ page-break-inside:avoid; }}
caption {{ text-align:left; font-weight:700; padding:2px 0; }}
.comp {{ width:48%; display:inline-table; vertical-align:top; margin-right:1.5%; }}
p.small {{ font-size:9pt; color:#333; }} pre {{ white-space:pre-wrap; font:inherit; }}
</style>
<h1>Pesquisa Eleitoral Sergipe 2026 — Detalhamento geográfico e complementação do art. 2º, § 7º, incisos III e IV (Res.-TSE 23.600/2019)</h1>
<table class=id>
<tr><td>Registros</td><td>TRE-SE <b>SE-09441/2026</b> · TSE <b>BR-04041/2026</b> (mesmo levantamento, mesma amostra)</td></tr>
<tr><td>Entidade</td><td>Câmara de Dirigentes Lojistas de Aracaju — CDL Aracaju, CNPJ 13.045.935/0001-36</td></tr>
<tr><td>Estatístico responsável</td><td>Danilio Silva Santos — CONRE 8223</td></tr>
<tr><td>Coleta</td><td>01/09/2026 a 03/09/2026 (encerrada às 23h59 de 03/09), exclusivamente pela internet, com identidade verificada (CPF + WhatsApp)</td></tr>
<tr><td>Documento</td><td>Complementação gerada a partir do banco de dados da pesquisa em {esc(d['gerado_em_brt'])} (horário de Brasília). Contém apenas agregados; nenhum dado pessoal.</td></tr>
</table>

<h2>1. Área de abrangência — bairros e municípios (art. 2º, IX)</h2>
<pre>{esc(municipios_txt)}</pre>

<h2>2. Número de pesquisados por unidade territorial — município (art. 2º, § 7º, III)</h2>
<p class=small>Unidade territorial: <b>município</b>. A coleta foi digital e estadual, sem abordagem domiciliar; o setor censitário não é unidade operacional da coleta. <b>Planejado</b> = cota proporcional ao eleitorado (TSE) de cada município sobre a meta de {n(d['meta_amostra'])} entrevistas. <b>Participantes</b> = cadastros com identidade verificada. <b>Respondentes</b> = participantes que responderam ao questionário. <b>Peso</b> = (eleitorado do município ÷ eleitorado total) ÷ (respondentes do município ÷ total de respondentes).</p>
<table><tr><th>Município</th><th>Região</th><th class=r>Eleitorado TSE</th><th class=r>Share</th><th class=r>Planejado</th><th class=r>Participantes</th><th class=r>Respondentes</th><th class=r>Peso</th></tr>{''.join(rows)}</table>
<p class=small>Total de respondentes: <b>{n(r['total'])}</b> ({n(r['se'])} com domicílio eleitoral em Sergipe, ponderados, e {n(r['fora_se'])} com título de outra UF, peso zero). Amostra efetiva (Kish): <b>{n(k['n_eff'])}</b>; efeito de desenho (deff) <b>{f(k['deff'],3)}</b>; pesos entre {f(k['peso_min']['peso'])} ({esc(k['peso_min']['municipio'])}) e {f(k['peso_max']['peso'])} ({esc(k['peso_max']['municipio'])}). Margem de erro (95%): ±{f(k['margem_n']*100,1)} p.p. nominal e ±{f(k['margem_n_eff']*100,1)} p.p. sobre a amostra efetiva.</p>

<h2>3. Composição da amostra final (art. 2º, § 7º, IV)</h2>
<p class=small>Base: {n(N)} participantes com identidade verificada ({n(r['total'])} respondentes). Sexo, faixa etária e grau de instrução vêm do cadastro; nível econômico é autodeclarado e não foi usado na ponderação por falta de parâmetro oficial por município.</p>
{comp_html}
{''.join(cr)}

<h2>4. Ponderação aplicada</h2>
<p>Pós-estratificação por município (75 estratos) pelo eleitorado do TSE, conforme a Tabela de Estratos e Ponderação anexa (páginas seguintes). Os resultados divulgados em 04/09/2026 foram apresentados por contagem direta; os percentuais ponderados por município foram publicados em 06/09/2026 ao lado dos brutos. Não houve ponderação por sexo, idade, instrução ou nível econômico.</p>
<p class=small>Anexo: Tabela de Estratos e Ponderação (arquivo de 25/07/2026).</p>
</html>"""
base = D / 'pesqele-detalhamento-geografico-complementacao'
base.with_suffix('.html').write_text(doc)
chrome = sys.argv[1] if len(sys.argv) > 1 else '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
subprocess.run([chrome, '--headless=new', '--disable-gpu', '--no-sandbox', '--no-pdf-header-footer',
                f'--print-to-pdf={base.with_suffix(".pdf")}', 'file://' + str(base.with_suffix('.html'))], check=True, capture_output=True)
final = D / 'pesqele-anexo-detalhamento-e-complementacao-art2-par7.pdf'
subprocess.run(['pdfunite', str(base.with_suffix('.pdf')), str(ROOT / 'docs/Tabela-Estratos-Ponderacao.pdf'), str(final)], check=True)
print('ok', final, final.stat().st_size, 'bytes')
