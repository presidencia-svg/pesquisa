'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { gerarOtp, hashOtp } from '@/lib/crypto'
import { DEV_MODE } from '@/lib/env'
import { enviarOtpWhatsApp, metaWhatsappConfigurada } from '@/lib/meta-whatsapp'
import { checarRateLimit } from '@/lib/rate-limit'
import { getPreVoto, setPreVoto } from '@/lib/sessao'
import { supabaseAdmin } from '@/lib/supabase/admin'

export type ConfirmaState = {
  ok: boolean
  message?: string
  field?: string
}

/**
 * Valida o WhatsApp em formato E.164 simplificado (BR).
 * Aceita "+5579999998888" ou "5579999998888" ou "(79) 99999-8888".
 * Sempre normaliza pra +55XXXXXXXXXXX (12 a 13 digitos depois do +55).
 */
const normalizarWhatsapp = (raw: string): string | null => {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 11) return `+55${digits}` // celular sem DDI: 79 99999-8888
  if (digits.length === 13 && digits.startsWith('55')) return `+${digits}`
  if (digits.length === 12 && digits.startsWith('55')) return `+${digits}` // fixo (raro)
  return null
}

const schema = z.object({
  municipio_ibge: z.coerce
    .number()
    .int()
    .positive({ message: 'Selecione seu município.' }),
  sexo: z.enum(['M', 'F'], { message: 'Selecione uma opção.' }),
  faixa_etaria: z.enum(['16-17', '18-24', '25-34', '35-44', '45-59', '60+'], {
    message: 'Selecione uma faixa etária.',
  }),
  escolaridade: z.enum(['fundamental', 'medio', 'superior'], {
    message: 'Selecione sua escolaridade.',
  }),
  whatsapp: z.string().min(11, { message: 'Informe seu número com DDD.' }),
})

const OTP_VALIDADE_MIN = 10

