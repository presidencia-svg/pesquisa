'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'

import {
  compararHashes,
  gerarOtp,
  gerarTokenVoto,
  hashOtp,
  hashTokenVoto,
} from '@/lib/crypto'
import { DEV_MODE } from '@/lib/env'
import { enviarOtpWhatsApp, metaWhatsappConfigurada } from '@/lib/meta-whatsapp'
import { checarRateLimit } from '@/lib/rate-limit'
import {
  clearPreVoto,
  getPreVoto,
  setPreVoto,
  setVotoToken,
} from '@/lib/sessao'
import { supabaseAdmin } from '@/lib/supabase/admin'

export type OtpState = {
  ok: boolean
  message?: string
  /** Quantas tentativas ainda restam neste codigo. -1 = expirado. */
  tentativasRestantes?: number
}

const TENTATIVAS_MAX = 3
const OTP_VALIDADE_MIN = 10

const codigoSchema = z
  .string()
  .regex(/^\d{6}$/, { message: 'Digite os 6 dígitos do código.' })

/**
 * Valida o codigo OTP digitado, e — se valido — DESTROI A PONTE entre
 * Sala 1 e Sala 2:
 *   1. Marca eleitor.wa_validado = true.
 *   2. Marca whatsapp_codigos.validado = true.
 *   3. Gera token de voto aleatorio. Hash dele entra em tokens_emitidos
 *      (sem nenhuma referencia ao CPF). Token em claro vai pro cookie
 *      `voto`.
 *   4. Apaga o cookie `pre_voto` (Sala 1).
 *
 * Apos esta acao, o servidor nao tem como ligar este token a um CPF.
 * O eleitor entra na capsula com o cookie novo.
 */
