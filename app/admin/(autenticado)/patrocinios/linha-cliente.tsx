'use client'

import { useState, useTransition } from 'react'

import { COTA_SPECS, estiloSlotDesktop } from '@/lib/patrocinio-specs'

import {
  atualizarExibicaoPublica,
  atualizarStatus,
  uploadLogo,
} from './actions'

type Lead = {
  id: string
  empresa: string
  cnpj: string | null
  contato_nome: string
  contato_email: string
  contato_telefone: string | null
  cota: 'diamante' | 'ouro' | 'prata'
  mensagem: string | null
  status: 'novo' | 'em_contato' | 'firmado' | 'recusado'
  criado_em: string
  logo_url?: string | null
  site_url?: string | null
  mostrar_publico?: boolean
}

const ROTULO_COTA = {
  diamante: 'Diamante · R$ 100k',
  ouro: 'Ouro · R$ 70k',
  prata: 'Prata · R$ 30k',
} as const
const COR_COTA = {
  diamante: 'rgb(8, 145, 178)',
  ouro: 'rgb(202, 138, 4)',
  prata: 'rgb(100, 116, 139)',
} as const

const ROTULO_STATUS = {
  novo: 'Novo',
  em_contato: 'Em contato',
  firmado: 'Firmado',
  recusado: 'Recusado',
} as const

