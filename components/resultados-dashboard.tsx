'use client'

import { BiografiaModal } from './biografia-modal'

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
 * estado de UI (cargo aberto, filtro de eleitos/empate técnico).
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'

import { agruparEmFederacoes } from '@/lib/federacoes'

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
  /** Projeção: ficaria eleito se a eleição fosse agora */
  eleito?: boolean
  /** Empate técnico com o candidato no corte das vagas (margem de erro overlap) */
  empate?: boolean
  /** Posição na fila de suplentes do partido (1, 2, 3...). Só pra proporcional, em partido que ganhou cadeira. */
  suplente?: number
  /** Pres/Gov: candidato vai pro 2º turno (top 1 e top 2 quando ninguém atingiu 50%) */
  segundoTurno?: boolean
  delta?: number
}

export type RegiaoResultadoLeve = {
  regiao: 'grande_aracaju' | 'leste' | 'agreste' | 'centro_sul' | 'sertao'
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

/** Voto agregado por partido (legenda), só para cargos proporcionais (fed/est). */
export type LegendaPartido = {
  partidoId: string
  numero: number
  sigla: string
  nome: string
  cor: string
  /** Votos de legenda (define cadeiras via Quociente Eleitoral) */
  votos: number
  /** % sobre o total de votos válidos do cargo */
  pct: number
  /** Cadeiras projetadas para o partido (D'Hondt) */
  cadeiras: number
}

export type CargoCandidato = {
  titulo: string
  vagas?: number
  regra: string
  candidatos: Candidato[]
  /** Só fed/est: ranking por partido (legenda). Habilita o modo "por federação". */
  legendas?: LegendaPartido[]
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
  turno: 1 | 2
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

/** Formato ordinal pt-BR: 1 -> "1º", 2 -> "2º", ... */
function ordinal(n: number) {
  return `${n}º`
}

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

// ---------- Lista por partido / federação (só deputado) ----------
const PALETA_LEG = [
  '#0f7a37', '#1aa34e', '#4fae3f', '#86c232', '#c2cf2a', '#eab308', '#f4b62c', '#56688f',
]

type GrupoVis = {
  id: string
  label: string
  sub?: string
  votos: number
  cadeiras: number
}

function ListaGrupos({ grupos, total }: { grupos: GrupoVis[]; total: number }) {
  const max = Math.max(...grupos.map((g) => g.votos), 1)
  return (
    <div className="rs-list">
      {grupos.map((g, i) => {
        const p = pct(g.votos, total)
        const cor = PALETA_LEG[Math.min(i, PALETA_LEG.length - 1)]
        return (
          <div key={g.id} className="rs-leg-row">
            <div className="rs-leg-pos">{i + 1}º</div>
            <div className="rs-leg-main">
              <div className="rs-leg-top">
                <span className="rs-leg-label">{g.label}</span>
                {g.sub && <span className="rs-leg-sub">{g.sub}</span>}
                {g.cadeiras > 0 && (
                  <span className="rs-leg-cad">
                    {g.cadeiras} cadeira{g.cadeiras > 1 ? 's' : ''}
                  </span>
                )}
                <span className="rs-leg-pct">{fmtPct(p)}</span>
              </div>
              <div className="rs-leg-track">
                <div
                  className="rs-leg-fill"
                  style={{ width: `${(g.votos / max) * 100}%`, background: cor }}
                />
              </div>
              <div className="rs-leg-votos">{fmt(g.votos)} votos de legenda</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------- Detail ----------
export function Detalhe({
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

  const [filtro, setFiltro] = useState<'todos' | 'eleitos' | 'empate'>('todos')
  const filtrados = useMemo(() => {
    if (filtro === 'todos') return ordered
    if (filtro === 'eleitos') return ordered.filter((c) => c.eleito)
    if (filtro === 'empate') return ordered.filter((c) => c.empate)
    return ordered
  }, [filtro, ordered])

  const [bioOpen, setBioOpen] = useState<{ nome: string; partido: string } | null>(
    null,
  )

  // ----- Deputado: modo de visualização (partido / federação / candidatos) -----
  const hasLeg = !!(cargo.legendas && cargo.legendas.length > 0)
  const [modo, setModo] = useState<'partido' | 'federacao' | 'candidatos'>('partido')
  const legendaTotal =
    (cargo.legendas?.reduce((s, l) => s + l.votos, 0) ?? 0) + t.branco + t.nao_sabe
  const partidoGrupos: GrupoVis[] = useMemo(
    () =>
      (cargo.legendas ?? []).map((l) => ({
        id: l.partidoId,
        label: l.sigla,
        sub: l.nome,
        votos: l.votos,
        cadeiras: l.cadeiras,
      })),
    [cargo.legendas],
  )
  const fedGrupos: GrupoVis[] = useMemo(
    () =>
      agruparEmFederacoes(
        (cargo.legendas ?? []).map((l) => ({
          sigla: l.sigla,
          nome: l.nome,
          cor: l.cor,
          votos: l.votos,
          cadeiras: l.cadeiras,
        })),
      ).map((g) => ({
        id: g.id,
        label: g.label,
        sub: g.isFederacao ? g.membros.join(' + ') : g.nomeCompleto,
        votos: g.votos,
        cadeiras: g.cadeiras,
      })),
    [cargo.legendas],
  )

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

      {hasLeg && (
        <div className="rs-filtros rs-filtros-modo">
          {([
            ['partido', 'Por partido'],
            ['federacao', 'Por federação'],
            ['candidatos', 'Candidatos'],
          ] as const).map(([k, rotulo]) => (
            <button
              key={k}
              type="button"
              className={`rs-filtro ${modo === k ? 'is-active' : ''}`}
              onClick={() => setModo(k)}
            >
              {rotulo}
            </button>
          ))}
        </div>
      )}

      {hasLeg && modo !== 'candidatos' ? (
        <ListaGrupos
          grupos={modo === 'federacao' ? fedGrupos : partidoGrupos}
          total={legendaTotal}
        />
      ) : (
        <>
          {cargo.vagas ? (
            <div className="rs-filtros">
              {(['todos', 'eleitos', 'empate'] as const).map((k) => {
                const qtdEleitos = ordered.filter((c) => c.eleito).length
                const qtdEmpate = ordered.filter((c) => c.empate).length
                return (
                  <button
                    key={k}
                    type="button"
                    className={`rs-filtro ${filtro === k ? 'is-active' : ''}`}
                    onClick={() => setFiltro(k)}
                  >
                    {k === 'todos' && `Todos (${ordered.length})`}
                    {k === 'eleitos' && `Estariam eleitos (${qtdEleitos})`}
                    {k === 'empate' && `Empate técnico (${qtdEmpate})`}
                  </button>
                )
              })}
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
                onAbrirBio={() => setBioOpen({ nome: c.nome, partido: c.partido })}
              />
            ))}
          </div>
        </>
      )}

      {bioOpen && (
        <BiografiaModal
          nome={bioOpen.nome}
          partido={bioOpen.partido}
          onClose={() => setBioOpen(null)}
        />
      )}

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
  onAbrirBio,
}: {
  c: Candidato
  posicao: number
  totalVal: number
  vagas?: number
  totalLista: number
  onAbrirBio?: () => void
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
          {onAbrirBio ? (
            <button
              type="button"
              onClick={onAbrirBio}
              className="rs-row-nome rs-row-nome-btn"
              title="Ver biografia"
            >
              {c.nome}
              <span className="rs-bio-icon" aria-hidden="true">
                ⓘ
              </span>
            </button>
          ) : (
            <span className="rs-row-nome">{c.nome}</span>
          )}
          <span className="rs-row-sigla">{c.partido}</span>
          {eleito && (
            <span
              className="rs-tag rs-tag-ok"
              title={
                vagas
                  ? 'Projeção: estaria eleito se a eleição fosse agora'
                  : 'Projeção: estaria eleito no 1º turno (acima de 50% dos válidos)'
              }
            >
              {vagas ? 'estaria eleito' : 'estaria eleito no 1º turno'}
            </span>
          )}
          {!eleito && c.segundoTurno && (
            <span
              className="rs-tag rs-tag-2turno"
              title="Projeção: nenhum candidato atingiu 50% dos válidos — top 2 vão pro 2º turno"
            >
              vai pro 2º turno
            </span>
          )}
          {vagas && !eleito && c.empate && (
            <span
              className="rs-tag rs-tag-near"
              title="Diferença para o corte das vagas está dentro da margem de erro"
            >
              empate técnico
            </span>
          )}
          {vagas && !eleito && c.suplente && (
            <span
              className="rs-tag rs-tag-suplente"
              title={`Ordem de suplência do ${c.partido} — assumiria a cadeira em caso de vacância`}
            >
              {ordinal(c.suplente)} suplente do {c.partido}
            </span>
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
          5 mesorregiões · 75 municípios
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

export function DetalheZona({
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
