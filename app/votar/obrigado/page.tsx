import Link from 'next/link'

import { CompartilharPesquisa } from '@/components/compartilhar-pesquisa'
import { FaixaPatrocinadores } from '@/components/faixa-patrocinadores'
import { carregarPatrocinadores } from '@/lib/patrocinadores'

export const metadata = {
  title: 'Obrigado · Pesquisa Eleitoral Sergipe 2026',
  robots: { index: false, follow: false },
}

/**
 * Tela final. O cookie `voto` ja foi limpo dentro do submeterVoto do
 * ultimo cargo (estadual) — nao podemos setar/deletar cookie em Server
 * Component aqui, so em Server Action ou Route Handler.
 *
 * Esta pagina e' pura leitura. Sem "ola fulano", sem menu, sem sessao
 * logada — exatamente como o ultimo passo da arquitetura "duas salas"
 * exige.
 */
export default async function ObrigadoPage() {
  const patrocinadores = await carregarPatrocinadores()
  return (
    <main className="flex flex-col flex-1 bg-capsule text-capsule-foreground">
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-14">
        <div className="max-w-xl w-full flex flex-col items-center gap-7 text-center">
          <CheckIcon />

          <div className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-[0.3em] text-capsule-foreground/70">
              Encerrado
            </p>
            <h1 className="text-3xl sm:text-4xl font-semibold">
              Obrigado pela participação
            </h1>
          </div>

          <p className="text-lg leading-relaxed text-capsule-foreground/90">
            Seu voto foi registrado em todas as cédulas, de forma anônima.
          </p>

          {/* Compartilhe — cresce a amostra (representatividade, sem viés) */}
          <CompartilharPesquisa />

          <details className="w-full text-sm text-capsule-foreground/70 text-left">
            <summary className="cursor-pointer hover:text-capsule-foreground">
              Como seu voto ficou anônimo
            </summary>
            <p className="pt-2 leading-relaxed">
              Os votos que você emitiu estão em{' '}
              <code className="font-mono">votos_pesquisa</code>, ligados apenas
              ao hash do token aleatório que você acabou de descartar. Seu CPF
              está em outra tabela, sem nenhum ponteiro pra lá. Os resultados
              serão divulgados após o registro junto ao TRE/SE.
            </p>
          </details>

          <Link
            href="/"
            className="inline-flex items-center justify-center h-12 px-8 rounded-md border border-capsule-foreground/30 text-capsule-foreground hover:bg-capsule-foreground/10 transition"
          >
            Voltar para o início
          </Link>

          <FaixaPatrocinadores patrocinadores={patrocinadores} tema="escuro" />
        </div>
      </section>
    </main>
  )
}

function CheckIcon() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5.5" />
    </svg>
  )
}
