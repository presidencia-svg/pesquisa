import { headers } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { EntradaVotacao } from '@/components/entrada-votacao'
import { RodapeInstitucional } from '@/components/rodape-institucional'
import { resolverEdicaoAlvo } from '@/lib/edicao-alvo'
import { PUBLIC_ENV } from '@/lib/env'
import { ipEmSergipe } from '@/lib/geo-sergipe'
import { getPreVoto, getVotoToken } from '@/lib/sessao'

export const metadata = {
  title: 'Identifique-se · Pesquisa Eleitoral Sergipe 2026',
}

// Sempre dinâmica — a janela de votação depende do relógio.
export const dynamic = 'force-dynamic'

export default async function VotarPage() {
  // Se ja entrou na capsula, vai pra capsula.
  const token = await getVotoToken()
  if (token) redirect('/votar/anonimo')

  // Se ja existe rascunho de cadastro, pula direto pro proximo passo.
  const draft = await getPreVoto()
  if (draft) redirect('/votar/confirma')

  // Janela da edição alvo (ativa, ou a de TESTE via cookie) — controla
  // cronômetro e gate.
  const edicao = await resolverEdicaoAlvo()

  // Localização por IP (headers da Vercel): se o IP já resolve pra
  // Sergipe, o eleitor entra direto — o GPS fica de plano B.
  const h = await headers()
  const ipSergipe = ipEmSergipe(
    h.get('x-vercel-ip-country'),
    h.get('x-vercel-ip-country-region'),
  )

  return (
    <>
      <main className="flex flex-col flex-1 bg-background">
        <header className="border-b border-border">
          <div className="max-w-xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <Link
              href="/"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              ← Início
            </Link>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Pesquisa Eleitoral Sergipe 2026
            </p>
          </div>
        </header>

        <section className="flex-1 flex flex-col px-4 sm:px-6 py-8 sm:py-16">
          <div className="max-w-xl mx-auto w-full flex flex-col gap-6 sm:gap-8">
            {edicao ? (
              <EntradaVotacao
                inicioISO={edicao.inicio as string}
                fimISO={edicao.fim as string}
                turnstileSiteKey={PUBLIC_ENV.TURNSTILE_SITE_KEY}
                ipDentroSergipe={ipSergipe}
              />
            ) : (
              <div className="text-center py-10">
                <h2 className="text-2xl font-semibold text-foreground">
                  Nenhuma pesquisa ativa
                </h2>
                <p className="text-base text-muted-foreground mt-2">
                  A votação abrirá em breve. Acompanhe em
                  pesquisa.cdlaju.com.br.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
      <RodapeInstitucional />
    </>
  )
}
