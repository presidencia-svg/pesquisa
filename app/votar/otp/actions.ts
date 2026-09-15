'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'

import { compararHashes, gerarOtp, hashOtp } from '@/lib/crypto'
import { mensagemJanela } from '@/lib/edicao-janela'
import { DEV_MODE, OTP_DESATIVADO } from '@/lib/env'
import { enviarOtpWhatsApp, metaWhatsappConfigurada } from '@/lib/meta-whatsapp'
import { atravessarPonte, checarJanela } from '@/lib/ponte-voto'
import { registrarTentativaIp } from '@/lib/rate-limit'
import { getPreVoto, setPreVoto } from '@/lib/sessao'
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

  // CONTINGÊNCIA (OTP_DESATIVADO): quem ainda tem o rascunho da etapa
  // anterior no cookie (chegou a /votar/otp antes do deploy) atravessa a
  // ponte sem código. Ver lib/env.ts.
  if (OTP_DESATIVADO) {
    const dbSemOtp = supabaseAdmin()
    const janelaSemOtp = await checarJanela(dbSemOtp, draft.edicaoId)
    if (janelaSemOtp !== 'aberta') {
      return { ok: false, message: mensagemJanela(janelaSemOtp) }
    }
    const ponte = await atravessarPonte(dbSemOtp, draft, '[otp/sem-otp]')
    if (!ponte.ok) return { ok: false, message: ponte.message }
    redirect('/votar/anonimo')
  }

  const parsed = codigoSchema.safeParse(formData.get('codigo'))
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? 'Código inválido.',
    }
  }

  // Sem bloqueio por IP (CGNAT). O bruteforce é segurado por
  // TENTATIVAS_MAX=3 por código; aqui só fica o rastro pra auditoria.
  await registrarTentativaIp('otp_validar')

  const codigoDigitado = parsed.data
  const db = supabaseAdmin()

  // 0. Janela de coleta declarada no PesqEle: fora dela não se emite
  //    cápsula (antes só a etapa do CPF conferia `fim`).
  const janela = await checarJanela(db, draft.edicaoId)
  if (janela !== 'aberta') {
    return { ok: false, message: mensagemJanela(janela) }
  }

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

  // 3b–3d. Marca eleitor validado, grava sexo autodeclarado no cache,
  //        gera token anônimo e troca os cookies (lib/ponte-voto.ts).
  const ponte = await atravessarPonte(db, draft, '[otp]')
  if (!ponte.ok) return { ok: false, message: ponte.message }

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

  // CONTINGÊNCIA (OTP_DESATIVADO): não há código pra reenviar; atravessa
  // a ponte direto (mesmas travas do caminho normal).
  if (OTP_DESATIVADO) {
    const janelaSemOtp = await checarJanela(db, draft.edicaoId)
    if (janelaSemOtp !== 'aberta') {
      return { ok: false, message: mensagemJanela(janelaSemOtp) }
    }
    const ponte = await atravessarPonte(db, draft, '[otp-reenvio/sem-otp]')
    if (!ponte.ok) return { ok: false, message: ponte.message }
    redirect('/votar/anonimo')
  }

  // Janela de coleta: encerrada → não dispara mensagem paga nem reabre
  // caminho pra cápsula fora do período registrado.
  const janela = await checarJanela(db, draft.edicaoId)
  if (janela !== 'aberta') {
    return { ok: false, message: mensagemJanela(janela) }
  }

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

  // Sem bloqueio por IP (CGNAT). O que segura OTP-bombing, cota da Meta
  // e ban do número é o teto por CPF logo abaixo; o IP fica só no rastro.
  await registrarTentativaIp('otp_reenviar')

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
