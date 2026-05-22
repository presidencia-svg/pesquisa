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
      razao:
        | 'cpf_inexistente'
        | 'cpf_irregular'
        | 'cpf_inativo'
        | 'cpf_falecido'
        | 'erro_api'
        | 'nao_integrado'
        | 'idade_minima'
        | 'idade_indeterminada'
      detalhe?: string
    }

/**
 * Resposta da API SPC JUD pra consulta cadastral de CPF.
 * Campos opcionais — alguns só vem se SPC tiver registro.
 *
 * `situacaoReceitaFederal` espelha o status oficial do CPF na RF.
 * Valores comuns observados em produção:
 *   REGULAR / ATIVA              → pode prosseguir
 *   PENDENTE_REGULARIZACAO       → bloqueia (cpf_irregular)
 *   SUSPENSO / SUSPENSA          → bloqueia (cpf_inativo)
 *   CANCELADO_MULTIPLICIDADE     → bloqueia (cpf_inativo)
 *   CANCELADO_OFICIO             → bloqueia (cpf_inativo)
 *   NULA                         → bloqueia (cpf_inativo)
 *   TITULAR_FALECIDO / OBITO     → bloqueia (cpf_falecido)
 *
 * Comparações são feitas case-insensitive e tolerantes a underscore/espaço.
 */
type SpcCadastralResponse = {
  nome?: string
  dataDeNascimento?: string // formato DDMMYYYY (ex: "23011938")
  dataObito?: string
  obitoOcorrido?: boolean
  situacaoReceitaFederal?: string
  situacaoCadastral?: string
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

/**
 * Normaliza string de status pra comparação tolerante.
 * "Cancelado de Ofício" → "cancelado_oficio"
 */
const normalizarStatus = (s: string | undefined): string =>
  (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\s-]+/g, '_')

/** Conjuntos de status interpretados em cada razão de rejeição. */
const STATUS_FALECIDO = new Set([
  'titular_falecido',
  'obito',
  'falecido',
  'obito_ocorrido',
])
const STATUS_REGULAR = new Set(['regular', 'ativa', 'ativo'])
const STATUS_IRREGULAR = new Set([
  'pendente_regularizacao',
  'pendente_de_regularizacao',
  'pendente',
])
const STATUS_INATIVO = new Set([
  'suspenso',
  'suspensa',
  'cancelado_multiplicidade',
  'cancelado_de_multiplicidade',
  'cancelado_oficio',
  'cancelado_de_oficio',
  'cancelado',
  'nula',
  'nulo',
])

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

/**
 * Dispatcher principal — exporta a função usada pelo resto do app.
 * Escolhe a implementação (JUD legada ou API nova) baseado em env.
 *
 * Mantém a mesma interface SpcResult/SpcDadosEleitor pros callers.
 */
export async function consultarSpc(cpfDigits: string): Promise<SpcResult> {
  if (!/^\d{11}$/.test(cpfDigits)) {
    return { ok: false, razao: 'erro_api', detalhe: 'CPF inválido (formato)' }
  }

  // DEV_MODE / SPC_MOCK — stub deterministico pra testar UX sem credencial.
  if (DEV_MODE || SERVER_ENV.SPC_MOCK) {
    const ultimos3 = cpfDigits.slice(-3)
    if (ultimos3 === '000') return { ok: false, razao: 'cpf_falecido' }
    if (ultimos3 === '111') return { ok: false, razao: 'cpf_inativo' }
    if (ultimos3 === '222') return { ok: false, razao: 'cpf_irregular' }
    if (ultimos3 === '333') return { ok: false, razao: 'idade_minima' }
    return { ok: true, dados: stubDevPrefill(cpfDigits) }
  }

  if (SERVER_ENV.SPC_USAR_API_NOVA) {
    return consultarSpcNova(cpfDigits)
  }
  return consultarSpcJud(cpfDigits)
}

/**
 * Implementação SPC JUD (legada) — GET /spc/remoting/rest/consultaCadastral.
 * Mantida como fallback. Resposta flat com nome/dataDeNascimento.
 */
