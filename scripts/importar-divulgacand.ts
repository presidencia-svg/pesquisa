#!/usr/bin/env tsx
/**
 * Importa/sincroniza candidatos 2026 direto do DivulgaCand (TSE) pra
 * `candidatos_pesquisa` da edicao ativa.
 *
 * Fonte: API publica do DivulgaCand — a mesma que alimenta
 * divulgacandcontas.tse.jus.br. Candidaturas aparecem conforme os
 * pedidos de registro sao protocolados (prazo: 15/08/2026), entao o
 * script e' feito pra RODAR VARIAS VEZES ate a lista fechar:
 *
 *   - candidato novo            → insere
 *   - candidato ja cadastrado   → atualiza nome/partido/impedimento
 *                                 (match por edicao+cargo+numero;
 *                                 foto_url so preenche se vazia)
 *   - candidato no banco mas    → lista como "ausente"; so desativa
 *     fora do DivulgaCand         com --desativar-ausentes (util pra
 *                                 aposentar a carga de referencia
 *                                 2022/2018 quando a lista real fechar)
 *
 * Situacao TSE → `impedimento`: "Aguardando julgamento", "Deferido" e
 * afins ficam null (normal do fluxo). So vira aviso na cedula quando a
 * situacao e' negativa (indeferido, cassado, sub judice etc.).
 *
 * Pra rodar:
 *   npm run import:tse                  # dry-run (so mostra o diff)
 *   npm run import:tse -- --gravar
 *   npm run import:tse -- --gravar --desativar-ausentes
 */
import { config as dotenvConfig } from 'dotenv'
import path from 'node:path'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

dotenvConfig({ path: path.resolve(process.cwd(), '.env.local') })

const ANO = 2026
const ID_ELEICAO = 20322002026 // "Eleição Geral Federal 2026" (04/10)
const API = 'https://divulgacandcontas.tse.jus.br/divulga/rest/v1'
// O Akamai do TSE devolve 403 pra qualquer User-Agent que nao seja de
// navegador (testado em 12/09/2026: UA proprio → 403, UA Chrome → 200).
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'

/** cargo local → (unidade eleitoral, codigo de cargo no TSE) */
const CARGOS_TSE: ReadonlyArray<{ cargo: string; ue: string; cod: number }> = [
  { cargo: 'presidente', ue: 'BR', cod: 1 },
  { cargo: 'governador', ue: 'SE', cod: 3 },
  { cargo: 'senador', ue: 'SE', cod: 5 },
  { cargo: 'federal', ue: 'SE', cod: 6 },
  { cargo: 'estadual', ue: 'SE', cod: 7 },
]

type CandidatoTse = {
  /** id sequencial da candidatura no TSE — maior = registro mais recente */
  id: number
  numero: number
  nomeUrna: string
  nomeCompleto: string | null
  /** "FEDERAÇÃO UNIÃO PROGRESSISTA(UNIÃO/PP)", "PSB", "SERGIPE CRESCE COM VOCÊ"… */
  nomeColigacao?: string | null
  fotoUrl: string | null
  fotoUrlPublicavel: boolean
  descricaoSituacao: string | null
  descricaoTotalizacao: string | null
  /** false quando renunciou/foi indeferido sem recurso; true inclusive sub judice */
  candidatoApto: boolean | null
  partido: { sigla: string | null; nome: string | null } | null
}

type CandidatoDb = {
  id: string
  cargo: string
  numero: number
  nome_urna: string
  nome_completo: string | null
  partido_id: string
  foto_url: string | null
  ativo: boolean
  impedimento: string | null
}

/**
 * Situacoes que merecem aviso na cedula. O fluxo normal ate' o
 * julgamento ("Aguardando julgamento", "Deferido", "Concorrendo",
 * "Apto") NAO e' impedimento.
 */
function situacaoVirouImpedimento(c: CandidatoTse): string | null {
  const s = (c.descricaoSituacao ?? '').trim()
  const t = (c.descricaoTotalizacao ?? '').trim()
  // "Renúncia" e "Não conhecimento" vem com acento no DivulgaCand.
  const negativa = /indefer|cassad|ineleg|impugna|ren[uú]nc|falecid|n[aã]o conhec|sub judice/i
  if (negativa.test(s)) return `${s} (TSE)`
  if (negativa.test(t)) return `${t} (TSE)`
  return null
}

/**
 * Mesmo numero com mais de uma pessoa (substituicao apos renuncia ou
 * indeferimento — visto em 12/09/2026: federal 2244 e 4055, estadual
 * 22300 e 70888). Fica na cedula quem esta' concorrendo de fato:
 *   1. candidatoApto (o TSE ja' marca o substituido como inapto);
 *   2. senao, quem nao tem situacao definitiva negativa (renuncia/indeferido);
 *   3. empate: o registro mais recente (id maior).
 * Os preteridos sao listados no log pra conferencia.
 */
