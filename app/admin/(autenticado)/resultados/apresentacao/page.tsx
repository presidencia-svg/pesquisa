/**
 * Apresentação da pesquisa pra TV Atalaia (tela cheia 1920×1080).
 *
 * Lê os dados reais (carregarResultados com ignorarDivulgacao=true, pra
 * o operador ensaiar antes da divulgação) e os transforma no formato do
 * template importado do Claude Design. Renderiza o componente client
 * ApresentacaoTV, que cobre a tela inteira (z-index alto sobre o admin).
 *
 * Trilha de patrocínio: Oferecimento (Diamante) · Patrocínio (Ouro) ·
 * Apoio (Prata). Assinatura fixa CDL Pesquisas + TV Atalaia no rodapé.
 */
import {
  ApresentacaoTV,
  type ApresCargo,
  type ApresData,
  type ApresMapa,
  type ApresRow,
  type ApresSponsor,
} from '@/components/apresentacao-tv'
import { registrarAcessoAdmin } from '@/lib/admin-audit'
import {
  carregarResultados,
  type PatroPublico,
} from '@/lib/resultados-data'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type {
  CargoCandidato,
  CargoZona,
} from '@/components/resultados-dashboard'

export const metadata = { title: 'Apresentação TV · Pesquisa Eleitoral Sergipe 2026' }
export const dynamic = 'force-dynamic'

const CARGOS = [
  { key: 'presidente', num: '1', label: 'Presidente da República', sub: 'Voto espontâneo · 1º turno', top: 4 },
  { key: 'governador', num: '2', label: 'Governador de Sergipe', sub: 'Voto espontâneo · 1º turno', top: 4 },
  { key: 'senador', num: '3', label: 'Senador', sub: 'Voto espontâneo · 2 vagas', top: 4 },
  { key: 'federal', num: '4', label: 'Deputado Federal', sub: 'Voto por legenda · projeção', top: 5 },
  { key: 'estadual', num: '5', label: 'Deputado Estadual', sub: 'Voto por legenda · projeção', top: 5 },
] as const

function f(x: number): string {
  return x.toFixed(1).replace('.', ',')
}

function curiosidade(cands: ApresRow[], marginPP: number): string {
  if (cands.length < 2) return ''
  const a = cands[0]
  const b = cands[1]
  const diff = a.pct - b.pct
  if (diff > 2 * marginPP) {
    return `${a.name} lidera fora da margem (±${f(marginPP)}pp): abre ${f(diff)} pontos sobre ${b.name}.`
  }
  return `Empate técnico no topo — ${a.name} e ${b.name} separados por apenas ${f(diff)} pontos.`
}

function montaCargo(
  meta: { key: string; num: string; label: string; sub: string; top: number },
  cargo: CargoCandidato,
  marginPP: number,
): ApresCargo | null {
  const validos = cargo.candidatos.reduce((s, c) => s + c.votos, 0)
  const total = validos + cargo.branco + cargo.nao_sabe
  if (total === 0) return null

  const ordenados = [...cargo.candidatos].sort((a, b) => b.votos - a.votos)

  // Deputado: "Mais votados" precisa ir pelo menos até o ÚLTIMO ELEITO —
  // como a vaga vem do quociente do partido, um eleito pode estar bem
  // abaixo do 5º no voto nominal. Estende o corte até incluí-lo.
  const ehDeputado = meta.key === 'federal' || meta.key === 'estadual'
  let corte = meta.top
  if (ehDeputado) {
    let idxUltimoEleito = -1
    ordenados.forEach((c, i) => {
      if (c.eleito) idxUltimoEleito = i
    })
    corte = Math.max(meta.top, idxUltimoEleito + 1)
  } else if (meta.key === 'senador') {
    // Senador (2 vagas, campo grande): mostra TODOS os candidatos.
    corte = ordenados.length
  }

  const topN = ordenados.slice(0, corte)
  const resto = ordenados.slice(corte)
  const restoVotos = resto.reduce((s, c) => s + c.votos, 0)

  const candRows: ApresRow[] = topN.map((c) => ({
    name: c.nome,
    party: c.partido || undefined,
    num: String(c.numero),
    pct: total > 0 ? (c.votos / total) * 100 : 0,
    color: c.cor || '#2F6FE0',
    eleito: c.eleito,
  }))

  const rows: ApresRow[] = [...candRows]
  if (restoVotos > 0) {
    rows.push({ name: 'Outros', pct: (restoVotos / total) * 100, other: true })
  }
  if (cargo.branco > 0) {
    rows.push({ name: 'Brancos / Nulos', pct: (cargo.branco / total) * 100, other: true })
  }
  if (cargo.nao_sabe > 0) {
    rows.push({ name: 'Indecisos', pct: (cargo.nao_sabe / total) * 100, other: true })
  }

  // Deputado: lista dos candidatos ELEITOS pela projeção (D'Hondt), pra
  // a visão separada "quem leva a cadeira".
  let rowsEleitos: ApresRow[] | undefined
  if (ehDeputado) {
    rowsEleitos = ordenados
      .filter((c) => c.eleito)
      .map((c) => ({
        name: c.nome,
        party: c.partido || undefined,
        num: String(c.numero),
        pct: total > 0 ? (c.votos / total) * 100 : 0,
        color: c.cor || '#2F6FE0',
        eleito: true,
      }))
  }

  return {
    id: meta.key,
    num: meta.num,
    label: meta.label,
    subtitle: meta.sub,
    curiosity: curiosidade(candRows, marginPP),
    rows,
    rowsEleitos,
  }
}

