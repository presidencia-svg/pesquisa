import Link from 'next/link'
import { redirect } from 'next/navigation'

import { RodapeInstitucional } from '@/components/rodape-institucional'
import { getPreVoto, getVotoToken } from '@/lib/sessao'

import { CpfForm } from './cpf-form'

export const metadata = {
  title: 'Identifique-se · Pesquisa Sergipe 2026',
}

export default async function VotarPage() {
  // Se ja entrou na capsula, vai pra capsula.
  const token = await getVotoToken()
  if (token) redirect('/votar/anonimo')

  // Se ja existe rascunho de cadastro, pula direto pro proximo passo.
  const draft = await getPreVoto()
  if (draft) redirect('/votar/confirma')

  return (
    <>
    <main className="flex flex-col flex-1 bg-background">
      <header className="border-b border-border">
        <div className="max-w-xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Início
          </Link>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Etapa 1 de 4
          </p>
        </div>
      </header>

      <section className="flex-1 flex flex-col px-6 py-12 sm:py-16">
        <div className="max-w-xl mx-auto w-full flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold text-foreground">
              Identifique-se
            </h1>
            <p className="text-base text-muted-foreground">
              Informe seu CPF. Validamos que é real e que ainda não foi usado
              nesta edição da pesquisa.
            </p>
          </div>

          <CpfForm />

          <details className="text-sm text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">
              Por que pedimos CPF?
            </summary>
            <div className="pt-3 flex flex-col gap-2">
              <p>
                Pra impedir que a mesma pessoa vote várias vezes e pra
                garantir que o respondente é eleitor real. O CPF é
                imediatamente embaralhado (hash) e nunca fica armazenado em
                texto.
              </p>
              <p>
                Depois da validação por WhatsApp, você entra numa sessão
                anônima — daí pra frente, não temos como ligar seus votos
                ao seu CPF.
              </p>
            </div>
          </details>
        </div>
      </section>
    </main>
    <RodapeInstitucional />
    </>
  )
}
