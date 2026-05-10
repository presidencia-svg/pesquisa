import { redirect } from 'next/navigation'

import { getVotoToken } from '@/lib/sessao'

import { AnonimoClient } from './anonimo-client'

export const metadata = {
  title: 'Sessão anônima · Pesquisa Sergipe 2026',
}

/**
 * Tela de transicao pra capsula. Visualmente diferente — fundo verde
 * escuro, cadeado.
 *
 * Le o token em claro do cookie httpOnly (so o servidor enxerga) e
 * passa pro client component pra exibicao + copia opcional.
 */
export default async function AnonimoPage() {
  const token = await getVotoToken()
  if (!token) redirect('/votar')

  return (
    <main className="flex flex-col flex-1 bg-capsule text-capsule-foreground">
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-xl w-full flex flex-col items-center gap-8 text-center">
          <CadeadoIcon />

          <div className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-[0.3em] text-capsule-foreground/70">
              Etapa 4 de 4
            </p>
            <h1 className="text-3xl sm:text-4xl font-semibold">
              Você está numa sessão anônima
            </h1>
          </div>

          <p className="text-lg leading-relaxed text-capsule-foreground/90">
            A ponte com seu CPF foi destruída agora. Daqui pra frente, nem o
            sistema, nem a CDL, nem um auditor que abra o banco conseguem
            ligar seus votos a você.
          </p>

          <AnonimoClient token={token} />
        </div>
      </section>
    </main>
  )
}

function CadeadoIcon() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  )
}
