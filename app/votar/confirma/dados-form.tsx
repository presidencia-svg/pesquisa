'use client'

import { useActionState, useEffect, useState } from 'react'

import {
  ESCOLARIDADE_DETALHES,
  ESCOLARIDADE_DETALHE_ROTULO,
  NIVEIS_ECONOMICOS,
  NIVEL_ECONOMICO_ROTULO,
  type EscolaridadeDetalhe,
  type NivelEconomico,
} from '@/lib/demograficos'

import { confirmarDados, type ConfirmaState } from './actions'

/**
 * Fingerprint estável do dispositivo: combina sinais que mudam pouco
 * entre sessões (canvas pixel render, UA, idioma, resolução de tela,
 * timezone, núcleos lógicos) e hash em SHA-256 hex (64 chars).
 *
 * NÃO é identificador de pessoa — é identificador de browser+device.
 * Mudança de browser, modo anônimo, ou atualização significativa do
 * SO geram fingerprints diferentes. É só ARMAZENADO para auditoria
 * pós-coleta: o servidor não trava cadastro por aparelho (ver
 * app/votar/confirma/actions.ts, passo 2b).
 *
 * Roda só client-side (typeof window !== undefined).
 */
async function gerarDeviceFingerprint(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  try {
    // Detecta iOS. Safari iOS 17+ aplica anti-fingerprint no canvas
    // (adiciona ruído por sessão), o que torna o canvas instável.
    // Em iOS, omitimos o canvas pra ter fingerprint estável — perde
    // alguma unicidade mas mantém o objetivo (sinal comparável entre
    // sessões pra análise de clusters na auditoria).
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)

    let canvasData = ''
    if (!isIOS) {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.textBaseline = 'top'
        ctx.font = '14px Arial'
        ctx.fillStyle = '#069'
        ctx.fillText('pesquisa-sergipe-2026', 4, 4)
        ctx.strokeStyle = '#3a8a1d'
        ctx.beginPath()
        ctx.arc(50, 18, 8, 0, Math.PI * 2)
        ctx.stroke()
        canvasData = canvas.toDataURL()
      }
    }
    const signals = [
      navigator.userAgent,
      navigator.language ?? 'pt-BR',
      `${screen.width}x${screen.height}x${screen.colorDepth}`,
      new Date().getTimezoneOffset().toString(),
      (navigator.hardwareConcurrency ?? 0).toString(),
      // WebGL renderer/vendor são mais estáveis que canvas no iOS
      // (Apple não randomiza esses) — adiciona unicidade sem
      // instabilidade.
      obterWebGLSignal(),
      canvasData,
    ].join('|')
    const enc = new TextEncoder()
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(signals))
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    return null
  }
}

/** WebGL vendor+renderer — estável em todos os browsers, inclusive iOS. */
function obterWebGLSignal(): string {
  try {
    const canvas = document.createElement('canvas')
    const gl =
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ??
      (canvas.getContext(
        'experimental-webgl',
      ) as WebGLRenderingContext | null)
    if (!gl) return 'no-webgl'
    const dbg = gl.getExtension('WEBGL_debug_renderer_info')
    if (!dbg) {
      return [gl.getParameter(gl.VENDOR), gl.getParameter(gl.RENDERER)].join(',')
    }
    return [
      gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL),
      gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL),
    ].join(',')
  } catch {
    return 'webgl-err'
  }
}

type Municipio = { ibge_codigo: number; nome: string }

const initialState: ConfirmaState = { ok: true }

const formatarWhatsappInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

// 27 UFs. SE primeiro (público-alvo); as demais em ordem alfabética.
const UFS: ReadonlyArray<[string, string]> = [
  ['SE', 'Sergipe'],
  ['AC', 'Acre'], ['AL', 'Alagoas'], ['AP', 'Amapá'], ['AM', 'Amazonas'],
  ['BA', 'Bahia'], ['CE', 'Ceará'], ['DF', 'Distrito Federal'],
  ['ES', 'Espírito Santo'], ['GO', 'Goiás'], ['MA', 'Maranhão'],
  ['MT', 'Mato Grosso'], ['MS', 'Mato Grosso do Sul'], ['MG', 'Minas Gerais'],
  ['PA', 'Pará'], ['PB', 'Paraíba'], ['PR', 'Paraná'], ['PE', 'Pernambuco'],
  ['PI', 'Piauí'], ['RJ', 'Rio de Janeiro'], ['RN', 'Rio Grande do Norte'],
  ['RS', 'Rio Grande do Sul'], ['RO', 'Rondônia'], ['RR', 'Roraima'],
  ['SC', 'Santa Catarina'], ['SP', 'São Paulo'], ['TO', 'Tocantins'],
]

