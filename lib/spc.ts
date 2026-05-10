/**
 * Consulta ao SPC Brasil — API REST.
 *
 * Adaptado do projeto Melhores do Ano (lib/spc/client.ts), com mesmas
 * variaveis de ambiente pra permitir reuso direto de credenciais.
 *
 * Server-only.
 */
import 'server-only'

import { DEV_MODE, SERVER_ENV } from './env'

export type SpcDadosEleitor = {
  nomeMascarado?: string
  municipioIbge?: number
  whatsappE164?: string
  sexo?: 'M' | 'F'
  faixaEtaria?: '16-17' | '18-24' | '25-34' | '35-44' | '45-59' | '60+'
  escolaridade?: 'fundamental' | 'medio' | 'superior'
}

export type SpcResult =
  | { ok: true; dados: SpcDadosEleitor }
  | {
      ok: false
      razao: 'cpf_inexistente' | 'cpf_irregular' | 'erro_api' | 'nao_integrado'
      detalhe?: string
    }

/**
 * Estrutura conhecida da resposta SPC (extraida do uso em producao no
 * projeto Melhores do Ano). Campos extras sao preservados via index
 * signature.
 */
type SpcResponseShape = {
  result?: {
    return_object?: {
      resultado?: {
        consumidor?: {
          consumidorPessoaFisica?: {
            nome?: string
            dataNascimento?: number
            sexo?: string
          }
        } | null
      }
    }
    error?: string | boolean
    message?: string
  }
}

const TIMEOUT_MS = 15_000

export async function consultarSpc(cpfDigits: string): Promise<SpcResult> {
  if (!/^\d{11}$/.test(cpfDigits)) {
    return { ok: false, razao: 'erro_api', detalhe: 'CPF inválido (formato)' }
  }

  // Modo MOCK explicito (SPC_MOCK=true) — util pra dev sem chave SPC
  // ainda contratada. NAO ative em producao.
  if (DEV_MODE || SERVER_ENV.SPC_MOCK) {
    return {
      ok: true,
      dados: stubDevPrefill(cpfDigits),
    }
  }

  const user = SERVER_ENV.SPC_USER
  const password = SERVER_ENV.SPC_PASSWORD
  if (!user || !password) {
    return { ok: false, razao: 'nao_integrado' }
  }

  const url =
    SERVER_ENV.SPC_AMBIENTE === 'producao'
      ? SERVER_ENV.SPC_API_URL
      : SERVER_ENV.SPC_API_URL_HOMOLOG

  const auth = Buffer.from(`${user}:${password}`).toString('base64')

  let response: Response
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        codigoProduto: SERVER_ENV.SPC_CODIGO_PRODUTO,
        tipoConsumidor: 'F',
        documentoConsumidor: cpfDigits,
        codigoInsumoOpcional: [],
      }),
      signal: ctrl.signal,
      cache: 'no-store',
    })
    clearTimeout(timer)
  } catch (err) {
    console.error('[spc] erro de rede:', err)
    return {
      ok: false,
      razao: 'erro_api',
      detalhe: err instanceof Error ? err.message : 'falha de rede',
    }
  }

  if (response.status === 401 || response.status === 403) {
    return { ok: false, razao: 'erro_api', detalhe: 'Auth SPC inválida' }
  }
  if (response.status === 429) {
    return { ok: false, razao: 'erro_api', detalhe: 'Rate limit SPC' }
  }

  let data: SpcResponseShape
  try {
    data = (await response.json()) as SpcResponseShape
  } catch {
    return { ok: false, razao: 'erro_api', detalhe: 'resposta nao-JSON do SPC' }
  }

  // SPC retorna erro estruturado mesmo em HTTP 200 / 500.
  if (data.result?.error === true || data.result?.error === 'true') {
    const msg = data.result?.message ?? 'Erro SPC'
    console.error('[spc] erro estruturado:', msg)
    return { ok: false, razao: 'erro_api', detalhe: msg }
  }

  const pf =
    data.result?.return_object?.resultado?.consumidor?.consumidorPessoaFisica
  const nome = pf?.nome?.trim()
  if (!nome) {
    return { ok: false, razao: 'cpf_inexistente' }
  }

  // Mapeia pra SpcDadosEleitor.
  const dados: SpcDadosEleitor = {
    nomeMascarado: mascararNome(nome),
  }

  if (pf?.dataNascimento) {
    const data = new Date(pf.dataNascimento)
    if (!Number.isNaN(data.getTime())) {
      const faixa = calcularFaixaEtaria(data)
      if (faixa) dados.faixaEtaria = faixa
    }
  }

  if (pf?.sexo === 'M' || pf?.sexo === 'F') {
    dados.sexo = pf.sexo
  }

  return { ok: true, dados }
}

/**
 * Stub determinístico pra DEV_MODE/SPC_MOCK. Gera prefill sintetico
 * baseado no ultimo digito do CPF — o suficiente pra testar a UX sem
 * SPC real.
 */
function stubDevPrefill(cpfDigits: string): SpcDadosEleitor {
  const ultimoDigito = Number(cpfDigits.slice(-1))
  const faixas = [
    '18-24',
    '25-34',
    '35-44',
    '45-59',
    '60+',
    '25-34',
    '35-44',
    '45-59',
    '18-24',
    '60+',
  ] as const
  const escolaridades = ['fundamental', 'medio', 'superior'] as const
  return {
    nomeMascarado: 'Eleitor T. ***',
    sexo: ultimoDigito % 2 === 0 ? 'F' : 'M',
    faixaEtaria: faixas[ultimoDigito],
    escolaridade: escolaridades[ultimoDigito % 3],
  }
}

/**
 * Faixa etaria a partir de data de nascimento. Cortes alinhados com o
 * que o TSE publica em estatisticas de eleitorado.
 */
export const calcularFaixaEtaria = (
  dataNascimento: Date,
): SpcDadosEleitor['faixaEtaria'] => {
  const hoje = new Date()
  let idade = hoje.getFullYear() - dataNascimento.getFullYear()
  const m = hoje.getMonth() - dataNascimento.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < dataNascimento.getDate())) {
    idade--
  }

  if (idade < 16) return undefined
  if (idade <= 17) return '16-17'
  if (idade <= 24) return '18-24'
  if (idade <= 34) return '25-34'
  if (idade <= 44) return '35-44'
  if (idade <= 59) return '45-59'
  return '60+'
}

/**
 * Mascara nome conforme padrao LGPD do projeto: 'Maria S. ***'
 */
export const mascararNome = (nomeCompleto: string): string => {
  const partes = nomeCompleto.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '***'
  if (partes.length === 1) return `${partes[0]}`
  const primeiro = partes[0]
  const segundo = partes[1]?.[0]?.toUpperCase()
  return segundo ? `${primeiro} ${segundo}. ***` : `${primeiro} ***`
}
