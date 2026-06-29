import Link from 'next/link'

import { RodapeInstitucional } from '@/components/rodape-institucional'

export const metadata = {
  title: 'Exposição dos patrocinadores · Pesquisa Eleitoral Sergipe 2026',
  description:
    'Veja onde a logomarca do seu patrocínio aparece em cada tela do fluxo da pesquisa, no telejornal e na página pública de resultados.',
}

// Cores das cotas (consistentes com /patrocinio e /admin/patrocinios)
const COR = {
  diamante: '#0891b2',
  ouro: '#ca8a04',
  prata: '#64748b',
} as const

export default function ExposicaoPage() {
  return (
    <>
      <main className="flex flex-col flex-1 bg-background">
        {/* Hero */}
        <section className="border-b border-border bg-muted/30">
          <div className="max-w-4xl mx-auto px-5 py-10 sm:py-14 flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
              Exposição dos patrocinadores
            </p>
            <h1 className="text-3xl sm:text-4xl font-semibold leading-tight">
              Onde sua marca vai aparecer
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
              Cada cota de patrocínio garante posições específicas em cada
              tela do fluxo da pesquisa, no telejornal da TV Atalaia e na
              página pública de resultados. As wireframes abaixo mostram a
              localização exata de cada slot.
            </p>
          </div>
        </section>

        {/* Legenda */}
        <section className="max-w-5xl mx-auto px-5 py-8 w-full">
          <div className="flex flex-wrap gap-3 items-center justify-center text-sm">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              Legenda:
            </span>
            <LegendaItem cor={COR.diamante} label="Diamante R$ 100k" />
            <LegendaItem cor={COR.ouro} label="Ouro R$ 60k" />
            <LegendaItem cor={COR.prata} label="Prata R$ 30k" />
          </div>
        </section>

        {/* Mockups */}
        <section className="max-w-6xl mx-auto px-5 pb-12 w-full grid grid-cols-1 md:grid-cols-2 gap-6">
          <MockupHome />
          <MockupVotar />
          <MockupCedula />
          <MockupObrigado />
          <MockupResultados />
          <MockupTelejornal />
        </section>

        {/* CTA */}
        <section className="border-t border-border bg-muted/30">
          <div className="max-w-3xl mx-auto px-5 py-12 flex flex-col gap-4 items-center text-center">
            <h2 className="text-2xl font-semibold">
              Pronto para reservar sua cota?
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
              Volte para a página de patrocínio e preencha o formulário. Nossa
              equipe entra em contato em até 2 dias úteis com o contrato.
            </p>
            <Link
              href="/patrocinio#interesse"
              className="inline-flex items-center justify-center h-12 px-6 rounded-md bg-primary text-primary-foreground font-semibold hover:opacity-90 transition"
            >
              Ver cotas e formalizar interesse →
            </Link>
          </div>
        </section>
      </main>
      <RodapeInstitucional />
    </>
  )
}

/* ====== Componentes auxiliares ====== */

function LegendaItem({ cor, label }: { cor: string; label: string }) {
  return (
    <span className="flex items-center gap-2 text-sm">
      <span
        className="inline-block w-5 h-5 rounded border-2"
        style={{ borderColor: cor, background: `${cor}22` }}
      />
      <span style={{ color: cor, fontWeight: 600 }}>{label}</span>
    </span>
  )
}

function CardMockup({
  titulo,
  rota,
  children,
}: {
  titulo: string
  rota?: string
  children: React.ReactNode
}) {
  return (
    <article className="rounded-lg border border-border bg-background overflow-hidden flex flex-col">
      <header className="px-4 py-3 border-b border-border bg-muted/30 flex items-baseline justify-between gap-3">
        <h3 className="text-base font-semibold">{titulo}</h3>
        {rota && (
          <code className="text-[10px] font-mono text-muted-foreground">
            {rota}
          </code>
        )}
      </header>
      <div className="p-4 flex-1">{children}</div>
    </article>
  )
}

function Slot({
  cor,
  label,
  className = '',
  height = 'h-12',
}: {
  cor: string
  label: string
  className?: string
  height?: string
}) {
  return (
    <div
      className={`rounded border-2 border-dashed flex items-center justify-center ${height} ${className}`}
      style={{
        borderColor: cor,
        background: `${cor}11`,
      }}
    >
      <span
        className="text-[10px] font-bold uppercase tracking-widest"
        style={{ color: cor }}
      >
        {label}
      </span>
    </div>
  )
}

function BlocoFalso({
  altura = 'h-3',
  className = '',
}: {
  altura?: string
  className?: string
}) {
  return (
    <div className={`bg-muted rounded ${altura} ${className}`} aria-hidden />
  )
}

/* ====== Mockups das telas ====== */

