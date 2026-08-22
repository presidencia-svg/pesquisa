#!/usr/bin/env tsx
/**
 * Converte a edicao ATIVA numa demo 100% FICTICIA — nenhum candidato,
 * numero ou sigla real na tela. Pra apresentacao com imprensa/partidos
 * sem sugerir apoio a ninguem (e sem risco de parecer "pesquisa
 * fraudulenta" com numeros inventados em cima de gente real).
 *
 * O que faz (so na edicao ativa; a edicao real de setembro nao existe
 * ainda / nao e' tocada — o script ABORTA se a edicao ativa tiver
 * registro_tre preenchido):
 *
 *   1. Cria 5 partidos ficticios por COR, numeros 01-05 (faixa que nao
 *      existe no TSE — partidos reais comecam no 10):
 *        01 AZUL · 02 VERDE · 03 AMARELO · 04 ROXO · 05 LARANJA
 *   2. Presidente/Governador: mantem os 5 mais votados da simulacao,
 *      renomeia pra CANDIDATA/CANDIDATO 01..05 (numeros 01-05, um por
 *      partido-cor), foto null (avatar de iniciais). Votos dos demais
 *      sao remapeados pros 5 e os excedentes deletados.
 *   3. Senador: idem com numeros 010..050.
 *   4. Federal/Estadual (voto por legenda): cada partido real vira um
 *      partido-cor (round-robin por ranking de votos, preserva a forma
 *      da projecao de cadeiras); votos nominais sao remapeados pra
 *      deputados ficticios (0101..0505 / 01001..05005) e os candidatos
 *      reais do espelho sao deletados.
 *
 * Idempotente — candidatos ja convertidos (nome comeca com CANDIDAT)
 * sao reconhecidos e o script vira no-op.
 *
 * Pra rodar:
 *   npm run demo:ficticia              # dry-run
 *   npm run demo:ficticia -- --gravar
 */
import { config as dotenvConfig } from 'dotenv'
import path from 'node:path'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

dotenvConfig({ path: path.resolve(process.cwd(), '.env.local') })

const CORES: Array<{ numero: number; sigla: string; nome: string; cor_hex: string }> = [
  { numero: 1, sigla: 'AZUL', nome: 'Partido Azul (fictício)', cor_hex: '#2563EB' },
  { numero: 2, sigla: 'VERDE', nome: 'Partido Verde (fictício)', cor_hex: '#16A34A' },
  { numero: 3, sigla: 'AMARELO', nome: 'Partido Amarelo (fictício)', cor_hex: '#EAB308' },
  { numero: 4, sigla: 'ROXO', nome: 'Partido Roxo (fictício)', cor_hex: '#9333EA' },
  { numero: 5, sigla: 'LARANJA', nome: 'Partido Laranja (fictício)', cor_hex: '#EA580C' },
]

type CandRow = {
  id: string
  cargo: string
  numero: number
  nome_urna: string
  partido_id: string
}

function ehFicticio(c: { nome_urna: string }): boolean {
  return c.nome_urna.startsWith('CANDIDAT')
}

/** CANDIDATA nas posicoes impares, CANDIDATO nas pares — variedade no telao. */
function nomeFicticio(idx: number, display: string): { urna: string; completo: string } {
  const fem = idx % 2 === 1
  return {
    urna: `${fem ? 'CANDIDATA' : 'CANDIDATO'} ${display}`,
    completo: `${fem ? 'Candidata Fictícia' : 'Candidato Fictício'} ${display}`,
  }
}

/** token_hash de todos os votos de um candidato (paginado). */
async function tokensDoCandidato(db: SupabaseClient, candidatoId: string): Promise<Set<string>> {
  const tokens = new Set<string>()
  const PAGINA = 1000
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await db
      .from('votos_pesquisa')
      .select('token_hash')
      .eq('candidato_id', candidatoId)
      .range(de, de + PAGINA - 1)
    if (error) throw new Error(`paginando tokens: ${error.message}`)
    for (const v of data ?? []) tokens.add(v.token_hash)
    if ((data ?? []).length < PAGINA) break
  }
  return tokens
}

