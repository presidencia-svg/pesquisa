import Link from 'next/link'

import { RodapeInstitucional } from '@/components/rodape-institucional'
import type {
  CargoCandidato,
  CargoZona,
} from '@/components/resultados-dashboard'
import {
  carregarResultados,
  formatarData,
  type EdicaoRow,
  type PatroPublico,
} from '@/lib/resultados-data'

import './resultados.css'

export const metadata = {
  title: 'Resultados · Pesquisa Sergipe 2026',
  description:
    'Resultados da Pesquisa Sergipe 2026 realizada pela CDL Aracaju. Registrada no TRE/SE.',
}

// Cache de 15s — mesmo racional da versão anterior. revalidatePath('/resultados')
// nas actions de divulgar/retirar invalida na hora.
export const revalidate = 15

// Ordem e slugs dos cargos no hub. Slug vira /resultados/<slug>.
// Ordem definida pelo Presidente da CDL: estaduais primeiro (Governador,
// Senador), depois Presidente, legislativos e a consulta extra.
const CARGOS = [
  { key: 'governador', slug: 'governador', label: 'Governador' },
  { key: 'senador', slug: 'senador', label: 'Senador' },
  { key: 'presidente', slug: 'presidente', label: 'Presidente' },
  { key: 'federal', slug: 'deputado-federal', label: 'Deputado Federal' },
  { key: 'estadual', slug: 'deputado-estadual', label: 'Deputado Estadual' },
  { key: 'zona_expansao', slug: 'zona-expansao', label: 'Zona de Expansão' },
] as const

type Teaser = {
  liderNome: string
  liderSub: string
  liderPct: number
  liderCor: string
  liderFoto: string | null
  rodape: string
}

function teaserCandidato(cargo: CargoCandidato): Teaser | null {
  const lider = cargo.candidatos[0]
  if (!lider) return null
  const validos = cargo.candidatos.reduce((s, c) => s + c.votos, 0)
  const pct = validos > 0 ? (lider.votos / validos) * 100 : 0
  const rodape = cargo.vagas
    ? `${cargo.vagas} ${cargo.vagas === 1 ? 'vaga' : 'vagas'} em disputa`
    : 'Maioria dos votos válidos'
  return {
    liderNome: lider.nome,
    liderSub: lider.partido,
    liderPct: pct,
    liderCor: lider.cor,
    liderFoto: lider.foto,
    rodape,
  }
}

function teaserZona(cargo: CargoZona): Teaser {
  const total =
    cargo.aracaju + cargo.sao_cristovao + cargo.branco + cargo.nao_sabe
  const ajuPct = total > 0 ? (cargo.aracaju / total) * 100 : 0
  const scPct = total > 0 ? (cargo.sao_cristovao / total) * 100 : 0
  const ajuLider = ajuPct >= scPct
  return {
    liderNome: ajuLider ? 'Aracaju' : 'São Cristóvão',
    liderSub: 'Aracaju × S. Cristóvão',
    liderPct: Math.max(ajuPct, scPct),
    liderCor: ajuLider ? '#1d3a8a' : '#fcc40c',
    liderFoto: null,
    rodape: 'Consulta extra',
  }
}

