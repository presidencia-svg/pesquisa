'use client'

import { useActionState, useEffect, useState } from 'react'

import { confirmarDados, type ConfirmaState } from './actions'

/**
 * Fingerprint estável do dispositivo: combina sinais que mudam pouco
 * entre sessões (canvas pixel render, UA, idioma, resolução de tela,
 * timezone, núcleos lógicos) e hash em SHA-256 hex (64 chars).
 *
 * NÃO é identificador de pessoa — é identificador de browser+device.
 * Mudança de browser, modo anônimo, ou atualização significativa do
 * SO geram fingerprints diferentes. Suficiente como anti-multivoto.
 *
 * Roda só client-side (typeof window !== undefined).
 */
async function gerarDeviceFingerprint(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  try {
    // Detecta iOS. Safari iOS 17+ aplica anti-fingerprint no canvas
    // (adiciona ruído por sessão), o que torna o canvas instável.
    // Em iOS, omitimos o canvas pra ter fingerprint estável — perde
    // alguma unicidade mas mantém o objetivo (1 voto por aparelho na
    // mesma sessão funciona; aparelho diferente = fingerprint diferente).
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)

    let canvasData = ''
    if (!isIOS) {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.textBaseline = 'top'
        ctx.font = '14px Arial'
        ctx.fillStyle = '#069'
        ctx.fillText('pesquisa-sergipe-2026', 4, 4)
        ctx.strokeStyle = '#3a8a1d'
        ctx.beginPath()
        ctx.arc(50, 18, 8, 0, Math.PI * 2)
        ctx.stroke()
        canvasData = canvas.toDataURL()
      }
    }
    const signals = [
      navigator.userAgent,
      navigator.language ?? 'pt-BR',
      `${screen.width}x${screen.height}x${screen.colorDepth}`,
      new Date().getTimezoneOffset().toString(),
      (navigator.hardwareConcurrency ?? 0).toString(),
      // WebGL renderer/vendor são mais estáveis que canvas no iOS
      // (Apple não randomiza esses) — adiciona unicidade sem
      // instabilidade.
      obterWebGLSignal(),
      canvasData,
    ].join('|')
    const enc = new TextEncoder()
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(signals))
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    return null
  }
}

/** WebGL vendor+renderer — estável em todos os browsers, inclusive iOS. */
function obterWebGLSignal(): string {
  try {
    const canvas = document.createElement('canvas')
    const gl =
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ??
      (canvas.getContext(
        'experimental-webgl',
      ) as WebGLRenderingContext | null)
    if (!gl) return 'no-webgl'
    const dbg = gl.getExtension('WEBGL_debug_renderer_info')
    if (!dbg) {
      return [gl.getParameter(gl.VENDOR), gl.getParameter(gl.RENDERER)].join(',')
    }
    return [
      gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL),
      gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL),
    ].join(',')
  } catch {
    return 'webgl-err'
  }
}

type Municipio = { ibge_codigo: number; nome: string }

const initialState: ConfirmaState = { ok: true }

const formatarWhatsappInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

type Escolaridade = 'fundamental' | 'medio' | 'superior'

