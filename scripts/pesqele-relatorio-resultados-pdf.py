#!/usr/bin/env python3
"""Gera o "Relatório completo com os resultados da pesquisa" (Res.-TSE 23.600/2019, art. 2º, § 7º-C)
para o slot "Resultado da pesquisa" do PesqEle Empresa. Fonte: anexo-tecnico-numeros.json.
Só agregados (candidatos são dados públicos do DivulgaCand). Uso: python3 scripts/pesqele-relatorio-resultados-pdf.py [chrome]
"""
import html, json, pathlib, subprocess, sys
ROOT = pathlib.Path(__file__).resolve().parents[1]
D = ROOT / 'docs/juridico/rp-0601015-42'
d = json.load(open(D / 'anexo-tecnico-numeros.json'))
R = ROOT / 'docs/pesqele-registro'
campo1 = (R / 'SE-TRE_campo-1-metodologia.txt').read_text().strip()
campo2 = (R / 'SE-TRE_campo-2-plano-amostral.txt').read_text().strip()
esc = html.escape
def n(x): return f'{x:,.0f}'.replace(',', '.')
def n1(x): return f'{x:,.1f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
def p(x, dec=1): return f'{x*100:.{dec}f}%'.replace('.', ',')
def f(x, dec=3): return f'{x:.{dec}f}'.replace('.', ',')
def paras(t): return ''.join(f'<p>{esc(par.strip())}</p>' for par in t.split('\n\n') if par.strip())
r = d['respondentes']; k = d['kish']; c = d['composicao']; N = d['participantes']['validados_total']
ROT = {'F':'Feminino','M':'Masculino','nao_informado':'Não informado','fundamental':'Fundamental','medio':'Médio','superior':'Superior','A':'Classe A','B':'Classe B','C':'Classe C','D_E':'Classes D/E','fora_de_se':'Fora de Sergipe (peso 0)','grande_aracaju':'Grande Aracaju','centro_sul':'Centro-Sul','agreste':'Agreste','leste':'Leste Sergipano','sertao':'Sertão','baixo_sao_francisco':'Baixo São Francisco'}
def tabela(titulo, itens):
    total = sum(v for _, v in itens)
    t = [f"<table class=comp><caption>{esc(titulo)}</caption><tr><th>Categoria</th><th class=r>n</th><th class=r>%</th></tr>"]
    for key, val in itens: t.append(f"<tr><td>{esc(ROT.get(key,key))}</td><td class=r>{n(val)}</td><td class=r>{p(val/total)}</td></tr>")
    t.append(f"<tr class=tot><td>Total</td><td class=r>{n(total)}</td><td class=r>100%</td></tr></table>"); return ''.join(t)
comp_html = ''.join([tabela('Sexo', list(c['sexo'].items())), tabela('Faixa etária', list(c['faixa_etaria'].items())),
                     tabela('Grau de instrução', list(c['escolaridade'].items())), tabela('Nível econômico (autodeclarado)', list(c['nivel_economico'].items())),
                     tabela('Região do estado', list(c['regiao'].items()))])

ORDEM = [('presidente','BR-04041/2026 (TSE)'), ('governador','SE-09441/2026 (TRE-SE)'), ('senador','SE-09441/2026 (TRE-SE)'), ('federal','SE-09441/2026 (TRE-SE)'), ('estadual','SE-09441/2026 (TRE-SE)')]
res_html = []
for cargo, reg in ORDEM:
    g = d['resultados'][cargo]
    cands = sorted(g['candidatos'], key=lambda x: -x['votos'])
    nominal = g['base_nominal_bruta']; total = g['respostas_total']
    rows = ''.join(f"<tr><td class=r>{x['numero']}</td><td>{esc(x['nome'])}</td><td>{esc(x['partido'])}</td><td class=small>{esc(x['coligacao'] or '')}</td><td class=r>{n(x['votos'])}</td><td class=r>{p(x['pct_bruto'])}</td><td class=r>{n1(x['pond'])}</td><td class=r>{p(x['pct_pond'])}</td></tr>" for x in cands)
    extra = ''
    if g.get('legendas'):
        base_p = g['base_partido_bruta']
        lg = sorted(g['legendas'], key=lambda x: -x['votos'])
        extra = (f"<table><caption>{esc(g['rotulo'])} — votos por legenda (partido/federação; nominais + legenda). Base: {n(base_p)} votos válidos de número, dos quais {n(g['votos_legenda_pura'])} apenas na legenda</caption>"
                 "<thead><tr><th class=r>Nº</th><th>Sigla</th><th class=r>Votos</th><th class=r>% válidos</th><th class=r>Ponderado</th><th class=r>% pond.</th></tr></thead>"
                 + ''.join(f"<tr><td class=r>{x['numero']}</td><td>{esc(x['sigla'])}</td><td class=r>{n(x['votos'])}</td><td class=r>{p(x['pct_bruto'])}</td><td class=r>{n1(x['pond'])}</td><td class=r>{p(x['pct_pond'])}</td></tr>" for x in lg) + '</table>')
    res_html.append(f"""<h3>{esc(g['rotulo'])} <span class=reg>· registro {esc(reg)}</span></h3>
<p class=small>Respostas ao cargo: <b>{n(total)}</b> ({n(g['respondentes'])} respondentes). Votos nominais válidos (base dos percentuais dos candidatos): <b>{n(nominal)}</b>. Brancos: {n(g['branco']['votos'])} ({p(g['branco']['pct_bruto'])} das respostas). Não sabe / não respondeu: {n(g['nao_sabe']['votos'])} ({p(g['nao_sabe']['pct_bruto'])}).{' Votos apenas na legenda: ' + n(g['votos_legenda_pura']) + '.' if g.get('votos_legenda_pura') else ''}</p>
<table><thead><tr><th class=r>Nº</th><th>Candidato(a)</th><th>Partido</th><th>Coligação / federação</th><th class=r>Votos (contagem direta)</th><th class=r>% válidos (bruto)</th><th class=r>Ponderado</th><th class=r>% válidos (pond.)</th></tr></thead>{rows}
<tr class=tot><td></td><td>Total de votos nominais válidos</td><td></td><td></td><td class=r>{n(nominal)}</td><td class=r>100%</td><td class=r>{n1(g['base_nominal_pond'])}</td><td class=r>100%</td></tr></table>{extra}""")

