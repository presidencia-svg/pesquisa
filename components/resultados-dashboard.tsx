'use client'

/**
 * Dashboard publico de resultados — overview cards + drill-down.
 *
 * Layout vindo de um mock Claude Design (chat1.md). User explicito:
 *   - "Hierarquia visual fraca" → card de lider em destaque
 *   - "Layout denso/cansativo" → cards de overview com top 3 mini-barras
 *   - "Abas no topo fracas/dificeis no mobile" → trocou por cards
 *   - "Fed/Est confusos (sub-abas)" → ranking unico com sigla colorida
 *   - "Falta fotos" → Avatar com foto_url + fallback iniciais
 *
 * Server passa shape `pesquisa` ja' montado; este componente faz apenas
 * estado de UI (cargo aberto, filtro de eleitos/bolha).
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'

// ---------- Types ----------
export type CargoId =
  | 'governador'
  | 'senador'
  | 'presidente'
  | 'federal'
  | 'estadual'
  | 'zona_expansao'

export type Candidato = {
  id: string
  numero: number
  nome: string
  partido: string
  cor: string
  votos: number
  foto: string | null
  impedimento: string | null
  eleito?: boolean
  delta?: number
}

export type RegiaoResultadoLeve = {
  regiao: 'leste' | 'agreste' | 'sertao'
  rotulo: string
  subtitulo: string
  municipios: number
  totalVotos: number
  liderNome: string | null
  liderPartido: string
  liderCor: string
  liderFoto: string | null
  liderVotos: number
  liderPct: number
}

export type CargoCandidato = {
  titulo: string
  vagas?: number
  regra: string
  candidatos: Candidato[]
  branco: number
  nao_sabe: number
  regional?: RegiaoResultadoLeve[]
}

export type CargoZona = {
  titulo: string
  aracaju: number
  sao_cristovao: number
  branco: number
  nao_sabe: number
}

export type Meta = {
  n: number
  margem: string
  confianca: string
  divulgada_em: string
  registro_tre: string
  edicao: string
}

export type Pesquisa = {
  meta: Meta
  governador: CargoCandidato | null
  senador: CargoCandidato | null
  presidente: CargoCandidato | null
  federal: CargoCandidato | null
  estadual: CargoCandidato | null
  zona_expansao: CargoZona | null
}

// ---------- Helpers ----------
const fmt = (n: number) => n.toLocaleString('pt-BR')
const pct = (a: number, b: number) => (b === 0 ? 0 : (a / b) * 100)
const fmtPct = (x: number, d = 1) =>
  x.toFixed(d).replace('.', ',') + '%'

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Cor por posicao: azul (1o) → verde (meio) → amarelo (ultimo). */
function rankColor(i: number, total: number) {
  if (total <= 1) return 'hsl(218, 60%, 46%)'
  const t = Math.min(1, Math.max(0, i / (total - 1)))
  let hue: number
  if (t < 0.5) {
    const k = t / 0.5
    hue = 218 + (148 - 218) * k
  } else {
    const k = (t - 0.5) / 0.5
    hue = 148 + (48 - 148) * k
  }
  const sat = 55 + 10 * t
  const lig = 46 + 6 * t
  return `hsl(${hue.toFixed(1)}, ${sat.toFixed(0)}%, ${lig.toFixed(0)}%)`
}

function totalsFor(c: CargoCandidato) {
  const validos = c.candidatos.reduce((a, b) => a + b.votos, 0)
  return {
    validos,
    branco: c.branco ?? 0,
    nao_sabe: c.nao_sabe ?? 0,
    total: validos + (c.branco ?? 0) + (c.nao_sabe ?? 0),
  }
}

// ---------- Avatar ----------
function Avatar({
  nome,
  foto,
  size = 48,
}: {
  nome: string
  foto: string | null
  size?: number
}) {
  const [erro, setErro] = useState(false)
  if (foto && !erro) {
    return (
      <div
        className="avatar avatar-foto"
        style={{ width: size, height: size }}
        aria-label={nome}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={foto}
          alt={nome}
          loading="lazy"
          onError={() => setErro(true)}
        />
      </div>
    )
  }
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.32),
      }}
      aria-label={nome}
    >
      <span>{initials(nome)}</span>
    </div>
  )
}

// ---------- Component ----------
type Props = { pesquisa: Pesquisa }

