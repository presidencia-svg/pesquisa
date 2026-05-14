'use client'

import Link from 'next/link'
import Script from 'next/script'
import { useActionState, useState } from 'react'

import { entrarComCpf, type VotarFormState } from './actions'

const formatarCpfInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

const initialState: VotarFormState = { ok: true }

export function CpfForm({ turnstileSiteKey }: { turnstileSiteKey?: string }) {
  const [state, formAction, pending] = useActionState(entrarComCpf, initialState)
  const [cpfDisplay, setCpfDisplay] = useState('')
  const [consentido, setConsentido] = useState(false)

  const showTurnstile =
    typeof turnstileSiteKey === 'string' && turnstileSiteKey.length > 0

  return (
    <>
      {showTurnstile ? (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          async
          defer
          strategy="afterInteractive"
        />
      ) : null}

      <form action={formAction} className="flex flex-col gap-5">
        <label htmlFor="cpf" className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Seu CPF</span>
          <input
            id="cpf"
            name="cpf"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            required
            placeholder="000.000.000-00"
            value={cpfDisplay}
            onChange={(e) => setCpfDisplay(formatarCpfInput(e.target.value))}
            className="h-14 px-4 rounded-md border border-border bg-background text-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>

        {/* Widget Turnstile — renderiza inline no submit do form. Em
            DEV_MODE local, sem TURNSTILE_SITE_KEY configurada, o widget
            nem aparece e a validacao server-side faz bypass. */}
        {showTurnstile ? (
          <div className="flex flex-col gap-1">
            <div
              className="cf-turnstile"
              data-sitekey={turnstileSiteKey}
              data-theme="light"
              data-size="flexible"
            />
            <p className="text-[10px] text-muted-foreground">
              Verificação anti-bot Cloudflare. Sem dados pessoais.
            </p>
          </div>
        ) : null}

        {state.message ? (
          <p
            role="alert"
            aria-live="polite"
            className="text-sm text-error bg-error/5 border border-error/20 rounded-md px-3 py-2"
          >
            {state.message}
          </p>
        ) : null}

        <label className="flex items-start gap-3 text-sm text-foreground border border-border rounded-md px-4 py-3 bg-muted/40 cursor-pointer hover:bg-muted/60 transition">
          <input
            type="checkbox"
            name="consentimento"
            required
            checked={consentido}
            onChange={(e) => setConsentido(e.target.checked)}
            className="mt-0.5 w-4 h-4 flex-none"
          />
          <span className="leading-snug">
            Li e concordo com a{' '}
            <Link
              href="/privacidade"
              target="_blank"
              className="text-primary underline font-medium"
            >
              Política de Privacidade
            </Link>
            . Autorizo a CDL Aracaju a tratar meu CPF, WhatsApp,
            município e dados demográficos para validação de identidade
            e ponderação amostral, conforme Lei 13.709/2018 (LGPD) e
            Resolução TSE 23.747/2026.
          </span>
        </label>

        <button
          type="submit"
          disabled={
            pending ||
            cpfDisplay.replace(/\D/g, '').length !== 11 ||
            !consentido
          }
          className="h-14 px-6 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition"
        >
          {pending ? 'Validando…' : 'Continuar'}
        </button>

        <p className="text-xs text-muted-foreground">
          Seu CPF é validado e armazenado apenas como um código embaralhado
          (hash). O número original nunca fica gravado. Você pode pedir
          exclusão dos seus dados a qualquer momento em{' '}
          <Link href="/privacidade/excluir" className="text-primary hover:underline">
            /privacidade/excluir
          </Link>
          .
        </p>
      </form>
    </>
  )
}