export function LinhaInteressado({ lead }: { lead: Lead }) {
  const [aberto, setAberto] = useState(false)
  const [statusAtual, setStatusAtual] = useState(lead.status)
  const [logoUrl, setLogoUrl] = useState(lead.logo_url ?? '')
  const [siteUrl, setSiteUrl] = useState(lead.site_url ?? '')
  const [mostrarPub, setMostrarPub] = useState(
    lead.mostrar_publico ?? false,
  )
  const [salvandoExib, setSalvandoExib] = useState(false)
  const [exibOk, setExibOk] = useState(false)
  const [aba, setAba] = useState<'upload' | 'url'>('upload')
  const [enviando, setEnviando] = useState(false)
  const [erroUp, setErroUp] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  async function handleUpload(file: File) {
    setEnviando(true)
    setErroUp(null)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('patrocinioId', lead.id)
    const r = await uploadLogo(fd)
    setEnviando(false)
    if (r.ok && r.url) {
      setLogoUrl(r.url)
    } else {
      setErroUp(r.message ?? 'Erro no upload.')
    }
  }

  function mudarStatus(novo: Lead['status']) {
    startTransition(async () => {
      const r = await atualizarStatus(lead.id, novo)
      if (r.ok) setStatusAtual(novo)
    })
  }

  async function salvarExibicao() {
    setSalvandoExib(true)
    setExibOk(false)
    const r = await atualizarExibicaoPublica(lead.id, {
      logo_url: logoUrl.trim() || null,
      site_url: siteUrl.trim() || null,
      mostrar_publico: mostrarPub,
    })
    setSalvandoExib(false)
    if (r.ok) {
      setExibOk(true)
      setTimeout(() => setExibOk(false), 2500)
    }
  }

  return (
    <article className="rounded-md border border-border bg-background">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-muted/40 transition"
      >
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="font-semibold">{lead.empresa}</span>
          <span
            className="text-[10px] uppercase tracking-widest font-bold"
            style={{ color: COR_COTA[lead.cota] }}
          >
            {ROTULO_COTA[lead.cota]}
          </span>
          <span className="text-xs text-muted-foreground">
            {lead.contato_nome}
          </span>
          <span className="text-xs text-muted-foreground">
            ·{' '}
            {new Date(lead.criado_em).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: '2-digit',
            })}
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {ROTULO_STATUS[statusAtual]} {aberto ? '▴' : '▾'}
        </span>
      </button>

      {aberto && (
        <div className="border-t border-border p-4 flex flex-col gap-4 text-sm">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <dt className="text-muted-foreground">CNPJ</dt>
            <dd className="font-mono">{lead.cnpj ?? '—'}</dd>
            <dt className="text-muted-foreground">E-mail</dt>
            <dd>{lead.contato_email}</dd>
            <dt className="text-muted-foreground">Telefone</dt>
            <dd>{lead.contato_telefone ?? '—'}</dd>
          </dl>
          {lead.mensagem && (
            <div className="border-l-2 border-muted-foreground/30 pl-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                Mensagem
              </p>
              <p className="text-sm whitespace-pre-wrap">{lead.mensagem}</p>
            </div>
          )}
          <div className="flex gap-2 flex-wrap pt-2 border-t border-dashed border-border">
            {(['novo', 'em_contato', 'firmado', 'recusado'] as const).map(
              (s) => (
                <button
                  key={s}
                  type="button"
                  disabled={pending || statusAtual === s}
                  onClick={() => mudarStatus(s)}
                  className={`h-8 px-3 rounded-md text-xs font-medium border transition ${
                    statusAtual === s
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  Marcar como {ROTULO_STATUS[s]}
                </button>
              ),
            )}
          </div>

          {/* Exibição pública — só relevante quando firmado */}
          {statusAtual === 'firmado' && (
            <div className="pt-3 border-t border-dashed border-border flex flex-col gap-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                Exibição pública em /resultados
              </p>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium">Logo do patrocinador</span>

                {/* Abas Upload / URL */}
                <div className="flex gap-1 border-b border-border">
                  <button
                    type="button"
                    onClick={() => setAba('upload')}
                    className={`h-8 px-3 text-xs font-medium border-b-2 transition ${
                      aba === 'upload'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    📁 Importar arquivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setAba('url')}
                    className={`h-8 px-3 text-xs font-medium border-b-2 transition ${
                      aba === 'url'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    🔗 Colar URL
                  </button>
                </div>

                {aba === 'upload' && (
                  <label className="flex flex-col gap-2 mt-1">
                    <div className="border-2 border-dashed border-border rounded-md px-4 py-5 text-center bg-background hover:bg-muted/40 transition cursor-pointer">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        disabled={enviando}
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) handleUpload(f)
                          e.target.value = ''
                        }}
                        className="sr-only"
                      />
                      <p className="text-xs font-medium text-foreground">
                        {enviando
                          ? 'Enviando…'
                          : 'Clique para escolher arquivo'}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        PNG, JPG, SVG ou WebP · até 2 MB
                      </p>
                    </div>
                    {erroUp && (
                      <p className="text-[11px] text-error">{erroUp}</p>
                    )}
                  </label>
                )}

                {aba === 'url' && (
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://exemplo.com/logo.png"
                    className="h-9 px-2 rounded-md border border-border bg-background text-xs mt-1"
                  />
                )}

                {/* Preview do logo atual + slot real */}
                {logoUrl && (
                  <PreviewLogo
                    logoUrl={logoUrl}
                    empresa={lead.empresa}
                    cota={lead.cota}
                    onRemover={() => setLogoUrl('')}
                  />
                )}
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium">
                  URL do site (opcional — logo vira link)
                </span>
                <input
                  type="url"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  placeholder="https://exemplo.com.br"
                  className="h-9 px-2 rounded-md border border-border bg-background text-xs"
                />
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={mostrarPub}
                  onChange={(e) => setMostrarPub(e.target.checked)}
                  className="w-4 h-4"
                />
                <span>
                  Exibir publicamente em <code>/resultados</code> (precisa
                  logo URL + status firmado)
                </span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={salvarExibicao}
                  disabled={salvandoExib}
                  className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50 hover:opacity-90"
                >
                  {salvandoExib ? 'Salvando…' : 'Salvar exibição'}
                </button>
                {exibOk && (
                  <span className="text-xs text-emerald-700 font-medium">
                    ✓ Salvo
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  )
}

/**
 * Preview do logo na exata dimensão do slot do /resultados.
 *
 * - Mostra ficha técnica (dimensões desktop + mobile + dica de
 *   arquivo ideal)
 * - Renderiza a logo dentro de uma caixa que reproduz visualmente o
 *   slot real (fundo + borda + tamanho exato + object-fit:contain)
 */
function PreviewLogo({
  logoUrl,
  empresa,
  cota,
  onRemover,
}: {
  logoUrl: string
  empresa: string
  cota: 'diamante' | 'ouro' | 'prata'
  onRemover: () => void
}) {
  const spec = COTA_SPECS[cota]

  // Fundo simulado por cota (espelha resultados.css)
  const fundoSlot =
    cota === 'diamante'
      ? 'linear-gradient(180deg, #ecfeff 0%, #fff 100%)'
      : cota === 'ouro'
        ? '#fff'
        : '#f8fafc'

  const opacityImg = cota === 'prata' ? 0.85 : 1

  return (
    <div className="border-2 border-border rounded-md p-4 bg-muted/20 flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
          Preview no slot real ({spec.nome})
        </p>
        <button
          type="button"
          onClick={onRemover}
          className="text-[10px] text-error hover:underline whitespace-nowrap"
        >
          Remover logo
        </button>
      </div>

      {/* Slot simulado */}
      <div
        className="rounded-md border border-border flex items-center justify-center p-4"
        style={{ background: fundoSlot, minHeight: spec.desktop.height + 32 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={`Logo ${empresa}`}
          style={{ ...estiloSlotDesktop(cota), opacity: opacityImg }}
        />
      </div>

      {/* Ficha técnica */}
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <dt className="text-muted-foreground">Dimensão desktop</dt>
        <dd className="font-mono">
          {spec.desktop.width}×{spec.desktop.height} px (máx)
        </dd>
        <dt className="text-muted-foreground">Dimensão mobile</dt>
        <dd className="font-mono">
          {spec.mobile.width}×{spec.mobile.height} px (máx)
        </dd>
        <dt className="text-muted-foreground">Arquivo ideal</dt>
        <dd>{spec.ideal}</dd>
      </dl>

      <p className="text-[10px] text-muted-foreground italic leading-relaxed pt-2 border-t border-dashed border-border">
        {spec.descricao} A logo é encaixada com{' '}
        <code className="bg-muted px-1 rounded">object-fit: contain</code> —
        formato horizontal, vertical ou quadrado, qualquer um cabe no slot
        preservando proporção.
      </p>

      <p className="text-[10px] text-muted-foreground font-mono truncate">
        URL: {logoUrl}
      </p>
    </div>
  )
}
