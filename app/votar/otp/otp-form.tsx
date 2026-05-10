'use client'

import { useActionState, useState, useTransition } from 'react'

import { reenviarOtp, validarOtp, type OtpState } from './actions'

const initialState: OtpState = { ok: true }

const formatarCodigoInput = (raw: string): string =>
  raw.replace(/\D/g, '').slice(0, 6)

export function OtpForm() {
  const [state, formAction, pending] = useActionState(validarOtp, initialState)
  const [codigo, setCodigo] = useState('')
  const [reenvioPending, startReenvio] = useTransition()
  const [reenvioMsg, setReenvioMsg] = useState<{
    tipo: 'ok' | 'erro'
    msg: string
  } | null>(null)

  const handleReenviar = () => {
    setReenvioMsg(null)
    startReenvio(async () => {
      const result = await reenviarOtp()
      setReenvioMsg({
        tipo: result.ok ? 'ok' : 'erro',
        msg: result.message ?? '',
      })
      if (result.ok) setCodigo('')
    })
  }

  const codigoCompleto = codigo.length === 6
  const tentativasMsg =
    state.tentativasRestantes !== undefined && state.tentativasRestantes > 0
      ? ` Tentativas restantes: ${state.tentativasRestantes}.`
      : ''

  return (
    <div className="flex flex-col gap-5">
      <form action={formAction} className="flex flex-col gap-5">
        <label htmlFor="codigo" className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">
            Código de 6 dígitos
          </span>
          <input
            id="codigo"
            name="codigo"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            placeholder="000000"
            maxLength={6}
            value={codigo}
            onChange={(e) => setCodigo(formatarCodigoInput(e.target.value))}
            className="h-16 px-4 rounded-md border border-border bg-background text-3xl tracking-[0.5em] tabular-nums text-center focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>

        {state.message ? (
          <p
            role="alert"
            aria-live="polite"
            className="text-sm text-error bg-error/5 border border-error/20 rounded-md px-3 py-2"
          >
            {state.message}
            {tentativasMsg}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending || !codigoCompleto}
          className="h-14 px-6 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition"
        >
          {pending ? 'Validando…' : 'Confirmar código'}
        </button>
      </form>

      <div className="flex flex-col gap-2 pt-3 border-t border-border">
        <button
          type="button"
          onClick={handleReenviar}
          disabled={reenvioPending}
          className="text-sm text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed self-start"
        >
          {reenvioPending ? 'Enviando…' : 'Não recebi. Reenviar código.'}
        </button>
        {reenvioMsg ? (
          <p
            role="status"
            aria-live="polite"
            className={`text-sm ${
              reenvioMsg.tipo === 'ok'
                ? 'text-foreground'
                : 'text-error'
            }`}
          >
            {reenvioMsg.msg}
          </p>
        ) : null}
      </div>
    </div>
  )
}
