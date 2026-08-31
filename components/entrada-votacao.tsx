'use client'

import { useCallback, useEffect, useState } from 'react'

import { CpfForm } from '@/app/votar/cpf-form'
import { dentroDeSergipe } from '@/lib/geo-sergipe'

/**
 * Porta de entrada da votação. Decide, pelo relógio do cliente, o que
 * mostrar:
 *   - antes do início  → CRONÔMETRO regressivo (quando a votação abre)
 *   - depois do fim     → aviso de encerrada
 *   - dentro da janela  → se o IP já confirma Sergipe (ipDentroSergipe,
 *                          vindo do servidor), vai DIRETO pro CPF — zero
 *                          fricção. Senão, GATE DE LOCALIZAÇÃO (grande)
 *                          como plano B via GPS.
 *
 * A checagem de localização aqui é feedback instantâneo; o servidor
 * revalida (IP em SE ou coordenadas em SE — autoritativo). Coordenada
 * não é armazenada.
 */
type Fase = 'antes' | 'aberta' | 'encerrada'

function faseDe(inicio: number, fim: number): Fase {
  const agora = Date.now()
  if (agora < inicio) return 'antes'
  if (agora > fim) return 'encerrada'
  return 'aberta'
}

const fmtData = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Bahia',
  })

export function EntradaVotacao({
  inicioISO,
  fimISO,
  turnstileSiteKey,
  ipDentroSergipe = false,
}: {
  inicioISO: string
  fimISO: string
  turnstileSiteKey?: string
  ipDentroSergipe?: boolean
}) {
  const inicio = new Date(inicioISO).getTime()
  const fim = new Date(fimISO).getTime()
  // Inicializa já com a fase pelo relógio (SSR usa o relógio do servidor),
  // pra não "piscar" o card de localização antes do cronômetro.
  const [fase, setFase] = useState<Fase>(() => faseDe(inicio, fim))

  // Só avalia o relógio no cliente (evita divergência de SSR).
  useEffect(() => {
    setFase(faseDe(inicio, fim))
    const t = setInterval(() => setFase(faseDe(inicio, fim)), 1000)
    return () => clearInterval(t)
  }, [inicio, fim])

  if (fase === 'antes') return <Cronometro alvo={inicio} inicioISO={inicioISO} />
  if (fase === 'encerrada') return <Encerrada fimISO={fimISO} />
  // IP já confirmou Sergipe → direto pro CPF, sem pedir GPS.
  if (ipDentroSergipe) return <CpfForm turnstileSiteKey={turnstileSiteKey} />
  return <GateLocalizacao turnstileSiteKey={turnstileSiteKey} />
}

/* ------------------------- Cronômetro ------------------------- */
function Cronometro({ alvo, inicioISO }: { alvo: number; inicioISO: string }) {
  const [resta, setResta] = useState(0)
  useEffect(() => {
    setResta(alvo - Date.now())
    const t = setInterval(() => setResta(alvo - Date.now()), 1000)
    return () => clearInterval(t)
  }, [alvo])

  const s = Math.max(0, Math.floor(resta / 1000))
  const dias = Math.floor(s / 86400)
  const horas = Math.floor((s % 86400) / 3600)
  const min = Math.floor((s % 3600) / 60)
  const seg = s % 60
  const bloco = (n: number, r: string) => (
    <div className="flex flex-col items-center">
      <span className="text-4xl sm:text-6xl font-bold tabular-nums text-primary leading-none">
        {String(n).padStart(2, '0')}
      </span>
      <span className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground mt-1">
        {r}
      </span>
    </div>
  )

  return (
    <div className="flex flex-col items-center gap-6 py-6 text-center">
      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          A votação ainda não começou
        </span>
        <h2 className="text-2xl font-semibold text-foreground">
          Faltam para abrir:
        </h2>
      </div>
      <div className="flex items-start gap-3 sm:gap-6">
        {bloco(dias, 'dias')}
        <span className="text-4xl sm:text-6xl font-bold text-border leading-none">:</span>
        {bloco(horas, 'horas')}
        <span className="text-4xl sm:text-6xl font-bold text-border leading-none">:</span>
        {bloco(min, 'min')}
        <span className="text-4xl sm:text-6xl font-bold text-border leading-none">:</span>
        {bloco(seg, 'seg')}
      </div>
      <p className="text-base text-muted-foreground">
        A pesquisa abre em{' '}
        <strong className="text-foreground">{fmtData(inicioISO)}</strong>.
        <br />
        Volte neste horário para votar.
      </p>
    </div>
  )
}

