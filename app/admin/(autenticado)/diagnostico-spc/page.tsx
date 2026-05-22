import { requireAdmin } from '@/lib/admin-auth'
import { DEV_MODE, SERVER_ENV } from '@/lib/env'
import { consultarSpc } from '@/lib/spc'

import { DiagnosticoForm } from './form-client'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ cpf?: string }>

export default async function DiagnosticoSpcPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  await requireAdmin()

  const { cpf: cpfParam } = await searchParams
  const cpf = (cpfParam ?? '').replace(/\D/g, '')

  let resultadoConsultarSpc: unknown = null
  let payloadBruto: unknown = null

  if (cpf.length === 11) {
    const t0 = Date.now()
    resultadoConsultarSpc = await consultarSpc(cpf)
    const duracaoConsulta = Date.now() - t0

    // Chamada paralela direto na API SPC pra ver o payload bruto
    if (!DEV_MODE && !SERVER_ENV.SPC_MOCK) {
      const user = SERVER_ENV.SPC_USER
      const senha = SERVER_ENV.SPC_PASSWORD
      if (user && senha) {
        try {
          const usarNova = SERVER_ENV.SPC_USAR_API_NOVA
          let url: string
          let init: RequestInit
          const auth = Buffer.from(`${user}:${senha}`).toString('base64')
          if (usarNova) {
            url =
              SERVER_ENV.SPC_AMBIENTE === 'producao'
                ? SERVER_ENV.SPC_API_URL_NOVA
                : SERVER_ENV.SPC_API_URL_NOVA_HOMOLOG
            init = {
              method: 'POST',
              headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
              body: JSON.stringify({
                codigoProduto: SERVER_ENV.SPC_CODIGO_PRODUTO_NOVO,
                tipoConsumidor: 'F',
                documentoConsumidor: cpf,
                codigoInsumoOpcional: [],
              }),
              cache: 'no-store',
            }
          } else {
            const base =
              SERVER_ENV.SPC_AMBIENTE === 'producao'
                ? SERVER_ENV.SPC_API_URL
                : SERVER_ENV.SPC_API_URL_HOMOLOG
            url = `${base.replace(/\/+$/, '')}/cpf/${cpf}/1`
            init = {
              method: 'GET',
              headers: {
                Authorization: `Basic ${auth}`,
                Accept: 'application/json',
              },
              cache: 'no-store',
            }
          }
          const ctrl = new AbortController()
          const timer = setTimeout(() => ctrl.abort(), 10_000)
          const t1 = Date.now()
          const res = await fetch(url, { ...init, signal: ctrl.signal })
          clearTimeout(timer)
          const duracaoBruto = Date.now() - t1
          const text = await res.text()
          let parsed: unknown = null
          let erroParse: string | null = null
          try {
            parsed = JSON.parse(text)
          } catch {
            erroParse = 'resposta não é JSON'
          }
          // Mascara campos sensíveis
          const mascararStr = (v: unknown): unknown =>
            typeof v === 'string' && v.length > 4
              ? v.slice(0, 2) + '***' + v.slice(-2)
              : v
          let payloadMascarado: unknown = parsed
          if (parsed && typeof parsed === 'object') {
            const copy: Record<string, unknown> = {
              ...(parsed as Record<string, unknown>),
            }
            for (const k of ['nome', 'nomeDaMae', 'cep', 'endereco', 'cpf']) {
              if (k in copy) copy[k] = mascararStr(copy[k])
            }
            payloadMascarado = copy
          }

          payloadBruto = {
            http_status: res.status,
            http_status_text: res.statusText,
            duracao_ms: duracaoBruto,
            headers: Object.fromEntries(res.headers.entries()),
            erro_parse: erroParse,
            campos:
              parsed && typeof parsed === 'object'
                ? Object.keys(parsed)
                : [],
            dataDeNascimento:
              parsed && typeof parsed === 'object'
                ? (parsed as Record<string, unknown>).dataDeNascimento ??
                  null
                : null,
            payload_mascarado: payloadMascarado,
            corpo_se_nao_json: erroParse ? text.slice(0, 800) : null,
          }
        } catch (e) {
          payloadBruto = {
            erro: e instanceof Error ? e.message : String(e),
          }
        }
      } else {
        payloadBruto = {
          aviso:
            'SPC_USER ou SPC_PASSWORD não configurado nas envs — payload bruto indisponível',
        }
      }
    }

    return (
      <div className="flex flex-col gap-6">
        <Header cpf={cpf} duracao={duracaoConsulta} />
        <DiagnosticoForm valorInicial={cpfParam ?? ''} />
        <SecaoContexto />
        <SecaoConsultarSpc resultado={resultadoConsultarSpc} />
        <SecaoPayloadBruto bruto={payloadBruto} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Header cpf={null} duracao={null} />
      <DiagnosticoForm valorInicial={cpfParam ?? ''} />
      <SecaoContexto />
      <p className="text-sm text-muted-foreground italic">
        Informe um CPF de 11 dígitos acima e clique &quot;Diagnosticar&quot;
        para ver o resultado.
      </p>
    </div>
  )
}