export function ResultadosDashboard({ pesquisa }: Props) {
  const [open, setOpen] = useState<CargoId | null>(null)
  const detailRef = useRef<HTMLDivElement | null>(null)

  const cargosDisponiveis = useMemo<
    Array<[CargoId, CargoCandidato | CargoZona]>
  >(() => {
    const out: Array<[CargoId, CargoCandidato | CargoZona]> = []
    for (const id of [
      'governador',
      'senador',
      'presidente',
      'federal',
      'estadual',
      'zona_expansao',
    ] as CargoId[]) {
      const c = pesquisa[id]
      if (c) out.push([id, c])
    }
    return out
  }, [pesquisa])

  // Default open: primeiro cargo disponivel + sync URL hash.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const fromHash = window.location.hash.slice(1) as CargoId
    const valid = cargosDisponiveis.some(([id]) => id === fromHash)
    if (valid) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(fromHash)
    } else if (cargosDisponiveis.length > 0) {
      setOpen(cargosDisponiveis[0][0])
    }
  }, [cargosDisponiveis])

  const openCargo = (id: CargoId) => {
    setOpen(id)
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${id}`)
    }
    setTimeout(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
  }

  const closeCargo = () => {
    setOpen(null)
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }

  return (
    <>
      <section className="rs-overview">
        <div className="rs-overview-inner">
          <div className="rs-overview-head">
            <p className="rs-overview-kicker">Cenário atual</p>
            <h2 className="rs-overview-title">Liderança por cargo</h2>
            <p className="rs-overview-sub">
              Toque num cargo para abrir o detalhamento completo.
            </p>
          </div>
          <div className="rs-overview-grid">
            {cargosDisponiveis.map(([id, cargo]) =>
              id === 'zona_expansao' ? (
                <ZonaCard
                  key={id}
                  cargo={cargo as CargoZona}
                  onOpen={openCargo}
                  isOpen={open === id}
                />
              ) : (
                <OverviewCard
                  key={id}
                  id={id}
                  cargo={cargo as CargoCandidato}
                  onOpen={openCargo}
                  isOpen={open === id}
                />
              ),
            )}
          </div>
        </div>
      </section>

      <section ref={detailRef} className="rs-detail-wrap">
        <div className="rs-detail-inner">
          {open ? (
            open === 'zona_expansao' && pesquisa.zona_expansao ? (
              <DetalheZona
                cargo={pesquisa.zona_expansao}
                onClose={closeCargo}
              />
            ) : (
              <Detalhe
                cargo={pesquisa[open] as CargoCandidato}
                onClose={closeCargo}
              />
            )
          ) : (
            <p className="rs-empty">
              Escolha um cargo acima para ver o detalhamento.
            </p>
          )}
        </div>
      </section>
    </>
  )
}

// ---------- Overview cards ----------
function OverviewCard({
  id,
  cargo,
  onOpen,
  isOpen,
}: {
  id: CargoId
  cargo: CargoCandidato
  onOpen: (id: CargoId) => void
  isOpen: boolean
}) {
  const t = totalsFor(cargo)
  const lider = cargo.candidatos[0]
  const segundo = cargo.candidatos[1]
  if (!lider) {
    return (
      <button
        type="button"
        className={`rs-ov ${isOpen ? 'is-open' : ''}`}
        onClick={() => onOpen(id)}
      >
        <div className="rs-ov-head">
          <span className="rs-ov-cargo">{cargo.titulo}</span>
          {cargo.vagas ? (
            <span className="rs-ov-vagas">
              {cargo.vagas} {cargo.vagas === 1 ? 'vaga' : 'vagas'}
            </span>
          ) : null}
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted-foreground)', fontStyle: 'italic' }}>
          Sem votos registrados ainda.
        </p>
        <div className="rs-ov-foot">
          <span>—</span>
          <span className="rs-ov-cta">{isOpen ? 'Ver ▾' : 'Ver →'}</span>
        </div>
      </button>
    )
  }
  const liderPct = pct(lider.votos, t.total)
  const segundoPct = segundo ? pct(segundo.votos, t.total) : 0
  const dif = liderPct - segundoPct
  const top3 = cargo.candidatos.slice(0, 3)

  return (
    <button
      type="button"
      className={`rs-ov ${isOpen ? 'is-open' : ''}`}
      onClick={() => onOpen(id)}
    >
      <div className="rs-ov-head">
        <span className="rs-ov-cargo">{cargo.titulo}</span>
        {cargo.vagas ? (
          <span className="rs-ov-vagas">
            {cargo.vagas} {cargo.vagas === 1 ? 'vaga' : 'vagas'}
          </span>
        ) : null}
      </div>
      <div className="rs-ov-lider">
        <Avatar nome={lider.nome} foto={lider.foto} size={56} />
        <div className="rs-ov-lider-text">
          <span className="rs-ov-rot">Liderança</span>
          <span className="rs-ov-nome">{lider.nome}</span>
          <span className="rs-ov-sigla">
            {lider.numero} · {lider.partido}
          </span>
        </div>
        <div className="rs-ov-pct">
          <span className="rs-ov-pct-num">
            {liderPct.toFixed(1).replace('.', ',')}
          </span>
          <span className="rs-ov-pct-sym">%</span>
        </div>
      </div>
      <div className="rs-ov-bars">
        {top3.map((c, i) => {
          const p = pct(c.votos, t.total)
          return (
            <div key={c.id} className="rs-ov-bar">
              <div className="rs-ov-bar-label">
                <span className="rs-ov-bar-name">{c.nome}</span>
                <span className="rs-ov-bar-pct">
                  {p.toFixed(1).replace('.', ',')}%
                </span>
              </div>
              <div className="rs-ov-bar-track">
                <div
                  className="rs-ov-bar-fill"
                  style={{
                    width: `${p}%`,
                    background: rankColor(
                      i,
                      Math.max(top3.length, cargo.candidatos.length),
                    ),
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <div className="rs-ov-foot">
        {segundo ? (
          <span>
            {dif.toFixed(1).replace('.', ',')} pp à frente de{' '}
            {segundo.nome.split(' ')[0]}
          </span>
        ) : (
          <span>—</span>
        )}
        <span className="rs-ov-cta">{isOpen ? 'Ver detalhes ▾' : 'Ver detalhes →'}</span>
      </div>
    </button>
  )
}

function ZonaCard({
  cargo,
  onOpen,
  isOpen,
}: {
  cargo: CargoZona
  onOpen: (id: CargoId) => void
  isOpen: boolean
}) {
  const total =
    cargo.aracaju + cargo.sao_cristovao + cargo.branco + cargo.nao_sabe
  const ajuPct = pct(cargo.aracaju, total)
  const scPct = pct(cargo.sao_cristovao, total)
  const lider = ajuPct >= scPct ? 'Aracaju' : 'São Cristóvão'
  const liderCor = ajuPct >= scPct ? '#1d3a8a' : '#fcc40c'
  const liderPctVal = Math.max(ajuPct, scPct)
  return (
    <button
      type="button"
      className={`rs-ov rs-ov-zona ${isOpen ? 'is-open' : ''}`}
      onClick={() => onOpen('zona_expansao')}
      style={{ ['--accent' as string]: liderCor } as React.CSSProperties}
    >
      <div className="rs-ov-head">
        <span className="rs-ov-cargo">{cargo.titulo}</span>
        <span className="rs-ov-vagas">consulta extra</span>
      </div>
      <div className="rs-ov-lider">
        <div className="rs-zona-icon" style={{ background: liderCor }}>
          <svg viewBox="0 0 24 24" width="28" height="28" fill="white">
            <path d="M12 2L4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z" />
          </svg>
        </div>
        <div className="rs-ov-lider-text">
          <span className="rs-ov-rot">Deveria ficar com</span>
          <span className="rs-ov-nome">{lider}</span>
          <span className="rs-ov-sigla">Aracaju × S. Cristóvão</span>
        </div>
        <div className="rs-ov-pct">
          <span className="rs-ov-pct-num">{liderPctVal.toFixed(0)}</span>
          <span className="rs-ov-pct-sym">%</span>
        </div>
      </div>
      <div className="rs-ov-bars">
        <div className="rs-ov-bar">
          <div className="rs-ov-bar-label">
            <span>Aracaju</span>
            <span>{ajuPct.toFixed(1).replace('.', ',')}%</span>
          </div>
          <div className="rs-ov-bar-track">
            <div
              className="rs-ov-bar-fill"
              style={{ width: `${ajuPct}%`, background: '#1d3a8a' }}
            />
          </div>
        </div>
        <div className="rs-ov-bar">
          <div className="rs-ov-bar-label">
            <span>São Cristóvão</span>
            <span>{scPct.toFixed(1).replace('.', ',')}%</span>
          </div>
          <div className="rs-ov-bar-track">
            <div
              className="rs-ov-bar-fill"
              style={{ width: `${scPct}%`, background: '#fcc40c' }}
            />
          </div>
        </div>
      </div>
      <div className="rs-ov-foot">
        <span>Eleitores de Aracaju + S. Cristóvão</span>
        <span className="rs-ov-cta">{isOpen ? 'Ver detalhes ▾' : 'Ver detalhes →'}</span>
      </div>
    </button>
  )
}

// ---------- Detail ----------
function Detalhe({
  cargo,
  onClose,
}: {
  cargo: CargoCandidato
  onClose: () => void
}) {
  const t = totalsFor(cargo)
  const ordered = useMemo(
    () => [...cargo.candidatos].sort((a, b) => b.votos - a.votos),
    [cargo.candidatos],
  )
  const lider = ordered[0]
  const segundo = ordered[1]
  const liderPct = lider ? pct(lider.votos, t.total) : 0
  const segundoPct = segundo ? pct(segundo.votos, t.total) : 0
  const dif = liderPct - segundoPct

  const [filtro, setFiltro] = useState<'todos' | 'eleitos' | 'bolha'>('todos')
  const filtrados = useMemo(() => {
    if (filtro === 'todos') return ordered
    if (filtro === 'eleitos') return ordered.filter((c) => c.eleito)
    if (filtro === 'bolha')
      return ordered.filter(
        (_, i) => cargo.vagas && i >= cargo.vagas - 3 && i < cargo.vagas + 5,
      )
    return ordered
  }, [filtro, ordered, cargo.vagas])

  return (
    <article className="rs-detail">
      <div className="rs-detail-head">
        <div>
          <p className="rs-detail-kicker">Detalhamento</p>
          <h2 className="rs-detail-title">{cargo.titulo}</h2>
          <p className="rs-detail-meta">
            {fmt(t.total)} votos contabilizados
            {cargo.vagas ? ` · ${cargo.vagas} cadeiras em disputa` : ''}
          </p>
        </div>
        <button className="rs-close" onClick={onClose} aria-label="Fechar">
          ×
        </button>
      </div>

      {lider && (
        <DetailLider
          lider={lider}
          segundo={segundo ?? null}
          liderPct={liderPct}
          segundoPct={segundoPct}
          dif={dif}
        />
      )}

      {cargo.vagas ? (
        <div className="rs-filtros">
          {(['todos', 'eleitos', 'bolha'] as const).map((k) => (
            <button
              key={k}
              type="button"
              className={`rs-filtro ${filtro === k ? 'is-active' : ''}`}
              onClick={() => setFiltro(k)}
            >
              {k === 'todos' && `Todos (${ordered.length})`}
              {k === 'eleitos' && `Eleitos (${cargo.vagas})`}
              {k === 'bolha' && 'Na bolha do corte'}
            </button>
          ))}
        </div>
      ) : null}

      <div className="rs-list">
        {filtrados.map((c) => (
          <LinhaCandidato
            key={c.id}
            c={c}
            posicao={ordered.indexOf(c) + 1}
            totalVal={t.total}
            vagas={cargo.vagas}
            totalLista={ordered.length}
          />
        ))}
      </div>

      <Totais t={t} />

      {cargo.regional && cargo.regional.length > 0 && (
        <RegionalStrip regional={cargo.regional} />
      )}

      <MetodoNota texto={cargo.regra} />

      <p className="rs-impedimento" style={{ marginTop: 16 }}>
        <Link href="/transparencia" style={{ color: 'var(--primary)' }}>
          Ler metodologia completa →
        </Link>
      </p>
    </article>
  )
}

function DetailLider({
  lider,
  segundo,
  liderPct,
  segundoPct,
  dif,
}: {
  lider: Candidato
  segundo: Candidato | null
  liderPct: number
  segundoPct: number
  dif: number
}) {
  return (
    <div className="rs-lider-card">
      <div className="rs-lider-rot">
        <span className="rs-lider-rot-dot" />
        Lidera a corrida
        {lider.impedimento && (
          <span className="rs-tag rs-tag-warn">sub judice</span>
        )}
      </div>
      <div className="rs-lider-row">
        <Avatar nome={lider.nome} foto={lider.foto} size={120} />
        <div className="rs-lider-info">
          <p className="rs-lider-nome">{lider.nome}</p>
          <p className="rs-lider-sigla">
            <span className="rs-pill">{lider.numero}</span>
            <span className="rs-pill-text">{lider.partido}</span>
          </p>
          <p className="rs-lider-votos">
            {fmt(lider.votos)} <span>votos</span>
          </p>
        </div>
        <div className="rs-lider-pct">
          <span className="rs-lider-pct-num">
            {liderPct.toFixed(1).replace('.', ',')}
          </span>
          <span className="rs-lider-pct-sym">%</span>
        </div>
      </div>
      {segundo && (
        <div className="rs-lider-delta">
          <div className="rs-lider-delta-bar">
            <div
              className="rs-lider-delta-bar-fill"
              style={{ width: `${liderPct}%` }}
            />
            <div
              className="rs-lider-delta-bar-marker"
              style={{ left: `${segundoPct}%` }}
            >
              <span className="rs-lider-delta-marker-label">
                {segundo.nome.split(' ').slice(-1)[0]} ·{' '}
                {segundoPct.toFixed(1).replace('.', ',')}%
              </span>
            </div>
          </div>
          <p className="rs-lider-delta-text">
            <strong>
              {dif > 0
                ? `${dif.toFixed(1).replace('.', ',')} pontos`
                : 'empate técnico'}
            </strong>
            {dif > 0
              ? ` à frente de ${segundo.nome}`
              : ` com ${segundo.nome}`}
          </p>
        </div>
      )}
      {lider.impedimento && (
        <p className="rs-impedimento">{lider.impedimento}</p>
      )}
    </div>
  )
}

function LinhaCandidato({
  c,
  posicao,
  totalVal,
  vagas,
  totalLista,
}: {
  c: Candidato
  posicao: number
  totalVal: number
  vagas?: number
  totalLista: number
}) {
  const p = pct(c.votos, totalVal)
  const barColor = rankColor((posicao || 1) - 1, totalLista || 10)
  const eleito = c.eleito === true
  return (
    <div className={`rs-row ${eleito ? 'is-eleito' : ''}`}>
      <div className="rs-row-pos">{posicao}</div>
      <Avatar nome={c.nome} foto={c.foto} size={44} />
      <div className="rs-row-body">
        <div className="rs-row-line1">
          <span className="rs-row-nome">{c.nome}</span>
          <span className="rs-row-sigla">{c.partido}</span>
          {vagas && eleito && <span className="rs-tag rs-tag-ok">eleito</span>}
          {vagas && !eleito && posicao <= vagas + 3 && (
            <span className="rs-tag rs-tag-near">na bolha</span>
          )}
          {c.impedimento && (
            <span className="rs-tag rs-tag-warn">sub judice</span>
          )}
          <span className="rs-row-pct">
            {p.toFixed(1).replace('.', ',')}%
          </span>
        </div>
        <div className="rs-row-track">
          <div
            className="rs-row-fill"
            style={{ width: `${Math.min(p, 100)}%`, background: barColor }}
          />
          {vagas && posicao === vagas && (
            <div className="rs-row-cutoff" title={`Corte das ${vagas} cadeiras`} />
          )}
        </div>
        <div className="rs-row-line3">
          <span>
            {fmt(c.votos)} {c.votos === 1 ? 'voto' : 'votos'}
          </span>
          <span className="rs-row-num-small">nº {c.numero}</span>
        </div>
        {c.impedimento && <p className="rs-row-imped">{c.impedimento}</p>}
      </div>
    </div>
  )
}

function RegionalStrip({ regional }: { regional: RegiaoResultadoLeve[] }) {
  return (
    <div className="rs-regional">
      <div className="rs-regional-head">
        <div>
          <p className="rs-regional-kicker">Recorte territorial</p>
          <h3 className="rs-regional-title">Liderança por mesorregião</h3>
        </div>
        <p className="rs-regional-meta">
          3 mesorregiões IBGE · 75 municípios
        </p>
      </div>
      <div className="rs-regional-grid">
        {regional.map((r) => (
          <div key={r.regiao} className="rs-regional-card">
            <p className="rs-regional-nome">{r.rotulo}</p>
            <p className="rs-regional-mun">
              {r.municipios} municípios · {fmt(r.totalVotos)}{' '}
              {r.totalVotos === 1 ? 'voto' : 'votos'}
            </p>
            {r.liderNome ? (
              <>
                <div className="rs-regional-lider">
                  <Avatar
                    nome={r.liderNome}
                    foto={r.liderFoto}
                    size={32}
                  />
                  <span className="rs-regional-lider-nome">{r.liderNome}</span>
                  <span className="rs-regional-sigla">{r.liderPartido}</span>
                </div>
                <p
                  className="rs-regional-pct"
                  style={{ color: r.liderCor }}
                >
                  {r.liderPct.toFixed(1).replace('.', ',')}
                  <span>%</span>
                </p>
              </>
            ) : (
              <p className="rs-regional-mun" style={{ marginTop: 12 }}>
                Sem votos nesta região ainda.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function Totais({
  t,
}: {
  t: { validos: number; branco: number; nao_sabe: number; total: number }
}) {
  if (t.total === 0) return null
  const v = pct(t.validos, t.total)
  const b = pct(t.branco, t.total)
  const ns = pct(t.nao_sabe, t.total)
  return (
    <div className="rs-totais">
      <div className="rs-tot-bar">
        <div style={{ width: `${v}%`, background: '#1d3a8a' }} />
        <div style={{ width: `${b}%`, background: '#a1a1aa' }} />
        <div style={{ width: `${ns}%`, background: '#d4d4d8' }} />
      </div>
      <div className="rs-tot-grid">
        <div>
          <span className="rs-tot-dot" style={{ background: '#1d3a8a' }} />
          <span className="rs-tot-rot">Válidos</span>
          <span className="rs-tot-val">{fmtPct(v, 2)}</span>
          <span className="rs-tot-abs">{fmt(t.validos)}</span>
        </div>
        <div>
          <span className="rs-tot-dot" style={{ background: '#a1a1aa' }} />
          <span className="rs-tot-rot">Brancos</span>
          <span className="rs-tot-val">{fmtPct(b, 2)}</span>
          <span className="rs-tot-abs">{fmt(t.branco)}</span>
        </div>
        <div>
          <span className="rs-tot-dot" style={{ background: '#d4d4d8' }} />
          <span className="rs-tot-rot">Não sabe</span>
          <span className="rs-tot-val">{fmtPct(ns, 2)}</span>
          <span className="rs-tot-abs">{fmt(t.nao_sabe)}</span>
        </div>
      </div>
    </div>
  )
}

function MetodoNota({ texto }: { texto: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rs-metodo">
      <button
        type="button"
        className="rs-metodo-btn"
        onClick={() => setOpen(!open)}
      >
        <span className="rs-metodo-icon">i</span>
        <span>Como funciona este cargo</span>
        <span className="rs-metodo-chev">{open ? '▴' : '▾'}</span>
      </button>
      {open && <p className="rs-metodo-text">{texto}</p>}
    </div>
  )
}

function DetalheZona({
  cargo,
  onClose,
}: {
  cargo: CargoZona
  onClose: () => void
}) {
  const total =
    cargo.aracaju + cargo.sao_cristovao + cargo.branco + cargo.nao_sabe
  const ajuPct = pct(cargo.aracaju, total)
  const scPct = pct(cargo.sao_cristovao, total)
  return (
    <article className="rs-detail">
      <div className="rs-detail-head">
        <div>
          <p className="rs-detail-kicker">Consulta extra</p>
          <h2 className="rs-detail-title">Zona de Expansão</h2>
          <p className="rs-detail-meta">
            Eleitores de Aracaju e São Cristóvão · {fmt(total)} respostas
          </p>
        </div>
        <button className="rs-close" onClick={onClose} aria-label="Fechar">
          ×
        </button>
      </div>

      <div className="rs-zona-grid">
        <div
          className="rs-zona-box"
          style={{ ['--accent' as string]: '#1d3a8a' } as React.CSSProperties}
        >
          <p className="rs-zona-rot">Deveria ficar com</p>
          <p className="rs-zona-nome">Aracaju</p>
          <p className="rs-zona-pct" style={{ color: '#1d3a8a' }}>
            {ajuPct.toFixed(1).replace('.', ',')}%
          </p>
          <p className="rs-zona-abs">{fmt(cargo.aracaju)} votos</p>
        </div>
        <div
          className="rs-zona-box"
          style={{ ['--accent' as string]: '#fcc40c' } as React.CSSProperties}
        >
          <p className="rs-zona-rot">Deveria ficar com</p>
          <p className="rs-zona-nome">São Cristóvão</p>
          <p className="rs-zona-pct" style={{ color: '#b88a00' }}>
            {scPct.toFixed(1).replace('.', ',')}%
          </p>
          <p className="rs-zona-abs">{fmt(cargo.sao_cristovao)} votos</p>
        </div>
      </div>

      <Totais
        t={{
          validos: cargo.aracaju + cargo.sao_cristovao,
          branco: cargo.branco,
          nao_sabe: cargo.nao_sabe,
          total,
        }}
      />
      <MetodoNota texto="Consulta extra exclusiva pra eleitores de Aracaju e São Cristóvão sobre a administração da Zona de Expansão." />
    </article>
  )
}
