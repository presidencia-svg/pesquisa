import Link from 'next/link'

import { InstalarAppButton } from '@/components/instalar-app-button'
import { MarcaCdl } from '@/components/marca-cdl'
import { RodapeInstitucional } from '@/components/rodape-institucional'

export default function Home() {
  return (
    <>
      <main className="flex flex-col flex-1 items-center bg-background px-5 sm:px-6 py-10 sm:py-24">
        <div className="w-full max-w-2xl flex flex-col gap-10 sm:gap-12">
          <header className="flex flex-col gap-6 sm:gap-8">
            <div className="flex items-start justify-between gap-3">
              <MarcaCdl tamanho="lg" />
              <InstalarAppButton />
            </div>

            <div className="flex flex-col gap-3 pt-4 border-t border-border">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
                Pesquisa de intenção de voto
              </p>
              <h1 className="text-3xl sm:text-5xl font-semibold leading-[1.05] tracking-tight text-foreground">
                Sergipe 2026
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed pt-2">
                Pesquisa eleitoral via internet, com identidade verificada e
                voto desvinculado do eleitor. O sistema valida quem você é,
                mas não armazena ligação entre você e seus votos.
              </p>
            </div>
          </header>

          <section className="flex flex-col gap-6">
            <h2 className="text-base font-semibold tracking-wide uppercase text-foreground">
              Como funciona
            </h2>
            <ol className="flex flex-col gap-4 text-foreground">
              <li className="flex gap-4">
                <span className="flex-none w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center">
                  1
                </span>
                <p className="pt-0.5">
                  Você informa o CPF. O sistema valida que o documento é real
                  e que ainda não foi usado nesta edição da pesquisa.
                </p>
              </li>
              <li className="flex gap-4">
                <span className="flex-none w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center">
                  2
                </span>
                <p className="pt-0.5">
                  Você confirma um código de 6 dígitos enviado no seu
                  WhatsApp. Garante que o CPF é seu.
                </p>
              </li>
              <li className="flex gap-4">
                <span className="flex-none w-7 h-7 rounded-full bg-capsule text-capsule-foreground text-sm font-semibold flex items-center justify-center">
                  3
                </span>
                <p className="pt-0.5">
                  <strong>Cápsula anônima.</strong> Daqui pra frente, o
                  sistema não tem como ligar seus votos ao seu CPF — nem o
                  operador, nem a CDL, nem um auditor que abra o banco.
                </p>
              </li>
              <li className="flex gap-4">
                <span className="flex-none w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center">
                  4
                </span>
                <p className="pt-0.5">
                  Você vota como na urna eletrônica: digita o número do
                  candidato ou da legenda. Confirma vendo a foto. Pronto.
                </p>
              </li>
            </ol>
          </section>

          <section className="flex flex-col gap-4 rounded-md border-2 border-accent/40 bg-accent/5 px-5 sm:px-6 py-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
              Quando saem os resultados
            </h2>
            <ul className="flex flex-col gap-3 text-sm text-foreground">
              <li className="flex gap-3">
                <span className="flex-none w-2 h-2 mt-2 rounded-full bg-accent" />
                <span>
                  <strong>Setembro de 2026:</strong> coleta principal dos
                  votos. O link de participação fica aberto pra todo
                  sergipano cadastrado responder pelo celular.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-none w-2 h-2 mt-2 rounded-full bg-accent" />
                <span>
                  <strong>Registro no TRE/SE:</strong> antes da divulgação,
                  metodologia, plano amostral e questionário são depositados
                  no PesqEle do TRE com pelo menos 5 dias de antecedência
                  (Resolução TSE 23.747/2026).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-none w-2 h-2 mt-2 rounded-full bg-accent" />
                <span>
                  <strong>Divulgação:</strong> resultado completo —
                  percentuais por cargo, recortes por município, sexo, faixa
                  etária e escolaridade — sai{' '}
                  <strong>aqui mesmo no app</strong>, antes do 1º turno
                  (04/out/2026).
                </span>
              </li>
            </ul>
            <p className="text-xs text-muted-foreground leading-relaxed pt-2 border-t border-accent/20">
              Instale o app no celular (botão no topo) pra ver o resultado
              assim que for publicado — sem precisar lembrar do link.
            </p>
          </section>

          <section className="flex flex-col gap-3 rounded-md border border-border bg-muted px-5 sm:px-6 py-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
              Por que essa separação importa
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pesquisas online costumam guardar CPF e voto na mesma tabela.
              A promessa de anonimato fica no discurso, não na arquitetura.
              Aqui as duas informações vivem em tabelas que não se conectam.
              O código é aberto e auditável.
            </p>
          </section>

          <section className="flex flex-col gap-4 rounded-md border-2 border-cyan-200 bg-cyan-50/50 px-5 sm:px-6 py-5">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-700">
                Patrocínio institucional
              </p>
              <h2 className="text-base font-semibold text-foreground">
                Cotas de patrocínio disponíveis
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed pt-1">
                A pesquisa é mantida por patrocínio institucional B2B — empresas
                que apoiam a iniciativa sem qualquer ingerência editorial. Vedado
                a candidatos, partidos e administração pública (Lei 9.504/97
                art. 33 §2º).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-md border-2 border-cyan-500 bg-white px-3 py-3 flex flex-col gap-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-700">
                  Diamante
                </p>
                <p className="text-lg font-bold tabular-nums">R$ 30.000</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  1 vaga única
                </p>
                <p className="text-xs text-foreground/80 leading-snug pt-1 border-t border-dashed border-cyan-200">
                  Exclusividade de categoria + painel dedicado na abertura do
                  telejornal + entrevista exclusiva do Presidente + snapshot
                  embargado 48h antes
                </p>
              </div>

              <div className="rounded-md border-2 border-amber-500 bg-white px-3 py-3 flex flex-col gap-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
                  Ouro
                </p>
                <p className="text-lg font-bold tabular-nums">R$ 15.000</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  até 3 vagas
                </p>
                <p className="text-xs text-foreground/80 leading-snug pt-1 border-t border-dashed border-amber-200">
                  Logo em destaque + menção institucional no telejornal +
                  relatório premium + snapshot embargado 24h antes
                </p>
              </div>

              <div className="rounded-md border-2 border-slate-400 bg-white px-3 py-3 flex flex-col gap-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-700">
                  Prata
                </p>
                <p className="text-lg font-bold tabular-nums">R$ 8.000</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  vagas ilimitadas
                </p>
                <p className="text-xs text-foreground/80 leading-snug pt-1 border-t border-dashed border-slate-200">
                  Logo presente na página de resultados + relatório premium +
                  reunião de apresentação
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Link
                href="/patrocinio"
                className="inline-flex items-center justify-center h-10 px-4 rounded-md bg-cyan-700 text-white text-sm font-semibold hover:bg-cyan-800 transition"
              >
                Ver detalhes das cotas →
              </Link>
              <Link
                href="/patrocinio/exposicao"
                className="inline-flex items-center justify-center h-10 px-4 rounded-md border-2 border-cyan-700 text-cyan-700 text-sm font-semibold hover:bg-cyan-50 transition"
              >
                Onde aparece a marca
              </Link>
            </div>
          </section>

          <section className="flex flex-col gap-4 border-l-2 border-accent pl-4 sm:pl-6 py-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
              Por que a CDL realiza esta pesquisa
            </h2>
            <p className="text-base text-foreground leading-relaxed">
              A Câmara de Dirigentes Lojistas de Aracaju foi fundada em{' '}
              <strong>21 de dezembro de 1961</strong> e é entidade declarada
              de utilidade pública pela{' '}
              <strong>Lei Municipal nº 63 de 1967</strong>. Como associação
              civil sem fins lucrativos, há mais de seis décadas representa
              os comerciantes lojistas, mantém serviços coletivos como o
              Serviço de Proteção ao Crédito e realiza atividades públicas
              — entre elas a premiação popular Melhores do Ano.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Esta pesquisa eleitoral é mais uma iniciativa de utilidade
              pública: medir a opinião dos sergipanos sobre a eleição de
              2026 com rigor metodológico e transparência total. A CDL não
              tem candidato, não apoia partido, não monetiza o resultado.
              Os custos operacionais são cobertos por{' '}
              <Link
                href="/patrocinio"
                className="text-primary hover:underline font-medium"
              >
                patrocínio institucional B2B
              </Link>
              {' '}declarado, vedado a candidatos, partidos e administração
              pública. O código é aberto, o banco é auditável, e o registro
              no TRE/SE acompanha o que a Lei 9.504/97 e a Resolução TSE
              23.747/2026 determinam.
            </p>
          </section>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/votar"
              className="flex-1 inline-flex justify-center items-center h-12 px-6 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
            >
              Quero participar
            </Link>
            <Link
              href="/resultados"
              className="flex-1 inline-flex justify-center items-center h-12 px-6 rounded-md border border-border text-foreground font-medium hover:bg-muted transition"
            >
              Ver resultados
            </Link>
            <Link
              href="/transparencia"
              className="flex-1 inline-flex justify-center items-center h-12 px-6 rounded-md border border-border text-foreground font-medium hover:bg-muted transition"
            >
              Como auditar
            </Link>
          </div>

          <p className="text-xs text-muted-foreground border-t border-border pt-6 leading-relaxed">
            Pesquisa de abrangência estadual (75 municípios de Sergipe), com
            cota proporcional ao eleitorado oficial do TSE em cada município.
            Resultados serão divulgados após registro no TRE/SE conforme
            Lei 9.504/97 e Resolução TSE 23.747/2026.
          </p>
        </div>
      </main>

      <RodapeInstitucional />
    </>
  )
}
