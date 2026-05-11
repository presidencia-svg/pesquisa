'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

/**
 * Componente client da capsula. Mostra o token, oferece copiar o magic
 * link, e tem instrucoes expansiveis pra quem quer entrar numa janela
 * anonima de verdade.
 */
export function AnonimoClient({ token }: { token: string }) {
  const [linkCompleto, setLinkCompleto] = useState('')
  const [copiado, setCopiado] = useState(false)

  // Calcula o magic link no client porque ai pega o origin certo
  // (localhost em dev, dominio real em prod) sem precisar de env var.
  // setState num effect aqui e' o padrao recomendado pra ler window
  // depois da hidratacao — desabilita o lint pra esse caso especifico.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLinkCompleto(`${window.location.origin}/votar/redimir?t=${token}`)
  }, [token])

  const copiar = async () => {
    if (!linkCompleto) return
    try {
      await navigator.clipboard.writeText(linkCompleto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      // Fallback: seleciona texto pro usuario copiar manualmente.
      setCopiado(false)
    }
  }

  // Quebra o token em 4 linhas de 16 chars pra leitura.
  const tokenFormatado = token.match(/.{1,16}/g)?.join('\n') ?? token

  return (
    <div className="w-full flex flex-col gap-6">
      <Link
        href="/votar/cedula/presidente"
        className="inline-flex items-center justify-center h-14 px-8 rounded-md bg-capsule-foreground text-capsule font-semibold hover:opacity-90 transition"
      >
        Começar a votar →
      </Link>

      <details className="w-full text-left rounded-md border border-capsule-foreground/20 bg-capsule-foreground/5 p-4">
        <summary className="cursor-pointer text-sm font-medium text-capsule-foreground hover:text-capsule-foreground/80">
          Quer máximo isolamento? Abra numa janela anônima do navegador.
        </summary>

        <div className="pt-4 flex flex-col gap-4 text-sm text-capsule-foreground/85">
          <p>
            A janela anônima do seu navegador não compartilha cookies nem
            histórico com esta janela. Pra entrar lá com seu voto:
          </p>

          <ol className="list-decimal list-outside pl-5 flex flex-col gap-2">
            <li>Copie o link abaixo (botão à direita).</li>
            <li>
              Aperte{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-capsule-foreground/15 font-mono text-xs">
                Cmd+Shift+N
              </kbd>{' '}
              (Chrome/Edge/Safari) ou{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-capsule-foreground/15 font-mono text-xs">
                Cmd+Shift+P
              </kbd>{' '}
              (Firefox). No Windows, troque{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-capsule-foreground/15 font-mono text-xs">
                Cmd
              </kbd>{' '}
              por{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-capsule-foreground/15 font-mono text-xs">
                Ctrl
              </kbd>
              .
            </li>
            <li>Cole o link na barra de endereço e dê Enter.</li>
            <li>Vote por lá. Pode até usar outro celular ou computador.</li>
          </ol>

          <div className="flex flex-col gap-2 pt-2">
            <label
              htmlFor="magic-link"
              className="text-xs uppercase tracking-widest text-capsule-foreground/60"
            >
              Seu link único
            </label>
            <div className="flex gap-2">
              <input
                id="magic-link"
                type="text"
                value={linkCompleto}
                readOnly
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 h-10 px-3 rounded-md bg-capsule-foreground/10 border border-capsule-foreground/20 font-mono text-xs text-capsule-foreground focus:outline-none focus:ring-2 focus:ring-capsule-foreground/40"
              />
              <button
                type="button"
                onClick={copiar}
                disabled={!linkCompleto}
                className="px-4 rounded-md bg-capsule-foreground text-capsule font-medium text-sm hover:opacity-90 disabled:opacity-50 transition whitespace-nowrap"
              >
                {copiado ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          <details className="text-xs text-capsule-foreground/70">
            <summary className="cursor-pointer hover:text-capsule-foreground">
              Ver o token bruto (sem URL)
            </summary>
            <pre className="mt-2 px-3 py-2 rounded bg-capsule-foreground/5 border border-capsule-foreground/15 font-mono text-[11px] leading-relaxed whitespace-pre overflow-x-auto">
              {tokenFormatado}
            </pre>
          </details>

          <p className="text-xs text-capsule-foreground/60 pt-2 border-t border-capsule-foreground/15">
            Esse token é único, expira quando você terminar de votar, e não
            tem nenhuma ligação com seu CPF. Se alguém usar antes de você
            terminar, você descobre na hora — mas o risco prático é baixo
            porque ele só vale pra emitir até 5 votos nesta pesquisa.
          </p>
        </div>
      </details>
    </div>
  )
}
