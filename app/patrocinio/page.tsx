import Link from 'next/link'

import { MarcaCdl } from '@/components/marca-cdl'
import { RodapeInstitucional } from '@/components/rodape-institucional'

import { PatrocinioForm } from './form'

export const metadata = {
  title:
    'A maior pesquisa política já realizada no Brasil · Patrocínio Sergipe 2026',
  description:
    'Meta de 200.000 respondentes em pesquisa eleitoral estadual — 100× maior que Datafolha, IBOPE ou Quaest. Patrocínio institucional CDL Aracaju com 3 cotas (Diamante R$ 100k / Ouro R$ 70k / Prata R$ 30k). Sem ingerência editorial.',
}

const COTAS = [
  {
    nivel: 'diamante',
    titulo: 'Cota Diamante',
    valor: 100_000,
    vagas: '1 vaga única — exclusividade de categoria',
    cor: 'rgb(8, 145, 178)', // cyan
    beneficios: [
      'Exclusividade na categoria — nenhum concorrente direto pode patrocinar nesta edição',
      'Logo em destaque máximo (topo) na página pública /resultados',
      'Painel dedicado nos créditos de abertura do telejornal da TV Atalaia (3/set/2026)',
      'Entrevista exclusiva do Presidente da CDL Aracaju para o veículo de comunicação do patrocinador',
      'Relatório premium customizado com cortes demográficos × voto (gênero, idade, escolaridade, renda, município, região)',
      'Reunião privada com Presidente da CDL + estatístico responsável + análise customizada do segmento de interesse do patrocinador',
      'Direito de uso da marca "Patrocinador Master Pesquisa Eleitoral Sergipe 2026 – CDL Aracaju"',
    ],
  },
  {
    nivel: 'ouro',
    titulo: 'Cota Ouro',
    valor: 70_000,
    vagas: 'Até 3 vagas',
    cor: 'rgb(202, 138, 4)', // amarelo institucional
    beneficios: [
      'Logo em destaque na página pública /resultados durante e após divulgação',
      'Relatório premium com cortes demográficos × voto (gênero, idade, escolaridade, renda, município)',
      'Direito de uso da marca "Patrocinador Pesquisa Eleitoral Sergipe 2026 – CDL Aracaju" em comunicação institucional',
      'Reunião de apresentação dos resultados com o Presidente da CDL e o estatístico responsável',
    ],
  },
  {
    nivel: 'prata',
    titulo: 'Cota Prata',
    valor: 30_000,
    vagas: 'Vagas ilimitadas',
    cor: 'rgb(100, 116, 139)', // slate
    beneficios: [
      'Logo presente na página pública /resultados durante e após divulgação',
      'Relatório premium com cortes demográficos × voto (gênero, idade, escolaridade, renda, município)',
      'Direito de uso da marca "Apoiador Pesquisa Eleitoral Sergipe 2026 – CDL Aracaju" em comunicação institucional',
      'Reunião de apresentação dos resultados',
    ],
  },
] as const

