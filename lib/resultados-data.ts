/**
 * Carregamento e montagem dos resultados públicos da pesquisa.
 *
 * Extraído de app/resultados/page.tsx pra ser reusado por:
 *   - /resultados          (hub — usa só os teasers/líderes)
 *   - /resultados/[cargo]  (tela de detalhe de um cargo)
 *
 * Server-only: usa SERVICE_ROLE_KEY via supabaseAdmin. Toda a lógica de
 * projeção de cadeiras, empate técnico e regional é idêntica à versão
 * monolítica anterior — só mudou o lugar.
 */
import 'server-only'

import type {
  Candidato,
  CargoCandidato,
  CargoZona,
  Pesquisa,
} from '@/components/resultados-dashboard'
import { projetarCadeiras, type PartidoVotos } from '@/lib/projecao'
import { lerTudo } from '@/lib/supabase/ler-tudo'
import {
  montaRegionais,
  type CandidatoLeve,
  type RegiaoKey,
} from '@/lib/regional'
import { supabaseAdmin } from '@/lib/supabase/admin'

const VAGAS = { federal: 8, estadual: 24 } as const

/** Contratante da pesquisa (Lei 9.504/97 art. 33 — obrigatório na divulgação). */
export const CONTRATANTE = 'CDL Aracaju'
export const CONTRATANTE_CNPJ = '13.045.935/0001-36'

const REGRA = {
  presidente:
    'Maioria absoluta no 1º turno (>50% dos válidos) elege direto. Caso contrário, 2º turno entre os dois mais votados.',
  governador:
    'Maioria absoluta no 1º turno (>50% dos válidos) elege direto. Caso contrário, vai pra 2º turno entre os dois mais votados.',
  senador:
    'São 2 vagas em disputa em 2026 (igual a 2018). Eleitor escolhe até 2 candidatos. Os 2 mais votados são eleitos.',
  federal:
    'Voto por legenda define quantas cadeiras o partido elege (Quociente Eleitoral, Lei 9.504/97). Os mais votados dentro do partido ocupam as cadeiras conquistadas.',
  estadual:
    'Voto por legenda define quantas cadeiras o partido elege (Quociente Eleitoral, Lei 9.504/97). Os mais votados dentro do partido ocupam as cadeiras conquistadas.',
} as const

export type EdicaoRow = {
  id: string
  nome: string
  divulgada_em: string | null
  divulgacao_prevista: string | null
  registro_tre: string | null
  turno: number | null
  consulta_zona_ativa: boolean | null
}

export type PatroPorCota = {
  diamante: PatroPublico[]
  ouro: PatroPublico[]
  prata: PatroPublico[]
}

export type PatroPublico = {
  id: string
  empresa: string
  cota: 'diamante' | 'ouro' | 'prata'
  logo_url: string | null
  site_url: string | null
}

export type ResultadosCarregados =
  | { status: 'aguardando'; edicao: EdicaoRow | null }
  | { status: 'ok'; pesquisa: Pesquisa; patroPorCota: PatroPorCota }

