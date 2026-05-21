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

import { isAdmin } from '@/lib/admin-auth'
import { DEV_MODE, SERVER_ENV } from '@/lib/env'
import { consultarSpc } from '@/lib/spc'

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ erro: 'unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const cpf = (searchParams.get('cpf') ?? '').replace(/\D/g, '')

  if (cpf.length !== 11) {
    return NextResponse.json(
      { erro: 'cpf_formato', detalhe: 'Informe ?cpf= com 11 dígitos' },
      { status: 400 },
    )
  }

  const t0 = Date.now()
  const resultado = await consultarSpc(cpf)
  const duracaoMs = Date.now() - t0

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
  })
}