export default function PatrocinioPage() {
  return (
    <>
      <main className="flex flex-col flex-1 bg-background">
        {/* Hero */}
        <section className="border-b border-border bg-gradient-to-br from-[#0a2a6e] to-[#1e40af] text-white">
          <div className="max-w-3xl mx-auto px-5 py-14 sm:py-20 flex flex-col gap-5">
            <Link
              href="/"
              className="inline-block bg-white rounded-md px-4 py-3 self-start hover:opacity-90 transition"
              aria-label="Voltar para a home da Pesquisa Eleitoral Sergipe 2026"
            >
              <MarcaCdl tamanho="md" />
            </Link>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300 pt-2">
              Patrocínio institucional · Pesquisa Eleitoral Sergipe 2026
            </p>
            <h1 className="text-3xl sm:text-5xl font-bold leading-[1.05]">
              A maior pesquisa política já realizada no Brasil
              <span className="text-cyan-300 text-base align-top ml-1">*</span>
            </h1>
            <p className="text-base sm:text-lg text-white/90 leading-relaxed max-w-2xl">
              Meta de <strong>200.000 respondentes</strong> nos 75 municípios
              sergipanos, com identidade verificada por CPF + WhatsApp —{' '}
              <strong>100× maior</strong> que Datafolha, IBOPE ou Quaest.
              Divulgação ao vivo no telejornal da TV Atalaia em{' '}
              <strong>3 de setembro de 2026</strong>, registrada no
              PesqEle/TRE-SE, independente e transparente.
            </p>
            <p className="text-[11px] text-white/60 leading-relaxed max-w-2xl pt-2 border-t border-white/20">
              <span className="text-cyan-300">*</span> Por critério de amostra
              com identidade verificada em pesquisa eleitoral estadual. Datafolha,
              IBOPE, Quaest, AtlasIntel e Paraná Pesquisas operam com amostras
              de 1.500 a 2.500 respondentes por estado.
            </p>
          </div>
        </section>

        {/* Comparação com institutos tradicionais */}
        <section className="max-w-4xl mx-auto px-5 py-10 sm:py-14 w-full flex flex-col gap-6">
          <header className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
              Por que esta pesquisa é única
            </p>
            <h2 className="text-2xl sm:text-3xl font-semibold leading-tight">
              200.000 votantes vs. 2.000 dos institutos tradicionais
            </h2>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="text-left p-3 font-semibold">Instituto</th>
                  <th className="text-right p-3 font-semibold">Amostra (n)</th>
                  <th className="text-right p-3 font-semibold">
                    Margem de erro (IC 95%)
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="p-3">Datafolha (típico estado)</td>
                  <td className="p-3 text-right tabular-nums">2.000</td>
                  <td className="p-3 text-right tabular-nums">±2,2 pp</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="p-3">IBOPE / Quaest (típico estado)</td>
                  <td className="p-3 text-right tabular-nums">1.500 – 2.500</td>
                  <td className="p-3 text-right tabular-nums">±2,0 – 2,5 pp</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="p-3">AtlasIntel / Paraná Pesquisas</td>
                  <td className="p-3 text-right tabular-nums">1.500 – 2.000</td>
                  <td className="p-3 text-right tabular-nums">±2,2 – 2,5 pp</td>
                </tr>
                <tr
                  className="border-t-2 border-accent bg-accent/5"
                  style={{ fontWeight: 600 }}
                >
                  <td className="p-3 text-foreground">
                    Pesquisa Eleitoral Sergipe 2026 — CDL Aracaju
                  </td>
                  <td className="p-3 text-right tabular-nums text-accent">
                    200.000
                  </td>
                  <td className="p-3 text-right tabular-nums text-accent">
                    ±0,22 pp
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Em pesquisa de intenção de voto, <strong>menor margem de erro</strong>
            {' '}significa que o número divulgado é mais próximo da realidade.
            Atingida a meta de 200 mil respondentes, a Pesquisa Eleitoral
            Sergipe 2026 entrega <strong>10× mais precisão</strong> que os
            maiores institutos do país — e, já com a base de 44.545 CPFs
            validados, 5× mais precisão.
          </p>
        </section>

        {/* Cotas */}
        <section className="max-w-6xl mx-auto px-5 py-10 sm:py-14 w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {COTAS.map((cota) => (
              <article
                key={cota.nivel}
                className="rounded-lg border-2 p-6 sm:p-7 flex flex-col gap-4 bg-background"
                style={{ borderColor: cota.cor }}
              >
                <header className="flex flex-col gap-2">
                  <h2
                    className="text-2xl font-bold"
                    style={{ color: cota.cor }}
                  >
                    {cota.titulo}
                  </h2>
                  <p className="text-3xl font-semibold">
                    R$ {cota.valor.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    {cota.vagas}
                  </p>
                </header>
                <ul className="flex flex-col gap-2 text-sm leading-relaxed flex-1">
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

        {/* Especificações de logo */}
        <section className="border-t border-border bg-muted/30">
          <div className="max-w-3xl mx-auto px-5 py-10 flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
              Especificações do logo
            </p>
            <h2 className="text-xl font-semibold">
              Dimensões e formato por cota
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Cada cota tem um tamanho máximo de exibição. Logos de qualquer
              proporção (horizontal, vertical ou quadrada) se encaixam
              automaticamente preservando aspect ratio.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-background border-b border-border">
                  <tr>
                    <th className="text-left p-3 font-semibold">Cota</th>
                    <th className="text-left p-3 font-semibold">
                      Tamanho desktop
                    </th>
                    <th className="text-left p-3 font-semibold">
                      Tamanho mobile
                    </th>
                    <th className="text-left p-3 font-semibold">
                      Arquivo recomendado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50 bg-cyan-50/50">
                    <td className="p-3">
                      <strong style={{ color: '#0891b2' }}>Diamante</strong>
                    </td>
                    <td className="p-3 font-mono text-xs">220 × 90 px</td>
                    <td className="p-3 font-mono text-xs">180 × 70 px</td>
                    <td className="p-3 text-xs">PNG transparente</td>
                  </tr>
                  <tr className="border-b border-border/50 bg-amber-50/50">
                    <td className="p-3">
                      <strong style={{ color: '#ca8a04' }}>Ouro</strong>
                    </td>
                    <td className="p-3 font-mono text-xs">160 × 60 px</td>
                    <td className="p-3 font-mono text-xs">130 × 48 px</td>
                    <td className="p-3 text-xs">PNG transparente</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="p-3">
                      <strong style={{ color: '#64748b' }}>Prata</strong>
                    </td>
                    <td className="p-3 font-mono text-xs">120 × 40 px</td>
                    <td className="p-3 font-mono text-xs">100 × 32 px</td>
                    <td className="p-3 text-xs">PNG transparente</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pt-2 border-t border-border">
              <strong>Aceitos:</strong> PNG, JPG, SVG ou WebP até 2 MB.{' '}
              <strong>Recomendado:</strong> PNG com fundo transparente nas
              dimensões ideais — garante renderização perfeita em qualquer
              tela. Encaixe automático via{' '}
              <code className="bg-muted px-1 rounded">object-fit: contain</code>.
            </p>
          </div>
        </section>

        {/* Exposição visual */}
        <section className="border-t border-border">
          <div className="max-w-3xl mx-auto px-5 py-10 flex flex-col gap-4 items-center text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
              Onde sua marca aparece
            </p>
            <h2 className="text-2xl font-semibold">
              Sua marca em cada etapa da jornada
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
              Veja onde a sua logo aparece — da entrada à cabine de votação e
              ao encerramento — na demonstração completa, tela a tela.
            </p>
            <a
              href="/patrocinio/jornada"
              className="inline-flex items-center justify-center h-11 px-5 rounded-md border-2 border-accent text-accent text-sm font-semibold hover:bg-accent hover:text-white transition"
            >
              Ver a jornada da marca →
            </a>
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
            Como política de <em>due diligence</em> eleitoral — para afastar
            recurso de fonte vedada (Lei 9.504/97, arts. 24 e 81) e conduta
            vedada a agente público (art. 73) —, não aceitamos recursos
            originários de:
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
