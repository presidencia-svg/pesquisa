/**
 * Consulta SPC Brasil — API SPC JUD (REST GET).
 *
 * Doc oficial: Manuais_WebService_Integracao_SPCBRASIL_v4.3 / SPC JUD v1.5.
 *
 * Endpoints usados:
 *   GET /spc/remoting/rest/consultaCadastral/cpf/{cpf}/1
 *
 * Auth: Basic com SPC_USER:SPC_PASSWORD. O usuario precisa ter perfil
 * de operador associado abaixo da entidade SPC JUD pra fazer requisicoes
 * — homologacao requer abertura de chamado via Sales Force; producao
 * a propria CDL libera.
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
 * Resposta da API SPC JUD pra consulta cadastral de CPF.
 * Campos opcionais — alguns só vem se SPC tiver registro.
 */
type SpcCadastralResponse = {
  nome?: string
  dataDeNascimento?: string // formato DDMMYYYY (ex: "23011938")
  cpf?: string
  cep?: string
  endereco?: string
  estado?: string
  nomeDaMae?: string
  enderecosInformadosAnteriormente?: Array<unknown>
  telefonesConsultadosAnteriormente?: Array<unknown>
  telefonesVinculadosDocumento?: Array<unknown>
  // Campo de erro retornado em 400/404
  message?: string
}

const TIMEOUT_MS = 15_000

/**
 * Monta URL completa pra consulta cadastral por CPF.
 *
 * Le a base de SPC_API_URL (producao) ou SPC_API_URL_HOMOLOG
 * (homologacao) — definidos em lib/env.ts. Apenda `/cpf/{CPF}/1`.
 *
 * Resultado tipico:
 *   producao:    https://api.spcbrasil.com.br/spc/remoting/rest/consultaCadastral/cpf/12345678901/1
 *   homologacao: https://treinamento.spcbrasil.com.br/spc/remoting/rest/consultaCadastral/cpf/12345678901/1
 */
const construirUrlConsulta = (cpfDigits: string): string => {
  const base =
    SERVER_ENV.SPC_AMBIENTE === 'producao'
      ? SERVER_ENV.SPC_API_URL
      : SERVER_ENV.SPC_API_URL_HOMOLOG
  // Aceita base com ou sem trailing slash.
  const baseClean = base.replace(/\/+$/, '')
  return `${baseClean}/cpf/${cpfDigits}/1`
}

export async function consultarSpc(cpfDigits: string): Promise<SpcResult> {
  if (!/^\d{11}$/.test(cpfDigits)) {
    return { ok: false, razao: 'erro_api', detalhe: 'CPF inválido (formato)' }
  }

  // DEV_MODE / SPC_MOCK — stub deterministico pra testar UX sem credencial.
  if (DEV_MODE || SERVER_ENV.SPC_MOCK) {
    return { ok: true, dados: stubDevPrefill(cpfDigits) }
  }

  const user = SERVER_ENV.SPC_USER
  const password = SERVER_ENV.SPC_PASSWORD
  if (!user || !password) {
    return { ok: false, razao: 'nao_integrado' }
  }

  const url = construirUrlConsulta(cpfDigits)
  const auth = Buffer.from(`${user}:${password}`).toString('base64')

  let response: Response
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
      },
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

  let data: SpcCadastralResponse
  try {
    data = (await response.json()) as SpcCadastralResponse
  } catch {
    return {
      ok: false,
      razao: 'erro_api',
      detalhe: 'resposta nao-JSON do SPC',
    }
  }

  // Erros do SPC JUD vem como HTTP 400 com { "message": "..." }
  if (response.status >= 400) {
    const msg = (data.message ?? '').toLowerCase()
    // Mensagens conhecidas:
    //   "Número do CPF inválido"  → CPF malformado (mas nosso valida antes)
    //   "CPF não foi encontrado"  → CPF nao existe na base SPC
    if (msg.includes('não foi encontrado') || msg.includes('nao foi encontrado')) {
      return { ok: false, razao: 'cpf_inexistente' }
    }
    if (msg.includes('inválido') || msg.includes('invalido')) {
      return { ok: false, razao: 'cpf_inexistente', detalhe: data.message }
    }
    return {
      ok: false,
      razao: 'erro_api',
      detalhe: data.message ?? `HTTP ${response.status}`,
    }
  }

  // Sucesso — extrai dados.
  const nome = data.nome?.trim()
  if (!nome) {
    return { ok: false, razao: 'cpf_inexistente' }
  }

  const dados: SpcDadosEleitor = {
    nomeMascarado: mascararNome(nome),
  }

  if (data.dataDeNascimento) {
    const dt = parseDataDeNascimentoSpc(data.dataDeNascimento)
    if (dt) {
      const faixa = calcularFaixaEtaria(dt)
      if (faixa) dados.faixaEtaria = faixa
    }
  }

  return { ok: true, dados }
}

/**
 * Stub determinístico pra DEV_MODE/SPC_MOCK.
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
 * Parse da data de nascimento que o SPC JUD retorna no formato DDMMYYYY
 * (ex.: "23011938" -> 1938-01-23). Aceita tambem com separadores caso
 * a API mude no futuro.
 */
function parseDataDeNascimentoSpc(raw: string): Date | null {
  const limpa = raw.replace(/\D/g, '')
  if (limpa.length !== 8) return null
  const dia = Number(limpa.slice(0, 2))
  const mes = Number(limpa.slice(2, 4))
  const ano = Number(limpa.slice(4, 8))
  if (
    !Number.isFinite(dia) ||
    !Number.isFinite(mes) ||
    !Number.isFinite(ano) ||
    mes < 1 ||
    mes > 12 ||
    dia < 1 ||
    dia > 31 ||
    ano < 1900 ||
    ano > 2100
  ) {
    return null
  }
  return new Date(ano, mes - 1, dia)
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
