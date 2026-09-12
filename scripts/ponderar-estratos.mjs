#!/usr/bin/env node
/**
 * Executa a ponderação por estratos (raking nas marginais município × sexo ×
 * faixa etária × instrução do eleitorado TSE) NO BANCO — função
 * ponderar_estratos_raking da migration 048 — e imprime os diagnósticos da
 * execução gravada (n efetivo de Kish, deff, margem efetiva, pesos extremos).
 *
 * Fluxo previsto (docs/metodologia.md, seção 2.3):
 *   1. coleta encerrada (edicao.fim no passado);
 *   2. eleitorado TSE importado (scripts/importar-eleitorado-tse.mjs);
 *   3. este script → grava execução + pesos por célula e aponta a edição
 *      pra execução (edicao.ponderacao_execucao_id);
 *   4. estatístico CONRE confere os números e registra a aprovação no
 *      /admin/edicoes (TOTP) — sem isso a divulgação não abre.
 *
 * Nunca calcula peso em memória a partir de páginas de 1.000 linhas: tudo
 * acontece dentro do Postgres, sobre a base completa. Nenhuma coluna pessoal
 * é lida aqui.
 *
 * Uso: node --env-file=.env.local scripts/ponderar-estratos.mjs [--edicao <uuid>] [--importacao <uuid>]
 *        [--por "Nome — CONRE"] [--comparar docs/juridico/rp-0601015-42/ponderacao-completa.json]
 *        [--permitir-coleta-aberta]
 *
 * --comparar confere a execução contra o doc. 16 da Rp 0601015-42 (variante
 * C, kish.C): n com peso, n efetivo, deff, peso máximo e margem efetiva.
 */
import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) throw new Error('faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (rode com --env-file=.env.local)')
const db = createClient(URL, KEY, { auth: { persistSession: false } })

const args = process.argv.slice(2)
const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null)
const EDICAO = opt('--edicao')
const IMPORTACAO = opt('--importacao')
const POR = opt('--por')
const COMPARAR = opt('--comparar')
const PERMITIR_ABERTA = args.includes('--permitir-coleta-aberta')

const fmt = (x, d = 4) => (x == null ? '—' : Number(x).toLocaleString('pt-BR', { maximumFractionDigits: d }))
const pp = (x) => (x == null ? '—' : `±${(Number(x) * 100).toFixed(3)} p.p.`)
const TZ = 'America/Recife'
const dt = (iso) => new Date(iso).toLocaleString('pt-BR', { timeZone: TZ })

