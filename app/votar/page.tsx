import { headers } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { EntradaVotacao } from '@/components/entrada-votacao'
import { RodapeInstitucional } from '@/components/rodape-institucional'
import { hashTokenVoto } from '@/lib/crypto'
import { resolverEdicaoAlvo } from '@/lib/edicao-alvo'
import { PUBLIC_ENV } from '@/lib/env'
import { getPreVoto, getVotoToken } from '@/lib/sessao'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const metadata = {
  title: 'Identifique-se · Pesquisa Eleitoral Sergipe 2026',
}

// Sempre dinâmica — a janela de votação depende do relógio.
export const dynamic = 'force-dynamic'

export default async function VotarPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}) {
  // Janela da edição alvo (ativa, ou a de TESTE via cookie) — controla
  // cronômetro e gate.
  const edicao = await resolverEdicaoAlvo()

  // Se ja entrou na capsula, vai pra capsula — MAS só se a cápsula for
  // DESTA edição. Token de teste/demo antigo → limpa e recomeça, senão
  // o voto cairia na edição errada.
  const token = await getVotoToken()
  if (token) {
    let mesmaEdicao = false
    if (edicao) {
      const db = supabaseAdmin()
      const { data: tok } = await db
        .from('tokens_emitidos')
        .select('edicao_id')
        .eq('token_hash', hashTokenVoto(token))
        .maybeSingle()
      mesmaEdicao = tok?.edicao_id === edicao.id
    }
    if (mesmaEdicao) redirect('/votar/anonimo')
    redirect('/votar/reiniciar')
  }

  // Rascunho de cadastro: retoma só se for DESTA edição; resquício de
  // outra edição → limpa e recomeça.
  const draft = await getPreVoto()
  if (draft) {
    if (edicao && draft.edicaoId === edicao.id) redirect('/votar/confirma')
    redirect('/votar/reiniciar')
  }

  // Localização por IP (headers da Vercel): se o IP já resolve pra
  // Sergipe, o eleitor entra direto — o GPS fica de plano B.
  // ?forcar_gps=1 força a tela do GPS (só a tela, pra testar o plano B;
  // a validação do servidor não muda).
  const sp = await searchParams
  const forcarGps = sp?.forcar_gps === '1'
  const h = await headers()
  // Gate de GPS só pra IP de FORA DO BRASIL (o servidor exige GPS-SE
  // nesses casos). IP nacional entra direto: a pesquisa é do eleitorado
  // de Sergipe inteiro e o 4G rotea IP pra outros estados o tempo todo.
  const ipSergipe =
    !forcarGps && h.get('x-vercel-ip-country') === 'BR'

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
