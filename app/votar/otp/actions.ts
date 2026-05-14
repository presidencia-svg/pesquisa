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
    max: 15,
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

  // 3a. Marca o codigo como consumido.
  const { error: errMark } = await db
    .from('whatsapp_codigos')
    .update({ validado: true })
    .eq('id', otp.id)
  if (errMark) {
    console.error('[otp] erro marcando codigo validado:', errMark)
    return { ok: false, message: 'Erro de sistema. Tente novamente.' }
  }

  // 3b. Marca o eleitor como WhatsApp-validado.
  const { error: errEleitor } = await db
    .from('eleitores_pesquisa')
    .update({ wa_validado: true })
    .eq('edicao_id', draft.edicaoId)
    .eq('cpf_hash', draft.cpfHash)
  if (errEleitor) {
    console.error('[otp] erro marcando eleitor wa_validado:', errEleitor)
    return { ok: false, message: 'Erro de sistema. Tente novamente.' }
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
  //     Inclui o municipioIbge no cookie pra que o /votar/cedula possa
  //     decidir condicionalmente se mostra a cedula de zona_expansao
  //     (apenas Aracaju + Sao Cristovao). Isso NAO escreve municipio
  //     no votos_pesquisa — fica so client-side.
  await clearPreVoto()
  await setVotoToken(tokenClaro, draft.municipioIbge)

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
