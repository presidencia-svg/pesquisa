'use client'

import { useEffect, useState } from 'react'

/**
 * Botao "Instalar como app" — captura o evento beforeinstallprompt (Chrome,
 * Edge, Android, Samsung Internet) e dispara o prompt nativo de instalacao
 * quando o usuario clica. No iOS Safari, que nao suporta esse evento,
 * mostra instrucoes manuais pra adicionar a tela inicial.
 *
 * Se o app ja' esta instalado (display-mode: standalone) ou se o browser
 * nao expoe beforeinstallprompt e nao eh iOS, o botao some — assim nao
 * confunde quem ja' instalou ou quem ta' num browser sem suporte.
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstalarAppButton() {
  const [evento, setEvento] = useState<BeforeInstallPromptEvent | null>(null)
  const [iosInstrucoes, setIosInstrucoes] = useState(false)
  // SSR sempre renderiza null; client preenche apos mount pra evitar
  // hydration mismatch entre SSR e o estado real do navegador.
  const [montado, setMontado] = useState(false)
  const [iaInstalado, setJaInstalado] = useState(false)
  const [isIos, setIsIos] = useState(false)

  useEffect(() => {
    // Leitura legitima de APIs do window — SSR nao tem como saber isso.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMontado(true)

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true
    const ua = window.navigator.userAgent
    const ehIos =
      /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)

    setJaInstalado(standalone)
    setIsIos(ehIos)

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setEvento(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setJaInstalado(true)
      setEvento(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!montado) return null

  if (iaInstalado) return null

  // Caso Chrome/Edge/Android: botao com prompt nativo
  if (evento) {
    return (
      <button
        type="button"
        onClick={async () => {
          await evento.prompt()
          const choice = await evento.userChoice
          if (choice.outcome === 'accepted') setEvento(null)
        }}
        className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-primary text-primary text-sm font-medium hover:bg-primary hover:text-primary-foreground transition"
      >
        <span aria-hidden="true">↓</span>
        Instalar como app
      </button>
    )
  }

  // Caso iOS Safari: botao mostra modal de instrucoes
  if (isIos) {
    return (
      <>
        <button
          type="button"
          onClick={() => setIosInstrucoes(true)}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-primary text-primary text-sm font-medium hover:bg-primary hover:text-primary-foreground transition"
        >
          <span aria-hidden="true">↓</span>
          Instalar como app
        </button>
        {iosInstrucoes ? (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4"
            onClick={() => setIosInstrucoes(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-background border border-border rounded-md p-5 flex flex-col gap-4"
            >
              <h3 className="text-base font-semibold">Adicionar à tela inicial</h3>
              <ol className="flex flex-col gap-3 text-sm text-foreground">
                <li className="flex gap-3">
                  <span className="flex-none w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
                    1
                  </span>
                  <span>
                    Toque no ícone <strong>Compartilhar</strong> (
                    <span aria-hidden="true">⬆️</span>) na barra do Safari.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-none w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
                    2
                  </span>
                  <span>
                    Role e escolha <strong>Adicionar à Tela de Início</strong>.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-none w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
                    3
                  </span>
                  <span>
                    Toque em <strong>Adicionar</strong>. O ícone fica na sua
                    tela como se fosse um app.
                  </span>
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setIosInstrucoes(false)}
                className="mt-2 h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
              >
                Entendi
              </button>
            </div>
          </div>
        ) : null}
      </>
    )
  }

  // Outros browsers (sem suporte) — nao mostra nada
  return null
}
