/**
 * Porta de entrada do link de prévia de uso único (migration 060).
 *
 * Este GET não consome nada — só mostra a situação do link e o botão "Abrir".
 * O consumo acontece no POST (abrirPrevia). Assim a prévia de link do
 * WhatsApp/e-mail, que faz GET, não queima o acesso do destinatário.
 */
import { redirect } from 'next/navigation'

import { registrarAcessoAdmin } from '@/lib/admin-audit'
import { PREVIA_SESSAO_HORAS, sessaoDePrevia, situacaoDoLink } from '@/lib/previa-link'

import { abrirPrevia } from './actions'

export const metadata = {
  title: 'Prévia reservada · Pesquisa CDL Aracaju',
  robots: { index: false, follow: false },
  referrer: 'no-referrer' as const,
}
export const dynamic = 'force-dynamic'

const MENSAGEM = {
  invalido: ['Link inválido', 'Este endereço não corresponde a nenhuma prévia.'],
  revogado: ['Link cancelado', 'A CDL Aracaju cancelou este link.'],
  expirado: ['Link vencido', 'O prazo para abrir este link terminou. Peça um novo à CDL Aracaju.'],
  usado: [
    'Link já utilizado',
    'Este link é de uso único e já foi aberto em outro navegador. Se não foi você, avise a CDL Aracaju.',
  ],
} as const

export default async function PreviaPortaPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const situacao = await situacaoDoLink(token)

  if (situacao.status === 'usado') {
    // Mesmo navegador que abriu (cookie da sessão ainda válido): volta pra prévia.
    const sessao = await sessaoDePrevia()
    if (sessao && sessao.id === situacao.link.id) redirect('/previa/ver')
    await registrarAcessoAdmin(
      'previa_link_recusado',
      { motivo: 'ja_utilizado' },
      `previa_link:${situacao.link.id}`,
    )
  }

  return (
    <main className="flex flex-col flex-1 bg-background items-center justify-center px-5 py-16">
      <div className="w-full max-w-md flex flex-col gap-6 items-start">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/cdl-pesquisas-logo.png" alt="CDL Pesquisas" className="h-12 w-auto" />
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
          Prévia reservada
        </p>

        {situacao.status === 'disponivel' ? (
          <>
            <h1 className="text-3xl font-semibold leading-tight">
              Resultado ponderado — uso único
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              Acesso reservado a{' '}
              <strong className="text-foreground">{situacao.link.destinatario}</strong>. Ao abrir,
              este link é <strong className="text-foreground">consumido</strong>: a prévia fica
              disponível só neste navegador, por {PREVIA_SESSAO_HORAS} horas, e o endereço deixa
              de funcionar para qualquer outra pessoa ou aparelho.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Abra no aparelho em que vai examinar os números. O conteúdo é sigiloso até a
              divulgação oficial (Res. TSE 23.747/2026) e cada acesso fica registrado.
            </p>
            <form action={abrirPrevia} className="w-full">
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                className="w-full h-14 rounded-md bg-accent text-accent-foreground text-base font-semibold"
              >
                Abrir a prévia agora
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-semibold leading-tight">{MENSAGEM[situacao.status][0]}</h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              {MENSAGEM[situacao.status][1]}
            </p>
          </>
        )}
      </div>
    </main>
  )
}
