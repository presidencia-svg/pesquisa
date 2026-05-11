import Link from 'next/link'
import { redirect } from 'next/navigation'

import { MarcaCdl } from '@/components/marca-cdl'
import { isAdmin } from '@/lib/admin-auth'
import { SERVER_ENV } from '@/lib/env'

import { LoginForm } from './login-form'

export const metadata = {
  title: 'Admin · Pesquisa Sergipe 2026',
  robots: { index: false, follow: false },
}

export default async function LoginPage() {
  if (await isAdmin()) redirect('/admin')

  const totpAtivo = Boolean(SERVER_ENV.ADMIN_TOTP_SECRET)

  return (
    <main className="flex flex-col flex-1 bg-background items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm flex flex-col gap-8">
        <div className="flex flex-col gap-3 items-start">
          <MarcaCdl tamanho="md" />
          <p className="pt-3 text-xs uppercase tracking-[0.25em] text-muted-foreground border-t border-border w-full">
            Painel administrativo
          </p>
          <h1 className="text-3xl font-semibold leading-tight">Entrar</h1>
        </div>

        <LoginForm totpAtivo={totpAtivo} />

        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground self-start"
        >
          ← Voltar ao site público
        </Link>
      </div>
    </main>
  )
}