function resolverMesmoNumero(lista: CandidatoTse[]): CandidatoTse[] {
  const porNumero = new Map<number, CandidatoTse[]>()
  for (const c of lista) {
    const arr = porNumero.get(c.numero) ?? []
    arr.push(c)
    porNumero.set(c.numero, arr)
  }
  const definitiva = /ren[uú]nc|^indeferido$|cassad|falecid/i
  const escolhidos: CandidatoTse[] = []
  for (const [numero, grupo] of porNumero) {
    if (grupo.length === 1) {
      escolhidos.push(grupo[0])
      continue
    }
    const ordenado = [...grupo].sort((a, b) => {
      const apto = Number(b.candidatoApto === true) - Number(a.candidatoApto === true)
      if (apto !== 0) return apto
      const def =
        Number(definitiva.test(a.descricaoSituacao ?? '')) -
        Number(definitiva.test(b.descricaoSituacao ?? ''))
      if (def !== 0) return def
      return b.id - a.id
    })
    const [vence, ...perdem] = ordenado
    console.log(
      `  ! número ${numero} com ${grupo.length} registros — fica ${vence.nomeUrna} (${vence.descricaoSituacao}); substituído(s): ${perdem.map((p) => `${p.nomeUrna} (${p.descricaoSituacao})`).join(', ')}`,
    )
    escolhidos.push(vence)
  }
  return escolhidos
}

async function buscarCargo(ue: string, cod: number): Promise<CandidatoTse[]> {
  const url = `${API}/candidatura/listar/${ANO}/${ue}/${ID_ELEICAO}/${cod}/candidatos`
  // Akamai do TSE devolve 403 sem Accept/Referer de navegador (visto em 12/09/2026).
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'pt-BR,pt;q=0.9',
      Referer: 'https://divulgacandcontas.tse.jus.br/divulga/',
    },
  })
  if (!res.ok) throw new Error(`TSE ${res.status} em ${url}`)
  const json = (await res.json()) as { candidatos?: CandidatoTse[] }
  return json.candidatos ?? []
}

/** Numero do partido = 2 primeiros digitos do numero do candidato. */
function numeroPartido(numeroCandidato: number): number {
  return Number(String(numeroCandidato).slice(0, 2))
}

async function resolverPartido(
  db: SupabaseClient,
  cache: Map<number, string>,
  c: CandidatoTse,
  gravar: boolean,
): Promise<string | null> {
  const num = numeroPartido(c.numero)
  const existente = cache.get(num)
  if (existente) return existente

  const sigla = c.partido?.sigla?.trim() || `P${num}`
  if (!gravar) {
    console.log(`  [dry-run] criaria partido ${num} ${sigla}`)
    cache.set(num, `dry-run-${num}`)
    return `dry-run-${num}`
  }
  const { data, error } = await db
    .from('partidos')
    .insert({ numero: num, sigla, nome: c.partido?.nome?.trim() || sigla })
    .select('id')
    .single()
  if (error) {
    console.error(`  ERRO criando partido ${num} ${sigla}: ${error.message}`)
    return null
  }
  cache.set(num, data.id)
  return data.id
}

