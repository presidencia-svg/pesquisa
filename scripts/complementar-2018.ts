/**
 * Complementa os dados de deputado com a eleição de 2018 (Sergipe).
 *
 * Fonte: TSE dados abertos (cdn.tse.jus.br), coletado e reconciliado.
 *
 * O QUE FAZ (edição ATIVA):
 *   1. Adiciona candidatos reais de 2018 pros partidos fortes em 2018 que HOJE
 *      não têm candidato no roster (PSC, MDB, REDE, Podemos, PSDB no estadual;
 *      PDT, PSC no federal). Números 2018, sem conflito (esses partidos não
 *      estão no roster atual).
 *   2. Re-escala `votos_referencia` de TODOS os candidatos fed/est pra que a
 *      soma de cada partido == a força dele em 2018 (mapeada 2018→2026:
 *      PR→PL, PRB→Republicanos, PPS→Cidadania, SD→Solidariedade, PODE→Podemos,
 *      DEM+PSL→União). A simulação pondera por `votos_referencia`, então isso
 *      faz as PROPORÇÕES por partido virarem as de 2018, preservando a ordem
 *      interna de cada legenda.
 *   3. Re-simula SÓ os votos de deputado (federal+estadual), preservando os
 *      mesmos respondentes (token_hash), municípios, demografia e os votos de
 *      Presidente/Governador/Senador (que NÃO mudam).
 *
 * Uso: npx tsx scripts/complementar-2018.ts [--apply]
 *   Sem --apply: dry-run (só imprime o que faria). Com --apply: executa.
 */
import { config as dotenvConfig } from 'dotenv'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

dotenvConfig({ path: path.resolve(process.cwd(), '.env.local') })

const APPLY = process.argv.includes('--apply')

const env = process.env
const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env.local')
  process.exit(1)
}
const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ---- Força por partido em 2018 (mapeada 2018→2026, sigla do banco) ----
const ALVO_FEDERAL: Record<string, number> = {
  PT: 135028, PSD: 107523, PSC: 89898, MDB: 88249, PL: 73441, PP: 71254,
  SOLIDARIEDADE: 65342, PDT: 43130, REPUBLICANOS: 42599, UNIAO: 23410,
  PSOL: 20378, PODEMOS: 13841, PSDB: 13135, PV: 12659, PCdoB: 10857, PSB: 48502,
}
const ALVO_ESTADUAL: Record<string, number> = {
  PSD: 143452, PSC: 131133, MDB: 93644, PT: 85905, REDE: 79571, PL: 74559,
  PTB: 58028, PSB: 57537, CIDADANIA: 49179, PODEMOS: 44259, REPUBLICANOS: 43318,
  PSDB: 38677, PCdoB: 28147, UNIAO: 27618, PSOL: 13740, PV: 6674, PP: 5058, PDT: 5025,
}

// ---- Candidatos reais de 2018 a adicionar (partidos ausentes do roster) ----
// [nome_urna, numero, votos_2018]
type NovoCand = { sigla: string; nome: string; numero: number; votos: number }
const NOVOS_ESTADUAL: NovoCand[] = [
  { sigla: 'PSC', nome: 'GILMAR CARVALHO', numero: 20222, votos: 34160 },
  { sigla: 'PSC', nome: 'IBRAIN MONTEIRO', numero: 20000, votos: 32059 },
  { sigla: 'PSC', nome: 'DR. VANDERBAL', numero: 20111, votos: 26054 },
  { sigla: 'PSC', nome: 'CAPITÃO SAMUEL', numero: 20123, votos: 15770 },
  { sigla: 'MDB', nome: 'ZEZINHO GUIMARÃES', numero: 15555, votos: 28094 },
  { sigla: 'REDE', nome: 'KITTY LIMA', numero: 18000, votos: 18008 },
  { sigla: 'PODEMOS', nome: 'ZEZINHO SOBRAL', numero: 19000, votos: 25764 },
  { sigla: 'PODEMOS', nome: 'DINÁ ALMEIDA', numero: 19111, votos: 20168 },
  { sigla: 'PSDB', nome: 'MARIA MENDONÇA', numero: 45555, votos: 19102 },
]
const NOVOS_FEDERAL: NovoCand[] = [
  { sigla: 'PDT', nome: 'FÁBIO HENRIQUE', numero: 1212, votos: 35226 },
  { sigla: 'PSC', nome: 'VALDEVAN NOVENTA', numero: 2090, votos: 45472 },
]

