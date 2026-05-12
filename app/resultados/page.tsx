import Link from 'next/link'

import {
  ResultadosDashboard,
  type Candidato,
  type CargoCandidato,
  type CargoZona,
  type Pesquisa,
} from '@/components/resultados-dashboard'
import { RodapeInstitucional } from '@/components/rodape-institucional'
import {
  projetarCadeiras,
  type PartidoVotos,
} from '@/lib/projecao'
import {
  montaRegionais,
  type CandidatoLeve,
  type RegiaoKey,
} from '@/lib/regional'
import { supabaseAdmin } from '@/lib/supabase/admin'

import './resultados.css'

export const metadata = {
  title: 'Resultados · Pesquisa Sergipe 2026',
  description:
    'Resultados da Pesquisa Sergipe 2026 realizada pela CDL Aracaju. Registrada no TRE/SE.',
}

export const dynamic = 'force-dynamic'

const VAGAS = { federal: 8, estadual: 24 } as const

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

type EdicaoRow = {
  id: string
  nome: string
  divulgada_em: string | null
  divulgacao_prevista: string | null
  registro_tre: string | null
  turno: number | null
}

export default async function ResultadosPublicosPage() {
  const db = supabaseAdmin()
  const { data: edicao } = await db
    .from('edicao')
    .select('id, nome, divulgada_em, divulgacao_prevista, registro_tre, turno')
    .eq('ativa', true)
    .maybeSingle<EdicaoRow>()

  if (!edicao || !edicao.divulgada_em) {
    return <AguardandoDivulgacao edicao={edicao} />
  }

  // ----- Carrega tudo em paralelo -----
  const [
    { data: candFedEstData },
    { data: votosCandidatoFedEst },
    { data: votosCandidatosTudo },
    { data: votosLegendaTudo },
    { data: zonaData },
    { data: bnsData },
    { count: eleitoresCount },
    { data: impedimentosData },
    { data: candidatosCargoSimples },
    { data: municipiosRegiaoData },
    { data: votosRegionaisData },
  ] = await Promise.all([
    db
      .from('candidatos_pesquisa')
      .select('id, cargo, numero, nome_urna, foto_url, impedimento, partido_id, partidos!inner(sigla, cor_hex)')
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
    db
      .from('votos_pesquisa')
      .select('cargo, metodo')
      .eq('edicao_id', edicao.id)
      .in('metodo', ['branco', 'nao_sabe']),
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
    db
      .from('votos_pesquisa')
      .select('candidato_id, municipio_ibge, cargo')
      .eq('edicao_id', edicao.id)
      .eq('metodo', 'numero')
      .in('cargo', ['presidente', 'governador', 'senador'])
      .not('candidato_id', 'is', null)
      .not('municipio_ibge', 'is', null),
  ])

  // ----- Branco / Não sei -----
  const brancoNaoSei: Record<string, { branco: number; nao_sabe: number }> = {}
  for (const r of (bnsData ?? []) as Array<{ cargo: string; metodo: string }>) {
    if (!brancoNaoSei[r.cargo])
      brancoNaoSei[r.cargo] = { branco: 0, nao_sabe: 0 }
    if (r.metodo === 'branco') brancoNaoSei[r.cargo].branco++
    if (r.metodo === 'nao_sabe') brancoNaoSei[r.cargo].nao_sabe++
  }

  // ----- Impedimentos -----
  const impedimentos = new Map<string, string>()
  for (const r of (impedimentosData ?? []) as Array<{
    id: string
    impedimento: string | null
  }>) {
    if (r.impedimento) impedimentos.set(r.id, r.impedimento)
  }

  // ----- Mapa município → região + count por região -----
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

    // Mapa de impedimento via candidatosCargoSimples (que tem foto + impedimento)
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
    }>)
      .filter((v) => v.cargo === cargoKey)
      .map((v) => ({
        candidato_id: v.candidato_id,
        municipio_ibge: v.municipio_ibge,
        votos: 1, // cada linha = 1 voto
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

  // ----- Fed/Est — monta CargoCandidato a partir de votos individuais + eleitos via projecao -----
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

    // Lista candidatos fed/est + metadata
    const cands = ((candFedEstData ?? []) as Array<{
      id: string
      cargo: string
      numero: number
      nome_urna: string
      foto_url: string | null
      impedimento: string | null
      partido_id: string
      partidos: { sigla: string; cor_hex: string | null } | { sigla: string; cor_hex: string | null }[]
    }>).filter((c) => c.cargo === cargoKey)

    // Calcula projecao TSE pra identificar eleitos
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
          eleito: eleitosIds.has(c.id),
        }
      })
      .sort((a, b) => b.votos - a.votos)

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
    if (aju > 0 || sc > 0 || bns.branco > 0 || bns.nao_sabe > 0) {
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
    },
    governador: montaCargoCandidato('governador'),
    senador: montaCargoCandidato('senador'),
    presidente: montaCargoCandidato('presidente'),
    federal: montaCargoLegenda('federal'),
    estadual: montaCargoLegenda('estadual'),
    zona_expansao: zonaCargo,
  }

  return (
    <>
      <header className="rs-header">
        <div className="rs-header-inner">
          <Link href="/" className="rs-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/cdl-logo.png"
              alt="CDL Aracaju"
              className="rs-brand-img"
            />
          </Link>
          <span className="rs-header-tag">Pesquisa Sergipe 2026</span>
          <span className="rs-header-spacer" />
          <span
            className="rs-live"
            style={{
              background: pesquisa.meta.turno === 2 ? '#0a1428' : '#fff',
              color: pesquisa.meta.turno === 2 ? '#fff' : 'inherit',
              borderColor:
                pesquisa.meta.turno === 2 ? '#0a1428' : 'var(--border)',
            }}
          >
            {pesquisa.meta.turno}º TURNO · {pesquisa.meta.edicao}
          </span>
        </div>
      </header>

      <section className="rs-hero">
        <div className="rs-hero-inner">
          <div className="rs-hero-text">
            <p className="rs-hero-kicker">
              Pesquisa Sergipe 2026 · {pesquisa.meta.turno}º Turno ·{' '}
              {pesquisa.meta.edicao}
            </p>
            <h1 className="rs-hero-title">Eleições em Sergipe</h1>
            <p className="rs-hero-sub">
              Intenção de voto para o{' '}
              <strong>{pesquisa.meta.turno}º turno</strong> em 75
              municípios. Identidade verificada por CPF + WhatsApp.
              Registrada no PesqEle/TRE conforme Lei 9.504/97.
            </p>
          </div>
          <div className="rs-ficha">
            <FichaCard
              rotulo="Amostra (n)"
              valor={pesquisa.meta.n.toLocaleString('pt-BR')}
              sub="CPF + WhatsApp verificados"
            />
            <FichaCard
              rotulo="Margem"
              valor={pesquisa.meta.margem}
              sub="Erro amostral"
            />
            <FichaCard
              rotulo="Confiança"
              valor={pesquisa.meta.confianca}
              sub="Intervalo"
            />
            <FichaCard
              rotulo="Divulgada"
              valor={pesquisa.meta.divulgada_em}
              sub={`TRE: ${pesquisa.meta.registro_tre}`}
            />
          </div>
        </div>
      </section>

      <ResultadosDashboard pesquisa={pesquisa} />

      <RodapeInstitucional />
    </>
  )
}

