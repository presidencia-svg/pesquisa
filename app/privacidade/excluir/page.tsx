import Link from 'next/link'

import { MarcaCdl } from '@/components/marca-cdl'
import { RodapeInstitucional } from '@/components/rodape-institucional'

import { ExcluirForm } from './form'

export const metadata = {
  title: 'Exclusão de dados (LGPD Art. 18 VI) · Pesquisa Eleitoral Sergipe 2026',
  description:
    'Solicite a exclusão dos seus dados pessoais nesta pesquisa, conforme Art. 18 VI da Lei 13.709/2018.',
}

export default function ExcluirPage() {
  return (
    <>
      <main className="flex flex-col flex-1 bg-background px-5 sm:px-6 py-10 sm:py-16">
        <div className="max-w-xl mx-auto flex flex-col gap-8">
          <header className="flex flex-col gap-4">
            <Link href="/">
              <MarcaCdl tamanho="sm" />
            </Link>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
              LGPD · Art. 18 VI
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold leading-[1.1] tracking-tight">
              Excluir meus dados
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              Conforme a Lei 13.709/2018 (LGPD), você tem direito de
              solicitar a exclusão dos seus dados pessoais.
            </p>
          </header>

          <section className="rounded-md border border-border bg-muted/40 px-5 py-4 flex flex-col gap-2 text-sm leading-relaxed">
            <p>
              <strong>O que será excluído:</strong>
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>Seu cadastro nesta pesquisa (Sala 1)</li>
              <li>WhatsApp, município, dados demográficos</li>
              <li>Histórico de códigos OTP enviados</li>
              <li>Seu registro na base CDL (Melhores do Ano)</li>
            </ul>
            <p className="pt-2">
              <strong>O que NÃO muda:</strong>
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>
                Seus votos permanecem anonimamente computados — eles
                vivem em tabela separada sem ligação com seu CPF, e
                não há como removê-los individualmente (nem nós
                conseguimos).
              </li>
              <li>
                A exclusão é definitiva. Se quiser participar de novo
                em outra edição, terá que se cadastrar de novo.
              </li>
            </ul>
          </section>

          <ExcluirForm />

          <div className="flex gap-3 pt-4 border-t border-border text-sm">
            <Link href="/" className="text-primary hover:underline">
              ← Voltar ao início
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link
              href="/privacidade"
              className="text-primary hover:underline"
            >
              Política de Privacidade
            </Link>
          </div>
        </div>
      </main>
      <RodapeInstitucional />
    </>
  )
}
