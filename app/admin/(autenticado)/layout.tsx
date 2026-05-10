import Link from 'next/link'

import { MarcaCdl } from '@/components/marca-cdl'
import { requireAdmin } from '@/lib/admin-auth'

import { SairButton } from './sair-button'

const NAV = [
  { href: '/admin', label: 'Visão geral' },
  { href: '/admin/edicoes', label: 'Edições' },
  { href: '/admin/candidatos', label: 'Candidatos' },
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
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <MarcaCdl tamanho="sm" />
            <span className="hidden sm:inline-block text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Painel administrativo
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Site público ↗
            </Link>
            <SairButton />
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-6xl mx-auto w-full flex flex-col sm:flex-row gap-8 px-6 py-8">
        <nav className="sm:w-48 flex-none">
          <ul className="flex sm:flex-col gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block px-3 py-2 rounded-md text-sm text-foreground hover:bg-muted transition"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