export async function confirmarDados(
  _prev: ConfirmaState,
  formData: FormData,
): Promise<ConfirmaState> {
  const draft = await getPreVoto()
  if (!draft) {
    return {
      ok: false,
      message: 'Sua sessão expirou. Volte ao início e digite o CPF novamente.',
    }
  }

  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors as Record<
      string,
      string[] | undefined
    >
    const firstField = Object.keys(flat)[0]
    const firstMsg = firstField ? flat[firstField]?.[0] : undefined
    return {
      ok: false,
      message: firstMsg ?? 'Dados inválidos.',
      ...(firstField ? { field: firstField } : {}),
    }
  }

  const { municipio_ibge, sexo, faixa_etaria, escolaridade, whatsapp } =
    parsed.data
  const whatsappE164 = normalizarWhatsapp(whatsapp)
  if (!whatsappE164) {
    return {
      ok: false,
      field: 'whatsapp',
      message: 'WhatsApp inválido. Use formato (DDD) 9XXXX-XXXX.',
    }
  }

  // Captura IP + user_agent dos headers — antifraude + auditoria.
  const h = await headers()
  const xff = h.get('x-forwarded-for')
  const ip = xff ? (xff.split(',')[0]?.trim() ?? null) : null
  const userAgent = h.get('user-agent') ?? null

  // Rate limit: max 5 envios de OTP por IP / 15min. Protege contra
  // bot que tentaria spammear WhatsApps de CPFs reais (custo Meta +
  // incomodo ao eleitor titular).
  const rl = await checarRateLimit({
    acao: 'otp_enviar',
    max: 5,
    janelaMin: 15,
  })
  if (!rl.ok) {
    return { ok: false, message: rl.message }
  }

  const db = supabaseAdmin()

  // 1. Verificar cota do município (skip em DEV_MODE)
  if (!DEV_MODE) {
    const { data: muni } = await db
      .from('municipios_se')
      .select('nome, cota_pesquisa')
      .eq('ibge_codigo', municipio_ibge)
      .maybeSingle()
    if (!muni) {
      return {
        ok: false,
        field: 'municipio_ibge',
        message: 'Município não encontrado.',
      }
    }
    if (muni.cota_pesquisa && muni.cota_pesquisa > 0) {
      const { count } = await db
        .from('eleitores_pesquisa')
        .select('id', { count: 'exact', head: true })
        .eq('edicao_id', draft.edicaoId)
        .eq('municipio_ibge', municipio_ibge)
        .eq('wa_validado', true)
      if ((count ?? 0) >= muni.cota_pesquisa) {
        return {
          ok: false,
          field: 'municipio_ibge',
          message: `A cota de ${muni.nome} já foi atingida nesta pesquisa.`,
        }
      }
    }
  }

  // 2. Insert ou update da linha eleitores_pesquisa
  const { data: existing } = await db
    .from('eleitores_pesquisa')
    .select('id, wa_validado')
    .eq('edicao_id', draft.edicaoId)
    .eq('cpf_hash', draft.cpfHash)
    .maybeSingle()

  if (existing?.wa_validado) {
    return {
      ok: false,
      message: 'Esta pessoa já participou desta edição da pesquisa.',
    }
  }

  if (existing) {
    const { error: errUpd } = await db
      .from('eleitores_pesquisa')
      .update({
        municipio_ibge,
        sexo,
        faixa_etaria,
        escolaridade,
        whatsapp_e164: whatsappE164,
        ip,
        user_agent: userAgent,
      })
      .eq('id', existing.id)
    if (errUpd) {
      console.error('[confirma] erro update eleitores_pesquisa:', errUpd)
      return {
        ok: false,
        message: DEV_MODE
          ? `[DEV] update eleitores_pesquisa: ${errUpd.message}${errUpd.details ? ` — ${errUpd.details}` : ''}`
          : 'Erro ao salvar dados. Tente novamente.',
      }
    }
  } else {
    const { error: errIns } = await db.from('eleitores_pesquisa').insert({
      edicao_id: draft.edicaoId,
      cpf_hash: draft.cpfHash,
      cpf_mascarado: draft.cpfMascarado,
      nome_mascarado: draft.nomeMascarado ?? null,
      municipio_ibge,
      sexo,
      faixa_etaria,
      escolaridade,
      whatsapp_e164: whatsappE164,
      spc_validado: draft.spcValidado,
      wa_validado: false,
      fonte: draft.fonte,
      ip,
      user_agent: userAgent,
    })
    if (errIns) {
      console.error('[confirma] erro insert eleitores_pesquisa:', errIns)
      return {
        ok: false,
        message: DEV_MODE
          ? `[DEV] insert eleitores_pesquisa: ${errIns.message}${errIns.details ? ` — ${errIns.details}` : ''}`
          : 'Erro ao iniciar cadastro. Tente novamente.',
      }
    }
  }

  // 2.5 — cdl_base cresce: novos CPFs validados via SPC entram aqui pra
  //       futuras pesquisas pularem a consulta. Quem ja' estava (origem
  //       'melhores_do_ano') tem so os campos enriquecidos pelo form
  //       (municipio, whatsapp, demograficos), origem inalterada.
  //       Falha aqui nao bloqueia o eleitor — so loga.
  try {
    if (draft.fonte === 'spc') {
      // CPF novo: insert com origem nova. ON CONFLICT (race condition
      // hipotetica) ignora duplicado.
      const { error: errCdl } = await db.from('cdl_base').upsert(
        {
          cpf_hash: draft.cpfHash,
          municipio_ibge,
          whatsapp_e164: whatsappE164,
          nome_mascarado: draft.nomeMascarado ?? null,
          sexo,
          faixa_etaria,
          escolaridade,
          origem: 'spc_pesquisa_2026',
        },
        { onConflict: 'cpf_hash', ignoreDuplicates: true },
      )
      if (errCdl) console.error('[confirma] erro upsert cdl_base:', errCdl)
    } else {
      // Ja' estava em cdl_base: enriquece dados sem mudar origem.
      const { error: errCdl } = await db
        .from('cdl_base')
        .update({
          municipio_ibge,
          whatsapp_e164: whatsappE164,
          sexo,
          faixa_etaria,
          escolaridade,
        })
        .eq('cpf_hash', draft.cpfHash)
      if (errCdl) console.error('[confirma] erro update cdl_base:', errCdl)
    }
  } catch (errCdl) {
    console.error('[confirma] excecao cdl_base:', errCdl)
  }

  // 3. Gerar e salvar OTP
  const codigo = gerarOtp()
  const codigoHash = hashOtp(codigo)
  const expiraEm = new Date(
    Date.now() + OTP_VALIDADE_MIN * 60_000,
  ).toISOString()

  // Invalida codigos anteriores do mesmo CPF nesta edicao (validado=false e
  // ainda nao expirou) — eleitor sempre usa o ultimo enviado.
  await db
    .from('whatsapp_codigos')
    .update({ validado: true }) // 'validado=true' aqui significa "consumido/invalidado", nao confunde com "wa_validado" do eleitor
    .eq('edicao_id', draft.edicaoId)
    .eq('cpf_hash', draft.cpfHash)
    .eq('validado', false)

  const { error: errOtp } = await db.from('whatsapp_codigos').insert({
    edicao_id: draft.edicaoId,
    cpf_hash: draft.cpfHash,
    whatsapp_e164: whatsappE164,
    codigo_hash: codigoHash,
    expira_em: expiraEm,
  })
  if (errOtp) {
    console.error('[confirma] erro insert whatsapp_codigos:', errOtp)
    return {
      ok: false,
      message: DEV_MODE
        ? `[DEV] insert whatsapp_codigos: ${errOtp.message}${errOtp.details ? ` — ${errOtp.details}` : ''}`
        : 'Erro ao gerar código. Tente novamente.',
    }
  }

  // 4. Enviar via WhatsApp ou logar em DEV_MODE
  if (DEV_MODE) {
    console.log('\n========================================')
    console.log(`[DEV_MODE] OTP para ${whatsappE164}: ${codigo}`)
    console.log(`(expira em ${OTP_VALIDADE_MIN} min)`)
    console.log('========================================\n')
  } else if (metaWhatsappConfigurada()) {
    const envio = await enviarOtpWhatsApp(whatsappE164, codigo)
    if (!envio.ok) {
      console.error('[confirma] falha envio Meta WA:', envio.detalhe)
      return {
        ok: false,
        message:
          'Não foi possível enviar o código. Verifique o número e tente novamente.',
      }
    }
  } else {
    return {
      ok: false,
      message:
        'Integração WhatsApp não configurada. Avise o operador da pesquisa.',
    }
  }

  // 5. Atualizar cookie com whatsapp + municipio confirmados
  await setPreVoto({
    ...draft,
    municipioIbge: municipio_ibge,
    whatsappE164,
  })

  redirect('/votar/otp')
}
