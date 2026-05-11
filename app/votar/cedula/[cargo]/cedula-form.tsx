'use client'

import { useMemo, useState, useTransition } from 'react'

import { type Cargo, type CargoConfig } from '@/lib/cargos'

import { submeterVoto, type VotoState } from './actions'

export type Opcao = {
  numero: number
  nome: string // nome_urna (candidato) ou sigla (legenda)
  partidoSigla: string
  fotoUrl: string | null
  corHex: string | null
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
  const [vaga, setVaga] = useState(vagaInicial)
  const [numero, setNumero] = useState('')
  const [serverMsg, setServerMsg] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Map de numero -> opcao pra lookup O(1).
  const mapaPorNumero = useMemo(() => {
    const m = new Map<number, Opcao>()
    for (const o of opcoes) m.set(o.numero, o)
    return m
  }, [opcoes])

  const completo = numero.length === cfg.digitos

  // Pra legenda, o lookup usa apenas os 2 primeiros digitos (numero do
  // partido). Os digitos restantes sao decorativos pra fidelidade urna.
  const numeroLookup =
    cfg.tipo === 'legenda' && completo ? numero.slice(0, 2) : numero
  const opcaoSelecionada = completo
    ? (mapaPorNumero.get(Number(numeroLookup)) ?? null)
    : null

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
      // O server faz redirect quando avanca pro proximo cargo. Se voltou
      // resposta, eh erro OU ainda tem 2a vaga (senador).
      if (!result.ok) {
        setServerMsg(result.message ?? 'Erro ao votar.')
      } else if (cargo === 'senador' && vaga === 1) {
        // Voto 1/2 do senador foi aceito sem redirect → segue pra vaga 2.
        setVaga(2)
        setNumero('')
      }
    })
  }

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Display estilo urna */}
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

        {/* Display de confirmacao do candidato/legenda */}
        {completo && opcaoSelecionada ? (
          <div className="mt-2 bg-capsule-foreground/5 border border-capsule-foreground/20 rounded-md p-4 flex items-center gap-4">
            <FotoOuInicial
              key={opcaoSelecionada.fotoUrl ?? opcaoSelecionada.numero}
              opcao={opcaoSelecionada}
            />
            <div className="flex-1 flex flex-col gap-0.5 text-left">
              <p className="text-xs uppercase tracking-wider text-capsule-foreground/60">
                {cfg.tipo === 'candidato' ? 'Candidato' : 'Legenda'}
              </p>
              <p className="text-lg font-semibold text-capsule-foreground">
                {opcaoSelecionada.nome}
              </p>
              <p className="text-sm text-capsule-foreground/80">
                {opcaoSelecionada.partidoSigla}
              </p>
            </div>
          </div>
        ) : completo ? (
          <div className="mt-2 bg-error/10 border border-error/30 rounded-md p-4 text-sm text-capsule-foreground">
            Número {numero} não corresponde a {cfg.tipo === 'candidato' ? 'nenhum candidato' : 'nenhuma legenda'} desta pesquisa.
          </div>
        ) : (
          <p className="mt-2 text-sm text-capsule-foreground/50 italic">
            Aguardando os {cfg.digitos} dígitos…
          </p>
        )}
      </div>

      {/* Erro do server */}
      {serverMsg ? (
        <p
          role="alert"
          aria-live="polite"
          className="text-sm bg-error/15 border border-error/30 rounded-md px-3 py-2 text-capsule-foreground"
        >
          {serverMsg}
        </p>
      ) : null}

      {/* Teclado */}
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

      {/* Vias alternativas */}
      <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-capsule-foreground/15">
        <button
          type="button"
          onClick={() => enviar('branco')}
          disabled={pending}
          className="flex-1 h-12 text-sm font-medium rounded-md border border-capsule-foreground/30 text-capsule-foreground/90 hover:bg-capsule-foreground/10 disabled:opacity-30 transition"
        >
          Voto em branco
        </button>
        <button
          type="button"
          onClick={() => enviar('nao_sabe')}
          disabled={pending}
          className="flex-1 h-12 text-sm font-medium rounded-md border border-capsule-foreground/30 text-capsule-foreground/90 hover:bg-capsule-foreground/10 disabled:opacity-30 transition"
        >
          Não sei / não quero votar
        </button>
      </div>
    </div>
  )
}

/**
 * Foto do candidato OU iniciais coloridas (placeholder estilo
 * material). Usa a cor do partido se tiver, senao um cinza neutro.
 */
function FotoOuInicial({ opcao }: { opcao: Opcao }) {
  // erroFoto reseta naturalmente entre opcoes diferentes via `key`
  // prop no FotoOuInicial em cima (linha 116). Evita setState em effect.
  const [erroFoto, setErroFoto] = useState(false)

  const iniciais = (opcao.nome.match(/\b[A-Z]/g) ?? ['?'])
    .slice(0, 2)
    .join('')
  const cor = opcao.corHex ?? '#52525b'

  if (opcao.fotoUrl && !erroFoto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={opcao.fotoUrl}
        alt=""
        onError={() => setErroFoto(true)}
        className="w-16 h-16 rounded-md object-cover bg-capsule-foreground/10"
      />
    )
  }

  return (
    <div
      className="w-16 h-16 rounded-md flex items-center justify-center text-xl font-bold text-white"
      style={{ background: cor }}
      aria-hidden="true"
    >
      {iniciais}
    </div>
  )
}