ed = d['edicao']
doc = f"""<!doctype html><html lang=pt-BR><meta charset=utf-8><title>Relatório completo com os resultados — Pesquisa Eleitoral Sergipe 2026</title>
<style>
@page {{ size: A4; margin: 16mm 14mm; }}
body {{ font: 10.5pt/1.4 -apple-system, "Helvetica Neue", Arial, sans-serif; color:#111; }}
h1 {{ font-size:15pt; margin:0 0 2mm; }} h2 {{ font-size:12pt; margin:7mm 0 2mm; border-bottom:1px solid #999; }} h3 {{ font-size:11pt; margin:6mm 0 1mm; }} .reg {{ font-weight:400; color:#444; font-size:9.5pt; }}
.id td {{ padding:1px 8px 1px 0; vertical-align:top; }} .id td:first-child {{ font-weight:600; white-space:nowrap; }}
table {{ border-collapse:collapse; width:100%; font-size:9pt; margin:2mm 0 4mm; }} thead {{ display:table-header-group; }}
th, td {{ border:1px solid #bbb; padding:2px 5px; vertical-align:top; }} th {{ background:#eef; text-align:left; }} .r {{ text-align:right; white-space:nowrap; }}
tr.tot td {{ font-weight:700; background:#f4f4f4; }} tr {{ page-break-inside:avoid; }} caption {{ text-align:left; font-weight:700; padding:2px 0; }}
.comp {{ width:48%; display:inline-table; vertical-align:top; margin-right:1.5%; }} td.small {{ font-size:8pt; }}
p {{ margin:0 0 2mm; }} p.small, .small {{ font-size:9pt; color:#333; }} .box {{ border:1px solid #999; background:#fafafa; padding:2mm 3mm; margin:2mm 0; }}
</style>
<h1>Pesquisa Eleitoral Sergipe 2026 (1º turno) — Relatório completo com os resultados</h1>
<p class=small>Res.-TSE nº 23.600/2019, art. 2º, § 7º-C. Documento juntado aos registros para completar o registro da pesquisa.</p>
<table class=id>
<tr><td>Registros</td><td>TRE-SE <b>SE-09441/2026</b> (Governador, Senador, Deputado Federal, Deputado Estadual) · TSE <b>BR-04041/2026</b> (Presidente da República; campo de coleta: Sergipe). Mesmo levantamento, mesma amostra. Registrados em 22/08/2026.</td></tr>
<tr><td>Entidade realizadora e contratante</td><td>Câmara de Dirigentes Lojistas de Aracaju — CDL Aracaju, CNPJ 13.045.935/0001-36 (recursos próprios; plataforma própria, sem terceirização)</td></tr>
<tr><td>Estatístico responsável</td><td>Danilio Silva Santos — CONRE 8223</td></tr>
<tr><td>Universo</td><td>Eleitorado apto de Sergipe: {n(d['eleitorado_total_se'])} eleitores nos 75 municípios (estatísticas do eleitorado do TSE)</td></tr>
<tr><td>Período de coleta</td><td>01/09/2026 (00h00) a 03/09/2026 (23h59), horário de Brasília — exclusivamente pela internet, em pesquisa.cdlaju.com.br</td></tr>
<tr><td>Amostra realizada</td><td>{n(N)} participantes com identidade verificada; <b>{n(r['total'])} respondentes</b> ({n(r['se'])} com domicílio eleitoral em Sergipe, ponderados; {n(r['fora_se'])} com título de outra UF, peso zero). Planejado: {n(d['planejado_total'])} entrevistas.</td></tr>
<tr><td>Ponderação</td><td>Pós-estratificação por município (75 estratos) pelo eleitorado do TSE. Amostra efetiva (Kish) {n(k['n_eff'])}; deff {f(k['deff'])}.</td></tr>
<tr><td>Margem de erro / confiança</td><td>±{f(k['margem_n']*100,1)} p.p. sobre o total de respondentes e ±{f(k['margem_n_eff']*100,1)} p.p. sobre a amostra efetiva, com 95% de confiança; diferenças inferiores a duas margens são tratadas como empate técnico.</td></tr>
<tr><td>Divulgação</td><td>04/09/2026, 09h14m54s (horário de Brasília), em pesquisa.cdlaju.com.br — contagem direta; percentuais ponderados por município publicados ao lado dos brutos em 06/09/2026.</td></tr>
<tr><td>Situação em 08/09/2026</td><td>Divulgação temporariamente suspensa por decisão do TRE-SE de 07/09/2026 (Rp 0601015-42.2026.6.25.0000); sítio e publicações retirados do ar em 08/09/2026. Este relatório reproduz exclusivamente os resultados já divulgados em 04 e 06/09/2026 e é juntado ao registro para os fins do art. 2º, § 7º-C.</td></tr>
</table>

<h2>1. Metodologia (texto do registro)</h2>{paras(campo1)}
<h2>2. Plano amostral e ponderação (texto do registro)</h2>{paras(campo2)}
<div class=box><b>Ponderação efetivamente aplicada.</b> Os pesos utilizados são os da pós-estratificação por município (peso = share do município no eleitorado ÷ share do município entre os respondentes), com {n(r['se'])} respondentes ponderados; pesos entre {f(k['peso_min']['peso'])} ({esc(k['peso_min']['municipio'])}) e {f(k['peso_max']['peso'])} ({esc(k['peso_max']['municipio'])}). Não foi aplicada ponderação por sexo, faixa etária, grau de instrução ou nível econômico. A tabela por município (eleitorado, planejado, participantes, respondentes e peso) e a Tabela de Estratos e Ponderação constam do arquivo de detalhamento geográfico juntado ao mesmo registro.</div>

<h2>3. Composição da amostra realizada (art. 2º, § 7º, IV)</h2>
<p class=small>Base: {n(N)} participantes com identidade verificada. Sexo, faixa etária e grau de instrução vêm do cadastro; nível econômico é autodeclarado.</p>
{comp_html}

<h2>4. Resultados</h2>
<p class=small>Modo espontâneo, no formato da urna eletrônica (o respondente digita o número do candidato). <b>Votos</b> = contagem direta das cédulas registradas. <b>% válidos (bruto)</b> = votos do candidato ÷ total de votos nominais válidos do cargo. <b>Ponderado</b> = soma dos pesos dos respondentes que votaram no candidato; <b>% válidos (pond.)</b> = ponderado ÷ base nominal ponderada. Brancos e "não sabe" são apresentados sobre o total de respostas ao cargo. Deputados: apuração por legenda (dois primeiros dígitos) e por candidato, como na urna.</p>
{''.join(res_html)}

<h2>5. Cronologia</h2>
<table><tr><th>Data/hora (Brasília)</th><th>Evento</th></tr>
<tr><td>22/08/2026</td><td>Registro no PesqEle (SE-09441/2026 e BR-04041/2026); aviso do TRE-SE gerado às 16h16</td></tr>
<tr><td>01/09/2026 a 03/09/2026</td><td>Coleta digital (encerrada às 23h59 de 03/09)</td></tr>
<tr><td>04/09/2026, 09h14m54s</td><td>Divulgação dos resultados (contagem direta) em pesquisa.cdlaju.com.br</td></tr>
<tr><td>06/09/2026</td><td>Publicação dos percentuais ponderados por município ao lado dos brutos</td></tr>
<tr><td>07/09/2026, 13h12</td><td>Decisão do TRE-SE (tutela) determinando a suspensão da divulgação até a complementação do art. 2º, § 7º, III e IV</td></tr>
<tr><td>08/09/2026, 10h47</td><td>Sítio retirado do ar por inteiro; publicações em redes sociais removidas; emissora comunicada</td></tr>
<tr><td>08/09/2026, tarde</td><td>Complementação (§ 7º, III e IV), arquivo de detalhamento geográfico e este relatório lançados nos dois registros do PesqEle</td></tr>
</table>
<p class=small>Números extraídos do banco de dados da pesquisa em {esc(d['gerado_em_brt'])} (horário de Brasília) por consultas agregadas reproduzíveis; código-fonte público em github.com/presidencia-svg/pesquisa. Nenhum dado pessoal de participante consta deste documento.</p>
</html>"""
base = D / 'pesqele-relatorio-completo-resultados'
base.with_suffix('.html').write_text(doc)
chrome = sys.argv[1] if len(sys.argv) > 1 else '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
subprocess.run([chrome, '--headless=new', '--disable-gpu', '--no-sandbox', '--no-pdf-header-footer',
                f'--print-to-pdf={base.with_suffix(".pdf")}', 'file://' + str(base.with_suffix('.html'))], check=True, capture_output=True)
print('ok', base.with_suffix('.pdf'), base.with_suffix('.pdf').stat().st_size, 'bytes')
