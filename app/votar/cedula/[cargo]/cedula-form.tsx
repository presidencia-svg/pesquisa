'use client'

import { useMemo, useState, useTransition } from 'react'

import { type Cargo, type CargoConfig } from '@/lib/cargos'

import { submeterVoto, type VotoState } from './actions'

export type Companheiro = {
  rotulo: string // "Vice", "1º Suplente", "2º Suplente"
  nome: string
  partido: string | null
  fotoUrl: string | null
}

export type Opcao = {
  numero: number
  nome: string // nome_urna (candidato) ou sigla (legenda)
  partidoSigla: string
  fotoUrl: string | null
  corHex: string | null
  // Chapa — só majoritário. Como na urna: vice (presidente/governador)
  // ou 1º/2º suplentes (senador), com foto e nome.
  companheiros?: Companheiro[]
}

export function CedulaForm({
  cargo,
  cfg,
  opcoes,
  vagaInicial,
}: {
  cargo: Cargo
  cfg: CargoConfig
  opcoes: Opcao[]
  /** 1 ou 2 — vagaInicial=2 quando estamos no segundo slot do senador. */
  vagaInicial: number
}) {
  // Branch pra consulta (zona_expansao) — UI totalmente diferente.
  if (cfg.tipo === 'consulta') {
    return <ConsultaForm cargo={cargo} cfg={cfg} />
  }

  return (
    <CedulaUrna
      cargo={cargo}
      cfg={cfg}
      opcoes={opcoes}
      vagaInicial={vagaInicial}
    />
  )
}

// ─── Cedula estilo urna (candidato/legenda) ────────────────────────────────

