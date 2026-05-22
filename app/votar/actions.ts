'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { cpfValido, mascararCpf, normalizarCpf } from '@/lib/cpf'
import { hashCpf } from '@/lib/crypto'
import { consultarSpc, type SpcDadosEleitor } from '@/lib/spc'
import { setPreVoto, type PreVotoDraft } from '@/lib/sessao'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyTurnstile } from '@/lib/turnstile'

export type VotarFormState = {
  ok: boolean
  message?: string
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
    return { ok: false, message: 'Informe o CPF.' }
  }

  const cpf = normalizarCpf(raw)
  if (!cpfValido(cpf)) {
    return { ok: false, message: 'CPF inválido. Verifique os dígitos.' }
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
      message: 'Erro de sistema. Tente novamente em instantes.',
    }
  }
  if (!edicao) {
    return {
      ok: false,
      message: 'Nenhuma pesquisa está ativa neste momento.',
    }
  }
  if (new Date(edicao.fim) < new Date()) {
    return { ok: false, message: 'Esta edição da pesquisa já foi encerrada.' }
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
            message: 'CPF não localizado. Confirme os dígitos e tente de novo.',
          }
        case 'cpf_irregular':
          return {
            ok: false,
            message:
              'CPF está em situação irregular na Receita Federal. Regularize e tente novamente.',
          }
        case 'idade_minima':
          return {
            ok: false,
            message:
              'A Pesquisa Sergipe 2026 é uma pesquisa de intenção de voto e só pode ser respondida por eleitores com idade mínima de 16 anos (Constituição Federal, art. 14, §1º). Volte quando completar a idade mínima.',
          }
        case 'idade_indeterminada':
          return {
            ok: false,
            message:
              'Não foi possível confirmar sua data de nascimento na Receita Federal. Verifique seus dados ou tente novamente mais tarde.',
          }
        case 'nao_integrado':
          return {
            ok: false,
            message:
              'Validação SPC ainda não está disponível nesta versão. Aguarde o piloto fechado.',
          }
        case 'erro_api':
        default:
          return {
            ok: false,
            message: 'Erro na validação. Tente novamente em alguns minutos.',
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
        message:
          'Não foi possível confirmar sua faixa etária nos cadastros oficiais. Tente novamente mais tarde.',
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
      message:
        'Não foi possível determinar sua faixa etária. Tente novamente mais tarde.',
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