function FichaCard({
  rotulo,
  valor,
  sub,
}: {
  rotulo: string
  valor: string
  sub: string
}) {
  return (
    <div className="rs-ficha-card">
      <p className="rs-ficha-rot">{rotulo}</p>
      <p className="rs-ficha-val">{valor}</p>
      <p className="rs-ficha-sub">{sub}</p>
    </div>
  )
}

function AguardandoDivulgacao({ edicao }: { edicao: EdicaoRow | null }) {
  const prevista = edicao?.divulgacao_prevista
  return (
    <>
      <main className="flex flex-col flex-1 bg-background items-center justify-center px-5 py-16">
        <div className="w-full max-w-md flex flex-col gap-8 items-start">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
              Resultados
            </p>
            <h1 className="text-3xl sm:text-4xl font-semibold leading-tight">
              Em breve aqui
            </h1>
            {prevista ? (
              <p className="text-base text-muted-foreground leading-relaxed">
                A pesquisa Sergipe 2026 da CDL Aracaju será divulgada em{' '}
                <strong className="text-foreground">
                  {formatarData(prevista)}
                </strong>
                , após registro no PesqEle do TRE/SE conforme Resolução
                TSE 23.747/2026.
              </p>
            ) : (
              <p className="text-base text-muted-foreground leading-relaxed">
                A pesquisa Sergipe 2026 da CDL Aracaju ainda não foi
                divulgada.
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Link
              href="/"
              className="flex-1 inline-flex justify-center items-center h-11 px-5 rounded-md border border-border text-foreground text-sm font-medium hover:bg-muted transition"
            >
              ← Voltar ao início
            </Link>
            <Link
              href="/transparencia"
              className="flex-1 inline-flex justify-center items-center h-11 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
            >
              Ver metodologia
            </Link>
          </div>
        </div>
      </main>
      <RodapeInstitucional />
    </>
  )
}

function formatarData(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function calcularMargem(n: number): string {
  if (n < 30) return '±—'
  const margem = (1.96 * Math.sqrt(0.25 / n) * 100).toFixed(1)
  return `±${margem}pp`
}
