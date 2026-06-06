/**
 * Diagnóstico SPC — endpoint admin-only que chama consultarSpc com um
 * CPF arbitrário e devolve a resposta crua (incluindo `detalhe` da
 * razão de falha). Útil pra reproduzir e debugar erros que o eleitor
 * vê como "Erro na validação. Tente novamente em alguns minutos."
 *
 * Uso (autenticado como admin):
 *   GET /api/admin/spc-teste?cpf=12345678901
 *
 * Retorna o SpcResult tal qual, mais infos de contexto (variáveis de
 * ambiente vistas pelo servidor — sem expor senhas).
 */

import { NextResponse } from 'next/server'

import { registrarAcessoAdmin } from '@/lib/admin-audit'
import { isAdmin } from '@/lib/admin-auth'
import { DEV_MODE, SERVER_ENV } from '@/lib/env'
import { consultarSpc } from '@/lib/spc'

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ erro: 'unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const cpf = (searchParams.get('cpf') ?? '').replace(/\D/g, '')
  const includeRaw = searchParams.get('raw') === '1'

  if (cpf.length !== 11) {
    return NextResponse.json(
      { erro: 'cpf_formato', detalhe: 'Informe ?cpf= com 11 dígitos' },
      { status: 400 },
    )
  }

  // Trilha de auditoria: rota API pode ser chamada via curl/fetch
  // bypassando a UI. Registrar aqui garante que TODO acesso gera log.
  // CPF mascarado (3 primeiros + 2 últimos) — coerente com o que
  // a página /admin/diagnostico-spc grava.
  await registrarAcessoAdmin(
    'view_diagnostico_spc',
    {
      cpf_mascarado: cpf.slice(0, 3) + '*****' + cpf.slice(-2),
      via: 'api',
      include_raw: includeRaw,
      api: SERVER_ENV.SPC_USAR_API_NOVA ? 'nova' : 'jud',
    },
    'cpf_lookup',
  )

  const t0 = Date.now()
  const resultado = await consultarSpc(cpf)
  const duracaoMs = Date.now() - t0

  // Quando ?raw=1, faz uma chamada paralela direto na API SPC pra
  // ver o payload BRUTO — útil pra diagnosticar quando consultarSpc
  // diz "ok mas sem faixaEtaria" (data de nascimento em formato
  // inesperado, campo missing, etc).
  let payloadBruto: unknown = null
  if (includeRaw && !DEV_MODE && !SERVER_ENV.SPC_MOCK) {
    const user = SERVER_ENV.SPC_USER
    const senha = SERVER_ENV.SPC_PASSWORD
    if (user && senha) {
      try {
        const base =
          SERVER_ENV.SPC_AMBIENTE === 'producao'
            ? SERVER_ENV.SPC_API_URL
            : SERVER_ENV.SPC_API_URL_HOMOLOG
        const url = `${base.replace(/\/+$/, '')}/cpf/${cpf}/1`
        const auth = Buffer.from(`${user}:${senha}`).toString('base64')
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), 10_000)
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Basic ${auth}`,
            Accept: 'application/json',
          },
          signal: ctrl.signal,
          cache: 'no-store',
        })
        clearTimeout(timer)
        const text = await res.text()
        try {
          const json = JSON.parse(text) as Record<string, unknown>
          // Mascara campos potencialmente sensíveis antes de devolver
          // (este endpoint é admin-only mas precaução ajuda em
          // screenshots eventuais).
          const mascarar = (v: unknown): string =>
            typeof v === 'string' && v.length > 4
              ? v.slice(0, 2) + '***' + v.slice(-2)
              : '***'
          const mascarado: Record<string, unknown> = { ...json }
          for (const k of ['nome', 'nomeDaMae', 'cep', 'endereco']) {
            if (k in mascarado) mascarado[k] = mascarar(mascarado[k])
          }
          payloadBruto = {
            http_status: res.status,
            campos: Object.keys(json),
            // dataDeNascimento sempre exposta — é o que precisamos
            // ver pra diagnosticar formato. NÃO é dado sensível
            // por si só sem outros identificadores.
            dataDeNascimento: json.dataDeNascimento ?? null,
            data_payload_mascarado: mascarado,
          }
        } catch {
          payloadBruto = {
            http_status: res.status,
            erro_parse: 'resposta não-JSON',
            corpo: text.slice(0, 500),
          }
        }
      } catch (e) {
        payloadBruto = { erro: e instanceof Error ? e.message : String(e) }
      }
    }
  }

  return NextResponse.json({
    resultado,
    contexto: {
      dev_mode: DEV_MODE,
      spc_mock: SERVER_ENV.SPC_MOCK,
      spc_ambiente: SERVER_ENV.SPC_AMBIENTE,
      spc_user_definido: Boolean(SERVER_ENV.SPC_USER),
      spc_password_definido: Boolean(SERVER_ENV.SPC_PASSWORD),
      spc_codigo_produto: SERVER_ENV.SPC_CODIGO_PRODUTO,
      duracao_ms: duracaoMs,
    },
    ...(includeRaw ? { payload_bruto: payloadBruto } : {}),
  })
}