export function DadosForm({
  municipios,
  prefilledMunicipio,
  prefilledWhatsapp,
  prefilledEscolaridade,
  prefilledNivelEconomico,
  algumPrefill,
  exigirTitulo = false,
  perguntarSexo = false,
  prefilledSexo,
}: {
  municipios: Municipio[]
  prefilledMunicipio?: number
  prefilledWhatsapp?: string
  /**
   * Opção de escolaridade marcada numa edição anterior (cdl_base). Quem
   * só tem o estrato 'fundamental' da 1ª edição chega sem seleção — a
   * opção era ambígua (ver lib/demograficos.ts).
   */
  prefilledEscolaridade?: EscolaridadeDetalhe
  /**
   * Renda informada em edição anterior (cdl_base) — editável. Só os
   * valores da 2ª edição (salários mínimos) são pré-preenchidos.
   */
  prefilledNivelEconomico?: NivelEconomico
  algumPrefill: boolean
  /** true quando o eleitor tem 16-17: voto facultativo, exige título. */
  exigirTitulo?: boolean
  /**
   * true quando a consulta cadastral (cdl_base/SPC) NÃO trouxe o sexo, ou
   * quando o valor existente é autodeclarado (nesta sessão ou em edição
   * anterior) e por isso pode ser corrigido. A fonte cadastral, quando
   * existe, tem prioridade e não é editável.
   */
  perguntarSexo?: boolean
  /** Valor autodeclarado anterior, pré-preenchido no select (editável). */
  prefilledSexo?: 'M' | 'F'
}) {
  const [state, formAction, pending] = useActionState(
    confirmarDados,
    initialState,
  )
  const [whatsapp, setWhatsapp] = useState(
    prefilledWhatsapp
      ? formatarWhatsappInput(prefilledWhatsapp.replace(/^\+55/, ''))
      : '',
  )
  const [deviceFingerprint, setDeviceFingerprint] = useState('')
  const [titulo, setTitulo] = useState('')
  // Estado (UF) do título. SE usa a lista do servidor (com cotas); outra
  // UF carrega o JSON estático pré-gerado (public/municipios/{UF}.json,
  // IBGE completo — 5.571 municípios).
  const [uf, setUf] = useState('SE')
  const [municipiosUf, setMunicipiosUf] = useState<
    Array<{ i: number; n: string }>
  >([])
  const [carregandoMun, setCarregandoMun] = useState(false)

  useEffect(() => {
    if (uf === 'SE') return
    let vivo = true
    setCarregandoMun(true)
    fetch(`/municipios/${uf}.json`)
      .then((r) => r.json())
      .then((lista) => {
        if (vivo) setMunicipiosUf(lista)
      })
      .catch(() => {
        if (vivo) setMunicipiosUf([])
      })
      .finally(() => {
        if (vivo) setCarregandoMun(false)
      })
    return () => {
      vivo = false
    }
  }, [uf])

  useEffect(() => {
    gerarDeviceFingerprint().then((fp) => {
      if (fp) setDeviceFingerprint(fp)
    })
  }, [])

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {algumPrefill ? (
        <p className="text-sm text-muted-foreground bg-muted border border-border rounded-md px-3 py-2">
          Pré-preenchemos o que conseguimos identificar. Confira e ajuste se
          algo estiver errado.
        </p>
      ) : null}

      {/* Município = domicílio ELEITORAL, não residência. O prefill vem do
          endereço do cadastro oficial, que diverge pra quem mudou de cidade
          sem transferir o título. Por isso o rótulo pergunta em vez de
          afirmar: quem só confirma sem ler erraria a variável que mais pesa
          na ponderação geográfica. */}
      {/* AVISO GRANDE: domicílio ELEITORAL, não residência. */}
      <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3">
        <p className="text-base font-bold text-amber-900">
          ⚠️ Informe onde você VOTA
        </p>
        <p className="text-sm text-amber-800 leading-snug mt-1">
          É o estado e a cidade do seu <strong>título de eleitor</strong> —
          pode ser diferente de onde você mora hoje. Eleitor de{' '}
          <strong>Sergipe</strong> vota em todos os cargos; eleitor de outro
          estado vota <strong>só para Presidente</strong>.
        </p>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">
          Em qual estado você vota?
        </span>
        <select
          value={uf}
          onChange={(e) => setUf(e.target.value)}
          className="h-12 px-3 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {UFS.map(([sigla, nome]) => (
            <option key={sigla} value={sigla}>
              {nome} ({sigla})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">
          Em qual cidade você vota?
        </span>
        {uf === 'SE' ? (
          <select
            name="municipio_ibge"
            required
            defaultValue={prefilledMunicipio ?? ''}
            aria-invalid={state.field === 'municipio_ibge'}
            className="h-12 px-3 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="" disabled>
              Selecione…
            </option>
            {municipios.map((m) => (
              <option key={m.ibge_codigo} value={m.ibge_codigo}>
                {m.nome}
              </option>
            ))}
          </select>
        ) : (
          <select
            name="municipio_ibge"
            required
            key={uf}
            defaultValue=""
            aria-invalid={state.field === 'municipio_ibge'}
            className="h-12 px-3 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="" disabled>
              {carregandoMun ? 'Carregando municípios…' : 'Selecione…'}
            </option>
            {municipiosUf.map((m) => (
              <option key={m.i} value={m.i}>
                {m.n}
              </option>
            ))}
          </select>
        )}
        <span className="text-xs text-muted-foreground">
          {prefilledMunicipio && uf === 'SE'
            ? 'Confira: é a cidade do seu título de eleitor, que pode ser diferente de onde você mora hoje.'
            : 'A cidade do seu título de eleitor — pode ser diferente de onde você mora hoje.'}
        </span>
      </label>

      {/* Título de eleitor — só para 16-17 (voto facultativo, CF art. 14
          §1º II c). Aos 18+ o alistamento é obrigatório e não pedimos.
          O número é validado no servidor e NÃO é armazenado. */}
      {exigirTitulo ? (
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">
            Número do título de eleitor
          </span>
          <input
            type="text"
            name="titulo_eleitor"
            inputMode="numeric"
            autoComplete="off"
            required
            value={titulo}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, '').slice(0, 12)
              const grupos = d.match(/.{1,4}/g)
              setTitulo(grupos ? grupos.join(' ') : d)
            }}
            placeholder="0000 0000 0000"
            aria-invalid={state.field === 'titulo_eleitor'}
            className="h-12 px-3 rounded-md border border-border bg-background font-mono tracking-wide focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <span className="text-xs text-muted-foreground">
            Aos 16 e 17 anos o voto é facultativo — só participa quem já tem
            título. Digite os 12 números do título (sem a zona/seção). Ele é
            usado só para conferir sua elegibilidade e <strong>não é
            guardado</strong>.
          </span>
        </label>
      ) : null}

      {/* Faixa etária NUNCA é perguntada — vem da consulta cadastral por CPF
          (cdl_base/SPC) no passo anterior. Sexo também vem de lá, mas a
          consulta ao SPC devolve o campo vazio para parte dos eleitores
          (sobretudo jovens sem histórico cadastral: na 1ª edição, 22% dos
          respondentes ficaram sem sexo). Nesses casos, e só neles, a
          pergunta aparece aqui — a Resolução TSE 23.747/2026 exige sexo na
          ponderação da amostra. */}
      {perguntarSexo ? (
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Sexo</span>
          <select
            name="sexo"
            required
            defaultValue={prefilledSexo ?? ''}
            aria-invalid={state.field === 'sexo'}
            className="h-12 px-3 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="" disabled>
              Selecione…
            </option>
            <option value="F">Feminino</option>
            <option value="M">Masculino</option>
          </select>
          <span className="text-xs text-muted-foreground">
            {prefilledSexo
              ? 'A consulta cadastral do seu CPF não trouxe essa informação; você a informou nesta pesquisa. Confira e corrija se necessário.'
              : 'A consulta cadastral do seu CPF não trouxe essa informação. Informe o sexo do seu registro civil (o mesmo do cadastro eleitoral) — é exigido pela Resolução TSE 23.747/2026 para a ponderação da amostra.'}
          </span>
        </label>
      ) : null}

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">Escolaridade</span>
        <select
          name="escolaridade"
          required
          defaultValue={prefilledEscolaridade ?? ''}
          aria-invalid={state.field === 'escolaridade'}
          className="h-12 px-3 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="" disabled>
            Selecione…
          </option>
          {ESCOLARIDADE_DETALHES.map((v) => (
            <option key={v} value={v}>
              {ESCOLARIDADE_DETALHE_ROTULO[v]}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">
          Marque a opção que mais se parece com o seu caso, mesmo que não
          tenha terminado.
        </span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">
          Somando o que todos da sua casa ganham por mês, dá quanto?
        </span>
        <select
          name="nivel_economico"
          required
          defaultValue={prefilledNivelEconomico ?? ''}
          aria-invalid={state.field === 'nivel_economico'}
          className="h-12 px-3 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="" disabled>
            Selecione…
          </option>
          {NIVEIS_ECONOMICOS.map((v) => (
            <option key={v} value={v}>
              {NIVEL_ECONOMICO_ROTULO[v]}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">
          Conte salários, aposentadoria, pensão, benefícios e bicos de todas
          as pessoas da casa. A resposta só entra em totais estatísticos da
          amostra e não altera o resultado da pesquisa. Se preferir, marque
          &ldquo;Prefiro não informar&rdquo;.
        </span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">WhatsApp</span>
        <input
          type="tel"
          name="whatsapp"
          required
          inputMode="numeric"
          autoComplete="tel"
          placeholder="(79) 99999-8888"
          value={whatsapp}
          onChange={(e) => setWhatsapp(formatarWhatsappInput(e.target.value))}
          aria-invalid={state.field === 'whatsapp'}
          className="h-12 px-4 rounded-md border border-border bg-background tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <span className="text-xs text-muted-foreground">
          Vamos enviar um código de 6 dígitos por WhatsApp pra confirmar que o
          número é seu.
        </span>
      </label>

      {state.message ? (
        <p
          role="alert"
          aria-live="polite"
          className="text-sm text-error bg-error/5 border border-error/20 rounded-md px-3 py-2"
        >
          {state.message}
        </p>
      ) : null}

      {/* Opt-in opcional para receber os resultados via WhatsApp.
          Default não-marcado (consentimento explícito LGPD art. 7º I).
          Mensagem clara sobre quando e o que será enviado. */}
      <label className="flex items-start gap-3 text-sm text-foreground border border-border rounded-md px-4 py-3 bg-accent/5 cursor-pointer hover:bg-accent/10 transition">
        <input
          type="checkbox"
          name="opt_in_resultados_wa"
          value="1"
          className="mt-0.5 w-5 h-5 rounded border-border accent-accent cursor-pointer flex-none"
        />
        <span className="leading-relaxed">
          <strong>Quero receber os resultados em primeira mão</strong> no meu
          WhatsApp, quando a CDL Aracaju divulgar os resultados. Envio único
          por edição, sem campanha ou propaganda. Posso cancelar a qualquer
          momento solicitando exclusão dos meus dados.
        </span>
      </label>

      {/* Identificador do dispositivo (gerado client-side via canvas +
          UA + screen + timezone, hash SHA-256). O servidor só ARMAZENA
          pra auditoria pós-coleta — não trava cadastro por aparelho. */}
      <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-4">
        Ao enviar, você confirma que leu a{' '}
        <a href="/privacidade" target="_blank" rel="noreferrer" className="text-primary hover:underline">
          Política de Privacidade
        </a>
        . Guardamos no cadastro: CPF em hash, nome, WhatsApp, UF e município
        do título, sexo (informado por você só quando o cadastro não traz),
        faixa etária, escolaridade, faixa de renda e os dados devolvidos pela
        consulta cadastral ao SPC Brasil. O número do título (16–17 anos) é
        conferido e não é guardado. Endereço IP, navegador e uma impressão do
        dispositivo ficam registrados só para auditoria, sem bloquear ninguém.
        Seus votos ficam em tabela separada, sem ligação com o CPF.
      </p>
      {deviceFingerprint ? (
        <input
          type="hidden"
          name="device_fingerprint"
          value={deviceFingerprint}
        />
      ) : null}

      <button
        type="submit"
        disabled={pending || !deviceFingerprint}
        className="h-14 px-6 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition"
      >
        {pending
          ? 'Enviando código…'
          : deviceFingerprint
            ? 'Enviar código no WhatsApp'
            : 'Validando dispositivo…'}
      </button>
    </form>
  )
}