function MockupHome() {
  return (
    <CardMockup titulo="Home — primeira tela" rota="/">
      <div className="rounded-md border border-border bg-background p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-bold">CDL ARACAJU</div>
          <Slot
            cor={COR.diamante}
            label="Logo Diamante"
            height="h-7"
            className="w-24"
          />
        </div>
        <BlocoFalso altura="h-2" className="w-1/2" />
        <BlocoFalso altura="h-6" className="w-3/4" />
        <BlocoFalso altura="h-2" />
        <BlocoFalso altura="h-2" className="w-4/5" />
        <div className="grid grid-cols-3 gap-1 pt-1">
          <BlocoFalso altura="h-12" />
          <BlocoFalso altura="h-12" />
          <BlocoFalso altura="h-12" />
        </div>
        <div className="pt-2 mt-1 border-t border-border">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">
            Apoio institucional
          </p>
          <div className="grid grid-cols-3 gap-1">
            <Slot cor={COR.ouro} label="Ouro #1" height="h-8" />
            <Slot cor={COR.ouro} label="Ouro #2" height="h-8" />
            <Slot cor={COR.ouro} label="Ouro #3" height="h-8" />
          </div>
        </div>
        <div className="pt-1">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">
            Apoiadores
          </p>
          <div className="grid grid-cols-4 gap-1">
            <Slot cor={COR.prata} label="P" height="h-6" />
            <Slot cor={COR.prata} label="P" height="h-6" />
            <Slot cor={COR.prata} label="P" height="h-6" />
            <Slot cor={COR.prata} label="P" height="h-6" />
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed pt-3">
        <strong>Diamante</strong> ocupa o topo ao lado da marca CDL.{' '}
        <strong>Ouro</strong> em grid de apoio institucional.{' '}
        <strong>Prata</strong> em grid de apoiadores no rodapé.
      </p>
    </CardMockup>
  )
}

function MockupVotar() {
  return (
    <CardMockup titulo="Cadastro do eleitor — CPF" rota="/votar">
      <div className="rounded-md border border-border bg-background p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-bold">Pesquisa Eleitoral Sergipe 2026</div>
          <Slot
            cor={COR.diamante}
            label="Diamante"
            height="h-6"
            className="w-20"
          />
        </div>
        <BlocoFalso altura="h-2" className="w-2/3" />
        <BlocoFalso altura="h-10" className="mt-1" />
        <BlocoFalso altura="h-2" />
        <BlocoFalso altura="h-8 mt-2" />
        <div className="pt-2 mt-1 border-t border-border">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">
            Apoio
          </p>
          <div className="grid grid-cols-3 gap-1">
            <Slot cor={COR.ouro} label="Ouro" height="h-6" />
            <Slot cor={COR.ouro} label="Ouro" height="h-6" />
            <Slot cor={COR.ouro} label="Ouro" height="h-6" />
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed pt-3">
        Tela inicial do voto. <strong>Diamante</strong> no header, ao lado do
        nome da pesquisa. <strong>Ouro</strong> no rodapé como apoio. Marca do
        patrocinador exposta para <strong>cada eleitor que entrar</strong>.
      </p>
    </CardMockup>
  )
}

function MockupCedula() {
  return (
    <CardMockup titulo="Cédula de votação" rota="/votar/cedula/[cargo]">
      <div className="rounded-md border-2 border-cyan-900 bg-cyan-950 text-white p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-bold text-cyan-300">CÁPSULA ANÔNIMA</div>
          <Slot
            cor={COR.diamante}
            label="Diamante"
            height="h-6"
            className="w-20 !bg-cyan-800/60"
          />
        </div>
        <div className="bg-cyan-900 rounded px-3 py-2">
          <p className="text-[10px] uppercase tracking-widest text-cyan-300 mb-1">
            Presidente
          </p>
          <div className="flex gap-2 items-center">
            <div className="bg-white text-cyan-950 font-mono text-lg font-bold w-10 h-10 rounded flex items-center justify-center">
              ??
            </div>
            <BlocoFalso altura="h-3" className="flex-1 !bg-cyan-800" />
          </div>
        </div>
        <BlocoFalso altura="h-8" className="!bg-cyan-700 mt-1" />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed pt-3">
        Cédula anônima do voto. <strong>Apenas Diamante</strong> aparece aqui —
        e em formato sutil, pra não interferir na experiência da escolha. Por
        ser exclusivo, é o único patrocinador presente neste momento crítico.
      </p>
    </CardMockup>
  )
}

