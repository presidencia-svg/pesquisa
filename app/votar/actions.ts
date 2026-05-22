'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { cpfValido, mascararCpf, normalizarCpf } from '@/lib/cpf'
import { hashCpf } from '@/lib/crypto'
import { consultarSpc, type SpcDadosEleitor } from '@/lib/spc'
import { setPreVoto, type PreVotoDraft } from '@/lib/sessao'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyTurnstile } from '@/lib/turnstile'

/**
 * Códigos de erro estruturados para o cliente diferenciar UX:
 *  - input_invalido    → erro do usuário, mostra mensagem simples
 *  - cpf_invalido      → mesmo grupo, foco no input do CPF
 *  - idade_minima      → bloqueio definitivo, sem botão "tentar de novo"
 *  - cpf_irregular     → bloqueio definitivo, instrui regularização
 *  - servico_indisponivel → falha transitória, sugere tentar mais tarde +
 *                            mostra canal de suporte
 *  - rate_limit        → muitas tentativas, espera
 *  - sistema           → erro nosso, mostra suporte
 */
export type VotarErroCode =
  | 'input_invalido'
  | 'cpf_invalido'
  | 'idade_minima'
  | 'cpf_irregular'
  | 'cpf_inativo'
  | 'cpf_falecido'
  | 'navegador_anonimo'
  | 'servico_indisponivel'
  | 'rate_limit'
  | 'sistema'

export type VotarFormState = {
  ok: boolean
  message?: string
  code?: VotarErroCode
}

const RATE_LIMIT_WINDOW_MIN = 5
const RATE_LIMIT_MAX = 5

/**
 * Server Action chamada pelo form de /votar.
 *
 * Fluxo:
 *  1. Valida formato + checksum do CPF.
 *  2. Busca edicao ativa.
 *  3. Aplica rate limit por IP.
 *  4. Hasheia CPF, busca em `cdl_base`. Hit -> fonte='cdl_base', skip SPC,
 *     puxa pre-preenchimento do que estiver na cdl_base.
 *  5. Miss em cdl_base -> consulta SPC. Sucesso -> fonte='spc', spc_validado=true,
 *     pre-preenchimento com o que SPC retornou. Falha -> erro pro eleitor.
 *  6. Grava rascunho no cookie `pre_voto` e redireciona pra /votar/confirma.
 *
 * NAO cria linha em `eleitores_pesquisa` ainda — a linha so entra quando
 * o eleitor confirmar municipio + WhatsApp em /votar/confirma.
 */