export function formatarData(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Margem de erro (IC 95%) usando o pior caso p=0.5: 1.96 * sqrt(0.25/n).
 * Mostra o número real sempre que houver ao menos 1 respondente.
 */
export function calcularMargem(n: number): string {
  if (n <= 0) return '±—'
  const margem = (1.96 * Math.sqrt(0.25 / n) * 100).toFixed(1)
  return `±${margem}pp`
}

export async function carregarResultados(
  opts?: { ignorarDivulgacao?: boolean },
): Promise<ResultadosCarregados> {
  const db = supabaseAdmin()
  const { data: edicao } = await db
    .from('edicao')
    .select('id, nome, divulgada_em, divulgacao_prevista, registro_tre, turno, consulta_zona_ativa')
    .eq('ativa', true)
    .maybeSingle<EdicaoRow>()

  // Público gateia em divulgada_em. Ferramentas internas (apresentação na
  // TV, snapshot embargado) passam ignorarDivulgacao=true pra ensaiar /
  // operar com os dados antes da divulgação pública.
  if (!edicao || (!edicao.divulgada_em && !opts?.ignorarDivulgacao)) {
    return { status: 'aguardando', edicao: edicao ?? null }
  }

  // Patrocinadores REMOVIDOS da exibição pública da pesquisa (decisão 25/08):
  // a divulgação da pesquisa (/resultados, /resultados/[cargo], /tv) não exibe
  // logos de patrocinador. A página de vendas /patrocinio segue independente.
  // Para reexibir no futuro, restaurar a query em interessados_patrocinio
  // (status='firmado', mostrar_publico=true, logo_url não nulo) e distribuir
  // por cota como antes.
  const patroPorCota: PatroPorCota = { diamante: [], ouro: [], prata: [] }

  // ----- Carrega tudo em paralelo -----
  const [
    { data: candFedEstData },
    { data: votosCandidatoFedEst },
    { data: votosCandidatosTudo },
    { data: votosLegendaTudo },
    { data: zonaData },
    { data: bnsData },
    { count: eleitoresCount },
    ,
    { data: candidatosCargoSimples },
    { data: municipiosRegiaoData },
    { data: votosRegionaisData },
  ] = await Promise.all([
    db
      .from('candidatos_pesquisa')
      .select('id, cargo, numero, nome_urna, foto_url, impedimento, partido_id, coligacao, partidos!inner(sigla, cor_hex)')
      .eq('edicao_id', edicao.id)
      .eq('ativo', true)
      .in('cargo', ['federal', 'estadual']),
    db
      .from('v_resultados_candidato')
      .select('candidato_id, votos')
      .eq('edicao_id', edicao.id)
      .in('cargo', ['federal', 'estadual']),
    db
      .from('v_resultados_candidato')
      .select('candidato_id, cargo, numero, nome_urna, foto_url, sigla, cor_hex, votos')
      .eq('edicao_id', edicao.id)
      .in('cargo', ['presidente', 'governador', 'senador']),
    db
      .from('v_resultados_legenda')
      .select('partido_id, cargo, numero, sigla, nome, cor_hex, votos')
      .eq('edicao_id', edicao.id)
      .in('cargo', ['federal', 'estadual']),
    db
      .from('v_resultados_zona')
      .select('resposta, votos')
      .eq('edicao_id', edicao.id),
    // View agregada: o fetch cru truncava em 1.000 linhas e zerava os
    // brancos/indecisos de presidente, governador e senador.
    db
      .from('v_votos_branco_nao_sabe')
      .select('cargo, metodo, votos')
      .eq('edicao_id', edicao.id),
    db
      .from('eleitores_pesquisa')
      .select('id', { count: 'exact', head: true })
      .eq('edicao_id', edicao.id)
      .eq('wa_validado', true),
    db
      .from('candidatos_pesquisa')
      .select('id, impedimento')
      .eq('edicao_id', edicao.id)
      .not('impedimento', 'is', null),
    db
      .from('candidatos_pesquisa')
      .select('id, cargo, numero, nome_urna, foto_url, impedimento, partidos!inner(sigla, cor_hex)')
      .eq('edicao_id', edicao.id)
      .eq('ativo', true)
      .in('cargo', ['presidente', 'governador', 'senador']),
    db
      .from('municipios_se')
      .select('ibge_codigo, regiao'),
    // Votos por (candidato, município) já agregados + paginação: o fetch
    // cru de votos_pesquisa truncava em 1.000 linhas e os líderes por
    // região saíam de uma fatia minúscula dos ~36 mil votos.
    lerTudo<{
      candidato_id: string
      municipio_ibge: number
      cargo: string
      votos: number
    }>((de, ate) =>
      db
        .from('v_proj_candidato_mun')
        .select('candidato_id, municipio_ibge, cargo, votos')
        .eq('edicao_id', edicao.id)
        .in('cargo', ['presidente', 'governador', 'senador'])
        .not('municipio_ibge', 'is', null)
        .range(de, ate),
    ).then((data) => ({ data })),
  ])

  // ----- Branco / Não sei -----
  const brancoNaoSei: Record<string, { branco: number; nao_sabe: number }> = {}
  for (const r of (bnsData ?? []) as Array<{ cargo: string; metodo: string; votos: number }>) {
    if (!brancoNaoSei[r.cargo]) brancoNaoSei[r.cargo] = { branco: 0, nao_sabe: 0 }
    if (r.metodo === 'branco') brancoNaoSei[r.cargo].branco += r.votos
    if (r.metodo === 'nao_sabe') brancoNaoSei[r.cargo].nao_sabe += r.votos
  }

  // ----- Mapa município → região -----
  const regiaoPorMunicipio = new Map<number, RegiaoKey>()
  const municipiosPorRegiao = new Map<RegiaoKey, number>()
  for (const r of (municipiosRegiaoData ?? []) as Array<{
    ibge_codigo: number
    regiao: string | null
  }>) {
    if (
      r.regiao === 'grande_aracaju' ||
      r.regiao === 'leste' ||
      r.regiao === 'agreste' ||
      r.regiao === 'centro_sul' ||
      r.regiao === 'sertao'
    ) {
      regiaoPorMunicipio.set(r.ibge_codigo, r.regiao)
      municipiosPorRegiao.set(
        r.regiao,
        (municipiosPorRegiao.get(r.regiao) ?? 0) + 1,
      )
    }
  }

  // ----- Pres/Gov/Sen — monta CargoCandidato -----
  function montaCargoCandidato(
    cargoKey: 'presidente' | 'governador' | 'senador',
  ): CargoCandidato | null {
    const titulo = {
      presidente: 'Presidente',
      governador: 'Governador',
      senador: 'Senador',
    }[cargoKey]
    const votos = (votosCandidatosTudo ?? []).filter(
      (r: { cargo: string }) => r.cargo === cargoKey,
    ) as Array<{
      candidato_id: string
      numero: number
      nome_urna: string
      foto_url: string | null
      sigla: string | null
      cor_hex: string | null
      votos: number
    }>

    const meta = new Map<
      string,
      { foto: string | null; impedimento: string | null; sigla: string; cor: string }
    >()
    for (const c of (candidatosCargoSimples ?? []) as Array<{
      id: string
      cargo: string
      foto_url: string | null
      impedimento: string | null
      partidos: { sigla: string; cor_hex: string | null } | { sigla: string; cor_hex: string | null }[]
    }>) {
      if (c.cargo !== cargoKey) continue
      const partido = Array.isArray(c.partidos) ? c.partidos[0] : c.partidos
      meta.set(c.id, {
        foto: c.foto_url,
        impedimento: c.impedimento,
        sigla: partido?.sigla ?? '',
        cor: partido?.cor_hex ?? '#52525b',
      })
    }

    const candidatos: Candidato[] = votos
      .map((r) => {
        const m = meta.get(r.candidato_id) ?? {
          foto: r.foto_url,
          impedimento: null,
          sigla: r.sigla ?? '',
          cor: r.cor_hex ?? '#52525b',
        }
        return {
          id: r.candidato_id,
          numero: r.numero,
          nome: r.nome_urna,
          partido: m.sigla,
          cor: m.cor,
          votos: r.votos,
          foto: r.foto_url ?? m.foto,
          impedimento: m.impedimento,
        }
      })
      .sort((a, b) => b.votos - a.votos)

    if (cargoKey === 'senador') {
      for (let i = 0; i < Math.min(2, candidatos.length); i++) {
        if (candidatos[i].votos > 0) candidatos[i].eleito = true
      }
    } else if (candidatos.length > 0 && candidatos[0].votos > 0) {
      const totalValidos = candidatos.reduce((acc, c) => acc + c.votos, 0)
      if (candidatos[0].votos / totalValidos > 0.5) {
        candidatos[0].eleito = true
      } else {
        for (let i = 0; i < Math.min(2, candidatos.length); i++) {
          if (candidatos[i].votos > 0) candidatos[i].segundoTurno = true
        }
      }
    }

    if (cargoKey === 'senador' && candidatos.length > 2) {
      const totalCargo = candidatos.reduce((s, c) => s + c.votos, 0)
      if (totalCargo > 0) {
        const cutoff = candidatos[1]
        const pCut = cutoff.votos / totalCargo
        const meCut = 1.96 * Math.sqrt((pCut * (1 - pCut)) / totalCargo)
        for (let i = 2; i < candidatos.length; i++) {
          const cand = candidatos[i]
          const p = cand.votos / totalCargo
          const me = 1.96 * Math.sqrt((p * (1 - p)) / totalCargo)
          if (pCut - p <= meCut + me) {
            cand.empate = true
          } else {
            break
          }
        }
      }
    }

    const bns = brancoNaoSei[cargoKey] ?? { branco: 0, nao_sabe: 0 }
    if (candidatos.length === 0 && bns.branco === 0 && bns.nao_sabe === 0) {
      return null
    }

    // ---- Regional (Leste/Agreste/Sertão) ----
    const candLeve = new Map<string, CandidatoLeve>()
    for (const c of candidatos) {
      candLeve.set(c.id, {
        id: c.id,
        nome: c.nome,
        partido: c.partido,
        cor: c.cor,
        foto: c.foto,
      })
    }
    const votosCargo = ((votosRegionaisData ?? []) as Array<{
      candidato_id: string
      municipio_ibge: number
      cargo: string
      votos: number
    }>)
      .filter((v) => v.cargo === cargoKey)
      .map((v) => ({
        candidato_id: v.candidato_id,
        municipio_ibge: v.municipio_ibge,
        votos: v.votos,
      }))
    let regionalLeve: ReturnType<typeof montaRegionais> | undefined
    if (votosCargo.length > 0) {
      regionalLeve = montaRegionais(
        votosCargo,
        regiaoPorMunicipio,
        municipiosPorRegiao,
        candLeve,
      )
    }

    return {
      titulo,
      regra: REGRA[cargoKey],
      vagas: cargoKey === 'senador' ? 2 : undefined,
      candidatos,
      branco: bns.branco,
      nao_sabe: bns.nao_sabe,
      regional: regionalLeve?.map((r) => ({
        regiao: r.regiao,
        rotulo: r.rotulo,
        subtitulo: r.subtitulo,
        municipios: r.municipios,
        totalVotos: r.totalVotos,
        liderNome: r.lider?.nome ?? null,
        liderPartido: r.lider?.partido ?? '',
        liderCor: r.lider?.cor ?? '#52525b',
        liderFoto: r.lider?.foto ?? null,
        liderVotos: r.liderVotos,
        liderPct: r.liderPct,
      })),
    }
  }

  // ----- Fed/Est — monta CargoCandidato a partir de votos + projeção -----
  function montaCargoLegenda(
    cargoKey: 'federal' | 'estadual',
  ): CargoCandidato | null {
    const votosCandidato = new Map<string, number>()
    for (const r of (votosCandidatoFedEst ?? []) as Array<{
      candidato_id: string
      votos: number
    }>) {
      votosCandidato.set(r.candidato_id, r.votos)
    }

    const cands = ((candFedEstData ?? []) as Array<{
      id: string
      cargo: string
      numero: number
      nome_urna: string
      foto_url: string | null
      impedimento: string | null
      partido_id: string
      coligacao: string | null
      partidos: { sigla: string; cor_hex: string | null } | { sigla: string; cor_hex: string | null }[]
    }>).filter((c) => c.cargo === cargoKey)

    const legendasCargo = ((votosLegendaTudo ?? []) as Array<{
      partido_id: string
      cargo: string
      numero: number
      sigla: string
      nome: string
      cor_hex: string | null
      votos: number
    }>).filter((l) => l.cargo === cargoKey)

    const partidosInput: PartidoVotos[] = legendasCargo.map((l) => ({
      partidoId: l.partido_id,
      numero: l.numero,
      sigla: l.sigla,
      nome: l.nome,
      corHex: l.cor_hex,
      // Coligação/federação oficial (TSE) do partido neste cargo, via candidato.
      coligacao:
        cands.find((c) => c.partido_id === l.partido_id && c.coligacao)?.coligacao ?? null,
      votosLegenda: l.votos,
      candidatos: cands
        .filter((c) => c.partido_id === l.partido_id)
        .map((c) => ({
          candidatoId: c.id,
          numero: c.numero,
          nomeUrna: c.nome_urna,
          votos: votosCandidato.get(c.id) ?? 0,
        })),
    }))
    const projecao = projetarCadeiras(partidosInput, VAGAS[cargoKey])
    const eleitosIds = new Set<string>()
    for (const p of projecao.partidos) {
      for (const e of p.eleitosProjetados) eleitosIds.add(e.candidatoId)
    }

    const candidatos: Candidato[] = cands
      .map((c) => {
        const partido = Array.isArray(c.partidos) ? c.partidos[0] : c.partidos
        return {
          id: c.id,
          numero: c.numero,
          nome: c.nome_urna,
          partido: partido?.sigla ?? '',
          cor: partido?.cor_hex ?? '#52525b',
          votos: votosCandidato.get(c.id) ?? 0,
          foto: c.foto_url,
          impedimento: c.impedimento,
          coligacao: c.coligacao,
          eleito: eleitosIds.has(c.id),
        }
      })
      .sort((a, b) => b.votos - a.votos)

    const totalNominal = candidatos.reduce((s, c) => s + c.votos, 0)

    // Suplência e empate são por AGREMIAÇÃO: na federação a lista nominal é
    // única (UNIÃO e PP disputam a mesma ordem), e com as travas de 10%/20%
    // do QE o eleito de um partido não é necessariamente o seu N-ésimo mais
    // votado — por isso a referência é o conjunto de eleitos da agremiação.
    const partidoIdsPorAgremiacao = new Map<string, string[]>()
    for (const p of projecao.partidos) {
      const lista = partidoIdsPorAgremiacao.get(p.agremiacaoChave) ?? []
      lista.push(p.partidoId)
      partidoIdsPorAgremiacao.set(p.agremiacaoChave, lista)
    }
    for (const partidoIds of partidoIdsPorAgremiacao.values()) {
      const listaNominal = partidosInput
        .filter((p) => partidoIds.includes(p.partidoId))
        .flatMap((p) => p.candidatos)
        .sort((a, b) => b.votos - a.votos || a.numero - b.numero)
      const eleitosDaAg = listaNominal.filter((c) => eleitosIds.has(c.candidatoId))
      if (eleitosDaAg.length === 0) continue
      const naoEleitos = listaNominal.filter((c) => !eleitosIds.has(c.candidatoId))
      naoEleitos.forEach((c, i) => {
        const found = candidatos.find((x) => x.id === c.candidatoId)
        if (found) found.suplente = i + 1
      })

      if (totalNominal > 0) {
        // Empate técnico com o eleito MENOS votado da agremiação.
        const ultimoEleito = eleitosDaAg[eleitosDaAg.length - 1]
        if (!ultimoEleito || ultimoEleito.votos === 0) continue
        const pCut = ultimoEleito.votos / totalNominal
        const meCut = 1.96 * Math.sqrt((pCut * (1 - pCut)) / totalNominal)
        for (const c of naoEleitos) {
          const pC = c.votos / totalNominal
          const meC = 1.96 * Math.sqrt((pC * (1 - pC)) / totalNominal)
          if (pCut - pC <= meCut + meC) {
            const found = candidatos.find((x) => x.id === c.candidatoId)
            if (found) found.empate = true
          } else {
            break
          }
        }
      }
    }

    const bns = brancoNaoSei[cargoKey] ?? { branco: 0, nao_sabe: 0 }
    if (
      candidatos.every((c) => c.votos === 0) &&
      bns.branco === 0 &&
      bns.nao_sabe === 0 &&
      legendasCargo.length === 0
    ) {
      return null
    }
    return {
      titulo: cargoKey === 'federal' ? 'Deputado Federal' : 'Deputado Estadual',
      regra: REGRA[cargoKey],
      vagas: VAGAS[cargoKey],
      candidatos,
      branco: bns.branco,
      nao_sabe: bns.nao_sabe,
    }
  }

  // ----- Zona de Expansão -----
  let zonaCargo: CargoZona | null = null
  {
    const ajuRow = (zonaData ?? []).find(
      (r: { resposta: string }) => r.resposta === 'aracaju',
    ) as { votos: number } | undefined
    const scRow = (zonaData ?? []).find(
      (r: { resposta: string }) => r.resposta === 'sao_cristovao',
    ) as { votos: number } | undefined
    const aju = ajuRow?.votos ?? 0
    const sc = scRow?.votos ?? 0
    const bns = brancoNaoSei['zona_expansao'] ?? { branco: 0, nao_sabe: 0 }
    // Flag do admin: com a consulta desligada, o bloco some da TV e de
    // /resultados. Os votos NÃO são apagados — ficam em votos_pesquisa e
    // voltam a aparecer se o admin religar a consulta.
    const zonaAtiva = edicao.consulta_zona_ativa !== false
    if (zonaAtiva && (aju > 0 || sc > 0 || bns.branco > 0 || bns.nao_sabe > 0)) {
      zonaCargo = {
        titulo: 'Zona de Expansão',
        aracaju: aju,
        sao_cristovao: sc,
        branco: bns.branco,
        nao_sabe: bns.nao_sabe,
      }
    }
  }

  const n = eleitoresCount ?? 0
  const margem = calcularMargem(n)

  const pesquisa: Pesquisa = {
    meta: {
      n,
      margem,
      confianca: '95%',
      divulgada_em: formatarData(edicao.divulgada_em),
      registro_tre: edicao.registro_tre ?? '—',
      edicao: edicao.nome,
      turno: (edicao.turno === 2 ? 2 : 1) as 1 | 2,
      contratante: CONTRATANTE,
    },
    governador: montaCargoCandidato('governador'),
    senador: montaCargoCandidato('senador'),
    presidente: montaCargoCandidato('presidente'),
    federal: montaCargoLegenda('federal'),
    estadual: montaCargoLegenda('estadual'),
    zona_expansao: zonaCargo,
  }

  return { status: 'ok', pesquisa, patroPorCota }
}
