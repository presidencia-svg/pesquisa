'use client'

import Link from 'next/link'
import Script from 'next/script'
import { useActionState, useEffect, useState } from 'react'

import { entrarComCpf, type VotarFormState } from './actions'

/**
 * Heurística de detecção de modo anônimo/incógnito.
 *
 * Combina múltiplas estratégias pra cobrir as quirks de cada browser:
 *
 *   1. navigator.storage.estimate() — quota baixa em modo privado.
 *      Chrome/Edge incognito ~120MB. Firefox private ~120MB.
 *      Safari iOS private: 0 ou muito pequeno.
 *      Modo normal: 1GB+ tipicamente.
 *
 *   2. localStorage.setItem — Safari (desktop e iOS) em Private Browsing
 *      lança QuotaExceededError ao escrever. Detecção decisiva em Safari.
 *
 *   3. (não usamos) IndexedDB.open — também falha em alguns privados,
 *      mas adiciona latência e tem mais falsos-positivos.
 *
 * Não é detecção 100% precisa (Brave normal também limita quota),
 * mas com 2 sinais a especificidade fica alta. Falsos-positivos em
 * voto eleitoral são preferíveis a falsos-negativos (multivoto).
 */
async function detectarNavegadorAnonimo(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false

  // Estratégia 1: storage.estimate quota
  if (navigator.storage?.estimate) {
    try {
      const est = await navigator.storage.estimate()
      const quota = est.quota ?? 0
      // Safari iOS private retorna 0 ou muito baixo. Limiar 400MB
      // pega Chrome/Edge/Firefox incognito (~120MB) com folga.
      if (quota > 0 && quota < 400_000_000) return true
    } catch {
      // Ignora — passa pra próxima estratégia
    }
  }

  // Estratégia 2: localStorage write probe (decisivo no Safari)
  try {
    const chave = '__anon_probe_' + Math.random().toString(36).slice(2)
    localStorage.setItem(chave, '1')
    localStorage.removeItem(chave)
  } catch {
    return true
  }

  return false
}

/**
 * Detecta se o browser é Safari rodando em iOS, pra ajustar a
 * mensagem com instruções específicas (sair de Modo Privado no iOS
 * é diferente do desktop — botão de Abas → "Privado" desligar).
 */
function isSafariIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  // Safari iOS UA contém "Safari" + "iPhone|iPad|iPod" e NÃO contém
  // "CriOS" (Chrome iOS) ou "FxiOS" (Firefox iOS) ou "EdgiOS".
  const isIOS = /iPhone|iPad|iPod/.test(ua)
  const isSafari =
    /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
  return isIOS && isSafari
}

const formatarCpfInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

const initialState: VotarFormState = { ok: true }

