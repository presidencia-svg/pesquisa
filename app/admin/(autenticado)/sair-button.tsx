'use client'

import { useTransition } from 'react'

import { sair } from './actions'

export function SairButton() {
  const [pending, startTransition] = useTransition()
  return (
    <button
      type="button"
      onClick={() => startTransition(() => sair())}
      disabled={pending}
      className="text-xs text-error hover:underline disabled:opacity-50"
    >
      {pending ? 'Saindo…' : 'Sair'}
    </button>
  )
}