async function main() {
  // 1. edição
  const q = db.from('edicao').select('id, nome, inicio, fim, ponderacao_metodo, ponderacao_execucao_id, ponderacao_aprovada_em')
  const { data: ed, error: eEd } = EDICAO ? await q.eq('id', EDICAO).single() : await q.eq('ativa', true).single()
  if (eEd || !ed) throw new Error(`edição não encontrada: ${eEd?.message ?? ''}`)
  console.log(`Edição: ${ed.nome} (${ed.id})`)
  console.log(`Coleta: ${dt(ed.inicio)} → ${dt(ed.fim)} · método vigente: ${ed.ponderacao_metodo}`)

  if (new Date(ed.fim) > new Date()) {
    if (!PERMITIR_ABERTA) {
      throw new Error('coleta ainda aberta — a ponderação oficial só se executa sobre a base final (use --permitir-coleta-aberta só pra ensaio; a divulgação recusa execução anterior ao fim)')
    }
    console.warn('AVISO: coleta aberta — execução de ENSAIO; refaça depois do fim da coleta.')
  }

  // 2. importação do eleitorado
  const qi = db.from('eleitorado_tse_importacao').select('id, arquivo, ano, total_se, total_mapeado, importado_em')
  const { data: imp } = IMPORTACAO
    ? await qi.eq('id', IMPORTACAO).single()
    : await qi.order('importado_em', { ascending: false }).limit(1).maybeSingle()
  if (!imp) throw new Error('nenhum eleitorado TSE importado — rode scripts/importar-eleitorado-tse.mjs')
  console.log(`Eleitorado: ${imp.arquivo} (${imp.ano ?? '?'}) · ${fmt(imp.total_se, 0)} eleitores, ${fmt(imp.total_mapeado, 0)} mapeados · importado em ${dt(imp.importado_em)}`)

  // 3. raking no banco
  const t0 = Date.now()
  const { data: execId, error } = await db.rpc('ponderar_estratos_raking', {
    p_edicao: ed.id,
    p_importacao: imp.id,
    p_executado_por: POR,
  })
  if (error) throw new Error(`ponderar_estratos_raking: ${error.message}`)
  console.log(`\nExecução ${execId} gravada em ${((Date.now() - t0) / 1000).toFixed(1)}s`)

  const { data: x, error: eX } = await db
    .from('ponderacao_execucao')
    .select('*')
    .eq('id', execId)
    .single()
  if (eX || !x) throw new Error(`execução não lida: ${eX?.message ?? ''}`)

  console.log(`  convergiu: ${x.convergiu ? 'sim' : 'NÃO'} em ${x.iteracoes} iterações (desvio máx ${fmt(x.desvio_max, 12)})`)
  console.log(`  respondentes: ${fmt(x.respondentes_total ?? x.n_peso_positivo, 0)} · com peso > 0: ${fmt(x.n_peso_positivo, 0)}`)
  console.log(`  Σw = ${fmt(x.soma_w, 4)} · Σw² = ${fmt(x.soma_w2, 4)}`)
  console.log(`  n efetivo (Kish) = ${fmt(x.n_eff, 3)} · deff = ${fmt(x.deff, 4)}`)
  console.log(`  pesos: mín ${fmt(x.peso_min, 4)} · mediana ${fmt(x.peso_mediana, 4)} · p95 ${fmt(x.peso_p95, 4)} · p99 ${fmt(x.peso_p99, 4)} · máx ${fmt(x.peso_max, 4)}`)
  console.log(`  margem nominal ${pp(x.margem_nominal)} · margem EFETIVA ${pp(x.margem_efetiva)} (95%)`)

  // 4. a edição passa a apontar pra execução? Só quando o método já é
  // estratos (a troca de método é ação do admin com TOTP). Se ainda é
  // 'municipio', só gravamos o ponteiro da execução pra ficar auditável —
  // as views públicas continuam por município até o admin trocar.
  const { error: eUp } = await db
    .from('edicao')
    .update({ ponderacao_execucao_id: execId, ponderacao_aprovada_em: null, ponderacao_aprovada_por: null })
    .eq('id', ed.id)
  if (eUp) throw new Error(`edicao.ponderacao_execucao_id: ${eUp.message}`)
  console.log(`\nedicao.ponderacao_execucao_id ← ${execId}; aprovação do estatístico zerada (precisa aprovar esta execução).`)
  if (ed.ponderacao_metodo !== 'estratos_raking') {
    console.log('Método da edição ainda é "municipio": o público segue vendo por município até o admin definir "estratos_raking" (TOTP) em /admin/edicoes.')
  }

  // 5. auditoria (mesma tabela do painel; sem IP porque é CLI)
  await db.from('admin_audit_log').insert({
    acao: 'executar_ponderacao',
    recurso: `edicao:${ed.id}`,
    detalhe: {
      execucao_id: execId,
      importacao_id: imp.id,
      executado_por: POR,
      n_eff: x.n_eff,
      deff: x.deff,
      margem_efetiva: x.margem_efetiva,
      convergiu: x.convergiu,
      origem: 'scripts/ponderar-estratos.mjs',
    },
    ip: null,
    user_agent: 'cli',
  })

  // 6. comparação opcional com o doc. 16
  if (COMPARAR) {
    if (!existsSync(COMPARAR)) throw new Error(`arquivo de comparação não existe: ${COMPARAR}`)
    const ref = JSON.parse(readFileSync(COMPARAR, 'utf8'))
    const k = ref?.kish?.C
    if (!k) throw new Error('JSON sem kish.C')
    const linhas = [
      ['n com peso', k.n_peso_positivo, x.n_peso_positivo, 0],
      ['n efetivo', k.n_eff, x.n_eff, 1e-3],
      ['deff', k.deff, x.deff, 1e-4],
      ['peso máx', k.max, x.peso_max, 1e-4],
      ['margem efetiva', k.margem_n_eff, x.margem_efetiva, 1e-6],
      ['iterações', ref?.raking?.C?.iteracoes ?? ref?.raking?.iteracoes, x.iteracoes, 0],
    ]
    let ok = true
    console.log(`\nComparação com ${COMPARAR} (variante C):`)
    for (const [l, a, b, tol] of linhas) {
      if (a == null) { console.log(`  ${l}: referência ausente`); continue }
      const d = Math.abs(Number(a) - Number(b))
      const bate = d <= tol
      ok = ok && bate
      console.log(`  ${bate ? '✓' : '✗'} ${l}: ref ${fmt(a, 6)} · banco ${fmt(b, 6)}${bate ? '' : ` (Δ ${fmt(d, 6)})`}`)
    }
    if (!ok) { console.error('\n✗ divergência com a referência'); process.exit(1) }
    console.log('✓ execução no banco reproduz a referência.')
  }
}

main().catch((e) => { console.error('ERRO', e.message ?? e); process.exit(1) })
