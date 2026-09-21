/**
 * Padrão único do resultado ponderado: confere que a PROJEÇÃO DE CADEIRAS do
 * admin (/admin/projecao?ponderado=1) e o resultado oficial
 * (carregarResultados → /resultados, TV, apresentação, prévia) saem da mesma
 * fonte e dão os mesmos eleitos e os mesmos votos ponderados.
 *
 *   node --env-file=.env.local --import ./scripts/_lib/hook-server-only.mjs \
 *        --import tsx scripts/verificar-padrao-unico.ts
 *
 * Sai com código 1 se houver qualquer divergência.
 */
import { viewsPonderadas } from '@/lib/ponderacao-views'
import { projetarCadeiras, type PartidoVotos } from '@/lib/projecao'
import { carregarResultados } from '@/lib/resultados-data'
import { supabaseAdmin } from '@/lib/supabase/admin'

const VAGAS = { federal: 8, estadual: 24 } as const

async function main() {
  const db = supabaseAdmin()
  const { data: edicao } = await db
    .from('edicao')
    .select('id, nome, ponderacao_metodo, ponderacao_execucao_id')
    .eq('ativa', true)
    .maybeSingle()
  if (!edicao) throw new Error('sem edição ativa')
  const views = viewsPonderadas(edicao)
  console.log(`Edição: ${edicao.nome} · método ${views.metodo} · views ${views.candidato}`)

  const oficial = await carregarResultados({ ignorarDivulgacao: true })
  if (oficial.status !== 'ok') throw new Error(`carregarResultados: ${oficial.status}`)

  const erros: string[] = []
  for (const cargo of ['federal', 'estadual'] as const) {
    // Mesmo caminho da página /admin/projecao em modo ponderado.
    const [{ data: candPond }, { data: legPond }, { data: cands }] = await Promise.all([
      db.from(views.candidato).select('candidato_id, votos_pond').eq('edicao_id', edicao.id).eq('cargo', cargo),
      db.from(views.legenda).select('partido_id, votos_pond').eq('edicao_id', edicao.id).eq('cargo', cargo),
      db
        .from('candidatos_pesquisa')
        .select('id, numero, nome_urna, partido_id, coligacao, partidos!inner(id, numero, sigla, nome, cor_hex)')
        .eq('edicao_id', edicao.id)
        .eq('cargo', cargo)
        .eq('ativo', true),
    ])
    const pondCand = new Map((candPond ?? []).map((r) => [r.candidato_id as string, Number(r.votos_pond)]))
    const pondPart = new Map((legPond ?? []).map((r) => [r.partido_id as string, Number(r.votos_pond)]))

    const partidos = new Map<string, PartidoVotos>()
    for (const c of (cands ?? []) as unknown as Array<{
      id: string
      numero: number
      nome_urna: string
      partido_id: string
      coligacao: string | null
      partidos: { id: string; numero: number; sigla: string; nome: string; cor_hex: string | null }
    }>) {
      const p = c.partidos
      const e =
        partidos.get(p.id) ??
        ({
          partidoId: p.id,
          numero: p.numero,
          sigla: p.sigla,
          nome: p.nome,
          corHex: p.cor_hex,
          coligacao: null,
          votosLegenda: Math.round(pondPart.get(p.id) ?? 0),
          candidatos: [],
        } as PartidoVotos)
      if (!e.coligacao && c.coligacao) e.coligacao = c.coligacao
      e.candidatos.push({
        candidatoId: c.id,
        numero: c.numero,
        nomeUrna: c.nome_urna,
        votos: Math.round(pondCand.get(c.id) ?? 0),
      })
      partidos.set(p.id, e)
    }
    const projecao = projetarCadeiras(Array.from(partidos.values()), VAGAS[cargo])
    const eleitosAdmin = new Map<string, string>()
    for (const p of projecao.partidos) for (const e of p.eleitosProjetados) eleitosAdmin.set(e.candidatoId, e.nomeUrna)

    const blocoOficial = oficial.pesquisa[cargo]
    if (!blocoOficial) throw new Error(`resultado oficial sem o cargo ${cargo}`)
    const oficiais = blocoOficial.candidatos
    const eleitosOficial = new Map(oficiais.filter((c) => c.eleito).map((c) => [String(c.id), c.nome]))

    for (const [id, nome] of eleitosAdmin) if (!eleitosOficial.has(id)) erros.push(`${cargo}: ${nome} eleito só na projeção do admin`)
    for (const [id, nome] of eleitosOficial) if (!eleitosAdmin.has(id)) erros.push(`${cargo}: ${nome} eleito só no resultado oficial`)
    for (const c of oficiais) {
      const a = pondCand.get(String(c.id)) ?? 0
      const o = c.votosPond ?? 0
      if (Math.abs(a - o) > 1e-6) erros.push(`${cargo}: ${c.nome} ponderado ${a} (admin) × ${o} (oficial)`)
    }
    console.log(
      `${cargo}: ${eleitosAdmin.size} eleitos na projeção × ${eleitosOficial.size} no oficial — ` +
        Array.from(eleitosOficial.values()).join(', '),
    )
  }

  if (erros.length) {
    console.error(`\nDIVERGÊNCIAS (${erros.length}):\n- ${erros.join('\n- ')}`)
    process.exit(1)
  }
  console.log('\nOK — projeção do admin e resultado oficial idênticos (mesmas views, mesmos eleitos).')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