async function consultarSpcJud(cpfDigits: string): Promise<SpcResult> {
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

  // Antes de prosseguir, valida situação cadastral.
  //  • Óbito: bloqueio prioritário, pra mensagem digna ao familiar.
  //  • Inativo (suspenso/cancelado/nulo): bloqueio.
  //  • Irregular (pendente regularização): bloqueio.
  const statusReceita = normalizarStatus(
    data.situacaoReceitaFederal ?? data.situacaoCadastral,
  )

  if (data.obitoOcorrido === true || data.dataObito || STATUS_FALECIDO.has(statusReceita)) {
    return { ok: false, razao: 'cpf_falecido', detalhe: statusReceita || 'obito_ocorrido' }
  }

  if (statusReceita && !STATUS_REGULAR.has(statusReceita)) {
    if (STATUS_INATIVO.has(statusReceita)) {
      return { ok: false, razao: 'cpf_inativo', detalhe: statusReceita }
    }
    if (STATUS_IRREGULAR.has(statusReceita)) {
      return { ok: false, razao: 'cpf_irregular', detalhe: statusReceita }
    }
    // Status desconhecido — tratamos como irregular por precaução.
    return { ok: false, razao: 'cpf_irregular', detalhe: statusReceita }
  }

  const dados: SpcDadosEleitor = {
    nomeMascarado: mascararNome(nome),
  }

  // Quando dataDeNascimento vem, validamos idade mínima e derivamos faixa.
  // Quando não vem (depende do nível de contrato SPC), a faixa fica vazia
  // e o formulário /votar/confirma pergunta ao eleitor como fallback —
  // sem bloquear a consulta.
  if (data.dataDeNascimento) {
    const dt = parseDataDeNascimentoSpc(data.dataDeNascimento)
    if (dt) {
      const idade = calcularIdade(dt)
      if (idade < IDADE_MINIMA_VOTAR) {
        return { ok: false, razao: 'idade_minima' }
      }
      const faixa = calcularFaixaEtaria(dt)
      if (faixa) dados.faixaEtaria = faixa
    }
  }

  return { ok: true, dados }
}

/**
 * Implementação SPC API NOVA — POST /spcconsulta/recurso/consulta/padrao.
 *
 * Estrutura do request:
 *   {
 *     "codigoProduto": "11",
 *     "tipoConsumidor": "F",
 *     "documentoConsumidor": "12345678901",
 *     "codigoInsumoOpcional": []
 *   }
 *
 * Estrutura da resposta (caminho relevante):
 *   result.return_object.resultado.consumidor.consumidorPessoaFisica
 *     ├── nome
 *     ├── dataNascimento  (epoch ms, pode ser negativo pra pré-1970)
 *     ├── idade           (anos completos calculado pelo SPC)
 *     ├── sexo            ('MASCULINO' | 'FEMININO')
 *     └── situacaoCpf.descricaoSituacao  ('REGULAR' | 'CANCELADA' | ...)
 */
type SpcConsultaPadraoResponse = {
  result?: {
    return_object?: {
      resultado?: {
        consumidor?: {
          consumidorPessoaFisica?: {
            nome?: string
            nomeMae?: string
            dataNascimento?: number
            idade?: number
            sexo?: string
            estadoCivil?: string
            situacaoCpf?: {
              descricaoSituacao?: string
              dataSituacao?: number
            }
          }
        }
      }
    }
  }
  message?: string
}