/* ------------------------- Encerrada ------------------------- */
function Encerrada({ fimISO }: { fimISO: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <div className="text-5xl">✓</div>
      <h2 className="text-2xl font-semibold text-foreground">
        Coleta encerrada
      </h2>
      <p className="text-base text-muted-foreground max-w-sm">
        A votação foi encerrada em{' '}
        <strong className="text-foreground">{fmtData(fimISO)}</strong>. Obrigado
        a quem participou! Os resultados serão divulgados em breve.
      </p>
    </div>
  )
}

/* ------------------- Gate de localização (grande) ------------------- */
type GeoEstado = 'inicial' | 'pedindo' | 'ok' | 'negado' | 'fora'

function GateLocalizacao({ turnstileSiteKey }: { turnstileSiteKey?: string }) {
  const [estado, setEstado] = useState<GeoEstado>('inicial')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  const pedir = useCallback(() => {
    setEstado('pedindo')
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setEstado('negado')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        if (dentroDeSergipe(lat, lng)) {
          setCoords({ lat, lng })
          setEstado('ok')
        } else {
          setEstado('fora')
        }
      },
      () => setEstado('negado'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    )
  }, [])

  useEffect(() => {
    pedir()
  }, [pedir])

  // Confirmado em Sergipe → mostra o formulário, passando as coordenadas.
  if (estado === 'ok' && coords) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <span className="text-2xl">📍</span>
          <p className="text-sm font-medium text-green-800">
            Localização confirmada em Sergipe. Você pode votar.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-foreground">
            Identifique-se
          </h1>
          <p className="text-base text-muted-foreground">
            Informe seu CPF. Validamos que é real e que ainda não foi usado
            nesta edição da pesquisa.
          </p>
        </div>
        <CpfForm turnstileSiteKey={turnstileSiteKey} lat={coords.lat} lng={coords.lng} />
      </div>
    )
  }

  // Card GRANDE de permissão / erro.
  const pedindo = estado === 'pedindo' || estado === 'inicial'
  const fora = estado === 'fora'
  return (
    <div
      className={`flex flex-col items-center gap-5 rounded-2xl border-2 px-6 py-10 text-center ${
        fora
          ? 'border-error/30 bg-error/5'
          : 'border-primary/30 bg-primary/5'
      }`}
    >
      <div className="text-6xl" aria-hidden="true">
        {fora ? '🚫' : '📍'}
      </div>

      {fora ? (
        <>
          <h2 className="text-2xl font-bold text-foreground">
            Você não está em Sergipe
          </h2>
          <p className="text-base text-muted-foreground max-w-sm">
            Esta pesquisa é <strong className="text-foreground">exclusiva
            para eleitores que estão no estado de Sergipe</strong>. Se você está
            em Sergipe, verifique se o GPS/localização do aparelho está ligado e
            tente de novo.
          </p>
        </>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-foreground">
            Ative sua localização
          </h2>
          <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
            Para participar, precisamos confirmar que você está{' '}
            <strong className="text-foreground">no estado de Sergipe</strong>.
            {pedindo
              ? ' Buscando sua localização…'
              : ' Toque no botão abaixo e escolha "Permitir" quando o navegador perguntar.'}
          </p>
        </>
      )}

      <button
        type="button"
        onClick={pedir}
        disabled={pedindo}
        className="h-14 px-8 rounded-xl bg-primary text-primary-foreground text-lg font-semibold disabled:opacity-60 hover:opacity-90 transition shadow-lg"
      >
        {pedindo
          ? 'Buscando localização…'
          : fora
            ? 'Tentar novamente'
            : 'Permitir localização'}
      </button>

      {estado === 'negado' && (
        <p className="text-sm text-muted-foreground max-w-sm">
          Se não apareceu o pedido, verifique nas configurações do navegador se
          a permissão de <strong>localização</strong> está bloqueada para este
          site e libere.
        </p>
      )}
    </div>
  )
}