export async function validarOtp(
  _prev: OtpState,
  formData: FormData,
): Promise<OtpState> {
  const draft = await getPreVoto()
  if (!draft) {
    return {
      ok: false,
      message: 'Sua sessão expirou. Volte ao início.',
    }
  }

  const parsed = codigoSchema.safeParse(formData.get('codigo'))
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? 'Código inválido.',
    }
  }

  // Rate limit: max 15 validacoes de OTP por IP / 15min.
  // O bruteforce ja' tem TENTATIVAS_MAX=3 por codigo; isso eh defesa
  // adicional contra rotacao de CPF/codigos por bot.
  const rl = await checarRateLimit({
    acao: 'otp_validar',
    max: 40, // por IP — rede compartilhada; o bruteforce real é segurado por código
    janelaMin: 15,
  })
  if (!rl.ok) {
    return { ok: false, message: rl.message }
  }

  const codigoDigitado = parsed.data
  const db = supabaseAdmin()

  // 1. Pega o ultimo OTP emitido pra esse CPF nesta edicao.
  const { data: otp, error: errOtp } = await db
    .from('whatsapp_codigos')
    .select('id, codigo_hash, tentativas, validado, expira_em')
    .eq('edicao_id', draft.edicaoId)
    .eq('cpf_hash', draft.cpfHash)
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (errOtp) {
    console.error('[otp] erro buscando codigo:', errOtp)
    return { ok: false, message: 'Erro de sistema. Tente novamente.' }
  }
  if (!otp) {
    return {
      ok: false,
      message: 'Nenhum código encontrado. Solicite um novo.',
    }
  }
  if (otp.validado) {
    return {
      ok: false,
      message: 'Este código já foi usado. Solicite um novo.',
    }
  }
  if (new Date(otp.expira_em) < new Date()) {
    return {
      ok: false,
      message: 'Código expirado. Solicite um novo.',
      tentativasRestantes: -1,
    }
  }
  if (otp.tentativas >= TENTATIVAS_MAX) {
    return {
      ok: false,
      message: 'Tentativas esgotadas. Solicite um novo código.',
      tentativasRestantes: 0,
    }
  }

  // 2. Compara hash do codigo digitado com o armazenado (timing-safe).
  const codigoHashDigitado = hashOtp(codigoDigitado)
  if (!compararHashes(codigoHashDigitado, otp.codigo_hash)) {
    const tentativasNova = otp.tentativas + 1
    await db
      .from('whatsapp_codigos')
      .update({ tentativas: tentativasNova })
      .eq('id', otp.id)
    return {
      ok: false,
      message: 'Código incorreto.',
      tentativasRestantes: TENTATIVAS_MAX - tentativasNova,
    }
  }

  // 3. CODIGO VALIDO — vamos atravessar a ponte.

  // 3a. Marca o codigo como consumido COM CHECK DE RACE.
  //
  // Usar UPDATE ... WHERE validado=false e checar rowsAffected eh um
  // compare-and-swap atomico do Postgres. Se 2 requests simultaneas
  // chegarem com o mesmo OTP correto, so' UMA consegue passar daqui —
  // a outra recebera 0 linhas atualizadas e sera abortada antes de
  // gerar um segundo token pro mesmo CPF.
  //
  // SEM esse check, o atacante que intercepta o OTP pode fazer 2 POSTs
  // simultaneos e ganhar 2 tokens validos pra votar 2x.
  const { data: marcados, error: errMark } = await db
    .from('whatsapp_codigos')
    .update({ validado: true })
    .eq('id', otp.id)
    .eq('validado', false)
    .select('id')
  if (errMark) {
    console.error('[otp] erro marcando codigo validado:', errMark)
    return { ok: false, message: 'Erro de sistema. Tente novamente.' }
  }
  if (!marcados || marcados.length === 0) {
    // Outra request paralela ja' consumiu este OTP. Aborta antes
    // de gerar token duplicado.
    return {
      ok: false,
      message:
        'Este código já foi usado. Solicite um novo se ainda quiser participar.',
    }
  }

  // 3b. Marca o eleitor como WhatsApp-validado.
  //     Defesa em profundidade: os índices UNIQUE parciais
  //     eleitores_wa_unico_validado_idx e eleitores_device_unico_validado_idx
  //     (migration 020) garantem que mesmo numa race condition entre
  //     dois eleitores validando ao mesmo tempo, só um vai conseguir.
  //     O outro recebe constraint violation (Postgres 23505).
  //     TRAVA DE TOKEN ÚNICO POR CPF (compare-and-swap atômico):
  //     o UPDATE só afeta a linha se token_emitido ainda for false. Assim
  //     um CPF gera NO MÁXIMO um token por edição — mesmo que o atacante
  //     rode o laço reenviarOtp -> validarOtp várias vezes (o índice UNIQUE
  //     por token não pega esse caso porque cada token é distinto).
  const { data: claimed, error: errEleitor } = await db
    .from('eleitores_pesquisa')
    .update({ wa_validado: true, token_emitido: true })
    .eq('edicao_id', draft.edicaoId)
    .eq('cpf_hash', draft.cpfHash)
    .eq('token_emitido', false)
    .select('id')
  if (errEleitor) {
    console.error('[otp] erro marcando eleitor wa_validado:', errEleitor)
    if (errEleitor.code === '23505') {
      const msg = (errEleitor.message ?? '').toLowerCase()
      if (msg.includes('whatsapp') || msg.includes('wa_unico')) {
        return {
          ok: false,
          message:
            'Este número de WhatsApp acabou de ser validado por outro CPF. Cada número participa uma única vez.',
        }
      }
      if (msg.includes('device')) {
        return {
          ok: false,
          message:
            'Este dispositivo acabou de ser validado por outro CPF. Cada aparelho participa uma única vez.',
        }
      }
    }
    return { ok: false, message: 'Erro de sistema. Tente novamente.' }
  }
  if (!claimed || claimed.length === 0) {
    // token_emitido já era true: este CPF já atravessou a ponte nesta
    // edição. Aborta antes de gerar um segundo token (anti vote-stuffing).
    return {
      ok: false,
      message:
        'Este CPF já participou desta edição. Cada CPF vota uma única vez.',
    }
  }

  // 3c. Gera token de voto. Hash entra em tokens_emitidos SEM nenhuma
  //     ligacao ao CPF. criado_hora truncado pra hora cheia (analise
  //     temporal sem permitir cruzamento minuto-a-minuto).
  const tokenClaro = gerarTokenVoto()
  const tokenHash = hashTokenVoto(tokenClaro)
  const horaCheia = new Date()
  horaCheia.setMinutes(0, 0, 0)

  const { error: errToken } = await db.from('tokens_emitidos').insert({
    token_hash: tokenHash,
    edicao_id: draft.edicaoId,
    usado: false,
    criado_hora: horaCheia.toISOString(),
  })
  if (errToken) {
    console.error('[otp] erro gravando token:', errToken)
    return { ok: false, message: 'Erro de sistema. Tente novamente.' }
  }

  // 3d. PONTE DESTRUIDA: limpa cookie da Sala 1, planta cookie da Sala 2.
  //     Cookie da capsula carrega:
  //       - token: identifica o voto em tokens_emitidos (sem CPF)
  //       - municipioIbge: roteamento condicional de zona_expansao +
  //         gravacao em votos_pesquisa.municipio_ibge (migration 011)
  //       - demograficos: copia controlada (sexo/faixa/escol/nivel) que
  //         entra em votos_pesquisa nas colunas da migration 026,
  //         permitindo cruzamento demografico × voto pro relatorio TRE
  //         e narrativa interna (com supressao N>=5 nas views).
  await clearPreVoto()
  await setVotoToken(tokenClaro, {
    municipioIbge: draft.municipioIbge,
    sexo: draft.sexo,
    faixaEtaria: draft.faixaEtaria,
    escolaridade: draft.escolaridade,
    nivelEconomico: draft.nivelEconomico,
  })

  redirect('/votar/anonimo')
}