async function main() {
  const gravar = process.argv.includes('--gravar')
  const desativarAusentes = process.argv.includes('--desativar-ausentes')
  // --edicao <uuid>: importa numa edicao ESPECIFICA (ativa ou nao), pra
  // preparar a edicao real sem desligar a demo. Sem o flag, usa a ativa.
  const idxEd = process.argv.indexOf('--edicao')
  const edicaoIdArg = idxEd >= 0 ? process.argv[idxEd + 1] : undefined

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_URL e SERVICE_ROLE_KEY ausentes no .env.local')
  }
  const db = createClient(url, key, { auth: { persistSession: false } })

  const seletor = db.from('edicao').select('id, nome')
  const { data: edicao, error: erroEdicao } = edicaoIdArg
    ? await seletor.eq('id', edicaoIdArg).maybeSingle()
    : await seletor.eq('ativa', true).maybeSingle()
  if (erroEdicao || !edicao) {
    throw new Error(
      edicaoIdArg
        ? `Edição ${edicaoIdArg} não encontrada.`
        : 'Sem edição ativa. Crie uma edição em /admin primeiro.',
    )
  }
  console.log(`Edição alvo: ${edicao.nome} (${edicao.id})`)
  console.log(gravar ? 'Modo: GRAVAR' : 'Modo: dry-run (use --gravar pra aplicar)')

  const { data: partidos } = await db.from('partidos').select('id, numero')
  const cachePartidos = new Map<number, string>(
    (partidos ?? []).map((p) => [p.numero as number, p.id as string]),
  )

  const { data: existentesRaw } = await db
    .from('candidatos_pesquisa')
    .select('id, cargo, numero, nome_urna, nome_completo, partido_id, foto_url, ativo, impedimento')
    .eq('edicao_id', edicao.id)
  const existentes = (existentesRaw ?? []) as CandidatoDb[]
  const porChave = new Map(existentes.map((c) => [`${c.cargo}:${c.numero}`, c]))

  let inseridos = 0
  let atualizados = 0
  let desativados = 0

  for (const { cargo, ue, cod } of CARGOS_TSE) {
    const bruta = await buscarCargo(ue, cod)
    console.log(`\n=== ${cargo.toUpperCase()} — ${bruta.length} no DivulgaCand ===`)
    const lista = resolverMesmoNumero(bruta)

    const vistos = new Set<number>()
    for (const c of lista) {
      vistos.add(c.numero)
      const partidoId = await resolverPartido(db, cachePartidos, c, gravar)
      if (!partidoId) continue

      const impedimento = situacaoVirouImpedimento(c)
      const fotoTse = c.fotoUrlPublicavel && c.fotoUrl ? c.fotoUrl : null
      const atual = porChave.get(`${cargo}:${c.numero}`)

      if (!atual) {
        inseridos++
        console.log(`  + ${c.numero} ${c.nomeUrna} (${c.partido?.sigla ?? '?'})`)
        if (gravar) {
          const { error } = await db.from('candidatos_pesquisa').insert({
            edicao_id: edicao.id,
            cargo,
            numero: c.numero,
            nome_urna: c.nomeUrna,
            nome_completo: c.nomeCompleto,
            partido_id: partidoId,
            foto_url: fotoTse,
            ativo: true,
            ano_referencia: ANO,
            impedimento,
            // Federação/coligação oficial — a projeção de cadeiras agrupa por ela.
            coligacao: c.nomeColigacao ?? null,
          })
          if (error) console.error(`    ERRO: ${error.message}`)
        }
      } else {
        atualizados++
        // Pessoa diferente no mesmo numero (substituto): a foto antiga
        // (Wikipedia/manual) e' de outra pessoa e nao pode ficar.
        const trocouPessoa =
          (atual.nome_completo ?? '').trim().toUpperCase() !==
          (c.nomeCompleto ?? '').trim().toUpperCase()
        const mudou =
          atual.nome_urna !== c.nomeUrna || (atual.impedimento ?? null) !== impedimento
        console.log(`  ${mudou ? '~' : '='} ${c.numero} ${c.nomeUrna}${atual.nome_urna !== c.nomeUrna ? ` (era ${atual.nome_urna})` : ''}${trocouPessoa ? ' [SUBSTITUTO — foto zerada]' : ''}${impedimento ? ` ⚠ ${impedimento}` : ''}${!impedimento && atual.impedimento ? ` (limpa "${atual.impedimento}")` : ''}`)
        if (gravar) {
          const { error } = await db
            .from('candidatos_pesquisa')
            .update({
              nome_urna: c.nomeUrna,
              nome_completo: c.nomeCompleto,
              partido_id: partidoId,
              // foto boa ja preenchida (Wikipedia/manual) nao e' sobrescrita,
              // salvo quando a pessoa mudou (substituto).
              foto_url: trocouPessoa ? fotoTse : (atual.foto_url ?? fotoTse),
              ativo: true,
              ano_referencia: ANO,
              impedimento,
              coligacao: c.nomeColigacao ?? null,
            })
            .eq('id', atual.id)
          if (error) console.error(`    ERRO: ${error.message}`)
        }
      }
    }

    const ausentes = existentes.filter(
      (c) => c.cargo === cargo && !vistos.has(c.numero) && c.ativo,
    )
    if (ausentes.length > 0) {
      console.log(`  ausentes no DivulgaCand (${ausentes.length}):`)
      for (const c of ausentes) {
        console.log(`  ${desativarAusentes ? '−' : '·'} ${c.numero} ${c.nome_urna}`)
      }
      if (desativarAusentes && gravar) {
        const { error } = await db
          .from('candidatos_pesquisa')
          .update({ ativo: false })
          .in('id', ausentes.map((c) => c.id))
        if (error) console.error(`    ERRO desativando: ${error.message}`)
        else desativados += ausentes.length
      }
    }
  }

  console.log(`\nResumo${gravar ? '' : ' (dry-run — nada gravado)'}:`)
  console.log(`  inseridos:   ${inseridos}`)
  console.log(`  atualizados: ${atualizados}`)
  console.log(`  desativados: ${desativados}${desativarAusentes ? '' : ' (--desativar-ausentes desligado)'}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
