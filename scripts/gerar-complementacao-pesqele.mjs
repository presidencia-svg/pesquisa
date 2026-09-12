#!/usr/bin/env node
/**
 * Complementação do registro no PesqEle — art. 2º, §7º, III e IV da
 * Res.-TSE 23.600/2019 (red. Res. 23.747/2026) — e ficha técnica do art. 10,
 * geradas POR EDIÇÃO direto do banco, só com agregados.
 *
 * Lição da Rp 0601015-42: a complementação (pesquisados por unidade
 * territorial + composição da amostra final) tem de ser lançada no PesqEle
 * ANTES da divulgação, e o texto tem de descrever a ponderação que foi de
 * fato aplicada. Este script tira isso do estado real da edição:
 *   • respondentes por município (v_amostra_marginais);
 *   • composição por sexo, faixa etária e instrução (idem);
 *   • ponderação: método vigente da edição e, se raking, os diagnósticos da
 *     execução gravada (n efetivo, deff, margem efetiva, pesos extremos);
 *   • ficha técnica do art. 10 (contratante, registro, período, n, margem,
 *     estatístico CONRE, método).
 *
 * Nenhuma coluna pessoal é lida. Os números de respondentes entram porque
 * são exigidos pelo registro (peça regulatória, não peça de divulgação).
 *
 * Saídas (docs/pesqele/):
 *   complementacao-<data>-<edicao>.md      — texto explicado, pra revisão
 *   campo-III-<data>-<edicao>.txt          — bloco pra colar no PesqEle
 *   campo-IV-<data>-<edicao>.txt           — idem
 *   ficha-tecnica-art10-<data>-<edicao>.txt
 * Os .txt são conferidos contra Latin-1 e o limite de 4.000 caracteres do
 * campo do PesqEle (o sistema grava travessão como '¿' — trocado por hífen).
 *
 * Uso: node --env-file=.env.local scripts/gerar-complementacao-pesqele.mjs [--edicao <uuid>]
 */
import { createClient } from '@supabase/supabase-js'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) throw new Error('faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (rode com --env-file=.env.local)')
const db = createClient(URL, KEY, { auth: { persistSession: false } })

const args = process.argv.slice(2)
const EDICAO = args.includes('--edicao') ? args[args.indexOf('--edicao') + 1] : null
const OUT_DIR = process.env.SAIDA_DIR ?? 'docs/pesqele'
const LIMITE_CAMPO = 4000
const TZ = 'America/Recife'

