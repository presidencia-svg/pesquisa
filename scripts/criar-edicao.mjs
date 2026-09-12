#!/usr/bin/env node
/**
 * Cria uma edição da pesquisa (inativa) copiando os candidatos de outra.
 *
 * Feito pra 2ª edição (coleta 13–20/09/2026): edição nasce com o método de
 * ponderação por estratos (raking, migration 048), CONRE do estatístico e a
 * meta mínima de respondentes (migration 049). Não ativa a edição: ativar é
 * um clique em /admin/edicoes e desativa a anterior — o que muda a edição
 * lida por /resultados e pelos scripts que usam `ativa = true`
 * (anexo-rp-0601015.mjs, exportar-dados-pericia.mjs, ponderacao-estratos.mjs,
 * verificar-resultados.ts). Rode esses antes de ativar a nova.
 *
 * Depois de criar: `npm run import:tse -- --edicao <id>` (dry-run) e
 * `--gravar` pra atualizar situações do DivulgaCand; fotos e ordem vêm da
 * edição copiada.
 *
 * Uso:
 *   node --env-file=.env.local scripts/criar-edicao.mjs \
 *     --nome "Pesquisa Sergipe 2026 — 2ª edição (1º turno)" \
 *     --inicio 2026-09-13 --fim 2026-09-20 \
 *     [--copiar-de <uuid|ativa>] [--metodo estratos_raking|municipio] \
 *     [--conre 8223] [--meta 50000] [--turno 1] [--por "Nome"] [--gravar]
 *
 * Sem --gravar só mostra o que faria. Início = 00:00:00 e fim = 23:59:59 em
 * America/Recife (UTC−3, sem horário de verão).
 */
import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) throw new Error('faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (rode com --env-file=.env.local)')
const db = createClient(URL, KEY, { auth: { persistSession: false } })

const args = process.argv.slice(2)
const opt = (k, d = null) => (args.includes(k) ? args[args.indexOf(k) + 1] : d)
const GRAVAR = args.includes('--gravar')
const NOME = opt('--nome')
const INICIO = opt('--inicio')
const FIM = opt('--fim')
const COPIAR_DE = opt('--copiar-de', 'ativa')
const METODO = opt('--metodo', 'estratos_raking')
const CONRE = opt('--conre', '8223')
const META = opt('--meta') ? Number(opt('--meta')) : null
const TURNO = Number(opt('--turno', '1'))
const POR = opt('--por', 'scripts/criar-edicao.mjs')

const ymd = /^\d{4}-\d{2}-\d{2}$/
if (!NOME || !INICIO || !FIM || !ymd.test(INICIO) || !ymd.test(FIM)) {
  throw new Error('use --nome, --inicio YYYY-MM-DD e --fim YYYY-MM-DD')
}
if (!['estratos_raking', 'municipio'].includes(METODO)) throw new Error('--metodo inválido')
if (META != null && (!Number.isInteger(META) || META <= 0)) throw new Error('--meta inválida')

const inicioIso = new Date(`${INICIO}T00:00:00-03:00`).toISOString()
const fimIso = new Date(`${FIM}T23:59:59-03:00`).toISOString()
if (new Date(fimIso) <= new Date(inicioIso)) throw new Error('fim deve ser depois do início')

const sel = db.from('edicao').select('id, nome, inicio, fim, ativa')
const { data: origem, error: eOrigem } =
  COPIAR_DE === 'ativa' ? await sel.eq('ativa', true).maybeSingle() : await sel.eq('id', COPIAR_DE).maybeSingle()
if (eOrigem) throw eOrigem
if (!origem) throw new Error(`edição de origem não encontrada (${COPIAR_DE})`)

const { data: dup } = await db.from('edicao').select('id').eq('nome', NOME).maybeSingle()
if (dup) throw new Error(`já existe edição com esse nome (${dup.id})`)

const { data: cands, error: eC } = await db
  .from('candidatos_pesquisa')
  .select('cargo, numero, nome_urna, nome_completo, partido_id, foto_url, ordem, ativo, votos_referencia, ano_referencia, impedimento, companheiros, coligacao')
  .eq('edicao_id', origem.id)
  .limit(2000)
if (eC) throw eC
const porCargo = new Map()
for (const c of cands ?? []) porCargo.set(c.cargo, (porCargo.get(c.cargo) ?? 0) + 1)

console.log(`${GRAVAR ? 'GRAVANDO' : 'DRY-RUN'} — nova edição`)
console.log(`  nome:     ${NOME}`)
console.log(`  coleta:   ${INICIO} 00:00 → ${FIM} 23:59 (America/Recife)  [${inicioIso} → ${fimIso}]`)
console.log(`  método:   ${METODO} · CONRE ${CONRE} · meta ${META ?? '—'} · turno ${TURNO} · ativa: não`)
console.log(`  candidatos copiados de "${origem.nome}" (${origem.id}):`)
for (const [cargo, n] of [...porCargo.entries()].sort()) console.log(`    ${cargo.padEnd(11)} ${n}`)
if (!GRAVAR) {
  console.log('\nnada gravado (use --gravar).')
  process.exit(0)
}

const { data: nova, error: eNova } = await db
  .from('edicao')
  .insert({
    nome: NOME,
    inicio: inicioIso,
    fim: fimIso,
    ativa: false,
    registro_tre: null,
    turno: TURNO,
    numero_conre_responsavel: CONRE,
    exigir_localizacao: false,
    consulta_zona_ativa: false,
    ponderacao_metodo: METODO,
    meta_amostra: META,
  })
  .select('id')
  .single()
if (eNova) throw eNova

const linhas = (cands ?? []).map((c) => ({ ...c, edicao_id: nova.id }))
for (let i = 0; i < linhas.length; i += 500) {
  const { error } = await db.from('candidatos_pesquisa').insert(linhas.slice(i, i + 500))
  if (error) throw error
}

await db.from('admin_audit_log').insert({
  acao: 'edicao_criada',
  recurso: `edicao:${nova.id}`,
  detalhe: {
    por: POR,
    nome: NOME,
    inicio: inicioIso,
    fim: fimIso,
    ponderacao_metodo: METODO,
    numero_conre_responsavel: CONRE,
    meta_amostra: META,
    candidatos_copiados_de: origem.id,
    candidatos: linhas.length,
  },
})

console.log(`\ncriada: ${nova.id} — ${linhas.length} candidatos copiados. Próximos passos:`)
console.log(`  npm run import:tse -- --edicao ${nova.id}            # dry-run DivulgaCand`)
console.log(`  npm run import:tse -- --edicao ${nova.id} --gravar   # atualiza situações`)
console.log(`  /admin/edicoes → Ativar (só na hora de abrir a coleta)`)