export function CpfForm({ turnstileSiteKey }: { turnstileSiteKey?: string }) {
  const [state, formAction, pending] = useActionState(entrarComCpf, initialState)
  const [cpfDisplay, setCpfDisplay] = useState('')
  const [consentido, setConsentido] = useState(false)
  const [navegadorAnonimo, setNavegadorAnonimo] = useState<boolean | null>(null)
  // Lazy initializer com guard SSR — calcula 1 vez no mount sem
  // disparar setState dentro de effect (evita cascading renders
  // flagado pelo lint react-hooks/purity).
  const [safariIOS] = useState(() =>
    typeof window !== 'undefined' ? isSafariIOS() : false,
  )

  useEffect(() => {
    detectarNavegadorAnonimo().then(setNavegadorAnonimo)
  }, [])

  const showTurnstile =
    typeof turnstileSiteKey === 'string' && turnstileSiteKey.length > 0
  const bloqueadoPorAnonimato = navegadorAnonimo === true

  return (
    <>
      {showTurnstile ? (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          async
          defer
          strategy="afterInteractive"
        />
      ) : null}

      <form action={formAction} className="flex flex-col gap-5">
        <label htmlFor="cpf" className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Seu CPF</span>
          <input
            id="cpf"
            name="cpf"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            required
            placeholder="000.000.000-00"
            value={cpfDisplay}
            onChange={(e) => setCpfDisplay(formatarCpfInput(e.target.value))}
            className="h-14 px-4 rounded-md border border-border bg-background text-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>

        {/* Widget Turnstile — renderiza inline no submit do form. Em
            DEV_MODE local, sem TURNSTILE_SITE_KEY configurada, o widget
            nem aparece e a validacao server-side faz bypass. */}
        {showTurnstile ? (
          <div className="flex flex-col gap-1">
            <div
              className="cf-turnstile"
              data-sitekey={turnstileSiteKey}
              data-theme="light"
              data-size="flexible"
            />
            <p className="text-[10px] text-muted-foreground">
              Verificação anti-bot Cloudflare. Sem dados pessoais.
            </p>
          </div>
        ) : null}

        {state.message ? (
          <div
            role="alert"
            aria-live="polite"
            className={
              state.code === 'idade_minima' ||
              state.code === 'cpf_irregular' ||
              state.code === 'cpf_inativo' ||
              state.code === 'cpf_falecido' ||
              state.code === 'navegador_anonimo'
                ? 'text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 flex flex-col gap-2'
                : 'text-sm text-error bg-error/5 border border-error/20 rounded-md px-3 py-2 flex flex-col gap-2'
            }
          >
            <p>{state.message}</p>
            {state.code === 'servico_indisponivel' ||
            state.code === 'sistema' ? (
              <p className="text-xs opacity-80">
                Código do erro:{' '}
                <code className="font-mono">{state.code}</code> · {' '}
                <Link
                  href="mailto:dpo@cdlaju.com.br?subject=Pesquisa%20Sergipe%202026%20-%20Erro%20no%20cadastro"
                  className="underline hover:no-underline"
                >
                  Contatar suporte
                </Link>
              </p>
            ) : null}
            {state.code === 'idade_minima' ? (
              <p className="text-xs opacity-80">
                Veja a metodologia em{' '}
                <Link href="/transparencia" className="underline">
                  /transparencia
                </Link>
                .
              </p>
            ) : null}
          </div>
        ) : null}

        <label className="flex items-start gap-3 text-sm text-foreground border border-border rounded-md px-4 py-3 bg-muted/40 cursor-pointer hover:bg-muted/60 transition">
          <input
            type="checkbox"
            name="consentimento"
            required
            checked={consentido}
            onChange={(e) => setConsentido(e.target.checked)}
            className="mt-0.5 w-4 h-4 flex-none"
          />
          <span className="leading-snug">
            Li e concordo com a{' '}
            <Link
              href="/privacidade"
              target="_blank"
              className="text-primary underline font-medium"
            >
              Política de Privacidade
            </Link>
            . Autorizo a CDL Aracaju a tratar meu CPF, WhatsApp,
            município e dados demográficos para validação de identidade
            e ponderação amostral, conforme Lei 13.709/2018 (LGPD) e
            Resolução TSE 23.747/2026.
          </span>
        </label>

        {/* Flag anonimato pra defesa em profundidade no servidor.
            Cliente pode mentir, mas se mentir e a checagem JS falhar
            silenciosamente, o usuário ainda passa — apenas o filtro
            client-side é perdido. */}
        <input
          type="hidden"
          name="navegador_anonimo"
          value={navegadorAnonimo === true ? '1' : '0'}
        />

        {bloqueadoPorAnonimato ? (
          <div
            role="alert"
            className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 flex flex-col gap-2"
          >
            <p>
              <strong>Modo anônimo detectado.</strong> O cadastro na
              Pesquisa Sergipe 2026 não é permitido em navegação privativa
              ou janela anônima — medida antifraude para evitar voto
              múltiplo no mesmo dispositivo.
            </p>
            {safariIOS ? (
              <div className="text-xs opacity-90 flex flex-col gap-1">
                <p className="font-medium">Como sair do Modo Privado no iPhone/iPad (Safari):</p>
                <ol className="list-decimal pl-5 flex flex-col gap-0.5">
                  <li>Toque no botão de Abas (ícone de dois quadrados, canto inferior direito)</li>
                  <li>Toque em &quot;Privado&quot; no rodapé</li>
                  <li>Selecione &quot;Pessoal&quot; ou &quot;Início&quot;</li>
                  <li>Abra novamente pesquisa.cdlaju.com.br/votar</li>
                </ol>
              </div>
            ) : (
              <p className="text-xs opacity-80">
                Abra a página em uma janela normal do seu navegador e tente
                novamente.
              </p>
            )}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={
            pending ||
            cpfDisplay.replace(/\D/g, '').length !== 11 ||
            !consentido ||
            bloqueadoPorAnonimato ||
            navegadorAnonimo === null
          }
          className="h-14 px-6 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition"
        >
          {pending
            ? 'Validando…'
            : navegadorAnonimo === null
              ? 'Verificando navegador…'
              : bloqueadoPorAnonimato
                ? 'Não permitido em modo anônimo'
                : 'Continuar'}
        </button>

        <p className="text-xs text-muted-foreground">
          Seu CPF é validado e armazenado apenas como um código embaralhado
          (hash). O número original nunca fica gravado. Você pode pedir
          exclusão dos seus dados a qualquer momento em{' '}
          <Link href="/privacidade/excluir" className="text-primary hover:underline">
            /privacidade/excluir
          </Link>
          .
        </p>
      </form>
    </>
  )
}
