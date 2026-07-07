/**
 * Demonstração pra patrocinadores: onde a marca aparece na JORNADA do
 * votante — entrada → cabine (cada cédula) → encerramento — e no
 * compartilhamento. Reusa a mesma FaixaPatrocinadores das telas reais,
 * então o mockup é fiel ao que o eleitor vê.
 */
import Link from 'next/link'

import { FaixaPatrocinadores } from '@/components/faixa-patrocinadores'
import { RodapeInstitucional } from '@/components/rodape-institucional'
import { carregarPatrocinadores } from '@/lib/patrocinadores'

export const metadata = {
  title: 'Exposição da marca na jornada do votante · Pesquisa Sergipe 2026',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

function LinhaSkeleton({ w = 'w-full' }: { w?: string }) {
  return <div className={`h-2.5 rounded ${w} bg-current opacity-15`} />
}

/** Moldura de "tela" pra representar cada etapa. */
function Tela({
  etapa,
  titulo,
  escuro,
  children,
  rodape,
}: {
  etapa: string
  titulo: string
  escuro?: boolean
  children: React.ReactNode
  rodape: React.ReactNode
}) {
  return (
    <div
      className={`rounded-2xl border overflow-hidden flex flex-col shadow-lg ${
        escuro
          ? 'bg-capsule text-capsule-foreground border-capsule-foreground/15'
          : 'bg-background text-foreground border-border'
      }`}
    >
      <div
        className={`px-4 py-2.5 text-[10px] uppercase tracking-widest border-b ${
          escuro ? 'border-capsule-foreground/15 text-capsule-foreground/60' : 'border-border text-muted-foreground'
        }`}
      >
        {etapa}
      </div>
      <div className="px-5 py-6 flex flex-col gap-4 flex-1">
        <h3 className="text-lg font-semibold">{titulo}</h3>
        <div className="flex flex-col gap-2.5">{children}</div>
        <div className="mt-auto pt-2">{rodape}</div>
      </div>
    </div>
  )
}

export default async function JornadaPage() {
  const patrocinadores = await carregarPatrocinadores()

  return (
    <>
      <main className="flex flex-col flex-1 bg-muted">
        <section className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-16 flex flex-col gap-10">
          <header className="flex flex-col gap-3 max-w-2xl">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Exposição de marca · Patrocínio
            </p>
            <h1 className="text-3xl sm:text-4xl font-semibold text-foreground">
              Sua marca em cada etapa da jornada do votante
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              Da identificação ao encerramento, o eleitor passa por{' '}
              <strong className="text-foreground">5 a 6 telas</strong> — e a sua
              marca aparece em todas. No final, um convite de compartilhamento
              leva a pesquisa (e a sua marca) adiante, de forma orgânica.
            </p>
          </header>

          {patrocinadores.length === 0 && (
            <p className="rounded-md border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
              Ainda não há patrocinadores firmados — assim que forem cadastrados,
              os logos aparecem aqui e nas telas reais automaticamente.
            </p>
          )}

          <div className="grid gap-6 md:grid-cols-3">
            <Tela
              etapa="Etapa 1 · Entrada"
              titulo="Identifique-se"
              rodape={
                <FaixaPatrocinadores patrocinadores={patrocinadores} tema="claro" detalhado />
              }
            >
              <LinhaSkeleton />
              <LinhaSkeleton w="w-4/5" />
              <div className="h-10 rounded-md border border-border" />
              <div className="h-10 rounded-md bg-primary/90" />
            </Tela>

            <Tela
              etapa="Etapa 2 · Cabine (cada cédula)"
              titulo="Deputado Estadual"
              escuro
              rodape={
                <FaixaPatrocinadores patrocinadores={patrocinadores} tema="escuro" detalhado />
              }
            >
              <LinhaSkeleton w="w-3/4" />
              <div className="grid grid-cols-3 gap-2 py-1">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="h-9 rounded-md bg-current opacity-10" />
                ))}
              </div>
              <div className="h-10 rounded-md bg-current opacity-20" />
            </Tela>

            <Tela
              etapa="Etapa final · Encerramento"
              titulo="Obrigado pela participação"
              escuro
              rodape={
                <FaixaPatrocinadores patrocinadores={patrocinadores} tema="escuro" detalhado />
              }
            >
              <div className="rounded-xl bg-white text-capsule px-4 py-4 flex flex-col items-center gap-2 text-center">
                <span className="text-2xl">📣</span>
                <p className="font-bold text-base">Chame seus amigos!</p>
                <p className="text-xs text-capsule/60">
                  Quanto mais gente responde, mais a pesquisa reflete Sergipe.
                </p>
                <div className="w-full flex gap-2 pt-1">
                  <div className="flex-1 h-8 rounded-lg bg-[#25D366]" />
                  <div className="flex-1 h-8 rounded-lg border-2 border-capsule/20" />
                </div>
              </div>
            </Tela>
          </div>

          <div className="rounded-2xl border border-border bg-background px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-lg font-semibold text-foreground">
                Quer a sua marca nessa jornada?
              </p>
              <p className="text-sm text-muted-foreground">
                Oferecimento · Patrocínio · Apoio — escolha a cota e apareça pra
                cada eleitor que participa.
              </p>
            </div>
            <Link
              href="/patrocinio"
              className="inline-flex items-center justify-center h-12 px-8 rounded-md bg-primary text-primary-foreground font-semibold hover:brightness-95 transition whitespace-nowrap"
            >
              Ver cotas de patrocínio →
            </Link>
          </div>
        </section>
      </main>
      <RodapeInstitucional />
    </>
  )
}
