'use client'

import { useActionState, useState } from 'react'

import { enviarInteresse, type InteressePatrocinioState } from './actions'

const initial: InteressePatrocinioState = { ok: false }

export function PatrocinioForm() {
  const [state, action, pending] = useActionState(enviarInteresse, initial)
  const [cotaSelecionada, setCotaSelecionada] = useState<
    'diamante' | 'ouro' | 'prata'
  >('ouro')

  if (state.ok) {
    return (
      <div className="rounded-md border-2 border-emerald-300 bg-emerald-50 p-6 flex flex-col gap-3">
        <p className="text-base font-semibold text-emerald-900">
          Interesse registrado com sucesso.
        </p>
        <p className="text-sm text-emerald-800 leading-relaxed">
          {state.message}
        </p>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Cota de interesse</span>
        <div className="grid grid-cols-3 gap-2">
          <label
            className={`flex flex-col gap-1 rounded-md border-2 p-3 cursor-pointer ${
              cotaSelecionada === 'diamante'
                ? 'border-cyan-600 bg-cyan-50'
                : 'border-border bg-background'
            }`}
          >
            <input
              type="radio"
              name="cota"
              value="diamante"
              required
              checked={cotaSelecionada === 'diamante'}
              onChange={() => setCotaSelecionada('diamante')}
              className="sr-only"
            />
            <span className="font-semibold text-cyan-700">Diamante</span>
            <span className="text-xs">R$ 100.000</span>
          </label>
          <label
            className={`flex flex-col gap-1 rounded-md border-2 p-3 cursor-pointer ${
              cotaSelecionada === 'ouro'
                ? 'border-amber-600 bg-amber-50'
                : 'border-border bg-background'
            }`}
          >
            <input
              type="radio"
              name="cota"
              value="ouro"
              required
              checked={cotaSelecionada === 'ouro'}
              onChange={() => setCotaSelecionada('ouro')}
              className="sr-only"
            />
            <span className="font-semibold text-amber-700">Ouro</span>
            <span className="text-xs">R$ 70.000</span>
          </label>
          <label
            className={`flex flex-col gap-1 rounded-md border-2 p-3 cursor-pointer ${
              cotaSelecionada === 'prata'
                ? 'border-slate-500 bg-slate-50'
                : 'border-border bg-background'
            }`}
          >
            <input
              type="radio"
              name="cota"
              value="prata"
              required
              checked={cotaSelecionada === 'prata'}
              onChange={() => setCotaSelecionada('prata')}
              className="sr-only"
            />
            <span className="font-semibold text-slate-700">Prata</span>
            <span className="text-xs">R$ 30.000</span>
          </label>
        </div>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Empresa</span>
        <input
          type="text"
          name="empresa"
          required
          maxLength={200}
          aria-invalid={state.field === 'empresa'}
          className="h-11 px-3 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">
          CNPJ <span className="text-xs text-muted-foreground">(opcional)</span>
        </span>
        <input
          type="text"
          name="cnpj"
          maxLength={20}
          placeholder="00.000.000/0001-00"
          className="h-11 px-3 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Seu nome</span>
        <input
          type="text"
          name="contato_nome"
          required
          maxLength={120}
          aria-invalid={state.field === 'contato_nome'}
          className="h-11 px-3 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">E-mail de contato</span>
        <input
          type="email"
          name="contato_email"
          required
          maxLength={200}
          aria-invalid={state.field === 'contato_email'}
          className="h-11 px-3 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">
          Telefone{' '}
          <span className="text-xs text-muted-foreground">(opcional)</span>
        </span>
        <input
          type="tel"
          name="contato_telefone"
          maxLength={20}
          placeholder="(79) 99999-8888"
          className="h-11 px-3 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">
          Mensagem{' '}
          <span className="text-xs text-muted-foreground">(opcional)</span>
        </span>
        <textarea
          name="mensagem"
          rows={4}
          maxLength={2000}
          placeholder="Algum detalhe relevante sobre sua empresa, expectativas ou perguntas?"
          className="px-3 py-2 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </label>

      {state.message && !state.ok ? (
        <p
          role="alert"
          className="text-sm text-error border border-error/30 bg-error/5 rounded-md px-3 py-2"
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="h-12 px-6 rounded-md bg-primary text-primary-foreground font-semibold disabled:opacity-50 hover:opacity-90 transition"
      >
        {pending ? 'Enviando…' : 'Enviar interesse'}
      </button>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Ao enviar, você concorda que a CDL Aracaju entre em contato apenas para
        tratar deste interesse de patrocínio. Seus dados não serão usados para
        outras finalidades. Veja a{' '}
        <a href="/privacidade" className="text-primary hover:underline">
          política de privacidade
        </a>
        .
      </p>
    </form>
  )
}