function sortear<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}

/** Lê todas as linhas de uma query paginando (PostgREST corta em 1000). */
async function lerTudo<T>(
  fazer: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const PAG = 1000
  const out: T[] = []
  for (let de = 0; ; de += PAG) {
    const { data, error } = await fazer(de, de + PAG - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    out.push(...data)
    if (data.length < PAG) break
  }
  return out
}

async function main() {
  console.log(`\n=== Complementar com 2018 ${APPLY ? '(APLICANDO)' : '(dry-run)'} ===\n`)

  const { data: edicao } = await db
    .from('edicao').select('id, nome').eq('ativa', true).maybeSingle()
  if (!edicao) throw new Error('Sem edição ativa')
  console.log(`Edição: ${edicao.nome} (${edicao.id})`)

  // Partidos por sigla
  const { data: partidosDb } = await db.from('partidos').select('id, sigla')
  const partidoIdPorSigla = new Map<string, string>()
  for (const p of (partidosDb ?? []) as Array<{ id: string; sigla: string }>) {
    partidoIdPorSigla.set(p.sigla, p.id)
  }

  // 1) Inserir candidatos faltantes (idempotente por cargo+numero)
  const candExistentes = await lerTudo<{ cargo: string; numero: number }>((de, ate) =>
    db.from('candidatos_pesquisa').select('cargo, numero')
      .eq('edicao_id', edicao.id).in('cargo', ['federal', 'estadual']).range(de, ate),
  )
  const jaExiste = new Set(candExistentes.map((c) => `${c.cargo}:${c.numero}`))

  const inserts: Array<Record<string, unknown>> = []
  for (const [cargo, lista] of [['estadual', NOVOS_ESTADUAL], ['federal', NOVOS_FEDERAL]] as const) {
    for (const c of lista) {
      if (jaExiste.has(`${cargo}:${c.numero}`)) {
        console.log(`  = já existe ${cargo} ${c.numero} ${c.nome}, pulo`)
        continue
      }
      const pid = partidoIdPorSigla.get(c.sigla)
      if (!pid) { console.log(`  ! sigla ${c.sigla} não encontrada, pulo ${c.nome}`); continue }
      inserts.push({
        edicao_id: edicao.id, cargo, numero: c.numero, nome_urna: c.nome,
        nome_completo: c.nome, partido_id: pid, votos_referencia: c.votos,
        ano_referencia: 2018, ativo: true,
      })
    }
  }
  console.log(`\n1) Candidatos a adicionar: ${inserts.length}`)
  inserts.forEach((c) => console.log(`   + ${c.cargo} ${c.numero} ${c.nome_urna} (${c.votos_referencia} votos 2018)`))
  if (APPLY && inserts.length) {
    const { error } = await db.from('candidatos_pesquisa').insert(inserts)
    if (error) throw error
    console.log('   → inseridos.')
  }

  // 2) Re-escalar votos_referencia pra força de 2018 por partido
  for (const cargo of ['federal', 'estadual'] as const) {
    const alvo = cargo === 'federal' ? ALVO_FEDERAL : ALVO_ESTADUAL
    const cands = await lerTudo<{ id: string; numero: number; nome_urna: string; partido_id: string; votos_referencia: number | null }>((de, ate) =>
      db.from('candidatos_pesquisa')
        .select('id, numero, nome_urna, partido_id, votos_referencia')
        .eq('edicao_id', edicao.id).eq('cargo', cargo).eq('ativo', true).range(de, ate),
    )
    const siglaPorId = new Map<string, string>()
    for (const [sigla, id] of partidoIdPorSigla) siglaPorId.set(id, sigla)

    // soma dos pesos atuais por partido
    const somaPorPartido = new Map<string, number>()
    for (const c of cands) {
      const w = Math.max(c.votos_referencia ?? 1, 1)
      somaPorPartido.set(c.partido_id, (somaPorPartido.get(c.partido_id) ?? 0) + w)
    }
    console.log(`\n2) Re-escala ${cargo}:`)
    for (const c of cands) {
      const sigla = siglaPorId.get(c.partido_id) ?? '?'
      const target = alvo[sigla]
      if (!target) continue // partido sem alvo 2018 — mantém
      const w = Math.max(c.votos_referencia ?? 1, 1)
      const soma = somaPorPartido.get(c.partido_id) ?? 1
      const novoRef = Math.max(Math.round((target * w) / soma), 1)
      if (APPLY) {
        const { error } = await db.from('candidatos_pesquisa')
          .update({ votos_referencia: novoRef, ano_referencia: 2018 }).eq('id', c.id)
        if (error) throw error
      }
    }
    // resumo por partido
    const resumo = new Map<string, number>()
    for (const c of cands) {
      const sigla = siglaPorId.get(c.partido_id) ?? '?'
      resumo.set(sigla, alvo[sigla] ?? resumo.get(sigla) ?? 0)
    }
    const ordenado = [...resumo.entries()].sort((a, b) => b[1] - a[1])
    const tot = ordenado.reduce((s, [, v]) => s + v, 0)
    for (const [sigla, v] of ordenado) {
      console.log(`   ${sigla.padEnd(14)} ${((v / tot) * 100).toFixed(1).padStart(5)}%  (alvo ${v})`)
    }
  }

  // 3) Re-simular deputado (fed+est) preservando respondentes
  console.log(`\n3) Re-simular deputado:`)
  // respondentes = 1 linha por token (via voto de presidente), com município/demo
  const resp = await lerTudo<{
    token_hash: string; municipio_ibge: number | null
    sexo: string | null; faixa_etaria: string | null
    escolaridade: string | null; nivel_economico: string | null
  }>((de, ate) =>
    db.from('votos_pesquisa')
      .select('token_hash, municipio_ibge, sexo, faixa_etaria, escolaridade, nivel_economico')
      .eq('edicao_id', edicao.id).eq('cargo', 'presidente').range(de, ate),
  )
  console.log(`   respondentes: ${resp.length}`)

  // candidatos fed/est com refs já re-escaladas (recarrega)
  const candCargo: Record<string, Array<{ id: string; partido_id: string; ref: number }>> = {}
  for (const cargo of ['federal', 'estadual'] as const) {
    const cs = await lerTudo<{ id: string; partido_id: string; votos_referencia: number | null }>((de, ate) =>
      db.from('candidatos_pesquisa').select('id, partido_id, votos_referencia')
        .eq('edicao_id', edicao.id).eq('cargo', cargo).eq('ativo', true).range(de, ate),
    )
    candCargo[cargo] = cs.map((c) => ({ id: c.id, partido_id: c.partido_id, ref: Math.max(c.votos_referencia ?? 1, 1) }))
  }

  if (!APPLY) {
    console.log('   (dry-run — não apaga nem insere votos)')
    console.log('\nDry-run OK. Rode com --apply pra executar.\n')
    return
  }

  const horaIso = new Date().toISOString()
  // apaga votos fed/est atuais
  for (const cargo of ['federal', 'estadual'] as const) {
    const { error } = await db.from('votos_pesquisa').delete()
      .eq('edicao_id', edicao.id).eq('cargo', cargo)
    if (error) throw error
  }
  console.log('   votos fed/est antigos apagados.')

  // gera novos
  let buffer: Array<Record<string, unknown>> = []
  let total = 0
  const flush = async () => {
    if (!buffer.length) return
    const { error } = await db.from('votos_pesquisa').insert(buffer)
    if (error) throw error
    total += buffer.length
    buffer = []
  }
  for (const r of resp) {
    for (const cargo of ['federal', 'estadual'] as const) {
      const cands = candCargo[cargo]
      const roll = Math.random()
      const base = {
        token_hash: r.token_hash, edicao_id: edicao.id, cargo,
        resposta: null, municipio_ibge: r.municipio_ibge, criado_hora: horaIso,
        sexo: r.sexo, faixa_etaria: r.faixa_etaria,
        escolaridade: r.escolaridade, nivel_economico: r.nivel_economico,
      }
      if (roll < 0.05) {
        buffer.push({ ...base, candidato_id: null, partido_id: null, metodo: 'branco' })
      } else if (roll < 0.10) {
        buffer.push({ ...base, candidato_id: null, partido_id: null, metodo: 'nao_sabe' })
      } else if (cands.length) {
        const esc = sortear(cands, cands.map((c) => c.ref))
        const completo = Math.random() < 0.8
        buffer.push({ ...base, candidato_id: completo ? esc.id : null, partido_id: esc.partido_id, metodo: 'numero' })
      }
    }
    if (buffer.length >= 1000) await flush()
  }
  await flush()
  console.log(`   votos fed/est inseridos: ${total}`)
  console.log('\n✓ Concluído.\n')
}

main().catch((e) => { console.error(e); process.exit(1) })
