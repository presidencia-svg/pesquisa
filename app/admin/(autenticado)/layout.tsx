import Link from 'next/link'

import { MarcaCdl } from '@/components/marca-cdl'
import { TreinamentoLgpd } from '@/components/treinamento-lgpd'
import { requireAdmin } from '@/lib/admin-auth'

import { SairButton } from './sair-button'

const NAV = [
  { href: '/admin', label: 'Visão geral' },
  { href: '/admin/resultados', label: 'Resultados' },
  { href: '/admin/projecao', label: 'Projeção' },
  { href: '/admin/edicoes', label: 'Edições' },
  { href: '/admin/candidatos', label: 'Candidatos' },
  { href: '/admin/notificar-resultado', label: 'Notificar resultados' },
  { href: '/admin/patrocinios', label: 'Patrocínios' },
  { href: '/admin/diagnostico-spc', label: 'Diagnóstico SPC' },
  { href: '/admin/auditoria', label: 'Auditoria' },
] as const

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdmin()

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-background">
      <header className="border-b border-border bg-background sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-6">
            <MarcaCdl tamanho="sm" />
            <span className="hidden sm:inline-block text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Painel administrativo
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/resultados"
              target="_blank"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Resultados públicos ↗
            </Link>
            <Link
              href="/"
              className="text-xs text-muted-foreground hover:text-foreground hidden sm:inline-block"
            >
              Site público ↗
            </Link>
            <SairButton />
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-6xl mx-auto w-full flex flex-col sm:flex-row gap-6 sm:gap-8 px-4 sm:px-6 py-6 sm:py-8">
        <nav className="sm:w-48 flex-none -mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto sm:overflow-visible">
          <ul className="flex sm:flex-col gap-1 min-w-max sm:min-w-0">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block px-3 py-2 rounded-md text-sm text-foreground hover:bg-muted transition whitespace-nowrap"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <main className="flex-1 min-w-0">{children}</main>
      </div>

      <TreinamentoLgpd />
    </div>
  )
}
