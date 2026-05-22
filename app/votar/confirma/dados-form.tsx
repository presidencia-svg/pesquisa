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
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    let canvasData = ''
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
    const signals = [
      navigator.userAgent,
      navigator.language ?? 'pt-BR',
      `${screen.width}x${screen.height}x${screen.colorDepth}`,
      new Date().getTimezoneOffset().toString(),
      (navigator.hardwareConcurrency ?? 0).toString(),
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

type Municipio = { ibge_codigo: number; nome: string }

const initialState: ConfirmaState = { ok: true }

const formatarWhatsappInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

type Sexo = 'M' | 'F'
type Escolaridade = 'fundamental' | 'medio' | 'superior'

export function DadosForm({
  municipios,
  prefilledMunicipio,
  prefilledWhatsapp,
  prefilledSexo,
  prefilledEscolaridade,
  algumPrefill,
}: {
  municipios: Municipio[]
  prefilledMunicipio?: number
  prefilledWhatsapp?: string
  prefilledSexo?: Sexo
  prefilledEscolaridade?: Escolaridade
  algumPrefill: boolean
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

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">Município</span>
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
          Onde você está cadastrado pra votar.
        </span>
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-foreground mb-1">
          Sexo
        </legend>
        <div className="flex gap-3">
          {[
            { v: 'M', l: 'Masculino' },
            { v: 'F', l: 'Feminino' },
          ].map((o) => (
            <label
              key={o.v}
              className="flex-1 flex items-center justify-center gap-2 h-12 rounded-md border border-border cursor-pointer has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary"
            >
              <input
                type="radio"
                name="sexo"
                value={o.v}
                required
                defaultChecked={prefilledSexo === o.v}
                className="sr-only"
              />
              <span>{o.l}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Faixa etária NÃO é perguntada — vem do cdl_base ou do SPC
          via consulta do CPF, e é gravada no cdl_base como cache.
          Se nenhuma fonte determina a idade, o cadastro é rejeitado
          ainda na tela /votar (não chega aqui). */}

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