export function DadosForm({
  municipios,
  prefilledMunicipio,
  prefilledWhatsapp,
  prefilledEscolaridade,
  algumPrefill,
  exigirTitulo = false,
}: {
  municipios: Municipio[]
  prefilledMunicipio?: number
  prefilledWhatsapp?: string
  prefilledEscolaridade?: Escolaridade
  algumPrefill: boolean
  /** true quando o eleitor tem 16-17: voto facultativo, exige título. */
  exigirTitulo?: boolean
}) {
  const [state, formAction, pending] = useActionState(
    confirmarDados,
    initialState,
  )
  const [whatsapp, setWhatsapp] = useState(
    prefilledWhatsapp
      ? formatarWhatsappInput(prefilledWhatsapp.replace(/^\+55/, ''))
      : '',
  )
  const [deviceFingerprint, setDeviceFingerprint] = useState('')
  const [titulo, setTitulo] = useState('')

  useEffect(() => {
    gerarDeviceFingerprint().then((fp) => {
      if (fp) setDeviceFingerprint(fp)
    })
  }, [])

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {algumPrefill ? (
        <p className="text-sm text-muted-foreground bg-muted border border-border rounded-md px-3 py-2">
          Pré-preenchemos o que conseguimos identificar. Confira e ajuste se
          algo estiver errado.
        </p>
      ) : null}

      {/* Município = domicílio ELEITORAL, não residência. O prefill vem do
          endereço do cadastro oficial, que diverge pra quem mudou de cidade
          sem transferir o título. Por isso o rótulo pergunta em vez de
          afirmar: quem só confirma sem ler erraria a variável que mais pesa
          na ponderação geográfica. */}
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">
          Em qual cidade você vota?
        </span>
        <select
          name="municipio_ibge"
          required
          defaultValue={prefilledMunicipio ?? ''}
          aria-invalid={state.field === 'municipio_ibge'}
          className="h-12 px-3 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="" disabled>
            Selecione…
          </option>
          {municipios.map((m) => (
            <option key={m.ibge_codigo} value={m.ibge_codigo}>
              {m.nome}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">
          {prefilledMunicipio
            ? 'Confira: é a cidade do seu título de eleitor, que pode ser diferente de onde você mora hoje.'
            : 'A cidade do seu título de eleitor — pode ser diferente de onde você mora hoje.'}
        </span>
      </label>

      {/* Título de eleitor — só para 16-17 (voto facultativo, CF art. 14
          §1º II c). Aos 18+ o alistamento é obrigatório e não pedimos.
          O número é validado no servidor e NÃO é armazenado. */}
      {exigirTitulo ? (
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">
            Número do título de eleitor
          </span>
          <input
            type="text"
            name="titulo_eleitor"
            inputMode="numeric"
            autoComplete="off"
            required
            value={titulo}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, '').slice(0, 12)
              const grupos = d.match(/.{1,4}/g)
              setTitulo(grupos ? grupos.join(' ') : d)
            }}
            placeholder="0000 0000 0000"
            aria-invalid={state.field === 'titulo_eleitor'}
            className="h-12 px-3 rounded-md border border-border bg-background font-mono tracking-wide focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <span className="text-xs text-muted-foreground">
            Aos 16 e 17 anos o voto é facultativo — só participa quem já tem
            título. Digite os 12 números do título (sem a zona/seção). Ele é
            usado só para conferir sua elegibilidade e <strong>não é
            guardado</strong>.
          </span>
        </label>
      ) : null}

      {/* Sexo e faixa etária NÃO são perguntados — vêm da Receita Federal
          (via SPC) no passo anterior e ficam em cache em cdl_base. Tirar
          essas perguntas reduz fricção e elimina autodeclaração incorreta. */}

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">Escolaridade</span>
        <select
          name="escolaridade"
          required
          defaultValue={prefilledEscolaridade ?? ''}
          aria-invalid={state.field === 'escolaridade'}
          className="h-12 px-3 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="" disabled>
            Selecione…
          </option>
          <option value="fundamental">Ensino fundamental</option>
          <option value="medio">Ensino médio</option>
          <option value="superior">Ensino superior</option>
        </select>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">
          Renda familiar mensal
        </span>
        <select
          name="nivel_economico"
          required
          defaultValue=""
          aria-invalid={state.field === 'nivel_economico'}
          className="h-12 px-3 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="" disabled>
            Selecione…
          </option>
          <option value="A">Mais de R$ 25.000</option>
          <option value="B">De R$ 7.000 a R$ 25.000</option>
          <option value="C">De R$ 2.800 a R$ 7.000</option>
          <option value="D_E">Até R$ 2.800</option>
          <option value="nao_informado">Prefiro não informar</option>
        </select>
        <span className="text-xs text-muted-foreground">
          Exigido pelo TRE/SE (Resolução 23.747/2026) para a composição da
          amostra. Você pode optar por não informar — os dados são tratados
          apenas em agregados estatísticos.
        </span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">WhatsApp</span>
        <input
          type="tel"
          name="whatsapp"
          required
          inputMode="numeric"
          autoComplete="tel"
          placeholder="(79) 99999-8888"
          value={whatsapp}
          onChange={(e) => setWhatsapp(formatarWhatsappInput(e.target.value))}
          aria-invalid={state.field === 'whatsapp'}
          className="h-12 px-4 rounded-md border border-border bg-background tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <span className="text-xs text-muted-foreground">
          Vamos enviar um código de 6 dígitos por WhatsApp pra confirmar que o
          número é seu.
        </span>
      </label>

      {state.message ? (
        <p
          role="alert"
          aria-live="polite"
          className="text-sm text-error bg-error/5 border border-error/20 rounded-md px-3 py-2"
        >
          {state.message}
        </p>
      ) : null}

      {/* Opt-in opcional para receber os resultados via WhatsApp.
          Default não-marcado (consentimento explícito LGPD art. 7º I).
          Mensagem clara sobre quando e o que será enviado. */}
      <label className="flex items-start gap-3 text-sm text-foreground border border-border rounded-md px-4 py-3 bg-accent/5 cursor-pointer hover:bg-accent/10 transition">
        <input
          type="checkbox"
          name="opt_in_resultados_wa"
          value="1"
          className="mt-0.5 w-5 h-5 rounded border-border accent-accent cursor-pointer flex-none"
        />
        <span className="leading-relaxed">
          <strong>Quero receber os resultados em primeira mão</strong> no meu
          WhatsApp, logo que a CDL Aracaju divulgar a pesquisa no telejornal
          da TV Atalaia. Envio único por edição, sem campanha ou propaganda. Posso
          cancelar a qualquer momento solicitando exclusão dos meus dados.
        </span>
      </label>

      {/* Identificador antifraude do dispositivo (gerado client-side
          via canvas + UA + screen + timezone, hash SHA-256). Server
          usa pra travar 1 voto por aparelho por edição. */}
      {deviceFingerprint ? (
        <input
          type="hidden"
          name="device_fingerprint"
          value={deviceFingerprint}
        />
      ) : null}

      <button
        type="submit"
        disabled={pending || !deviceFingerprint}
        className="h-14 px-6 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition"
      >
        {pending
          ? 'Enviando código…'
          : deviceFingerprint
            ? 'Enviar código no WhatsApp'
            : 'Validando dispositivo…'}
      </button>
    </form>
  )
}
