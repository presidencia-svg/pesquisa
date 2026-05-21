'use client'

import { useActionState, useState } from 'react'

import { confirmarDados, type ConfirmaState } from './actions'

type Municipio = { ibge_codigo: number; nome: string }

const initialState: ConfirmaState = { ok: true }

const formatarWhatsappInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

type Sexo = 'M' | 'F'
type FaixaEtaria = '16-17' | '18-24' | '25-34' | '35-44' | '45-59' | '60+'
type Escolaridade = 'fundamental' | 'medio' | 'superior'

export function DadosForm({
  municipios,
  prefilledMunicipio,
  prefilledWhatsapp,
  prefilledSexo,
  prefilledFaixaEtaria,
  prefilledEscolaridade,
  algumPrefill,
}: {
  municipios: Municipio[]
  prefilledMunicipio?: number
  prefilledWhatsapp?: string
  prefilledSexo?: Sexo
  prefilledFaixaEtaria?: FaixaEtaria
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

      {prefilledFaixaEtaria ? (
        <input
          type="hidden"
          name="faixa_etaria"
          value={prefilledFaixaEtaria}
        />
      ) : (
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">
            Faixa etária
          </span>
          <select
            name="faixa_etaria"
            required
            defaultValue=""
            aria-invalid={state.field === 'faixa_etaria'}
            className="h-12 px-3 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="" disabled>
              Selecione…
            </option>
            <option value="16-17">16 a 17 anos</option>
            <option value="18-24">18 a 24 anos</option>
            <option value="25-34">25 a 34 anos</option>
            <option value="35-44">35 a 44 anos</option>
            <option value="45-59">45 a 59 anos</option>
            <option value="60+">60 anos ou mais</option>
          </select>
        </label>
      )}

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

      <button
        type="submit"
        disabled={pending}
        className="h-14 px-6 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition"
      >
        {pending ? 'Enviando código…' : 'Enviar código no WhatsApp'}
      </button>
    </form>
  )
}