function fmtPct(x: number): string {
  return x.toFixed(1).replace('.', ',')
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default async function ResultadosHubPage() {
  const r = await carregarResultados()

  if (r.status === 'aguardando') {
    return <AguardandoDivulgacao edicao={r.edicao} />
  }

  const { pesquisa, patroPorCota } = r
  const { meta } = pesquisa

  return (
    <>
      <header className="rs-header">
        <div className="rs-header-inner">
          <Link href="/" className="rs-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cdl-logo.png" alt="CDL Aracaju" className="rs-brand-img" />
          </Link>
          <span className="rs-header-tag">Pesquisa Sergipe 2026</span>
          <span className="rs-header-spacer" />
          <span
            className="rs-live"
            style={{
              background: meta.turno === 2 ? '#0a1428' : '#fff',
              color: meta.turno === 2 ? '#fff' : 'inherit',
              borderColor: meta.turno === 2 ? '#0a1428' : 'var(--border)',
            }}
          >
            {meta.turno}º TURNO · {meta.edicao}
          </span>
        </div>
      </header>

      <main className="rs-hub">
        <div className="rs-hub-inner">
          {/* Título + resumo */}
          <section className="rs-hub-hero">
            <p className="rs-hub-kicker">
              Pesquisa de intenção de voto · {meta.turno}º turno
            </p>
            <h1 className="rs-hub-title">Eleições Sergipe 2026</h1>
            <p className="rs-hub-resumo">
              A maior pesquisa eleitoral já realizada em Sergipe ouviu{' '}
              <strong>{meta.n.toLocaleString('pt-BR')} eleitores</strong> com
              identidade verificada por CPF e WhatsApp nos 75 municípios do
              estado. Metodologia espontânea — o eleitor digita o número como
              na urna, sem ver lista de candidatos. Registrada no PesqEle/TRE-SE
              conforme a Lei 9.504/97.
            </p>
          </section>

          {/* Ficha técnica */}
          <section className="rs-hub-ficha">
            <FichaCard
              rotulo="Amostra"
              valor={meta.n.toLocaleString('pt-BR')}
              sub="CPF + WhatsApp"
            />
            <FichaCard rotulo="Margem" valor={meta.margem} sub="Erro amostral" />
            <FichaCard rotulo="Confiança" valor={meta.confianca} sub="Intervalo" />
            <FichaCard
              rotulo="Divulgada"
              valor={meta.divulgada_em}
              sub={`TRE: ${meta.registro_tre}`}
            />
          </section>

          {/* Patrocinador Diamante — apresentada por */}
          {patroPorCota.diamante.length > 0 && (
            <section className="rs-hub-diamante">
              <p className="rs-hub-diamante-kicker">Pesquisa apresentada por</p>
              <div className="rs-hub-diamante-logos">
                {patroPorCota.diamante.map((p) => (
                  <LogoPatro key={p.id} patro={p} />
                ))}
              </div>
            </section>
          )}

          {/* Botões por cargo */}
          <section className="rs-hub-cargos-sec">
            <p className="rs-hub-cargos-label">Escolha o cargo</p>
            <div className="rs-hub-cargos">
              {CARGOS.map(({ key, slug, label }) => {
                const cargo = pesquisa[key]
                if (!cargo) {
                  return (
                    <div key={key} className="rs-hub-cargo rs-hub-cargo-vazio">
                      <div className="rs-hub-cargo-head">
                        <span className="rs-hub-cargo-nome">{label}</span>
                      </div>
                      <p className="rs-hub-cargo-semdados">Sem dados ainda</p>
                    </div>
                  )
                }
                const teaser =
                  key === 'zona_expansao'
                    ? teaserZona(cargo as CargoZona)
                    : teaserCandidato(cargo as CargoCandidato)
                if (!teaser) {
                  return (
                    <div key={key} className="rs-hub-cargo rs-hub-cargo-vazio">
                      <div className="rs-hub-cargo-head">
                        <span className="rs-hub-cargo-nome">{label}</span>
                      </div>
                      <p className="rs-hub-cargo-semdados">Sem dados ainda</p>
                    </div>
                  )
                }
                return (
                  <Link
                    key={key}
                    href={`/resultados/${slug}`}
                    className="rs-hub-cargo"
                    style={
                      {
                        ['--accent' as string]: teaser.liderCor,
                      } as React.CSSProperties
                    }
                  >
                    <div className="rs-hub-cargo-head">
                      <span className="rs-hub-cargo-nome">{label}</span>
                      <span className="rs-hub-cargo-seta">→</span>
                    </div>
                    <div className="rs-hub-cargo-lider">
                      <span className="rs-hub-cargo-avatar">
                        {teaser.liderFoto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={teaser.liderFoto} alt="" />
                        ) : (
                          <span>{initials(teaser.liderNome)}</span>
                        )}
                      </span>
                      <span className="rs-hub-cargo-lider-text">
                        <span className="rs-hub-cargo-lider-nome">
                          {teaser.liderNome}
                        </span>
                        <span className="rs-hub-cargo-lider-sub">
                          {teaser.liderSub}
                        </span>
                      </span>
                      <span className="rs-hub-cargo-pct">
                        {fmtPct(teaser.liderPct)}
                        <small>%</small>
                      </span>
                    </div>
                    <p className="rs-hub-cargo-rodape">{teaser.rodape}</p>
                  </Link>
                )
              })}
            </div>
          </section>

          {/* Ações extras */}
          <section className="rs-hub-acoes">
            <Link href="/resultados/mapa" className="rs-hub-acao rs-hub-acao-mapa">
              <span className="rs-hub-acao-titulo">Mapa por cidade</span>
              <span className="rs-hub-acao-sub">
                Quem ganhou em cada um dos 75 municípios →
              </span>
            </Link>
            <Link href="/transparencia" className="rs-hub-acao">
              <span className="rs-hub-acao-titulo">Metodologia</span>
              <span className="rs-hub-acao-sub">
                Como a pesquisa foi feita e auditada →
              </span>
            </Link>
          </section>

          {/* Ouro + Prata — apoio */}
          {(patroPorCota.ouro.length > 0 || patroPorCota.prata.length > 0) && (
            <section className="rs-hub-apoio">
              {patroPorCota.ouro.length > 0 && (
                <div className="rs-hub-apoio-bloco">
                  <p className="rs-hub-apoio-kicker">Apoio institucional</p>
                  <div className="rs-hub-apoio-logos">
                    {patroPorCota.ouro.map((p) => (
                      <LogoPatro key={p.id} patro={p} cota="ouro" />
                    ))}
                  </div>
                </div>
              )}
              {patroPorCota.prata.length > 0 && (
                <div className="rs-hub-apoio-bloco">
                  <p className="rs-hub-apoio-kicker">Apoiadores</p>
                  <div className="rs-hub-apoio-logos">
                    {patroPorCota.prata.map((p) => (
                      <LogoPatro key={p.id} patro={p} cota="prata" />
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      <RodapeInstitucional />
    </>
  )
}

/** Logo do patrocinador clicável (se houver site_url) ou estática. */
function LogoPatro({
  patro,
  cota,
}: {
  patro: PatroPublico
  cota?: 'ouro' | 'prata'
}) {
  if (!patro.logo_url) return null
  const cls =
    cota === 'ouro'
      ? 'rs-patro-img rs-patro-ouro-img'
      : cota === 'prata'
        ? 'rs-patro-img rs-patro-prata-img'
        : 'rs-patro-img rs-patro-diamante-img'
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={patro.logo_url} alt={patro.empresa} className={cls} loading="lazy" />
  )
  if (patro.site_url) {
    return (
      <a
        href={patro.site_url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        title={patro.empresa}
        className="rs-patro-link"
      >
        {img}
      </a>
    )
  }
  return (
    <span title={patro.empresa} className="rs-patro-link">
      {img}
    </span>
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
                , após registro no PesqEle do TRE/SE conforme Resolução TSE
                23.747/2026.
              </p>
            ) : (
              <p className="text-base text-muted-foreground leading-relaxed">
                A pesquisa Sergipe 2026 da CDL Aracaju ainda não foi divulgada.
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