export async function entrarComCpf(
  _prev: VotarFormState,
  formData: FormData,
): Promise<VotarFormState> {
  const raw = formData.get('cpf')
  if (typeof raw !== 'string' || raw.length === 0) {
    return { ok: false, code: 'input_invalido', message: 'Informe o CPF.' }
  }

  const cpf = normalizarCpf(raw)
  if (!cpfValido(cpf)) {
    return {
      ok: false,
      code: 'cpf_invalido',
      message: 'CPF inválido. Verifique os dígitos.',
    }
  }

  // Bloqueio de modo anônimo/incógnito. O cliente detecta via
  // navigator.storage.estimate() e envia este flag — se vier "1",
  // recusa o cadastro mesmo que o JS tenha sido contornado.
  if (formData.get('navegador_anonimo') === '1') {
    return {
      ok: false,
      code: 'navegador_anonimo',
      message:
        'O cadastro não é permitido em navegação anônima ou privativa. Abra esta página em uma janela normal e tente novamente.',
    }
  }

  // 0. Anti-bot (Turnstile) — antes de tudo. Em DEV_MODE faz bypass.
  const headersListEarly = await headers()
  const xffEarly = headersListEarly.get('x-forwarded-for')
  const ipEarly = xffEarly ? (xffEarly.split(',')[0]?.trim() ?? null) : null
  const tokenTurnstile = formData.get('cf-turnstile-response')
  const tokenStr = typeof tokenTurnstile === 'string' ? tokenTurnstile : null
  const turnstile = await verifyTurnstile(tokenStr, ipEarly)
  if (!turnstile.ok) {
    return {
      ok: false,
      code: 'input_invalido',
      message:
        'Verificação anti-bot falhou. Recarregue a página e tente novamente.',
    }
  }

  const db = supabaseAdmin()

  // 1. Edicao ativa
  const { data: edicao, error: errEdicao } = await db
    .from('edicao')
    .select('id, fim')
    .eq('ativa', true)
    .maybeSingle()
  if (errEdicao) {
    console.error('[votar] erro buscando edicao:', errEdicao)
    return {
      ok: false,
      code: 'sistema',
      message: 'Erro de sistema. Tente novamente em instantes.',
    }
  }
  if (!edicao) {
    return {
      ok: false,
      code: 'sistema',
      message: 'Nenhuma pesquisa está ativa neste momento.',
    }
  }
  if (new Date(edicao.fim) < new Date()) {
    return {
      ok: false,
      code: 'sistema',
      message: 'Esta edição da pesquisa já foi encerrada.',
    }
  }

  // 2. Rate limit por IP
  const headersList = await headers()
  const xff = headersList.get('x-forwarded-for')
  const ip = xff ? (xff.split(',')[0]?.trim() ?? null) : null

  if (ip) {
    const desde = new Date(
      Date.now() - RATE_LIMIT_WINDOW_MIN * 60_000,
    ).toISOString()
    const { count } = await db
      .from('rate_limit_ip')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)
      .eq('acao', 'votar_cpf')
      .gte('criado_em', desde)
    if ((count ?? 0) >= RATE_LIMIT_MAX) {
      return {
        ok: false,
        code: 'rate_limit',
        message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
      }
    }
    await db.from('rate_limit_ip').insert({ ip, acao: 'votar_cpf' })
  }

  // 3. Hash + lookup cdl_base
  const cpfHash = hashCpf(cpf)

  const { data: cdl } = await db
    .from('cdl_base')
    .select(
      'municipio_ibge, whatsapp_e164, nome_mascarado, sexo, faixa_etaria, escolaridade',
    )
    .eq('cpf_hash', cpfHash)
    .maybeSingle()

  const fonte: 'cdl_base' | 'spc' = cdl ? 'cdl_base' : 'spc'

  // 4. SPC é consultado quando cdl_base não tem faixa_etaria (hit incompleto
  //    OU miss completo). Faixa é OBRIGATÓRIA — sem ela, não permitimos o
  //    cadastro (Resolução TSE 23.747/2026 exige ponderação demográfica,
  //    e a idade não é perguntada ao eleitor pra evitar autodeclaração
  //    incorreta ou tentativa de burlar bloqueio de menor de 16 anos).
  //
  //    Quando o SPC traz a faixa, gravamos de volta no cdl_base (UPSERT)
  //    pra acelerar consultas futuras e construir um cache permanente.
  let spcValidado: boolean
  let prefillSpc: SpcDadosEleitor = {}
  const precisaSpc = !cdl || !cdl.faixa_etaria

  if (!precisaSpc) {
    // cdl_base hit com faixa — confiança total nos dados locais
    spcValidado = true
  } else {
    const spc = await consultarSpc(cpf)
    if (!spc.ok) {
      console.error('[votar] SPC falhou', {
        razao: spc.razao,
        detalhe: spc.detalhe,
      })
      switch (spc.razao) {
        case 'cpf_inexistente':
          return {
            ok: false,
            code: 'cpf_invalido',
            message: 'CPF não localizado. Confirme os dígitos e tente de novo.',
          }
        case 'cpf_irregular':
          return {
            ok: false,
            code: 'cpf_irregular',
            message:
              'Seu CPF está com pendência de regularização na Receita Federal. Acesse gov.br/receitafederal para regularizar e tente novamente.',
          }
        case 'cpf_inativo':
          return {
            ok: false,
            code: 'cpf_inativo',
            message:
              'Seu CPF não está ativo na Receita Federal (suspenso, cancelado ou nulo). Apenas eleitores com CPF regular podem participar desta pesquisa.',
          }
        case 'cpf_falecido':
          return {
            ok: false,
            code: 'cpf_falecido',
            message:
              'A Receita Federal indica óbito vinculado a este CPF. Em respeito ao titular, não é possível prosseguir.',
          }
        case 'idade_minima':
          return {
            ok: false,
            code: 'idade_minima',
            message:
              'A Pesquisa Sergipe 2026 é uma pesquisa de intenção de voto e só pode ser respondida por eleitores com idade mínima de 16 anos (Constituição Federal, art. 14, §1º). Volte quando completar a idade mínima.',
          }
        case 'idade_indeterminada':
          return {
            ok: false,
            code: 'servico_indisponivel',
            message:
              'Não foi possível confirmar sua data de nascimento na Receita Federal. Tente novamente em alguns minutos — se persistir, contate dpo@cdlaju.com.br.',
          }
        case 'nao_integrado':
          return {
            ok: false,
            code: 'servico_indisponivel',
            message:
              'A validação de identidade está temporariamente indisponível. A pesquisa abrirá em breve — acompanhe em pesquisa.cdlaju.com.br.',
          }
        case 'erro_api':
        default:
          return {
            ok: false,
            code: 'servico_indisponivel',
            message:
              'Não foi possível validar seu CPF no momento. Tente novamente em alguns minutos. Se o problema persistir, contate dpo@cdlaju.com.br informando o horário da tentativa.',
          }
      }
    }
    spcValidado = true
    prefillSpc = spc.dados

    // SPC respondeu OK mas sem faixaEtaria (dataDeNascimento ausente
    // ou inválida). Não permitimos prosseguir sem idade comprovada.
    if (!prefillSpc.faixaEtaria) {
      console.error('[votar] SPC ok mas sem faixaEtaria', { cpfHash })
      return {
        ok: false,
        code: 'servico_indisponivel',
        message:
          'Não foi possível confirmar sua faixa etária nos cadastros oficiais. Tente novamente em alguns minutos. Se persistir, contate dpo@cdlaju.com.br.',
      }
    }

    // Cache em cdl_base: UPDATE se hit incompleto, INSERT se miss.
    // origem='spc_lookup' distingue do importado de Melhores do Ano.
    // PK do cdl_base é cpf_hash, então .upsert() funciona limpo.
    const cacheRow: Record<string, unknown> = {
      cpf_hash: cpfHash,
      faixa_etaria: prefillSpc.faixaEtaria,
    }
    if (!cdl) {
      cacheRow.origem = 'spc_lookup'
      if (prefillSpc.nomeMascarado) cacheRow.nome_mascarado = prefillSpc.nomeMascarado
      if (prefillSpc.sexo) cacheRow.sexo = prefillSpc.sexo
      if (prefillSpc.escolaridade) cacheRow.escolaridade = prefillSpc.escolaridade
      if (prefillSpc.municipioIbge) cacheRow.municipio_ibge = prefillSpc.municipioIbge
      if (prefillSpc.whatsappE164) cacheRow.whatsapp_e164 = prefillSpc.whatsappE164
    }
    const { error: errCache } = await db
      .from('cdl_base')
      .upsert(cacheRow, { onConflict: 'cpf_hash' })
    if (errCache) {
      // Não bloqueia o fluxo — cache é otimização, não pré-requisito.
      console.error('[votar] erro ao popular cdl_base com dados SPC', errCache)
    }
  }

  // 5. Monta rascunho. Faixa etária garantida: vem do cdl_base (hit
  //    com faixa) ou do SPC (caso contrário). Sexo/escolaridade/etc
  //    são opcionais — formulário pergunta o que faltar.
  const draft: PreVotoDraft = {
    cpfHash,
    cpfMascarado: mascararCpf(cpf),
    edicaoId: edicao.id,
    fonte,
    spcValidado,
  }

  const municipio = cdl?.municipio_ibge ?? prefillSpc.municipioIbge
  if (municipio) draft.municipioIbge = municipio

  const whatsapp = cdl?.whatsapp_e164 ?? prefillSpc.whatsappE164
  if (whatsapp) draft.whatsappE164 = whatsapp

  const nome = cdl?.nome_mascarado ?? prefillSpc.nomeMascarado
  if (nome) draft.nomeMascarado = nome

  const sexoPrefill = (cdl?.sexo ?? prefillSpc.sexo) as
    | 'M'
    | 'F'
    | undefined
  if (sexoPrefill) draft.sexo = sexoPrefill

  // Faixa etária: sempre presente neste ponto (cdl_base hit com faixa
  // OU SPC retornou faixaEtaria — caso contrário já teríamos abortado).
  const faixaPrefill = (cdl?.faixa_etaria ?? prefillSpc.faixaEtaria) as
    | PreVotoDraft['faixaEtaria']
    | undefined
  if (!faixaPrefill) {
    // Defesa em profundidade — não deve chegar aqui se a lógica
    // acima estiver correta. Mas se chegar, abortar é o seguro.
    console.error('[votar] faixaEtaria ausente após resolução', { cpfHash })
    return {
      ok: false,
      code: 'sistema',
      message:
        'Não foi possível determinar sua faixa etária. Contate dpo@cdlaju.com.br se persistir.',
    }
  }
  draft.faixaEtaria = faixaPrefill

  const escolPrefill = (cdl?.escolaridade ?? prefillSpc.escolaridade) as
    | PreVotoDraft['escolaridade']
    | undefined
  if (escolPrefill) draft.escolaridade = escolPrefill

  await setPreVoto(draft)

  redirect('/votar/confirma')
}