/**
 * Gera um codigo OTP novo pro mesmo CPF + WhatsApp ja confirmado.
 * Reaproveita o numero do cookie (nao deixa o eleitor mudar de WhatsApp
 * sem voltar pra etapa 2).
 */
export async function reenviarOtp(): Promise<OtpState> {
  const draft = await getPreVoto()
  if (!draft || !draft.whatsappE164) {
    return { ok: false, message: 'Sessão expirou. Volte ao início.' }
  }

  const db = supabaseAdmin()

  // Se este CPF já emitiu token (já votou/atravessou a ponte), não reenvia.
  const { data: jaEleitor } = await db
    .from('eleitores_pesquisa')
    .select('token_emitido')
    .eq('edicao_id', draft.edicaoId)
    .eq('cpf_hash', draft.cpfHash)
    .maybeSingle()
  if (jaEleitor?.token_emitido) {
    return {
      ok: false,
      message: 'Este CPF já participou desta edição.',
    }
  }

  // Rate limit por IP: no máx 3 reenvios / 15 min. Sem isso, o reenvio
  // dispara mensagem paga na Meta a cada chamada — OTP-bombing na vítima,
  // queima de cota e risco de ban do número (derruba TODA a coleta).
  const rlIp = await checarRateLimit({
    acao: 'otp_reenviar',
    max: 10, // por IP — rede compartilhada; o limite por CPF segue apertado abaixo
    janelaMin: 15,
  })
  if (!rlIp.ok) {
    return { ok: false, message: rlIp.message }
  }

  // Teto por CPF (independe do IP): no máx 3 códigos / 15 min pra este CPF.
  const desde15 = new Date(Date.now() - 15 * 60_000).toISOString()
  const { count: enviadosRecentes } = await db
    .from('whatsapp_codigos')
    .select('id', { count: 'exact', head: true })
    .eq('edicao_id', draft.edicaoId)
    .eq('cpf_hash', draft.cpfHash)
    .gte('criado_em', desde15)
  if ((enviadosRecentes ?? 0) >= 3) {
    return {
      ok: false,
      message: 'Muitos reenvios. Aguarde alguns minutos e tente de novo.',
    }
  }

  // Invalida codigos pendentes anteriores.
  await db
    .from('whatsapp_codigos')
    .update({ validado: true })
    .eq('edicao_id', draft.edicaoId)
    .eq('cpf_hash', draft.cpfHash)
    .eq('validado', false)

  // Gera novo.
  const codigo = gerarOtp()
  const codigoHash = hashOtp(codigo)
  const expiraEm = new Date(
    Date.now() + OTP_VALIDADE_MIN * 60_000,
  ).toISOString()

  const { error: errIns } = await db.from('whatsapp_codigos').insert({
    edicao_id: draft.edicaoId,
    cpf_hash: draft.cpfHash,
    whatsapp_e164: draft.whatsappE164,
    codigo_hash: codigoHash,
    expira_em: expiraEm,
  })
  if (errIns) {
    console.error('[otp] erro reenviando codigo:', errIns)
    return { ok: false, message: 'Erro ao gerar código. Tente novamente.' }
  }

  if (DEV_MODE) {
    console.log('\n========================================')
    console.log(`[DEV_MODE] OTP REENVIADO para ${draft.whatsappE164}: ${codigo}`)
    console.log(`(expira em ${OTP_VALIDADE_MIN} min)`)
    console.log('========================================\n')
  } else if (metaWhatsappConfigurada()) {
    const envio = await enviarOtpWhatsApp(draft.whatsappE164, codigo)
    if (!envio.ok) {
      console.error('[otp-reenvio] falha envio Meta WA:', envio.detalhe)
      return {
        ok: false,
        message: 'Não foi possível reenviar o código. Tente novamente.',
      }
    }
  } else {
    return {
      ok: false,
      message: 'Integração WhatsApp não configurada.',
    }
  }

  // Mantem o cookie como esta — so atualiza pra disparar revalidacao da view.
  await setPreVoto(draft)

  return {
    ok: true,
    message: `Enviamos um novo código pra ${mascarar(draft.whatsappE164)}.`,
    tentativasRestantes: TENTATIVAS_MAX,
  }
}

const mascarar = (e164: string): string => {
  const ultimos = e164.slice(-4)
  return `+55 ** ****-${ultimos}`
}