function MockupObrigado() {
  return (
    <CardMockup titulo="Tela de agradecimento" rota="/votar/obrigado">
      <div className="rounded-md border border-border bg-background p-3 flex flex-col gap-2 text-center">
        <div className="text-2xl">✓</div>
        <div className="text-sm font-semibold">Voto registrado</div>
        <BlocoFalso altura="h-2" className="mx-auto w-3/4" />
        <BlocoFalso altura="h-2" className="mx-auto w-1/2" />
        <div className="pt-3 mt-2 border-t border-border">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            Esta pesquisa é apresentada por
          </p>
          <Slot cor={COR.diamante} label="Patrocinador Master" height="h-12" />
        </div>
        <div className="pt-2">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">
            Com apoio institucional de
          </p>
          <div className="grid grid-cols-3 gap-1">
            <Slot cor={COR.ouro} label="Ouro" height="h-7" />
            <Slot cor={COR.ouro} label="Ouro" height="h-7" />
            <Slot cor={COR.ouro} label="Ouro" height="h-7" />
          </div>
        </div>
        <div className="pt-1">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">
            Apoiadores
          </p>
          <div className="grid grid-cols-5 gap-0.5">
            <Slot cor={COR.prata} label="P" height="h-5" />
            <Slot cor={COR.prata} label="P" height="h-5" />
            <Slot cor={COR.prata} label="P" height="h-5" />
            <Slot cor={COR.prata} label="P" height="h-5" />
            <Slot cor={COR.prata} label="P" height="h-5" />
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed pt-3">
        Tela final, momento de maior atenção do eleitor. <strong>Diamante</strong>{' '}
        em destaque máximo ("Apresentada por"). <strong>Ouro</strong> e{' '}
        <strong>Prata</strong> em grids de apoio.
      </p>
    </CardMockup>
  )
}

function MockupResultados() {
  return (
    <CardMockup titulo="Página de resultados públicos" rota="/resultados">
      <div className="rounded-md border border-border bg-background p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-bold">PESQUISA SERGIPE 2026</div>
          <Slot
            cor={COR.diamante}
            label="Diamante"
            height="h-7"
            className="w-24"
          />
        </div>
        <BlocoFalso altura="h-6" className="w-3/4" />
        <BlocoFalso altura="h-3" className="w-1/2" />
        <div className="grid grid-cols-2 gap-1 pt-1">
          <BlocoFalso altura="h-16" />
          <BlocoFalso altura="h-16" />
        </div>
        <div className="pt-2 mt-1 border-t border-border">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">
            Apoio institucional
          </p>
          <div className="grid grid-cols-3 gap-1">
            <Slot cor={COR.ouro} label="Ouro" height="h-8" />
            <Slot cor={COR.ouro} label="Ouro" height="h-8" />
            <Slot cor={COR.ouro} label="Ouro" height="h-8" />
          </div>
        </div>
        <div className="pt-1">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">
            Apoiadores
          </p>
          <div className="grid grid-cols-4 gap-0.5">
            <Slot cor={COR.prata} label="P" height="h-5" />
            <Slot cor={COR.prata} label="P" height="h-5" />
            <Slot cor={COR.prata} label="P" height="h-5" />
            <Slot cor={COR.prata} label="P" height="h-5" />
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed pt-3">
        Página pública pós-divulgação. <strong>Tráfego esperado: 50k-100k
        visitas</strong> nos primeiros 7 dias após o anúncio na TV Atalaia.
        Diamante no topo, Ouro em apoio, Prata como apoiadores.
      </p>
    </CardMockup>
  )
}

function MockupTelejornal() {
  return (
    <CardMockup titulo="Telejornal TV Atalaia (ao vivo)" rota="3 de setembro de 2026">
      <div className="rounded-md border-2 border-zinc-700 bg-zinc-900 text-white aspect-video flex flex-col">
        <div className="flex-1 p-3 flex flex-col gap-2 justify-center">
          <p className="text-[10px] uppercase tracking-widest text-zinc-400">
            Pesquisa exclusiva
          </p>
          <p className="text-base font-bold">PESQUISA SERGIPE 2026</p>
          <p className="text-xs text-zinc-300">200.000+ entrevistados</p>
        </div>
        <div className="border-t border-zinc-700 px-3 py-2 flex items-center justify-between gap-2 bg-zinc-800">
          <p className="text-[9px] uppercase tracking-widest text-zinc-400">
            Pesquisa apresentada por
          </p>
          <Slot
            cor={COR.diamante}
            label="Diamante"
            height="h-6"
            className="w-20 !bg-zinc-700/40"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed pt-3">
        <strong>Diamante:</strong> painel dedicado nos créditos de abertura
        (&quot;Pesquisa apresentada por...&quot;). <strong>Ouro:</strong>{' '}
        menção textual durante a reportagem (&quot;com apoio institucional
        de X, Y e Z&quot;).
      </p>
    </CardMockup>
  )
}
