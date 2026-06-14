import Link from 'next/link'

import { RodapeInstitucional } from '@/components/rodape-institucional'

import { PatrocinioForm } from './form'

export const metadata = {
  title: 'Patrocínio institucional · Pesquisa Sergipe 2026',
  description:
    'Apoie a Pesquisa Sergipe 2026 da CDL Aracaju com patrocínio institucional. 2 cotas disponíveis (Ouro R$ 15.000 / Prata R$ 10.000). Sem ingerência editorial.',
}

const COTAS = [
  {
    nivel: 'ouro',
    titulo: 'Cota Ouro',
    valor: 15_000,
    cor: 'rgb(202, 138, 4)', // amarelo institucional
    beneficios: [
      'Logo em destaque na página pública /resultados durante e após divulgação',
      'Menção institucional no telejornal da TV Atalaia (3 de setembro de 2026) como "apoio institucional"',
      'Relatório premium com cortes demográficos × voto (gênero, idade, escolaridade, renda, município)',
      'Acesso ao snapshot embargado 24h antes da divulgação pública (sob NDA)',
      'Direito de uso da marca "Patrocinador Pesquisa Sergipe 2026 – CDL Aracaju" em comunicação institucional',
      'Reunião de apresentação dos resultados com o Presidente da CDL e o estatístico responsável',
    ],
  },
  {
    nivel: 'prata',
    titulo: 'Cota Prata',
    valor: 10_000,
    cor: 'rgb(100, 116, 139)', // slate
    beneficios: [
      'Logo presente na página pública /resultados durante e após divulgação',
      'Relatório premium com cortes demográficos × voto (gênero, idade, escolaridade, renda, município)',
      'Direito de uso da marca "Apoiador Pesquisa Sergipe 2026 – CDL Aracaju" em comunicação institucional',
      'Reunião de apresentação dos resultados',
    ],
  },
] as const

export default function PatrocinioPage() {
  return (
    <>
      <main className="flex flex-col flex-1 bg-background">
        {/* Hero */}
        <section className="border-b border-border bg-muted/30">
          <div className="max-w-3xl mx-auto px-5 py-12 sm:py-16 flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
              Patrocínio institucional
            </p>
            <h1 className="text-3xl sm:text-4xl font-semibold leading-tight">
              Apoie a Pesquisa Sergipe 2026
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
              Sua empresa associa a marca a uma pesquisa eleitoral{' '}
              <strong>independente, transparente e registrada</strong> no
              PesqEle/TRE-SE — com divulgação ao vivo no telejornal da TV
              Atalaia em 3 de setembro de 2026 e cobertura estadual.
            </p>
          </div>
        </section>

        {/* Cotas */}
        <section className="max-w-5xl mx-auto px-5 py-10 sm:py-14 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {COTAS.map((cota) => (
              <article
                key={cota.nivel}
                className="rounded-lg border-2 p-6 sm:p-8 flex flex-col gap-5 bg-background"
                style={{ borderColor: cota.cor }}
              >
                <header className="flex flex-col gap-2">
                  <h2
                    className="text-2xl font-bold"
                    style={{ color: cota.cor }}
                  >
                    {cota.titulo}
                  </h2>
                  <p className="text-4xl font-semibold">
                    R$ {cota.valor.toLocaleString('pt-BR')}
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      por edição
                    </span>
                  </p>
                </header>
                <ul className="flex flex-col gap-2 text-sm leading-relaxed">
                  {cota.beneficios.map((b) => (
                    <li key={b} className="flex gap-2">
                      <span style={{ color: cota.cor }}>✓</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={`#interesse?cota=${cota.nivel}`}
                  className="mt-auto inline-flex items-center justify-center h-11 px-5 rounded-md text-sm font-semibold text-white transition hover:opacity-90"
                  style={{ background: cota.cor }}
                >
                  Quero patrocinar — {cota.titulo}
                </a>
              </article>
            ))}
          </div>
        </section>

        {/* Cláusula de independência */}
        <section className="border-y border-border bg-muted/30">
          <div className="max-w-3xl mx-auto px-5 py-10 flex flex-col gap-4">
            <h2 className="text-xl font-semibold">
              Independência editorial garantida
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              O patrocínio institucional é estritamente <strong>não eleitoral</strong>
              {' '}e não confere ao patrocinador qualquer poder de ingerência sobre:
            </p>
            <ul className="list-disc pl-6 text-sm leading-relaxed text-muted-foreground flex flex-col gap-1">
              <li>Metodologia, plano amostral ou questionário da pesquisa;</li>
              <li>Contratação dos colaboradores (entrevistadores, estatístico, equipe de TI, DPO);</li>
              <li>Resultados divulgados ou narrativa da apresentação no telejornal;</li>
              <li>Edição editorial da reportagem da TV Atalaia.</li>
            </ul>
            <p className="text-sm leading-relaxed text-muted-foreground">
              A relação é formalizada em <strong>contrato de patrocínio institucional</strong>
              {' '}com cláusula expressa de independência (espelhando a Cláusula 5ª
              do Convênio CDL × TV Atalaia v1.4). Conforme exige a{' '}
              <strong>Lei 9.504/1997, art. 33, §1º</strong>, a relação de
              patrocinadores é informada ao TRE/SE no registro PesqEle e
              divulgada publicamente em{' '}
              <Link
                href="/transparencia"
                className="text-primary hover:underline font-medium"
              >
                /transparencia
              </Link>
              .
            </p>
          </div>
        </section>

        {/* Quem NÃO pode patrocinar */}
        <section className="max-w-3xl mx-auto px-5 py-10 w-full flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Quem NÃO pode patrocinar</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Em conformidade com a <strong>Lei 9.504/97, art. 33, § 2º</strong>,
            é vedada qualquer transferência de recursos para a pesquisa
            originária de:
          </p>
          <ul className="list-disc pl-6 text-sm leading-relaxed text-muted-foreground flex flex-col gap-1">
            <li>Candidatas e candidatos a cargo eletivo, suas coligações ou federações;</li>
            <li>Partidos políticos e seus diretórios;</li>
            <li>Pessoas físicas filiadas a partido ou candidatura ativa;</li>
            <li>Pessoas jurídicas controladas direta ou indiretamente por candidato ou partido;</li>
            <li>Órgãos da administração pública direta ou indireta de qualquer esfera.</li>
          </ul>
          <p className="text-sm leading-relaxed text-muted-foreground">
            A CDL Aracaju realiza <strong>due diligence</strong> antes de aceitar
            qualquer patrocínio. Empresas em qualquer das vedações acima terão
            o patrocínio recusado.
          </p>
        </section>

        {/* Formulário de interesse */}
        <section
          id="interesse"
          className="border-t border-border bg-muted/30 scroll-mt-8"
        >
          <div className="max-w-2xl mx-auto px-5 py-12 flex flex-col gap-5">
            <h2 className="text-2xl font-semibold">Demonstrar interesse</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Preencha os dados abaixo. Nossa equipe entrará em contato em até{' '}
              <strong>2 dias úteis</strong> com o contrato de patrocínio para
              análise jurídica e formalização. Sem compromisso até a
              assinatura.
            </p>
            <PatrocinioForm />
          </div>
        </section>
      </main>
      <RodapeInstitucional />
    </>
  )
}
