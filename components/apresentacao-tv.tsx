'use client'

/**
 * Apresentação da pesquisa pra TV Atalaia (tela 1920×1080).
 *
 * Portado do template "Pesquisa Sergipe 2026" (Claude Design) pra React,
 * lendo dados reais via props. O operador navega ao vivo: hub com a lista
 * de cargos → clica num cargo → barras animadas com os resultados → volta.
 *
 * Trilha de patrocínio à direita, em 3 níveis:
 *   - OFERECIMENTO (cota Diamante)
 *   - PATROCÍNIO  (cota Ouro)
 *   - APOIO       (cota Prata)
 * E, no rodapé da trilha, a ASSINATURA fixa: CDL Pesquisas + TV Atalaia
 * (presente em todas as telas).
 */
import { useEffect, useMemo, useRef, useState } from 'react'

import { MapaSergipe, type PinturaMunicipio } from './mapa-sergipe'

export type ApresRow = {
  name: string
  party?: string
  num?: string
  pct: number
  color?: string
  other?: boolean
  /** Projeção: este candidato estaria eleito */
  eleito?: boolean
}

export type ApresCargo = {
  id: string
  num: string
  label: string
  subtitle: string
  curiosity: string
  extra?: boolean
  rows: ApresRow[]
  /** Só deputado: candidatos que estariam eleitos (projeção D'Hondt) */
  rowsEleitos?: ApresRow[]
  /**
   * Total de cadeiras em disputa no cargo (federal 8, estadual 24). Serve
   * pra denunciar quando rowsEleitos vem incompleto — um partido pode
   * conquistar mais cadeiras do que tem candidatos cadastrados, e a lista
   * sairia menor que as vagas sem avisar ninguém.
   */
  vagas?: number
}

export type ApresSponsor = { empresa: string; logoUrl: string }

export type ApresMapaMunicipio = { ibge: number; cor: string; label: string }
export type ApresMapaLegenda = {
  nome: string
  numero: number
  sigla: string | null
  cor: string
  cidades: number
}
export type ApresMapa = {
  municipios: ApresMapaMunicipio[]
  legenda: ApresMapaLegenda[]
  comDados: number
  semDados: number
  analise: string
}

export type ApresData = {
  edicaoLabel: string
  turno: number
  resumo: string
  stats: Array<{ label: string; value: string; sub: string }>
  cargos: ApresCargo[]
  amostra: string
  margem: string
  oferecimento: ApresSponsor[]
  patrocinio: ApresSponsor[]
  apoio: ApresSponsor[]
  /** Quem contratou (Lei 9.504/97 art. 33 — obrigatório na divulgação) */
  contratante: string
  mapas?: {
    presidente: ApresMapa | null
    governador: ApresMapa | null
    senador: ApresMapa | null
  }
}

function fmt(x: number): string {
  return x.toFixed(1).replace('.', ',')
}

// Paleta verde → amarelo (cara CDL Pesquisas / bandeira). Por posição:
// 1º colocado = verde mais forte, descendo até o amarelo.
const VERDE_AMARELO = [
  '#0f7a37',
  '#1aa34e',
  '#4fae3f',
  '#86c232',
  '#c2cf2a',
  '#eab308',
  '#f4b62c',
]