/**
 * Remapeia votos de `deId` pra `paraId`. No senador (2 votos por
 * eleitor) o mesmo token pode ja ter votado no destino — o UPDATE em
 * bloco estoura o unique. Fallback: deleta os conflitantes (o eleitor
 * ficticio "perde" um dos 2 votos) e remapeia o resto.
 */
async function remapearVotos(db: SupabaseClient, deId: string, paraId: string): Promise<void> {
  const { error } = await db
    .from('votos_pesquisa').update({ candidato_id: paraId }).eq('candidato_id', deId)
  if (!error) return
  if (!error.message.includes('votos_unico_token')) throw new Error(`remapeando votos: ${error.message}`)

  const tokensDestino = await tokensDoCandidato(db, paraId)
  const PAGINA = 1000
  const conflitantes: string[] = []
  for (let de = 0; ; de += PAGINA) {
    const { data, error: e } = await db
      .from('votos_pesquisa')
      .select('id, token_hash')
      .eq('candidato_id', deId)
      .range(de, de + PAGINA - 1)
    if (e) throw new Error(`paginando votos: ${e.message}`)
    for (const v of data ?? []) if (tokensDestino.has(v.token_hash)) conflitantes.push(v.id)
    if ((data ?? []).length < PAGINA) break
  }
  console.log(`    (${conflitantes.length} votos conflitantes deletados — eleitor já votava no destino)`)
  for (let i = 0; i < conflitantes.length; i += 500) {
    const { error: e } = await db
      .from('votos_pesquisa').delete().in('id', conflitantes.slice(i, i + 500))
    if (e) throw new Error(`deletando conflitantes: ${e.message}`)
  }
  const { error: e2 } = await db
    .from('votos_pesquisa').update({ candidato_id: paraId }).eq('candidato_id', deId)
  if (e2) throw new Error(`remapeando pós-limpeza: ${e2.message}`)
}

async function contarVotos(db: SupabaseClient, filtro: Record<string, string>): Promise<number> {
  let q = db.from('votos_pesquisa').select('id', { count: 'exact', head: true })
  for (const [k, v] of Object.entries(filtro)) q = q.eq(k, v)
  const { count, error } = await q
  if (error) throw new Error(`contando votos: ${error.message}`)
  return count ?? 0
}

