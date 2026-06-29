import Link from 'next/link'
import { notFound } from 'next/navigation'

import { DEV_MODE } from '@/lib/env'

import { resetarTudo } from './actions'

export const metadata = {
  title: 'Reset (dev) · Pesquisa Eleitoral Sergipe 2026',
  robots: { index: false, follow: false },
}

/**
 * Pagina-utilitario pra apagar todos os dados de teste e voltar pro
 * estado inicial. So funciona com DEV_MODE=true. Em producao retorna 404.
 */
export default async function ResetPage() {
  if (!DEV_MODE) notFound()

  return (
    <main className="flex flex-col flex-1 bg-background items-center justify-center px-6 py-16">
      <div className="max-w-md w-full flex flex-col gap-6 text-center">
        <p className="text-xs uppercase tracking-widest text-error">
          Modo de desenvolvimento
        </p>

        <h1 className="text-3xl font-semibold text-foreground">
          Resetar dados de teste
        </h1>

        <p className="text-base text-muted-foreground">
          Apaga{' '}
          <strong className="text-foreground">eleitores_pesquisa</strong>,{' '}
          <strong className="text-foreground">tokens_emitidos</strong>,{' '}
          <strong className="text-foreground">whatsapp_codigos</strong>,{' '}
          <strong className="text-foreground">votos_pesquisa</strong> e{' '}
          <strong className="text-foreground">rate_limit_ip</strong>. Mantém
          edição, municípios, partidos, candidatos e cdl_base. Também limpa
          os cookies da sua sessão.
        </p>

        <p className="text-sm text-error bg-error/5 border border-error/20 rounded-md px-3 py-2">
          Não roda em produção. Esta página retorna 404 quando{' '}
          <code className="font-mono">DEV_MODE</code> não está ligado.
        </p>

        <form action={resetarTudo}>
          <button
            type="submit"
            className="w-full h-14 px-6 rounded-md bg-error text-white font-medium hover:opacity-90 transition"
          >
            Apagar tudo e voltar pro início
          </button>
        </form>

        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Cancelar e voltar
        </Link>
      </div>
    </main>
  )
}