export function ApresentacaoTV({ data }: { data: ApresData }) {
  const [view, setView] = useState<string>('hub')
  const [grown, setGrown] = useState(true)
  const [scale, setScale] = useState(1)
  // Deputado: false = mais votados (intenção) · true = eleitos (projeção)
  const [modoEleitos, setModoEleitos] = useState(false)
  // Mapa por cidade: cargo exibido
  const [mapaCargo, setMapaCargo] = useState<'presidente' | 'governador' | 'senador'>('governador')
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Escala o palco 1920×1080 pra caber na viewport (modo TV/kiosk)
  useEffect(() => {
    const fit = () =>
      setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  const cargosNormais = useMemo(
    () => data.cargos.filter((c) => !c.extra),
    [data.cargos],
  )
  const zona = useMemo(() => data.cargos.find((c) => c.extra), [data.cargos])
  const cur = useMemo(
    () => data.cargos.find((c) => c.id === view) ?? null,
    [data.cargos, view],
  )
  const isHub = view === 'hub'

  const openCargo = (id: string) => {
    if (tRef.current) clearTimeout(tRef.current)
    setView(id)
    setModoEleitos(false) // abre sempre nos mais votados
    setGrown(false)
    tRef.current = setTimeout(() => setGrown(true), 60)
  }
  const back = () => {
    if (tRef.current) clearTimeout(tRef.current)
    setView('hub')
    setGrown(true)
  }
  const openMapa = () => {
    if (tRef.current) clearTimeout(tRef.current)
    setMapaCargo('governador')
    setView('mapa')
    setGrown(true)
  }

  // Mapa por cidade do cargo selecionado + tem algum mapa disponível?
  const temMapa = !!(
    data.mapas &&
    (data.mapas.presidente || data.mapas.governador || data.mapas.senador)
  )
  const mapaAtual = data.mapas?.[mapaCargo] ?? null
  const pinturaMapa = useMemo(() => {
    const m = new Map<number, PinturaMunicipio>()
    for (const mu of mapaAtual?.municipios ?? []) {
      m.set(mu.ibge, { cor: mu.cor, label: mu.label })
    }
    return m
  }, [mapaAtual])
  // Reanima as barras ao alternar mais votados ↔ eleitos
  const trocaModo = (eleitos: boolean) => {
    if (eleitos === modoEleitos) return
    if (tRef.current) clearTimeout(tRef.current)
    setModoEleitos(eleitos)
    setGrown(false)
    tRef.current = setTimeout(() => setGrown(true), 60)
  }

  // deputado tem a visão "eleitos" disponível?
  const podeEleitos = !!(cur && cur.rowsEleitos && cur.rowsEleitos.length > 0)
  const usandoEleitos = podeEleitos && modoEleitos
  const linhas = useMemo(
    () => (usandoEleitos ? cur!.rowsEleitos! : cur?.rows ?? []),
    [cur, usandoEleitos],
  )

  // barras do cargo aberto
  const bars = useMemo(() => {
    if (!cur) return []
    const cands = linhas.filter((r) => !r.other)
    const maxPct = Math.max(...cands.map((r) => r.pct), 1)
    const topPct = cands.length ? Math.max(...cands.map((r) => r.pct)) : 0
    let leaderFound = false
    let ci = 0 // posição entre candidatos (pra cor verde→amarelo)
    return linhas.map((r) => {
      const isLeader =
        !r.other && !cur.extra && !usandoEleitos && !leaderFound && r.pct === topPct
      if (isLeader) leaderFound = true
      let color: string
      if (r.other) {
        color = '#56688f' // brancos/nulos/indecisos = cinza neutro
      } else {
        color = VERDE_AMARELO[ci % VERDE_AMARELO.length]
        ci++
      }
      return {
        name: r.name,
        party: r.party ?? '',
        num: r.num ?? '',
        color,
        nameColor: r.other ? '#9fb0d8' : '#ffffff',
        displayPct: fmt(r.pct),
        width: grown ? `${(r.pct / maxPct) * 100}%` : '0%',
        isLeader,
        eleito: !!r.eleito,
      }
    })
  }, [cur, linhas, usandoEleitos, grown])

  // Municípios com amostra suficiente — sai de qualquer mapa disponível.
  const municipiosComDados =
    data.mapas?.governador?.comDados ??
    data.mapas?.presidente?.comDados ??
    data.mapas?.senador?.comDados ??
    null

  return (
    <div className="apres-root">
      <style>{CSS}</style>
      <div
        className="apres-stage"
        style={{ transform: `scale(${scale})` }}
      >
        {/* ===== CONTENT ===== */}
        <div className="apres-content">
          {/* header */}
          <div className="apres-head">
            <div className="apres-head-brand">
              <div className="apres-mono">S</div>
              <div className="apres-brandtxt">
                PESQUISA&nbsp; ELEITORAL&nbsp; SERGIPE&nbsp; 2026
              </div>
            </div>
            <div className="apres-live">
              <span className="apres-dot" />
              <span>
                {data.turno}º TURNO · AO VIVO
              </span>
            </div>
          </div>

          {isHub ? (
            <div className="apres-fill">
              <div style={{ marginTop: 18 }}>
                <div className="apres-kicker">PESQUISA DE INTENÇÃO DE VOTO</div>
                <h1 className="apres-h1">Eleições Sergipe 2026</h1>
                <p className="apres-lead" dangerouslySetInnerHTML={{ __html: data.resumo }} />
              </div>

              <div className="apres-pills">
                <span>Identidade verificada · CPF + WhatsApp</span>
                <span>75 municípios</span>
                <span>Coleta espontânea</span>
                <span>Registro PesqEle/TRE-SE</span>
              </div>

              <div className="apres-stats">
                {data.stats.map((s) => (
                  <div key={s.label} className="apres-stat">
                    <div className="apres-stat-l">{s.label}</div>
                    <div className="apres-stat-v">{s.value}</div>
                    <div className="apres-stat-s">{s.sub}</div>
                  </div>
                ))}
              </div>

              <div className="apres-choose">ESCOLHA O CARGO PARA VER O RESULTADO</div>
              <div className="apres-cargos">
                {cargosNormais.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="apres-cargo"
                    onClick={() => openCargo(c.id)}
                  >
                    <div className="apres-cargo-num">{c.num}</div>
                    <div className="apres-cargo-txt">
                      <div className="apres-cargo-label">{c.label}</div>
                      <div className="apres-cargo-sub">{c.subtitle}</div>
                    </div>
                    <div className="apres-cargo-seta">→</div>
                  </button>
                ))}
                {zona && (
                  <button
                    type="button"
                    className="apres-cargo apres-cargo-zona"
                    onClick={() => openCargo(zona.id)}
                  >
                    <div className="apres-cargo-num apres-cargo-num-zona">+</div>
                    <div className="apres-cargo-txt">
                      <div className="apres-cargo-label">{zona.label}</div>
                      <div className="apres-cargo-sub apres-cargo-sub-zona">
                        {zona.subtitle}
                      </div>
                    </div>
                    <div className="apres-cargo-seta apres-cargo-seta-zona">→</div>
                  </button>
                )}
              </div>

              <div className="apres-spacer" />
              <div className="apres-bottomcards">
                <div
                  className="apres-card-mapa"
                  onClick={temMapa ? openMapa : undefined}
                  style={{ cursor: temMapa ? 'pointer' : 'default' }}
                >
                  <div className="apres-card-t">Mapa por cidade</div>
                  <div className="apres-card-s">
                    Quem ganhou em cada um dos 75 municípios →
                  </div>
                </div>
                <div className="apres-card-met">
                  <div className="apres-card-t">Metodologia</div>
                  <div className="apres-card-s">
                    Como a pesquisa foi feita e auditada →
                  </div>
                </div>
              </div>
            </div>
          ) : view === 'mapa' ? (
            <div className="apres-fill" style={{ marginTop: 14 }}>
              <button type="button" className="apres-back" onClick={back}>
                ← VOLTAR AOS CARGOS
              </button>
              <div className="apres-resulthead">
                <div className="apres-result-num apres-mapa-pin">◎</div>
                <div>
                  <h1 className="apres-result-h1">Mapa por cidade</h1>
                  <div className="apres-result-sub">
                    Quem venceu em cada município · amostra por cidade N≥30
                  </div>
                </div>
                <div className="apres-toggle">
                  {(['presidente', 'governador', 'senador'] as const).map((cg) => (
                    <button
                      key={cg}
                      type="button"
                      disabled={!data.mapas?.[cg]}
                      className={mapaCargo === cg ? 'apres-toggle-on' : ''}
                      onClick={() => setMapaCargo(cg)}
                    >
                      {cg === 'presidente' ? 'Presidente' : cg === 'governador' ? 'Governador' : 'Senador'}
                    </button>
                  ))}
                </div>
              </div>

              {mapaAtual ? (
                <div className="apres-mapa-wrap">
                  <div className="apres-mapa-svg">
                    <MapaSergipe pintura={pinturaMapa} />
                  </div>
                  <div className="apres-mapa-legenda">
                    {mapaAtual.legenda.map((l) => (
                      <div key={l.numero} className="apres-mapa-leg-row">
                        <span className="apres-mapa-leg-cor" style={{ background: l.cor }} />
                        <span className="apres-mapa-leg-nome">
                          {l.nome}
                          {l.sigla ? <span className="apres-mapa-leg-sigla"> {l.sigla}</span> : null}
                        </span>
                        <span className="apres-mapa-leg-cid">
                          {l.cidades} cidade{l.cidades > 1 ? 's' : ''}
                        </span>
                      </div>
                    ))}
                    {mapaAtual.semDados > 0 && (
                      <div className="apres-mapa-semdados">
                        {mapaAtual.semDados} cidade{mapaAtual.semDados > 1 ? 's' : ''} sem amostra
                        suficiente (cinza)
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="apres-mapa-vazio">
                  Sem amostra suficiente por cidade neste cargo ainda.
                </div>
              )}

              {mapaAtual?.analise && (
                <div className="apres-destaque">
                  <div className="apres-destaque-ic">!</div>
                  <div>
                    <div className="apres-destaque-l">DESTAQUE</div>
                    <div className="apres-destaque-t">{mapaAtual.analise}</div>
                  </div>
                </div>
              )}
            </div>
          ) : cur ? (
            <div className="apres-fill" style={{ marginTop: 14 }}>
              <button type="button" className="apres-back" onClick={back}>
                ← VOLTAR AOS CARGOS
              </button>

              <div className="apres-resulthead">
                <div className="apres-result-num">{cur.num}</div>
                <div>
                  <h1 className="apres-result-h1">{cur.label}</h1>
                  <div className="apres-result-sub">
                    {usandoEleitos
                      ? `Projeção de quem leva a cadeira (quociente eleitoral)${
                          cur.vagas
                            ? ` · ${cur.rowsEleitos!.length} de ${cur.vagas} cadeiras`
                            : ''
                        }`
                      : cur.subtitle}{' '}
                    · Amostra {data.amostra} · Margem {data.margem}
                  </div>
                </div>
                {podeEleitos && (
                  <div className="apres-toggle">
                    <button
                      type="button"
                      className={!modoEleitos ? 'apres-toggle-on' : ''}
                      onClick={() => trocaModo(false)}
                    >
                      Mais votados
                    </button>
                    <button
                      type="button"
                      className={modoEleitos ? 'apres-toggle-on' : ''}
                      onClick={() => trocaModo(true)}
                    >
                      Eleitos
                    </button>
                  </div>
                )}
              </div>

              <div className="apres-bars">
                {bars.map((b, i) => (
                  <div key={i} className="apres-bar">
                    <div className="apres-bar-top">
                      <div className="apres-bar-name">
                        {b.isLeader && <span className="apres-lidera">LIDERA</span>}
                        {b.eleito && !usandoEleitos && (
                          <span className="apres-eleito">ELEITO</span>
                        )}
                        {b.num && <span className="apres-numchip">{b.num}</span>}
                        <span
                          className="apres-cand"
                          style={{ color: b.nameColor }}
                        >
                          {b.name}
                        </span>
                        {b.party && <span className="apres-party">{b.party}</span>}
                      </div>
                      <span className="apres-pct" style={{ color: b.nameColor }}>
                        {b.displayPct}%
                      </span>
                    </div>
                    <div className="apres-track">
                      <div
                        className="apres-fillbar"
                        style={{ width: b.width, background: b.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Cadeiras projetadas sem nome pra mostrar: o partido levou
                  mais cadeiras do que tem candidatos cadastrados. Sem este
                  aviso, quem assiste conclui que o estado elege menos
                  deputados do que realmente elege. */}
              {usandoEleitos &&
                cur.vagas != null &&
                cur.rowsEleitos!.length < cur.vagas && (
                  <div className="apres-alerta">
                    <div className="apres-alerta-ic">!</div>
                    <div>
                      <div className="apres-alerta-l">CADEIRAS SEM NOME</div>
                      <div className="apres-alerta-t">
                        {cur.vagas - cur.rowsEleitos!.length} das {cur.vagas}{' '}
                        cadeiras não têm candidato a exibir — o partido
                        conquistou mais cadeiras do que possui candidatos
                        cadastrados nesta edição.
                      </div>
                    </div>
                  </div>
                )}

              {cur.curiosity && (
                <div className="apres-destaque">
                  <div className="apres-destaque-ic">!</div>
                  <div>
                    <div className="apres-destaque-l">DESTAQUE DA DISPUTA</div>
                    <div className="apres-destaque-t">{cur.curiosity}</div>
                  </div>
                </div>
              )}
              <div className="apres-footnote">
                Percentuais sobre o total da amostra ({data.amostra} eleitores).
              </div>
            </div>
          ) : null}
        </div>

        {/* ===== FICHA TÉCNICA ===== */}
        {/* Antes esta coluna era o mural de patrocinadores. Sem cotas
            vendidas, ela virava um vazio enorme no ar. Agora carrega o
            que sustenta a pesquisa diante do telespectador: quem fez,
            com que método e sob qual registro. As logos sobem pro topo
            — canto fixo, visível em todas as telas do rodízio. */}
        <div className="apres-rail">
          <div className="apres-rail-accent" />
          <div className="apres-rail-inner">
            <div className="apres-rail-label apres-rail-label-of">
              REALIZAÇÃO E TRANSMISSÃO
            </div>
            <div className="apres-assinatura">
              <div className="apres-assina-card apres-assina-cdl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/cdl-pesquisas-logo.png" alt="CDL Pesquisas" />
              </div>
              <div className="apres-assina-card apres-assina-tv">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/tv-atalaia-logo.png" alt="TV Atalaia" />
              </div>
            </div>

            <div className="apres-rail-label">FICHA TÉCNICA</div>
            <div className="apres-ficha">
              <div className="apres-ficha-row">
                <span>Amostra</span>
                <b>{data.amostra} eleitores</b>
              </div>
              <div className="apres-ficha-row">
                <span>Margem de erro</span>
                <b>{data.margem}</b>
              </div>
              <div className="apres-ficha-row">
                <span>Confiança</span>
                <b>95%</b>
              </div>
              <div className="apres-ficha-row">
                <span>Municípios</span>
                <b>75 de 75</b>
              </div>
              {municipiosComDados ? (
                <div className="apres-ficha-row">
                  <span>Cidades no mapa</span>
                  <b>{municipiosComDados}</b>
                </div>
              ) : null}
              <div className="apres-ficha-row">
                <span>Método</span>
                <b>Espontânea</b>
              </div>
            </div>

            <div className="apres-rail-label">COMO VERIFICAMOS</div>
            <div className="apres-verif">
              <div className="apres-verif-item">
                <i>1</i>
                <p><b>CPF na Receita Federal</b><br />Cada eleitor é uma pessoa real</p>
              </div>
              <div className="apres-verif-item">
                <i>2</i>
                <p><b>WhatsApp com código</b><br />Confirma que o número é dele</p>
              </div>
              <div className="apres-verif-item">
                <i>3</i>
                <p><b>Um voto por eleitor</b><br />CPF e telefone únicos</p>
              </div>
              <div className="apres-verif-item">
                <i>4</i>
                <p><b>Voto secreto</b><br />O sistema não liga voto a pessoa</p>
              </div>
            </div>

            <div className="apres-spacer" />

            <div className="apres-registros">
              <div className="apres-reg-linha">
                <span>TRE-SE</span><b>SE-09441/2026</b>
              </div>
              <div className="apres-reg-linha">
                <span>TSE</span><b>BR-04041/2026</b>
              </div>
            </div>
            <div className="apres-pesqele">
              Contratante: <b>{data.contratante}</b> · Registrada no{' '}
              <b>PesqEle/TRE-SE</b> · Lei 9.504/97.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800;900&family=Public+Sans:wght@400;500;600;700&display=swap');
.apres-root{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:radial-gradient(120% 120% at 80% 0%,#0a1741 0%,#05102e 60%);overflow:hidden;z-index:60;}
.apres-root *{box-sizing:border-box;}
@keyframes apresPulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.35;transform:scale(.8);}}
.apres-stage{flex:none;width:1920px;height:1080px;transform-origin:center center;position:relative;display:flex;background:radial-gradient(140% 100% at 15% 0%,#14245e 0%,#0a1741 45%,#06112f 100%);color:#eaf0ff;font-family:'Public Sans',sans-serif;overflow:hidden;}
.apres-content{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;padding:48px 56px 40px;}
.apres-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}
.apres-head-brand{display:flex;align-items:center;gap:14px;}
.apres-mono{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#3d6fe5,#274bb8);display:flex;align-items:center;justify-content:center;font-family:'Archivo',sans-serif;font-weight:900;font-size:18px;color:#fff;}
.apres-brandtxt{font-family:'Archivo',sans-serif;font-weight:700;font-size:15px;letter-spacing:.22em;color:#aebce6;}
.apres-live{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);padding:9px 16px;border-radius:100px;font-family:'Archivo',sans-serif;font-weight:700;font-size:13px;letter-spacing:.16em;color:#eaf0ff;}
.apres-dot{width:9px;height:9px;border-radius:50%;background:#ff5b5b;animation:apresPulse 1.4s ease-in-out infinite;}
.apres-fill{flex:1;min-height:0;display:flex;flex-direction:column;}
.apres-spacer{flex:1;}
.apres-kicker{font-family:'Archivo',sans-serif;font-weight:700;font-size:15px;letter-spacing:.26em;color:#6f8fe0;margin-bottom:10px;}
.apres-h1{font-family:'Archivo',sans-serif;font-weight:900;font-size:84px;line-height:.96;letter-spacing:-.02em;margin:0;color:#fff;}
.apres-lead{font-size:21px;line-height:1.5;color:#b9c6ea;max-width:880px;margin:20px 0 0;}
.apres-lead b{color:#fff;}
.apres-pills{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px;}
.apres-pills span{font-size:14.5px;font-weight:600;color:#cdd8f4;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);padding:8px 16px;border-radius:100px;}
.apres-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:26px;}
.apres-stat{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:18px 20px;}
.apres-stat-l{font-family:'Archivo',sans-serif;font-weight:700;font-size:12.5px;letter-spacing:.16em;color:#7f93c7;}
.apres-stat-v{font-family:'Archivo',sans-serif;font-weight:800;font-size:34px;line-height:1.1;margin-top:6px;color:#fff;}
.apres-stat-s{font-size:14px;color:#9fb0d8;margin-top:2px;}
.apres-choose{font-family:'Archivo',sans-serif;font-weight:700;font-size:14px;letter-spacing:.2em;color:#7f93c7;margin:30px 0 14px;}
.apres-cargos{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.apres-cargo{display:flex;align-items:center;gap:18px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-left:4px solid #3d6fe5;border-radius:14px;padding:18px 22px;cursor:pointer;transition:background .15s,transform .15s;text-align:left;color:inherit;font:inherit;}
.apres-cargo:hover{background:rgba(61,111,229,.16);transform:translateY(-2px);}
.apres-cargo-zona{background:rgba(244,182,44,.08);border-color:rgba(244,182,44,.3);border-left-color:#f4b62c;}
.apres-cargo-zona:hover{background:rgba(244,182,44,.16);}
.apres-cargo-num{flex:none;width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#3d6fe5,#274bb8);display:flex;align-items:center;justify-content:center;font-family:'Archivo',sans-serif;font-weight:800;font-size:20px;color:#fff;}
.apres-cargo-num-zona{background:linear-gradient(135deg,#f4b62c,#e09a10);color:#3a2a00;font-size:24px;}
.apres-cargo-txt{flex:1;min-width:0;}
.apres-cargo-label{font-family:'Archivo',sans-serif;font-weight:700;font-size:22px;color:#fff;}
.apres-cargo-sub{font-size:14.5px;color:#9fb0d8;margin-top:1px;}
.apres-cargo-sub-zona{color:#d8c690;}
.apres-cargo-seta{flex:none;font-size:24px;color:#6f8fe0;}
.apres-cargo-seta-zona{color:#f4b62c;}
.apres-bottomcards{display:grid;grid-template-columns:1.4fr 1fr;gap:14px;margin-top:18px;}
.apres-card-mapa{background:linear-gradient(135deg,#1f3fae,#16317f);border-radius:14px;padding:18px 24px;}
.apres-card-met{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:18px 24px;}
.apres-card-t{font-family:'Archivo',sans-serif;font-weight:700;font-size:20px;color:#fff;}
.apres-card-s{font-size:14.5px;color:#bcd0ff;margin-top:2px;}
.apres-card-met .apres-card-s{color:#9fb0d8;}
.apres-card-mapa:hover{filter:brightness(1.12);}
/* ----- Mapa por cidade ----- */
.apres-mapa-pin{font-size:30px;line-height:1;}
.apres-mapa-wrap{display:flex;gap:34px;flex:1 1 auto;min-height:0;margin-top:22px;}
.apres-mapa-svg{flex:1 1 56%;display:flex;align-items:center;justify-content:center;min-width:0;}
.apres-mapa-svg svg{width:100%;height:auto;max-height:640px;}
.apres-mapa-legenda{flex:1 1 44%;display:flex;flex-direction:column;gap:12px;overflow-y:auto;padding-right:8px;}
.apres-mapa-leg-row{display:flex;align-items:center;gap:14px;}
.apres-mapa-leg-cor{width:22px;height:22px;border-radius:6px;flex:none;box-shadow:0 0 0 1px rgba(255,255,255,.15);}
.apres-mapa-leg-nome{flex:1;min-width:0;font-family:'Archivo',sans-serif;font-weight:800;font-size:20px;color:#eaf0ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.apres-mapa-leg-sigla{color:#9fb0d8;font-weight:600;font-size:16px;}
.apres-mapa-leg-cid{flex:none;font-weight:800;font-size:18px;color:#86c232;}
.apres-mapa-semdados{margin-top:8px;font-size:14px;color:#7f8fbb;}
.apres-mapa-vazio{flex:1;display:flex;align-items:center;justify-content:center;color:#9fb0d8;font-size:20px;}
.apres-back{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;font-family:'Archivo',sans-serif;font-weight:700;font-size:14px;letter-spacing:.06em;color:#9fb0d8;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);padding:8px 16px;border-radius:100px;cursor:pointer;}
.apres-back:hover{color:#fff;background:rgba(255,255,255,.12);}
.apres-resulthead{display:flex;align-items:flex-end;gap:18px;margin-top:18px;}
.apres-result-num{flex:none;width:58px;height:58px;border-radius:14px;background:linear-gradient(135deg,#3d6fe5,#274bb8);display:flex;align-items:center;justify-content:center;font-family:'Archivo',sans-serif;font-weight:900;font-size:26px;color:#fff;}
.apres-result-h1{font-family:'Archivo',sans-serif;font-weight:900;font-size:54px;line-height:1;letter-spacing:-.01em;margin:0;color:#fff;}
.apres-result-sub{font-size:17px;color:#9fb0d8;margin-top:6px;}
.apres-toggle{margin-left:auto;display:inline-flex;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:100px;padding:4px;gap:4px;}
.apres-toggle button{font-family:'Archivo',sans-serif;font-weight:800;font-size:15px;letter-spacing:.04em;color:#9fb0d8;background:transparent;border:none;padding:9px 20px;border-radius:100px;cursor:pointer;transition:all .15s;}
.apres-toggle button:hover{color:#eaf0ff;}
.apres-toggle .apres-toggle-on{background:linear-gradient(135deg,#1aa34e,#0f7a37);color:#fff;box-shadow:0 4px 14px rgba(15,122,55,.4);}
.apres-eleito{font-family:'Archivo',sans-serif;font-weight:800;font-size:12px;letter-spacing:.1em;color:#04210f;background:#34d27b;padding:4px 9px;border-radius:6px;}
.apres-bars{margin-top:26px;display:flex;flex-direction:column;gap:16px;flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;padding-right:14px;}
.apres-bars::-webkit-scrollbar{width:10px;}
.apres-bars::-webkit-scrollbar-track{background:rgba(255,255,255,.05);border-radius:5px;}
.apres-bars::-webkit-scrollbar-thumb{background:rgba(244,182,44,.45);border-radius:5px;}
.apres-bars::-webkit-scrollbar-thumb:hover{background:rgba(244,182,44,.7);}
.apres-bar{display:flex;flex-direction:column;gap:9px;}
.apres-bar-top{display:flex;align-items:center;justify-content:space-between;}
.apres-bar-name{display:flex;align-items:center;gap:12px;min-width:0;}
.apres-lidera{font-family:'Archivo',sans-serif;font-weight:800;font-size:12px;letter-spacing:.1em;color:#3a2a00;background:#f4b62c;padding:4px 9px;border-radius:6px;}
.apres-numchip{font-family:'Archivo',sans-serif;font-weight:700;font-size:15px;color:#cdd8f4;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);padding:3px 9px;border-radius:7px;letter-spacing:.04em;}
.apres-cand{font-family:'Archivo',sans-serif;font-weight:700;font-size:25px;}
.apres-party{font-size:15px;font-weight:600;color:#8294c2;}
.apres-pct{font-family:'Archivo',sans-serif;font-weight:800;font-size:30px;}
.apres-track{height:26px;border-radius:8px;background:rgba(255,255,255,.07);overflow:hidden;}
.apres-fillbar{height:100%;border-radius:8px;transition:width .95s cubic-bezier(.22,1,.36,1);}
.apres-destaque{display:flex;align-items:center;gap:16px;background:rgba(244,182,44,.1);border:1px solid rgba(244,182,44,.28);border-radius:14px;padding:18px 24px;margin-top:24px;}
.apres-destaque-ic{flex:none;width:38px;height:38px;border-radius:50%;background:#f4b62c;display:flex;align-items:center;justify-content:center;font-family:'Archivo',sans-serif;font-weight:900;font-size:22px;color:#3a2a00;}
.apres-destaque-l{font-family:'Archivo',sans-serif;font-weight:700;font-size:13px;letter-spacing:.16em;color:#f4b62c;}
.apres-destaque-t{font-size:19px;color:#fff;margin-top:3px;}
/* Alerta de cadeira sem candidato — vermelho, distinto do destaque
   dourado, pra não ser lido como "curiosidade" no ar. */
.apres-alerta{display:flex;align-items:center;gap:16px;background:rgba(232,84,84,.12);border:1px solid rgba(232,84,84,.35);border-radius:14px;padding:18px 24px;margin-top:24px;}
.apres-alerta-ic{flex:none;width:38px;height:38px;border-radius:50%;background:#e85454;display:flex;align-items:center;justify-content:center;font-family:'Archivo',sans-serif;font-weight:900;font-size:22px;color:#fff;}
.apres-alerta-l{font-family:'Archivo',sans-serif;font-weight:700;font-size:13px;letter-spacing:.16em;color:#ff8a8a;}
.apres-alerta-t{font-size:19px;color:#fff;margin-top:3px;}
.apres-footnote{font-size:13px;color:#6f80ac;margin-top:12px;}
/* rail */
.apres-rail{flex:none;width:372px;background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.02));border-left:1px solid rgba(255,255,255,.1);display:flex;flex-direction:column;}
.apres-rail-accent{height:6px;background:linear-gradient(90deg,#f4b62c,#ffd877);}
.apres-rail-inner{padding:28px 30px 24px;display:flex;flex-direction:column;height:100%;}
.apres-rail-label{font-family:'Archivo',sans-serif;font-weight:800;font-size:12px;letter-spacing:.2em;color:#7f93c7;margin-top:18px;}
.apres-rail-label-of{margin-top:0;color:#f4b62c;font-size:13px;letter-spacing:.24em;}
.apres-of-card{margin-top:12px;background:#fff;border-radius:14px;padding:18px 18px;box-shadow:0 10px 26px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;gap:14px;height:128px;}
.apres-of-logo{max-width:100%;max-height:88px;object-fit:contain;display:block;}
.apres-tier-logos{margin-top:10px;display:flex;flex-wrap:wrap;gap:9px;}
.apres-tier-card{background:#fff;border-radius:9px;display:flex;align-items:center;justify-content:center;overflow:hidden;}
.apres-tier-ouro{height:92px;flex:1 1 100%;width:100%;padding:12px 16px;}
.apres-tier-largo img{max-width:150px;}
.apres-tier-prata.apres-tier-largo img{max-width:96px;}
.apres-tier-prata{height:48px;flex:1 1 calc(33.33% - 6px);min-width:calc(33.33% - 6px);padding:7px;}
.apres-tier-card img{max-width:100%;max-height:100%;object-fit:contain;display:block;}
.apres-tier-logos-apoio .apres-tier-prata{opacity:.95;}
.apres-ficha{margin-top:11px;display:flex;flex-direction:column;gap:1px;background:rgba(255,255,255,.08);border-radius:10px;overflow:hidden;}
.apres-ficha-row{display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding:11px 14px;background:rgba(8,18,48,.55);}
.apres-ficha-row span{font-family:'Public Sans',sans-serif;font-size:15px;color:#9fb0da;}
.apres-ficha-row b{font-family:'Archivo',sans-serif;font-weight:800;font-size:19px;color:#fff;letter-spacing:-.01em;}
.apres-verif{margin-top:11px;display:flex;flex-direction:column;gap:9px;}
.apres-verif-item{display:flex;align-items:flex-start;gap:11px;}
.apres-verif-item i{flex:none;width:26px;height:26px;border-radius:50%;background:#f4b62c;color:#0a1741;font-family:'Archivo',sans-serif;font-weight:900;font-size:14px;font-style:normal;display:flex;align-items:center;justify-content:center;margin-top:1px;}
.apres-verif-item p{margin:0;font-family:'Public Sans',sans-serif;font-size:14px;line-height:1.35;color:#9fb0da;}
.apres-verif-item p b{color:#fff;font-weight:700;font-size:15px;}
.apres-registros{display:flex;flex-direction:column;gap:6px;margin-bottom:10px;}
.apres-reg-linha{display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding:8px 12px;border-radius:8px;background:rgba(244,182,44,.12);border:1px solid rgba(244,182,44,.3);}
.apres-reg-linha span{font-family:'Archivo',sans-serif;font-weight:800;font-size:12px;letter-spacing:.16em;color:#f4b62c;}
.apres-reg-linha b{font-family:'Archivo',sans-serif;font-weight:800;font-size:16px;color:#fff;}
.apres-assinatura-label{font-family:'Archivo',sans-serif;font-weight:700;font-size:11px;letter-spacing:.2em;color:#7f93c7;margin-bottom:10px;}
.apres-assinatura{margin-top:11px;display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.apres-assina-card{border-radius:9px;height:64px;display:flex;align-items:center;justify-content:center;overflow:hidden;}
.apres-assina-cdl{background:#fff;padding:9px 11px;}
.apres-assina-tv{background:#fff;padding:6px 10px;}
.apres-assina-card img{max-width:100%;max-height:100%;object-fit:contain;display:block;}
.apres-pesqele{margin-top:12px;font-size:11.5px;color:#7f8fbb;line-height:1.45;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:9px;padding:10px 12px;}
.apres-pesqele b{color:#aebce6;}
`