async function main() {
  const gravar = process.argv.includes('--gravar')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL e SERVICE_ROLE_KEY ausentes no .env.local')
  const db = createClient(url, key, { auth: { persistSession: false } })

  const { data: edicao } = await db
    .from('edicao')
    .select('id, nome, registro_tre')
    .eq('ativa', true)
    .maybeSingle()
  if (!edicao) throw new Error('Sem edição ativa.')
  if (edicao.registro_tre) {
    throw new Error(
      `Edição ativa "${edicao.nome}" tem registro TRE (${edicao.registro_tre}) — parece a pesquisa REAL. Abortando.`,
    )
  }
  console.log(`Edição ativa: ${edicao.nome} (${edicao.id})`)
  console.log(gravar ? 'Modo: GRAVAR' : 'Modo: dry-run (use --gravar pra aplicar)')

  // ---- 1. partidos ficticios -------------------------------------------
  const fake: string[] = [] // fake[idx 0..4] = partido_id
  for (const p of CORES) {
    const { data: existente } = await db
      .from('partidos').select('id').eq('numero', p.numero).maybeSingle()
    if (existente) {
      fake.push(existente.id)
      continue
    }
    if (!gravar) {
      console.log(`[dry-run] criaria partido 0${p.numero} ${p.sigla}`)
      fake.push(`dry-${p.numero}`)
      continue
    }
    const { data, error } = await db.from('partidos').insert(p).select('id').single()
    if (error) throw new Error(`criando partido ${p.sigla}: ${error.message}`)
    fake.push(data.id)
  }

  // ---- 2+3. majoritarios ------------------------------------------------
  const MAJ = [
    { cargo: 'presidente', numeroAlvo: (i: number) => i, pad: 2 },
    { cargo: 'governador', numeroAlvo: (i: number) => i, pad: 2 },
    { cargo: 'senador', numeroAlvo: (i: number) => i * 10, pad: 3 },
  ]
  for (const m of MAJ) {
    const { data: candsRaw } = await db
      .from('candidatos_pesquisa')
      .select('id, cargo, numero, nome_urna, partido_id')
      .eq('edicao_id', edicao.id)
      .eq('cargo', m.cargo)
    const cands = (candsRaw ?? []) as CandRow[]
    console.log(`\n=== ${m.cargo.toUpperCase()} — ${cands.length} candidatos ===`)

    const comVotos: Array<{ c: CandRow; votos: number }> = []
    for (const c of cands) comVotos.push({ c, votos: await contarVotos(db, { candidato_id: c.id }) })
    comVotos.sort((a, b) => b.votos - a.votos)

    // Keepers: os ficticios ja existentes tem prioridade (idempotencia);
    // completa com os reais mais votados ate 5.
    const ficticios = comVotos.filter((x) => ehFicticio(x.c))
    const reais = comVotos.filter((x) => !ehFicticio(x.c))
    const keepers = [...ficticios, ...reais].slice(0, 5)
    const tails = [...ficticios, ...reais].slice(5)

    for (let i = 0; i < keepers.length; i++) {
      const idx = i + 1
      const alvo = m.numeroAlvo(idx)
      const display = String(alvo).padStart(m.pad, '0')
      const nome = nomeFicticio(idx, display)
      const k = keepers[i].c
      console.log(`  ${display} ${nome.urna} (${CORES[i].sigla})  ← ${k.nome_urna} [${keepers[i].votos} votos]`)
      if (gravar) {
        const { error } = await db
          .from('candidatos_pesquisa')
          .update({
            numero: alvo,
            nome_urna: nome.urna,
            nome_completo: nome.completo,
            partido_id: fake[i],
            foto_url: null,
            impedimento: null,
            ordem: idx,
            ano_referencia: null,
            votos_referencia: null,
          })
          .eq('id', k.id)
        if (error) throw new Error(`atualizando ${k.nome_urna}: ${error.message}`)
      }
    }

    for (let j = 0; j < tails.length; j++) {
      const destino = keepers[j % keepers.length].c
      const t = tails[j].c
      console.log(`  votos de ${t.nome_urna} [${tails[j].votos}] → candidato ${j % keepers.length + 1}; deleta ${t.nome_urna}`)
      if (gravar) {
        await remapearVotos(db, t.id, destino.id)
        const { error: e2 } = await db.from('candidatos_pesquisa').delete().eq('id', t.id)
        if (e2) throw new Error(`deletando ${t.nome_urna}: ${e2.message}`)
      }
    }
  }

  // ---- 4. federal/estadual ---------------------------------------------
  console.log(`\n=== FEDERAL/ESTADUAL (legenda) ===`)
  const { data: partidosReais } = await db
    .from('partidos').select('id, numero, sigla').gte('numero', 10)
  const ranking: Array<{ id: string; sigla: string; votos: number }> = []
  for (const p of partidosReais ?? []) {
    const votos = await contarVotos(db, { partido_id: p.id })
    if (votos > 0) ranking.push({ id: p.id, sigla: p.sigla, votos })
  }
  ranking.sort((a, b) => b.votos - a.votos)
  const mapaPartido = new Map<string, number>() // partido real id → idx 0..4
  ranking.forEach((p, i) => {
    mapaPartido.set(p.id, i % 5)
    console.log(`  ${p.sigla} [${p.votos} votos legenda] → ${CORES[i % 5].sigla}`)
  })

  // deputados ficticios (5 por partido-cor por cargo)
  const DEP = [
    { cargo: 'federal', numero: (i: number, k: number) => i * 100 + k, pad: 4 },
    { cargo: 'estadual', numero: (i: number, k: number) => i * 1000 + k, pad: 5 },
  ]
  const dep = new Map<string, string[]>() // `${cargo}:${idx}` → [ids]
  for (const d of DEP) {
    const { data: existentesRaw } = await db
      .from('candidatos_pesquisa')
      .select('id, cargo, numero, nome_urna, partido_id')
      .eq('edicao_id', edicao.id)
      .eq('cargo', d.cargo)
    const existentes = (existentesRaw ?? []) as CandRow[]
    const porNumero = new Map(existentes.map((c) => [c.numero, c]))

    for (let i = 1; i <= 5; i++) {
      const ids: string[] = []
      for (let k = 1; k <= 5; k++) {
        const num = d.numero(i, k)
        const display = String(num).padStart(d.pad, '0')
        const ja = porNumero.get(num)
        if (ja) {
          ids.push(ja.id)
          continue
        }
        const nome = nomeFicticio(k, display)
        if (!gravar) {
          ids.push(`dry-${d.cargo}-${num}`)
          continue
        }
        const { data, error } = await db
          .from('candidatos_pesquisa')
          .insert({
            edicao_id: edicao.id,
            cargo: d.cargo,
            numero: num,
            nome_urna: nome.urna,
            nome_completo: nome.completo,
            partido_id: fake[i - 1],
            ordem: k,
            ativo: true,
          })
          .select('id')
          .single()
        if (error) throw new Error(`criando deputado ficticio ${display}: ${error.message}`)
        ids.push(data.id)
      }
      dep.set(`${d.cargo}:${i - 1}`, ids)
    }

    // remapeia votos nominais dos candidatos reais e deleta o espelho
    const reais = existentes.filter((c) => !ehFicticio(c))
    console.log(`  ${d.cargo}: ${reais.length} candidatos reais no espelho pra converter`)
    const rr = new Map<string, number>()
    for (const c of reais) {
      const idx = mapaPartido.get(c.partido_id) ?? 0
      const chave = `${d.cargo}:${idx}`
      const ids = dep.get(chave)!
      const k = (rr.get(chave) ?? 0) % ids.length
      rr.set(chave, k + 1)
      if (gravar) {
        const { error: e1 } = await db
          .from('votos_pesquisa')
          .update({ candidato_id: ids[k], partido_id: fake[idx] })
          .eq('candidato_id', c.id)
        if (e1) throw new Error(`remapeando votos de ${c.nome_urna}: ${e1.message}`)
        const { error: e2 } = await db.from('candidatos_pesquisa').delete().eq('id', c.id)
        if (e2) throw new Error(`deletando ${c.nome_urna}: ${e2.message}`)
      }
    }
  }

  // votos so-legenda (sem candidato nominal) dos partidos reais
  for (const p of ranking) {
    const idx = mapaPartido.get(p.id)!
    if (gravar) {
      for (const cargo of ['federal', 'estadual']) {
        const { error } = await db
          .from('votos_pesquisa')
          .update({ partido_id: fake[idx] })
          .eq('cargo', cargo)
          .eq('partido_id', p.id)
        if (error) throw new Error(`remapeando legenda ${p.sigla}/${cargo}: ${error.message}`)
      }
    }
  }

  // ---- verificacao ------------------------------------------------------
  if (gravar) {
    const { data: sobras } = await db
      .from('candidatos_pesquisa')
      .select('cargo, numero, nome_urna')
      .eq('edicao_id', edicao.id)
      .not('nome_urna', 'like', 'CANDIDAT%')
    if ((sobras ?? []).length > 0) {
      console.error('\n⚠ Sobraram candidatos NAO ficticios:', sobras)
      process.exit(1)
    }
    console.log('\n✓ Verificado: nenhum candidato real restante na edição.')
  }
  console.log('\nPronto.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