function montaZona(zona: CargoZona): ApresCargo | null {
  const total = zona.aracaju + zona.sao_cristovao + zona.branco + zona.nao_sabe
  if (total === 0) return null
  const indeciso = zona.branco + zona.nao_sabe
  const rows: ApresRow[] = [
    { name: 'Administrada por Aracaju', pct: (zona.aracaju / total) * 100, color: '#2F6FE0' },
    { name: 'Voltar a São Cristóvão', pct: (zona.sao_cristovao / total) * 100, color: '#f4b62c' },
  ]
  if (indeciso > 0) {
    rows.push({ name: 'Não sei / indeciso', pct: (indeciso / total) * 100, other: true })
  }
  return {
    id: 'zona',
    num: '+',
    label: 'Zona de Expansão',
    subtitle: 'Consulta extra · Aracaju × S. Cristóvão',
    extra: true,
    curiosity: '',
    rows,
  }
}

function sponsors(arr: PatroPublico[]): ApresSponsor[] {
  return arr
    .filter((p) => p.logo_url)
    .map((p) => ({ empresa: p.empresa, logoUrl: p.logo_url as string }))
}

// Paleta de fallback pro mapa (quando o partido não tem cor).
const PALETA_MAPA = [
  '#dc2626', '#0a2a6e', '#16a34a', '#ca8a04', '#7c3aed',
  '#0891b2', '#db2777', '#65a30d', '#ea580c', '#0d9488',
]

/** Monta o mapa "quem venceu por cidade" de um cargo (só o líder por município). */
async function montaMapa(
  db: ReturnType<typeof supabaseAdmin>,
  edicaoId: string,
  cargo: 'presidente' | 'governador' | 'senador',
): Promise<ApresMapa | null> {
  const { data } = await db
    .from('v_vencedor_municipio')
    .select(
      'municipio_ibge, municipio_nome, total_municipio, candidato_id, numero, nome_urna, partido_sigla, partido_cor, pct',
    )
    .eq('edicao_id', edicaoId)
    .eq('cargo', cargo)
    .eq('posicao', 1)
  const arr = (data ?? []) as Array<{
    municipio_ibge: number
    municipio_nome: string
    total_municipio: number
    candidato_id: string
    numero: number
    nome_urna: string
    partido_sigla: string | null
    partido_cor: string | null
    pct: number
  }>
  if (arr.length === 0) return null

  const corPorCand = new Map<string, string>()
  let i = 0
  for (const l of arr) {
    if (!corPorCand.has(l.candidato_id)) {
      corPorCand.set(l.candidato_id, l.partido_cor ?? PALETA_MAPA[i % PALETA_MAPA.length])
      i++
    }
  }

  const municipios = arr.map((l) => ({
    ibge: l.municipio_ibge,
    cor: corPorCand.get(l.candidato_id) as string,
    label: `${l.municipio_nome}: ${l.nome_urna} (${l.numero}) — ${l.pct.toFixed(1).replace('.', ',')}%`,
  }))

  const stat = new Map<
    string,
    { nome: string; numero: number; sigla: string | null; cor: string; cidades: number }
  >()
  for (const l of arr) {
    const s = stat.get(l.candidato_id) ?? {
      nome: l.nome_urna,
      numero: l.numero,
      sigla: l.partido_sigla,
      cor: corPorCand.get(l.candidato_id) as string,
      cidades: 0,
    }
    s.cidades++
    stat.set(l.candidato_id, s)
  }
  const legenda = [...stat.values()].sort((a, b) => b.cidades - a.cidades)
  const lider = legenda[0]

  return {
    municipios,
    legenda,
    comDados: arr.length,
    semDados: 75 - arr.length,
    analise: lider
      ? `${lider.nome}${lider.sigla ? ' (' + lider.sigla + ')' : ''} venceu em ${lider.cidades} das ${arr.length} cidades com amostra suficiente (N≥30).`
      : '',
  }
}