const fmtInt = (n) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 0 })
const fmtNum = (n, d = 2) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })
const fmtPct = (x, d = 1) => `${fmtNum(100 * x, d)}%`
const diaBRT = (iso) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: TZ })
const horaBRT = (iso) => new Date(iso).toLocaleString('pt-BR', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' })
const ROT = {
  sexo: { M: 'Masculino', F: 'Feminino', NI: 'Não informado' },
  escolaridade: { fundamental: 'Fundamental', medio: 'Médio', superior: 'Superior', NI: 'Não informado' },
}
const ORDEM = {
  sexo: ['M', 'F', 'NI'],
  faixa: ['16-17', '18-24', '25-34', '35-44', '45-59', '60+', 'NI'],
  escolaridade: ['fundamental', 'medio', 'superior', 'NI'],
}

/** Texto seguro pro campo do PesqEle: Latin-1, sem travessão. */
function paraCampo(s) {
  const t = s.replace(/[—–]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/…/g, '...')
  const volta = Buffer.from(t, 'latin1').toString('latin1')
  if (volta !== t) {
    const ruins = [...new Set([...t].filter((c) => c.charCodeAt(0) > 255))]
    throw new Error(`caracteres fora do Latin-1 no texto do campo: ${ruins.join(' ')}`)
  }
  return t
}

async function main() {
  const q = db.from('edicao').select('*')
  const { data: ed, error: eEd } = EDICAO ? await q.eq('id', EDICAO).single() : await q.eq('ativa', true).single()
  if (eEd || !ed) throw new Error(`edição não encontrada: ${eEd?.message ?? ''}`)
  const fimMs = new Date(ed.fim).getTime()
  const coletaAberta = fimMs > Date.now()
  if (coletaAberta) console.warn('AVISO: coleta ainda aberta — a complementação oficial usa a amostra FINAL; este é um rascunho.')

  const [{ data: marg, error: eM }, { data: muns }, { data: exec }] = await Promise.all([
    db.from('v_amostra_marginais').select('dimensao, categoria, respondentes').eq('edicao_id', ed.id).limit(1000),
    db.from('municipios_se').select('ibge_codigo, nome, eleitorado').limit(1000),
    ed.ponderacao_execucao_id
      ? db.from('ponderacao_execucao').select('*').eq('id', ed.ponderacao_execucao_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  if (eM) throw new Error(`v_amostra_marginais: ${eM.message}`)
  if (!marg?.length) throw new Error('edição sem respondentes validados')

  const dim = (d) => {
    const m = new Map()
    for (const r of marg) if (r.dimensao === d) m.set(r.categoria, Number(r.respondentes))
    return m
  }
  const sexo = dim('sexo'), faixa = dim('faixa'), escol = dim('escolaridade'), mun = dim('municipio')
  const total = [...sexo.values()].reduce((s, v) => s + v, 0)
  const eleitoradoTotal = (muns ?? []).reduce((s, m) => s + Number(m.eleitorado), 0)

  const linhasMun = [...(muns ?? [])]
    .map((m) => ({ nome: m.nome, eleitorado: Number(m.eleitorado), respondentes: mun.get(String(m.ibge_codigo)) ?? 0 }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  const respSE = linhasMun.reduce((s, m) => s + m.respondentes, 0)
  const munComResp = linhasMun.filter((m) => m.respondentes > 0).length
  const respForaOuSem = total - respSE

  const metodo = ed.ponderacao_metodo === 'estratos_raking' ? 'estratos_raking' : 'municipio'
  const estatistico = ed.numero_conre_responsavel ? `CONRE ${ed.numero_conre_responsavel}` : 'CONRE a informar'

  // ---------------------------------------------------------------- III
  const periodo = `${diaBRT(ed.inicio)} a ${diaBRT(new Date(fimMs - 1000).toISOString())}`
  const III = []
  III.push(`NÚMERO DE PESQUISADOS POR UNIDADE TERRITORIAL (art. 2º, §7º, III) — amostra final da coleta de ${periodo}.`)
  III.push(`Unidade territorial: MUNICÍPIO (coleta digital estadual, com identidade verificada por CPF e WhatsApp, sem abordagem domiciliar; o setor censitário não é unidade operacional da coleta). Total de respondentes: ${fmtInt(total)}, sendo ${fmtInt(respSE)} em ${munComResp} dos ${linhasMun.length} municípios de Sergipe${respForaOuSem > 0 ? ` e ${fmtInt(respForaOuSem)} sem município de Sergipe (peso zero, fora dos percentuais)` : ''}. Formato: Município - eleitorado TSE / respondentes.`)
  III.push(linhasMun.map((m) => `${m.nome} - ${fmtInt(m.eleitorado)} / ${fmtInt(m.respondentes)}`).join('; ') + '.')
  III.push(`Eleitorado total de referência: ${fmtInt(eleitoradoTotal)} (TSE).`)

  // ----------------------------------------------------------------- IV
  const comp = (d, m) => ORDEM[d].filter((k) => m.has(k)).map((k) => `${ROT[d]?.[k] ?? k} ${fmtInt(m.get(k))} (${fmtPct(m.get(k) / total)})`).join('; ')
  const IV = []
  IV.push(`COMPOSIÇÃO DA AMOSTRA FINAL (art. 2º, §7º, IV) — ${fmtInt(total)} respondentes com identidade verificada (CPF + WhatsApp), coleta de ${periodo}.`)
  IV.push(`SEXO: ${comp('sexo', sexo)}.`)
  IV.push(`FAIXA ETÁRIA: ${comp('faixa', faixa)}.`)
  IV.push(`GRAU DE INSTRUÇÃO: ${comp('escolaridade', escol)}.`)
  if (metodo === 'estratos_raking') {
    if (!exec) throw new Error('método estratos_raking sem execução gravada — rode scripts/ponderar-estratos.mjs')
    IV.push(`PONDERAÇÃO APLICADA: raking (ajuste proporcional iterativo) nas marginais do eleitorado TSE por município, sexo, faixa etária e grau de instrução, conforme o plano amostral registrado; respondentes sem sexo informado são ajustados nas demais marginais. Execução em ${horaBRT(exec.executado_em)}${exec.convergiu ? `, convergida em ${exec.iteracoes} iterações` : ' (NÃO CONVERGIDA)'}; pesos entre ${fmtNum(exec.peso_min, 3)} e ${fmtNum(exec.peso_max, 3)} (mediana ${fmtNum(exec.peso_mediana, 3)}); amostra efetiva (Kish) ${fmtNum(exec.n_eff, 0)}; efeito de desenho ${fmtNum(exec.deff, 2)}; margem de erro (95%) ±${fmtNum(100 * exec.margem_nominal, 1)} p.p. nominal e ±${fmtNum(100 * exec.margem_efetiva, 1)} p.p. sobre a amostra efetiva. ${ed.ponderacao_aprovada_por ? `Ponderação conferida e aprovada por ${ed.ponderacao_aprovada_por} em ${horaBRT(ed.ponderacao_aprovada_em)}.` : 'Aprovação do estatístico responsável pendente.'}`)
  } else {
    IV.push(`PONDERAÇÃO APLICADA: pós-estratificação por município pelo eleitorado TSE (peso = proporção do município no eleitorado ÷ proporção do município na amostra). ${ed.ponderacao_aprovada_por ? `Conferida por ${ed.ponderacao_aprovada_por}.` : 'Aprovação do estatístico responsável pendente.'}`)
  }
  IV.push('Resultados divulgados com o percentual ponderado ao lado do bruto (contagem simples); cruzamentos só com no mínimo 30 respondentes por célula.')

  // ------------------------------------------------------------ art. 10
  const margemNominal = 1.96 * Math.sqrt(0.25 / Math.max(total, 1))
  const F = []
  F.push(`FICHA TÉCNICA (Res.-TSE 23.600/2019, art. 10) — ${ed.nome}.`)
  F.push(`Contratante e responsável pela realização: CDL Aracaju (CNPJ 13.045.935/0001-36), com recursos próprios; sem terceirização.`)
  F.push(`Registro: ${ed.registro_tre ?? 'a informar'}${ed.data_registro_pesqele ? `, em ${diaBRT(ed.data_registro_pesqele)}` : ''}.`)
  F.push(`Período de coleta: ${periodo}. Metodologia: pesquisa quantitativa pela internet, autopreenchimento, resposta espontânea no formato da urna, identidade verificada (CPF + WhatsApp), uma participação por CPF.`)
  F.push(`Respondentes: ${fmtInt(total)}. Nível de confiança: 95%. Margem de erro: ±${fmtNum(100 * margemNominal, 1)} p.p. nominal${exec ? ` e ±${fmtNum(100 * exec.margem_efetiva, 1)} p.p. sobre a amostra efetiva de ${fmtNum(exec.n_eff, 0)} (Kish)` : ''}.`)
  F.push(`Ponderação: ${metodo === 'estratos_raking' ? 'raking nas marginais município × sexo × faixa etária × grau de instrução do eleitorado TSE' : 'pós-estratificação por município pelo eleitorado TSE'}. Estatístico responsável: ${estatistico}.`)
  F.push(`Divulgação: ${ed.divulgada_em ? horaBRT(ed.divulgada_em) : 'prevista para após a complementação e a aprovação do estatístico'}; percentual ponderado ao lado do bruto.`)

  // ------------------------------------------------------------- saída
  mkdirSync(OUT_DIR, { recursive: true })
  const slug = (ed.registro_tre ?? ed.id.slice(0, 8)).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const hojeISO = new Date().toISOString().slice(0, 10)
  const arq = (p) => join(OUT_DIR, `${p}-${hojeISO}-${slug}`)

  const blocos = [['campo-III', III], ['campo-IV', IV], ['ficha-tecnica-art10', F]]
  const avisos = []
  for (const [nome, linhas] of blocos) {
    const txt = paraCampo(linhas.join('\n'))
    if (txt.length > LIMITE_CAMPO) avisos.push(`${nome}: ${txt.length} caracteres — acima de ${LIMITE_CAMPO}; divida em dois lançamentos ou anexe o quadro em PDF`)
    writeFileSync(arq(nome) + '.txt', txt, 'latin1')
  }

  const M = []
  M.push(`# Complementação PesqEle — ${ed.nome}`)
  M.push('')
  M.push(`Gerado em ${horaBRT(new Date().toISOString())} por \`scripts/gerar-complementacao-pesqele.mjs\` a partir do banco (só agregados). ${coletaAberta ? '**RASCUNHO — coleta ainda aberta.**' : 'Amostra final.'}`)
  M.push('')
  M.push(`Registro: ${ed.registro_tre ?? '—'} · método de ponderação vigente: **${metodo}** · execução: ${exec ? `${exec.id} (${horaBRT(exec.executado_em)})` : '—'} · aprovação: ${ed.ponderacao_aprovada_por ? `${ed.ponderacao_aprovada_por}, ${horaBRT(ed.ponderacao_aprovada_em)}` : '**pendente**'} · complementação lançada: ${ed.complementacao_pesqele_em ? horaBRT(ed.complementacao_pesqele_em) : '**pendente**'}.`)
  M.push('')
  M.push('Ordem obrigatória (o botão Divulgar só abre depois): 1) coleta encerrada → 2) `ponderar-estratos.mjs` → 3) estatístico aprova em /admin/edicoes → 4) lançar os blocos abaixo no PesqEle (nos dois registros, quando houver) e registrar a data em /admin/edicoes → 5) divulgar.')
  M.push('')
  for (const [nome, linhas] of blocos) {
    M.push(`## ${nome}`)
    M.push('')
    M.push('```')
    M.push(...linhas)
    M.push('```')
    M.push('')
  }
  if (avisos.length) {
    M.push('## Avisos')
    M.push('')
    for (const a of avisos) M.push(`- ${a}`)
    M.push('')
  }
  writeFileSync(arq('complementacao') + '.md', M.join('\n'))

  console.log('ok →', arq('complementacao') + '.md', '+ campo-III/campo-IV/ficha-tecnica-art10 .txt')
  console.log({ edicao: ed.id, respondentes: total, respSE, municipiosComResp: munComResp, metodo, execucao: exec?.id ?? null, aprovada: Boolean(ed.ponderacao_aprovada_em), complementacao: ed.complementacao_pesqele_em })
  for (const a of avisos) console.warn('AVISO:', a)
}

main().catch((e) => { console.error('ERRO', e.message ?? e); process.exit(1) })