function Header({
  cpf,
  duracao,
}: {
  cpf: string | null
  duracao: number | null
}) {
  return (
    <header className="flex flex-col gap-1">
      <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        Diagnóstico
      </p>
      <h1 className="text-2xl font-semibold">Teste SPC por CPF</h1>
      <p className="text-sm text-muted-foreground">
        Reproduz a consulta SPC do fluxo /votar e mostra payload bruto +
        resultado processado. Use pra investigar erros que o eleitor vê
        como &quot;servico_indisponivel&quot;.
      </p>
      {cpf && duracao !== null ? (
        <p className="text-xs text-muted-foreground">
          CPF testado: <code>{cpf}</code> · Duração: {duracao}ms
        </p>
      ) : null}
    </header>
  )
}

function SecaoContexto() {
  return (
    <section className="rounded-md border border-border bg-muted/40 p-4 text-sm flex flex-col gap-2">
      <h2 className="text-base font-semibold">Contexto do servidor</h2>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <dt className="text-muted-foreground">DEV_MODE</dt>
        <dd className="font-mono">{String(DEV_MODE)}</dd>
        <dt className="text-muted-foreground">SPC_MOCK</dt>
        <dd className="font-mono">{String(SERVER_ENV.SPC_MOCK)}</dd>
        <dt className="text-muted-foreground">SPC_AMBIENTE</dt>
        <dd className="font-mono">{SERVER_ENV.SPC_AMBIENTE}</dd>
        <dt className="text-muted-foreground">SPC_USER definido?</dt>
        <dd className="font-mono">
          {String(Boolean(SERVER_ENV.SPC_USER))}
        </dd>
        <dt className="text-muted-foreground">SPC_PASSWORD definido?</dt>
        <dd className="font-mono">
          {String(Boolean(SERVER_ENV.SPC_PASSWORD))}
        </dd>
        <dt className="text-muted-foreground">SPC_API_URL</dt>
        <dd className="font-mono text-[10px] break-all">
          {SERVER_ENV.SPC_API_URL}
        </dd>
        <dt className="text-muted-foreground">SPC_CODIGO_PRODUTO (JUD)</dt>
        <dd className="font-mono">{SERVER_ENV.SPC_CODIGO_PRODUTO}</dd>
        <dt className="text-muted-foreground font-bold text-foreground">
          SPC_USAR_API_NOVA
        </dt>
        <dd className="font-mono font-bold text-foreground">
          {String(SERVER_ENV.SPC_USAR_API_NOVA)}{' '}
          {SERVER_ENV.SPC_USAR_API_NOVA ? '← POST /spcconsulta' : '← GET /spc/remoting (JUD legado)'}
        </dd>
        {SERVER_ENV.SPC_USAR_API_NOVA ? (
          <>
            <dt className="text-muted-foreground">SPC_API_URL_NOVA</dt>
            <dd className="font-mono text-[10px] break-all">
              {SERVER_ENV.SPC_API_URL_NOVA}
            </dd>
            <dt className="text-muted-foreground">SPC_CODIGO_PRODUTO_NOVO</dt>
            <dd className="font-mono">{SERVER_ENV.SPC_CODIGO_PRODUTO_NOVO}</dd>
          </>
        ) : null}
      </dl>
    </section>
  )
}

function SecaoConsultarSpc({ resultado }: { resultado: unknown }) {
  return (
    <section className="rounded-md border border-border bg-background p-4 flex flex-col gap-2">
      <h2 className="text-base font-semibold">
        consultarSpc() — resultado processado
      </h2>
      <p className="text-xs text-muted-foreground">
        Esta é a função que o /votar usa pra decidir se o CPF passa.
      </p>
      <pre className="text-[11px] font-mono bg-muted rounded p-3 overflow-x-auto whitespace-pre-wrap break-all">
        {JSON.stringify(resultado, null, 2)}
      </pre>
    </section>
  )
}

function SecaoPayloadBruto({ bruto }: { bruto: unknown }) {
  return (
    <section className="rounded-md border-2 border-primary/30 bg-primary/5 p-4 flex flex-col gap-2">
      <h2 className="text-base font-semibold">
        Payload bruto direto da API SPC
      </h2>
      <p className="text-xs text-muted-foreground">
        Resposta HTTP crua, com nome/endereço mascarados. Use pra
        comparar com o que o Melhores do Ano recebe e identificar
        diferença de formato.
      </p>
      <pre className="text-[11px] font-mono bg-background rounded p-3 overflow-x-auto whitespace-pre-wrap break-all border border-primary/20">
        {JSON.stringify(bruto, null, 2)}
      </pre>
    </section>
  )
}