export default async function ApresentacaoPage() {
  const r = await carregarResultados({ ignorarDivulgacao: true })

  if (r.status === 'aguardando') {
    return (
      <main style={{ padding: 48, color: '#fff', background: '#05102e', minHeight: '100vh' }}>
        <h1>Sem edição ativa</h1>
        <p>Ative uma edição em /admin/edicoes pra montar a apresentação.</p>
      </main>
    )
  }

  await registrarAcessoAdmin(
    'abrir_apresentacao_tv',
    { edicao: r.pesquisa.meta.edicao, n: r.pesquisa.meta.n },
    'apresentacao',
  )

  const { pesquisa, patroPorCota } = r
  const { meta } = pesquisa
  const marginPP = meta.n > 0 ? 1.96 * Math.sqrt(0.25 / meta.n) * 100 : 0

  // Mapa "quem venceu por cidade" — Presidente / Governador / Senador
  const db = supabaseAdmin()
  const { data: ed } = await db
    .from('edicao').select('id').eq('ativa', true).maybeSingle<{ id: string }>()
  const mapas = ed
    ? {
        presidente: await montaMapa(db, ed.id, 'presidente'),
        governador: await montaMapa(db, ed.id, 'governador'),
        senador: await montaMapa(db, ed.id, 'senador'),
      }
    : { presidente: null, governador: null, senador: null }

  const cargos: ApresCargo[] = []
  for (const c of CARGOS) {
    const cargo = pesquisa[c.key as keyof typeof pesquisa] as CargoCandidato | null
    if (cargo) {
      const montado = montaCargo(c, cargo, marginPP)
      if (montado) cargos.push(montado)
    }
  }
  if (pesquisa.zona_expansao) {
    const z = montaZona(pesquisa.zona_expansao)
    if (z) cargos.push(z)
  }

  const data: ApresData = {
    edicaoLabel: meta.edicao,
    turno: meta.turno,
    resumo: `A maior pesquisa eleitoral já feita em Sergipe ouviu <b>${meta.n.toLocaleString('pt-BR')} eleitores</b> com identidade verificada por CPF e WhatsApp nos 75 municípios. Coleta espontânea, estilo urna.`,
    stats: [
      { label: 'AMOSTRA', value: meta.n.toLocaleString('pt-BR'), sub: 'CPF + WhatsApp' },
      { label: 'MARGEM', value: meta.margem, sub: 'Erro amostral' },
      { label: 'CONFIANÇA', value: meta.confianca, sub: 'Intervalo' },
      { label: 'DIVULGADA', value: meta.divulgada_em, sub: `TRE: ${meta.registro_tre}` },
    ],
    cargos,
    amostra: meta.n.toLocaleString('pt-BR'),
    margem: meta.margem,
    oferecimento: sponsors(patroPorCota.diamante),
    patrocinio: sponsors(patroPorCota.ouro),
    apoio: sponsors(patroPorCota.prata),
    mapas,
  }

  return <ApresentacaoTV data={data} />
}
