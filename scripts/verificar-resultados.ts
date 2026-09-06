/**
 * Verificação de consistência dos RESULTADOS PUBLICADOS.
 *
 * Roda o mesmo caminho de dados do site/TV (lib/resultados-data) e compara
 * cada número com uma fonte independente, lida direto das views agregadas
 * do banco (sem paginação):
 *
 *   - votos brutos por candidato        → v_resultados_candidato
 *   - votos ponderados por candidato     → v_resultados_candidato_pond
 *   - brancos / não sabe (bruto e pond.) → v_votos_branco_nao_sabe_pond
 *   - amostra (n)                        → eleitores_pesquisa (wa_validado)
 *   - eleitos de deputado                → 8 federais e 24 estaduais
 *
 * Qualquer divergência acima da tolerância faz o processo sair com código 1.
 * Uso (precisa de .env.local com SUPABASE_SERVICE_ROLE_KEY):
 *
 *   npm run verificar:resultados
 *
 * É pra rodar ANTES de qualquer deploy que toque em resultados, e sempre que
 * alguém desconfiar de um número na tela.
 */
import { createClient } from '@supabase/supabase-js'

import { carregarResultados } from '@/lib/resultados-data'

const TOLERANCIA = 0.05 // votos ponderados são float; bruto tem que bater exato

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes')
  const db = createClient(url, key, { auth: { persistSession: false } })

  const r = await carregarResultados({ ignorarDivulgacao: true })
  if (r.status !== 'ok') throw new Error(`carregarResultados: ${r.status}`)
  const P = r.pesquisa

  const { data: ed } = await db.from('edicao').select('id').eq('ativa', true).single()
  const edicaoId = ed!.id as string

  const [{ data: brutoRef }, { data: pondRef }, { data: bnsRef }, { count: nRef }] = await Promise.all([
    db.from('v_resultados_candidato').select('candidato_id, cargo, votos').eq('edicao_id', edicaoId),
    db.from('v_resultados_candidato_pond').select('candidato_id, cargo, votos, votos_pond').eq('edicao_id', edicaoId),
    db.from('v_votos_branco_nao_sabe_pond').select('cargo, metodo, votos, votos_pond').eq('edicao_id', edicaoId),
    db.from('eleitores_pesquisa').select('id', { count: 'exact', head: true }).eq('edicao_id', edicaoId).eq('wa_validado', true),
  ])
  for (const [nome, d] of [['v_resultados_candidato', brutoRef], ['v_resultados_candidato_pond', pondRef]] as const) {
    if ((d ?? []).length >= 1000) throw new Error(`${nome}: 1.000+ linhas — referência truncada, verificação inválida`)
  }

  const bruto = new Map((brutoRef ?? []).map((x) => [x.candidato_id as string, Number(x.votos)]))
  const pond = new Map((pondRef ?? []).map((x) => [x.candidato_id as string, Number(x.votos_pond)]))
  const bns = new Map((bnsRef ?? []).map((x) => [`${x.cargo}:${x.metodo}`, { votos: Number(x.votos), pond: Number(x.votos_pond) }]))

  const erros: string[] = []
  let conferidos = 0
  const cargos = ['presidente', 'governador', 'senador', 'federal', 'estadual'] as const
  for (const k of cargos) {
    const c = P[k]
    if (!c) { erros.push(`${k}: sem dados no app`); continue }
    for (const cand of c.candidatos) {
      const b = bruto.get(cand.id) ?? 0
      const p = pond.get(cand.id) ?? 0
      if (cand.votos !== b) erros.push(`${k} · ${cand.nome}: bruto app=${cand.votos} ref=${b}`)
      if (Math.abs((cand.votosPond ?? 0) - p) > TOLERANCIA) erros.push(`${k} · ${cand.nome}: pond app=${(cand.votosPond ?? 0).toFixed(2)} ref=${p.toFixed(2)}`)
      conferidos++
    }
    // candidatos com voto na referência que o app não listou
    for (const x of brutoRef ?? []) {
      if (x.cargo === k && !c.candidatos.some((cand) => cand.id === x.candidato_id) && Number(x.votos) > 0) {
        erros.push(`${k}: candidato ${x.candidato_id} tem ${x.votos} votos na referência e não aparece no app`)
      }
    }
    const rb = bns.get(`${k}:branco`) ?? { votos: 0, pond: 0 }
    const rn = bns.get(`${k}:nao_sabe`) ?? { votos: 0, pond: 0 }
    if (c.branco !== rb.votos) erros.push(`${k}: branco app=${c.branco} ref=${rb.votos}`)
    if (c.nao_sabe !== rn.votos) erros.push(`${k}: nao_sabe app=${c.nao_sabe} ref=${rn.votos}`)
    if (Math.abs((c.brancoPond ?? 0) - rb.pond) > TOLERANCIA) erros.push(`${k}: brancoPond app=${(c.brancoPond ?? 0).toFixed(2)} ref=${rb.pond.toFixed(2)}`)
    if (Math.abs((c.naoSabePond ?? 0) - rn.pond) > TOLERANCIA) erros.push(`${k}: naoSabePond app=${(c.naoSabePond ?? 0).toFixed(2)} ref=${rn.pond.toFixed(2)}`)
    conferidos += 4
    if (k === 'federal' || k === 'estadual') {
      const vagas = k === 'federal' ? 8 : 24
      const eleitos = c.candidatos.filter((x) => x.eleito).length
      if (eleitos !== vagas) erros.push(`${k}: ${eleitos} eleitos projetados, esperado ${vagas}`)
      conferidos++
    }
  }
  if (P.meta.n !== (nRef ?? -1)) erros.push(`amostra: app=${P.meta.n} ref=${nRef}`)
  conferidos++

  console.log(`Resultados conferidos: ${conferidos} números · edição ${edicaoId}`)
  if (erros.length) {
    console.error(`\n✗ ${erros.length} DIVERGÊNCIA(S):`)
    for (const e of erros) console.error('  - ' + e)
    process.exit(1)
  }
  console.log('✓ zero divergências entre o que o site/TV publicam e o banco.')
}

main().catch((e) => { console.error('ERRO', e); process.exit(1) })
