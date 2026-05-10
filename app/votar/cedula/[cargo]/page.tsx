import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { CARGO_CONFIG, isCargo, type Cargo } from '@/lib/cargos'
import { hashTokenVoto } from '@/lib/crypto'
import { getVotoToken } from '@/lib/sessao'
import { supabaseAdmin } from '@/lib/supabase/admin'

import { CedulaForm, type Opcao } from './cedula-form'

export const metadata = {
  robots: { index: false, follow: false },
}

type PageProps = {
  params: Promise<{ cargo: string }>
}

export default async function CedulaPage({ params }: PageProps) {
  const { cargo: cargoRaw } = await params
  if (!isCargo(cargoRaw)) notFound()
  const cargo: Cargo = cargoRaw
  const cfg = CARGO_CONFIG[cargo]

  const tokenClaro = await getVotoToken()
  if (!tokenClaro) redirect('/votar')

  const tokenHash = hashTokenVoto(tokenClaro)
  const db = supabaseAdmin()

  // Pega edicao do token + checa se ja completou as vagas deste cargo
  const { data: tokenReg } = await db
    .from('tokens_emitidos')
    .select('edicao_id, usado')
    .eq('token_hash', tokenHash)
    .maybeSingle()
  if (!tokenReg) redirect('/votar')

  const { count: votosJaFeitos } = await db
    .from('votos_pesquisa')
    .select('id', { count: 'exact', head: true })
    .eq('token_hash', tokenHash)
    .eq('cargo', cargo)

  // Se ja completou todas as vagas, pula pro proximo
  if ((votosJaFeitos ?? 0) >= cfg.vagas) {
    if (cfg.proximo) redirect(`/votar/cedula/${cfg.proximo}`)
    redirect('/votar/obrigado')
  }

  // Carrega opcoes (candidatos OU partidos)
  let opcoes: Opcao[] = []
  if (cfg.tipo === 'candidato') {
    const { data } = await db
      .from('candidatos_pesquisa')
      .select(`
        numero,
        nome_urna,
        foto_url,
        partidos!inner ( sigla, cor_hex )
      `)
      .eq('edicao_id', tokenReg.edicao_id)
      .eq('cargo', cargo)
      .eq('ativo', true)
      .order('numero')
    opcoes =
      data?.map((c) => {
        const p = (c.partidos as unknown as { sigla: string; cor_hex: string | null })
        return {
          numero: c.numero as number,
          nome: c.nome_urna as string,
          partidoSigla: p.sigla,
          fotoUrl: (c.foto_url as string | null) ?? null,
          corHex: p.cor_hex ?? null,
        }
      }) ?? []
  } else {
    const { data } = await db
      .from('partidos')
      .select('numero, sigla, nome, cor_hex')
      .eq('ativo', true)
      .order('numero')
    opcoes =
      data?.map((p) => ({
        numero: p.numero as number,
        nome: (p.nome as string) ?? (p.sigla as string),
        partidoSigla: p.sigla as string,
        fotoUrl: null,
        corHex: (p.cor_hex as string | null) ?? null,
      })) ?? []
  }

  const vagaInicial = (votosJaFeitos ?? 0) + 1

  return (
    <main className="flex flex-col flex-1 bg-capsule text-capsule-foreground">
      <header className="border-b border-capsule-foreground/15">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-capsule-foreground/70">
            Cápsula anônima
          </p>
          <p className="text-xs text-capsule-foreground/70">
            Cédula {cfg.ordem} de 5
          </p>
        </div>
      </header>

      <section className="flex-1 flex flex-col px-6 py-10">
        <div className="max-w-2xl mx-auto w-full flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold">{cfg.label}</h1>
            <p className="text-sm text-capsule-foreground/80">
              {cfg.tipo === 'candidato'
                ? `Digite o número do candidato (${cfg.digitos} dígitos). A foto e o nome aparecem pra você confirmar antes de registrar.`
                : `Digite os ${cfg.digitos} dígitos como na urna eletrônica — os 2 primeiros identificam o partido, os ${cfg.digitos - 2} últimos identificam o candidato na urna real. Nesta pesquisa, o voto vale como legenda (o partido conta).`}
            </p>
          </div>

          <CedulaForm
            cargo={cargo}
            cfg={cfg}
            opcoes={opcoes}
            vagaInicial={vagaInicial}
          />

          <p className="text-xs text-capsule-foreground/50 text-center pt-4">
            <Link
              href="/votar/anonimo"
              className="underline hover:text-capsule-foreground/80"
            >
              Voltar pra cápsula
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
