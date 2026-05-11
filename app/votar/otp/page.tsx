import Link from 'next/link'
import { redirect } from 'next/navigation'

import { RodapeInstitucional } from '@/components/rodape-institucional'
import { getPreVoto, getVotoToken } from '@/lib/sessao'

import { OtpForm } from './otp-form'

export const metadata = {
  title: 'Confirmar código · Pesquisa Sergipe 2026',
}

export default async function OtpPage() {
  // Quem ja entrou na capsula nao volta pra etapa 3.
  const votoToken = await getVotoToken()
  if (votoToken) redirect('/votar/anonimo')

  const draft = await getPreVoto()
  if (!draft) redirect('/votar')
  if (!draft.whatsappE164) redirect('/votar/confirma')

  const ultimos = draft.whatsappE164.slice(-4)
  const mascarado = `+55 ** ****-${ultimos}`

  return (
    <>
    <main className="flex flex-col flex-1 bg-background">
      <header className="border-b border-border">
        <div className="max-w-xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/votar/confirma"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Voltar
          </Link>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Etapa 3 de 4
          </p>
        </div>
      </header>

      <section className="flex-1 flex flex-col px-6 py-12">
        <div className="max-w-xl mx-auto w-full flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold text-foreground">
              Confirme o código
            </h1>
            <p className="text-base text-muted-foreground">
              Mandamos um código de 6 dígitos para{' '}
              <span className="font-mono font-medium text-foreground">
                {mascarado}
              </span>
              . Digite abaixo pra confirmar que o WhatsApp é seu. O código
              expira em 10 minutos.
            </p>
          </div>

          {/* Caixa técnica visível (não hidden em details) — o eleitor lê
              ANTES de confirmar, porque depois é tarde: a ponte some. */}
          <aside className="rounded-md border border-capsule/20 bg-capsule/5 p-5 flex flex-col gap-3">
            <p className="text-sm font-semibold text-capsule">
              O que vai acontecer quando você clicar em &ldquo;Confirmar&rdquo;
            </p>
            <p className="text-sm text-foreground leading-relaxed">
              O servidor vai gerar um token aleatório, gravar só o hash dele
              (sem nenhuma ligação com seu CPF) e te entregar o token
              original num cookie no seu navegador. As cédulas a seguir vão
              usar esse cookie pra autorizar cada voto. Quando você terminar,
              o cookie expira e o token vira pó.
            </p>
            <p className="text-sm text-muted-foreground">
              Antes de confirmar, dá pra voltar e revisar os dados. Depois de
              confirmar, não tem como desfazer — porque a ligação CPF↔voto
              não existe mais nem na memória do servidor.
            </p>
          </aside>

          <OtpForm />
        </div>
      </section>
    </main>
    <RodapeInstitucional />
    </>
  )
}