function CedulaUrna({
  cargo,
  cfg,
  opcoes,
  vagaInicial,
}: {
  cargo: Cargo
  cfg: CargoConfig
  opcoes: Opcao[]
  vagaInicial: number
}) {
  const [vaga, setVaga] = useState(vagaInicial)
  const [numero, setNumero] = useState('')
  const [serverMsg, setServerMsg] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const mapaPorNumero = useMemo(() => {
    const m = new Map<number, Opcao>()
    for (const o of opcoes) m.set(o.numero, o)
    return m
  }, [opcoes])

  const completo = numero.length === cfg.digitos

  // Lookup com fallback pra legenda:
  //   1. Primeiro tenta o numero COMPLETO (pra exibir candidato especifico
  //      quando ele existe em candidatos_pesquisa — 4 digitos Federal,
  //      5 Estadual).
  //   2. Se nao achar e for legenda, extrai os 2 primeiros digitos pra
  //      cair no partido (votacao por sigla).
  let opcaoSelecionada: Opcao | null = null
  if (completo) {
    opcaoSelecionada = mapaPorNumero.get(Number(numero)) ?? null
    if (!opcaoSelecionada && cfg.tipo === 'legenda') {
      opcaoSelecionada =
        mapaPorNumero.get(Number(numero.slice(0, 2))) ?? null
    }
  }

  const apertarDigito = (d: string) => {
    setServerMsg(null)
    setNumero((cur) => (cur.length < cfg.digitos ? cur + d : cur))
  }
  const corrigir = () => {
    setServerMsg(null)
    setNumero('')
  }

  const enviar = (metodo: 'numero' | 'branco' | 'nao_sabe') => {
    setServerMsg(null)
    const fd = new FormData()
    fd.set('cargo', cargo)
    fd.set('metodo', metodo)
    if (metodo === 'numero') fd.set('numero', numero)
    fd.set('slot', String(vaga))

    startTransition(async () => {
      const result: VotoState = await submeterVoto({ ok: true }, fd)
      if (!result.ok) {
        setServerMsg(result.message ?? 'Erro ao votar.')
      } else if (cargo === 'senador' && vaga === 1) {
        setVaga(2)
        setNumero('')
      }
    })
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="w-full bg-capsule-foreground/10 border border-capsule-foreground/30 rounded-md p-6 flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <p className="text-xs uppercase tracking-widest text-capsule-foreground/70">
            {cfg.label}
            {cfg.vagas > 1 ? ` — ${vaga}º voto de ${cfg.vagas}` : ''}
          </p>
          <p className="text-xs text-capsule-foreground/50">
            {cfg.tipo === 'candidato'
              ? `${cfg.digitos} dígitos do candidato`
              : `${cfg.digitos} dígitos como na urna`}
          </p>
        </div>

        <div className="flex gap-3">
          {Array.from({ length: cfg.digitos }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-20 border-2 rounded-md flex items-center justify-center text-4xl font-mono tabular-nums ${
                numero[i]
                  ? 'border-capsule-foreground bg-capsule-foreground/5 text-capsule-foreground'
                  : 'border-capsule-foreground/30 text-capsule-foreground/30'
              }`}
            >
              {numero[i] ?? '·'}
            </div>
          ))}
        </div>

        {completo && opcaoSelecionada ? (
          <div className="mt-2 bg-capsule-foreground/5 border border-capsule-foreground/20 rounded-md p-4 flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <FotoOuInicial
                key={opcaoSelecionada.fotoUrl ?? opcaoSelecionada.numero}
                opcao={opcaoSelecionada}
              />
              <div className="flex-1 flex flex-col gap-0.5 text-left">
                <p className="text-xs uppercase tracking-wider text-capsule-foreground/60">
                  {cfg.tipo === 'candidato'
                    ? opcaoSelecionada.companheiros?.length
                      ? 'Titular'
                      : 'Candidato'
                    : 'Legenda'}
                </p>
                <p className="text-lg font-semibold text-capsule-foreground">
                  {opcaoSelecionada.nome}
                </p>
                <p className="text-sm text-capsule-foreground/80">
                  {opcaoSelecionada.partidoSigla}
                </p>
              </div>
            </div>
            {opcaoSelecionada.companheiros?.map((comp, i) => (
              <div
                key={`${comp.rotulo}-${i}`}
                className="flex items-center gap-4 pt-3 border-t border-capsule-foreground/15"
              >
                <FotoAvatar
                  fotoUrl={comp.fotoUrl}
                  nome={comp.nome}
                  corHex={opcaoSelecionada.corHex}
                  tamanho="vice"
                />
                <div className="flex-1 flex flex-col gap-0.5 text-left">
                  <p className="text-xs uppercase tracking-wider text-capsule-foreground/60">
                    {comp.rotulo}
                  </p>
                  <p className="text-base font-medium text-capsule-foreground">
                    {comp.nome}
                  </p>
                  {comp.partido ? (
                    <p className="text-sm text-capsule-foreground/70">
                      {comp.partido}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : completo ? (
          <div className="mt-2 bg-error/10 border border-error/30 rounded-md p-4 text-sm text-capsule-foreground">
            Número {numero} não corresponde a{' '}
            {cfg.tipo === 'candidato'
              ? 'nenhum candidato'
              : 'nenhuma legenda'}{' '}
            desta pesquisa.
          </div>
        ) : (
          <p className="mt-2 text-sm text-capsule-foreground/50 italic">
            Aguardando os {cfg.digitos} dígitos…
          </p>
        )}
      </div>

      {serverMsg ? (
        <p
          role="alert"
          aria-live="polite"
          className="text-sm bg-error/15 border border-error/30 rounded-md px-3 py-2 text-capsule-foreground"
        >
          {serverMsg}
        </p>
      ) : null}

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => apertarDigito(d)}
            disabled={pending || numero.length >= cfg.digitos}
            className="h-16 text-2xl font-semibold rounded-md bg-capsule-foreground/10 hover:bg-capsule-foreground/20 disabled:opacity-30 transition"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={corrigir}
          disabled={pending || numero.length === 0}
          className="h-16 text-sm font-semibold rounded-md bg-accent text-zinc-900 hover:opacity-90 disabled:opacity-30 transition"
        >
          CORRIGE
        </button>
        <button
          type="button"
          onClick={() => apertarDigito('0')}
          disabled={pending || numero.length >= cfg.digitos}
          className="h-16 text-2xl font-semibold rounded-md bg-capsule-foreground/10 hover:bg-capsule-foreground/20 disabled:opacity-30 transition"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => enviar('numero')}
          disabled={pending || !completo || !opcaoSelecionada}
          className="h-16 text-sm font-semibold rounded-md bg-emerald-400 text-emerald-950 hover:opacity-90 disabled:opacity-30 transition"
        >
          {pending ? '…' : 'CONFIRMA'}
        </button>
      </div>

      <div className="pt-3 border-t border-capsule-foreground/15 flex flex-col gap-2">
        <p className="text-xs text-capsule-foreground/60 leading-snug">
          Não lembra do número? Esta pesquisa é{' '}
          <strong>espontânea</strong> — não mostramos lista de candidatos.
          Use os botões abaixo se não souber.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => enviar('nao_sabe')}
            disabled={pending}
            className="flex-1 h-12 text-sm font-medium rounded-md border-2 border-capsule-foreground/40 bg-capsule-foreground/5 text-capsule-foreground hover:bg-capsule-foreground/15 disabled:opacity-30 transition"
          >
            Não lembro o número
          </button>
          <button
            type="button"
            onClick={() => enviar('branco')}
            disabled={pending}
            className="flex-1 h-12 text-sm font-medium rounded-md border border-capsule-foreground/30 text-capsule-foreground/90 hover:bg-capsule-foreground/10 disabled:opacity-30 transition"
          >
            Voto em branco
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Consulta (zona_expansao) — UI sem teclado ─────────────────────────────

function ConsultaForm({ cargo, cfg }: { cargo: Cargo; cfg: CargoConfig }) {
  const [serverMsg, setServerMsg] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const enviar = (metodo: 'numero' | 'branco' | 'nao_sabe', resposta?: string) => {
    setServerMsg(null)
    const fd = new FormData()
    fd.set('cargo', cargo)
    fd.set('metodo', metodo)
    if (metodo === 'numero' && resposta) fd.set('resposta', resposta)

    startTransition(async () => {
      const result: VotoState = await submeterVoto({ ok: true }, fd)
      if (!result.ok) {
        setServerMsg(result.message ?? 'Erro ao votar.')
      }
    })
  }

  const opcoes = cfg.opcoesConsulta ?? []

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="w-full bg-capsule-foreground/10 border border-capsule-foreground/30 rounded-md p-6">
        <p className="text-base sm:text-lg leading-relaxed text-capsule-foreground">
          Hoje a <strong>Zona de Expansão</strong> é administrada por Aracaju
          mas pertencia originalmente a São Cristóvão. Há um debate político
          sobre qual município deve administrar essa região.
        </p>
        <p className="text-base sm:text-lg leading-relaxed text-capsule-foreground mt-4 font-semibold">
          Na sua opinião, a Zona de Expansão deve ficar com:
        </p>
      </div>

      {serverMsg ? (
        <p
          role="alert"
          aria-live="polite"
          className="text-sm bg-error/15 border border-error/30 rounded-md px-3 py-2 text-capsule-foreground"
        >
          {serverMsg}
        </p>
      ) : null}

      {/* Duas opcoes grandes */}
      <div className="grid sm:grid-cols-2 gap-3">
        {opcoes.map((o) => (
          <button
            key={o.valor}
            type="button"
            onClick={() => enviar('numero', o.valor)}
            disabled={pending}
            className="h-24 text-lg font-semibold rounded-md bg-emerald-400 text-emerald-950 hover:opacity-90 disabled:opacity-30 transition px-4"
          >
            {pending ? '…' : o.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-capsule-foreground/15">
        <button
          type="button"
          onClick={() => enviar('nao_sabe')}
          disabled={pending}
          className="flex-1 h-12 text-sm font-medium rounded-md border border-capsule-foreground/30 text-capsule-foreground/90 hover:bg-capsule-foreground/10 disabled:opacity-30 transition"
        >
          Não sei / Sem opinião
        </button>
        <button
          type="button"
          onClick={() => enviar('branco')}
          disabled={pending}
          className="flex-1 h-12 text-sm font-medium rounded-md border border-capsule-foreground/30 text-capsule-foreground/90 hover:bg-capsule-foreground/10 disabled:opacity-30 transition"
        >
          Voto em branco
        </button>
      </div>
    </div>
  )
}

// ─── Foto / placeholder ────────────────────────────────────────────────────

function FotoOuInicial({ opcao }: { opcao: Opcao }) {
  return (
    <FotoAvatar
      fotoUrl={opcao.fotoUrl}
      nome={opcao.nome}
      corHex={opcao.corHex}
      tamanho="titular"
    />
  )
}

// Avatar reutilizável (titular e vice). Cai nas iniciais se a foto falhar.
function FotoAvatar({
  fotoUrl,
  nome,
  corHex,
  tamanho,
}: {
  fotoUrl: string | null | undefined
  nome: string
  corHex: string | null | undefined
  tamanho: 'titular' | 'vice'
}) {
  const [erroFoto, setErroFoto] = useState(false)

  const iniciais = (nome.match(/\b[A-Z]/g) ?? ['?']).slice(0, 2).join('')
  const cor = corHex ?? '#52525b'
  const dim = tamanho === 'titular' ? 'w-16 h-16 text-xl' : 'w-12 h-12 text-base'

  if (fotoUrl && !erroFoto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fotoUrl}
        alt=""
        onError={() => setErroFoto(true)}
        className={`${dim} rounded-md object-cover bg-capsule-foreground/10`}
      />
    )
  }

  return (
    <div
      className={`${dim} rounded-md flex items-center justify-center font-bold text-white`}
      style={{ background: cor }}
      aria-hidden="true"
    >
      {iniciais}
    </div>
  )
}