async function consultarSpcNova(cpfDigits: string): Promise<SpcResult> {
  const token = SERVER_ENV.SPC_USER
  const senha = SERVER_ENV.SPC_PASSWORD

  if (!token) return { ok: false, razao: 'nao_integrado' }
  if (!senha) return { ok: false, razao: 'nao_integrado' }

  const url =
    SERVER_ENV.SPC_AMBIENTE === 'producao'
      ? SERVER_ENV.SPC_API_URL_NOVA
      : SERVER_ENV.SPC_API_URL_NOVA_HOMOLOG

  const auth = Buffer.from(`${token}:${senha}`).toString('base64')

  const body = JSON.stringify({
    codigoProduto: SERVER_ENV.SPC_CODIGO_PRODUTO_NOVO,
    tipoConsumidor: 'F',
    documentoConsumidor: cpfDigits,
    codigoInsumoOpcional: [],
  })

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
      body,
      signal: ctrl.signal,
      cache: 'no-store',
    })
    clearTimeout(timer)
  } catch (err) {
    console.error('[spc-nova] erro de rede:', err)
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

  let data: SpcConsultaPadraoResponse
  try {
    data = (await response.json()) as SpcConsultaPadraoResponse
  } catch {
    return {
      ok: false,
      razao: 'erro_api',
      detalhe: 'resposta nao-JSON do SPC',
    }
  }

  if (response.status >= 400) {
    const msg = (data.message ?? '').toLowerCase()
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

  // Extração defensiva — qualquer camada faltando vira cpf_inexistente.
  const pf =
    data?.result?.return_object?.resultado?.consumidor?.consumidorPessoaFisica
  if (!pf || !pf.nome) {
    return { ok: false, razao: 'cpf_inexistente' }
  }

  // 1. Situação do CPF (RF)
  const statusReceita = normalizarStatus(pf.situacaoCpf?.descricaoSituacao)
  if (STATUS_FALECIDO.has(statusReceita)) {
    return { ok: false, razao: 'cpf_falecido', detalhe: statusReceita }
  }
  if (statusReceita && !STATUS_REGULAR.has(statusReceita)) {
    if (STATUS_INATIVO.has(statusReceita)) {
      return { ok: false, razao: 'cpf_inativo', detalhe: statusReceita }
    }
    if (STATUS_IRREGULAR.has(statusReceita)) {
      return { ok: false, razao: 'cpf_irregular', detalhe: statusReceita }
    }
    return { ok: false, razao: 'cpf_irregular', detalhe: statusReceita }
  }

  // 2. Idade — preferimos a `idade` direta; senão calculamos via epoch
  let idade: number | null = null
  if (typeof pf.idade === 'number' && Number.isFinite(pf.idade)) {
    idade = pf.idade
  } else if (
    typeof pf.dataNascimento === 'number' &&
    Number.isFinite(pf.dataNascimento)
  ) {
    idade = calcularIdade(new Date(pf.dataNascimento))
  }

  if (idade === null) {
    console.error('[spc-nova] sem idade nem dataNascimento', {
      campos: Object.keys(pf),
    })
    return { ok: false, razao: 'idade_indeterminada' }
  }

  if (idade < IDADE_MINIMA_VOTAR) {
    return { ok: false, razao: 'idade_minima' }
  }

  // 3. Monta dados de retorno
  const dados: SpcDadosEleitor = {
    nomeMascarado: mascararNome(pf.nome),
  }
  const faixa = idadeParaFaixa(idade)
  if (faixa) dados.faixaEtaria = faixa
  if (pf.sexo === 'FEMININO') dados.sexo = 'F'
  if (pf.sexo === 'MASCULINO') dados.sexo = 'M'

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
 * Parse de data de nascimento tolerante a 3 formatos comuns que a API
 * SPC JUD pode retornar dependendo do nível de contrato:
 *
 *   1. DDMMYYYY   — formato JUD legado (ex.: "23011938")
 *   2. DD/MM/YYYY — com separadores (ex.: "23/01/1938")
 *   3. YYYY-MM-DD — ISO 8601 (ex.: "1938-01-23")
 *
 * Estratégia: tenta ambos os layouts (DDMM ou YYYY no início), valida
 * faixas humanas (ano 1900-2100, mes 1-12, dia 1-31). Retorna a primeira
 * interpretação válida.
 */
function parseDataDeNascimentoSpc(raw: string): Date | null {
  const limpa = raw.replace(/\D/g, '')
  if (limpa.length !== 8) return null

  const checa = (dia: number, mes: number, ano: number): Date | null => {
    if (
      !Number.isFinite(dia) ||
      !Number.isFinite(mes) ||
      !Number.isFinite(ano) ||
      mes < 1 || mes > 12 ||
      dia < 1 || dia > 31 ||
      ano < 1900 || ano > 2100
    ) {
      return null
    }
    return new Date(ano, mes - 1, dia)
  }

  // Tenta DDMMYYYY
  const dt1 = checa(
    Number(limpa.slice(0, 2)),
    Number(limpa.slice(2, 4)),
    Number(limpa.slice(4, 8)),
  )
  if (dt1) return dt1

  // Tenta YYYYMMDD (caso SPC tenha mudado pra ISO)
  const dt2 = checa(
    Number(limpa.slice(6, 8)),
    Number(limpa.slice(4, 6)),
    Number(limpa.slice(0, 4)),
  )
  if (dt2) return dt2

  return null
}

/**
 * Idade em anos completos a partir da data de nascimento.
 * Considera o aniversário ainda não atingido no ano corrente.
 */
export const calcularIdade = (dataNascimento: Date): number => {
  const hoje = new Date()
  let idade = hoje.getFullYear() - dataNascimento.getFullYear()
  const m = hoje.getMonth() - dataNascimento.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < dataNascimento.getDate())) {
    idade--
  }
  return idade
}

/**
 * Idade mínima para alistamento eleitoral conforme CF/88 art. 14, §1º, II.
 * Como a Pesquisa Sergipe 2026 é de intenção de voto, restringimos a
 * participação apenas a quem está em idade de votar.
 */
export const IDADE_MINIMA_VOTAR = 16

/**
 * Faixa etária a partir da IDADE em anos (não da data). Útil quando a
 * API já devolve a idade calculada (caso da API nova SPC).
 */
export const idadeParaFaixa = (
  idade: number,
): SpcDadosEleitor['faixaEtaria'] => {
  if (idade < IDADE_MINIMA_VOTAR) return undefined
  if (idade <= 17) return '16-17'
  if (idade <= 24) return '18-24'
  if (idade <= 34) return '25-34'
  if (idade <= 44) return '35-44'
  if (idade <= 59) return '45-59'
  return '60+'
}

/**
 * Faixa etaria a partir de data de nascimento. Cortes alinhados com o
 * que o TSE publica em estatisticas de eleitorado.
 *
 * Retorna `undefined` quando a pessoa ainda não atingiu a idade mínima
 * para alistamento (16 anos) — esse caso deve ser tratado pelo chamador
 * como rejeição (não como dado simplesmente ausente).
 */
export const calcularFaixaEtaria = (
  dataNascimento: Date,
): SpcDadosEleitor['faixaEtaria'] => {
  return idadeParaFaixa(calcularIdade(dataNascimento))
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
