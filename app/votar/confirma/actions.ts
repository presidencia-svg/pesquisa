'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { gerarOtp, hashOtp } from '@/lib/crypto'
import { DEV_MODE } from '@/lib/env'
import { obterIpCliente } from '@/lib/ip'
import { enviarOtpWhatsApp, metaWhatsappConfigurada } from '@/lib/meta-whatsapp'
import { resolverEdicaoAlvo } from '@/lib/edicao-alvo'
import { checarRateLimit } from '@/lib/rate-limit'
import { clearPreVoto, getPreVoto, setPreVoto } from '@/lib/sessao'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { validarTituloEleitor } from '@/lib/titulo-eleitor'

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

const FAIXAS_VALIDAS = ['16-17', '18-24', '25-34', '35-44', '45-59', '60+'] as const
type FaixaEtaria = (typeof FAIXAS_VALIDAS)[number]
const isFaixaValida = (v: unknown): v is FaixaEtaria =>
  typeof v === 'string' && (FAIXAS_VALIDAS as readonly string[]).includes(v)

// Schema do formulário /votar/confirma — NÃO inclui faixa_etaria.
// Faixa vem 100% do draft de sessão (preenchida em /votar pela consulta
// CPF → cdl_base ou SPC). O eleitor não tem opção de alterar.
//
// device_fingerprint vem como hidden input gerado client-side (canvas +
// UA + screen + timezone + hardware concurrency, hash SHA-256). É
// opcional aqui — se ausente (cliente sem JS), o cadastro segue mas a
// trava por dispositivo não terá efeito pra esse eleitor.
const schema = z.object({
  municipio_ibge: z.coerce
    .number()
    .int()
    .positive({ message: 'Selecione seu município.' }),
  // Sexo NÃO está no schema — vem do draft (cdl_base ou SPC), não é
  // perguntado no formulário. Eleitor que chegou aqui já tem sexo
  // resolvido em /votar.
  escolaridade: z.enum(['fundamental', 'medio', 'superior'], {
    message: 'Selecione sua escolaridade.',
  }),
  // Nível econômico (ABEP) — exigido pela Resolução TSE 23.747/2026
  // Art. 2º §7º, IV. Inclui 'nao_informado' pra respeitar LGPD: renda
  // é dado sensível, eleitor pode optar por não declarar.
  nivel_economico: z.enum(['A', 'B', 'C', 'D_E', 'nao_informado'], {
    message: 'Selecione sua renda familiar.',
  }),
  whatsapp: z.string().min(11, { message: 'Informe seu número com DDD.' }),
  // Título de eleitor — exigido SÓ para 16-17 (voto facultativo). Validado
  // no corpo da action conforme a faixa; o número NÃO é armazenado.
  titulo_eleitor: z.string().trim().max(20).optional(),
  device_fingerprint: z
    .string()
    .regex(/^[a-f0-9]{64}$/, { message: 'Fingerprint inválido.' })
    .optional(),
  // Opt-in opcional: receber resultados por WhatsApp em primeira mão.
  // Vem do form como "1" ou ausente — não pré-marcado por design LGPD.
  opt_in_resultados_wa: z
    .union([z.literal('1'), z.literal('on'), z.literal(''), z.undefined()])
    .optional(),
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

  // Guarda de edição: rascunho de teste/demo antigo não pode virar
  // cadastro na edição atual (nem o contrário). Limpa e pede recomeço.
  const alvoEdicao = await resolverEdicaoAlvo()
  if (!alvoEdicao || alvoEdicao.id !== draft.edicaoId) {
    await clearPreVoto()
    return {
      ok: false,
      message:
        'Sua sessão era de uma edição anterior da pesquisa. Volte ao início e recomece.',
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

  const {
    municipio_ibge,
    escolaridade,
    nivel_economico,
    whatsapp,
    device_fingerprint,
  } = parsed.data
  // Sexo vem da Sala 1 (cdl_base ou SPC), não do form. Eleitor que chegou
  // aqui tem sexo resolvido em draft.sexo. Cai como null se SPC não trouxe
  // — voto vai pros cruzamentos sem corte por gênero, mas continua válido.
  const sexo: 'M' | 'F' | null = draft.sexo ?? null
  // Checkbox de opt-in vem como "1" ou "on" quando marcado; ausente quando não.
  const optInResultadosWa =
    parsed.data.opt_in_resultados_wa === '1' ||
    parsed.data.opt_in_resultados_wa === 'on'

  // Faixa etária vem 100% do draft de sessão (preenchida em /votar pela
  // consulta CPF). Não é perguntada ao eleitor. Se chegou aqui sem faixa
  // válida no draft, é estado inconsistente — voltar pro início.
  if (!isFaixaValida(draft.faixaEtaria)) {
    console.error('[confirma] draft sem faixaEtaria válida', {
      cpfHash: draft.cpfHash,
      faixaNoDraft: draft.faixaEtaria,
    })
    return {
      ok: false,
      message:
        'Sessão sem faixa etária válida. Volte ao início e digite o CPF novamente.',
    }
  }
  const faixa_etaria: FaixaEtaria = draft.faixaEtaria

  // Elegibilidade dos 16-17: o voto é FACULTATIVO (CF art. 14, §1º, II, c) e
  // só é eleitor quem já tirou o título. Exige e valida o nº do título
  // (formato + dígitos verificadores + UF). O número é validado e
  // DESCARTADO — não guardamos título (dado sensível, minimização LGPD).
  // Aos 18+ o alistamento é obrigatório e universal: não pedimos título.
  if (faixa_etaria === '16-17') {
    const titulo = String(parsed.data.titulo_eleitor ?? '').trim()
    if (!titulo) {
      return {
        ok: false,
        field: 'titulo_eleitor',
        message:
          'Aos 16 e 17 anos o voto é facultativo — informe o número do seu título de eleitor para participar.',
      }
    }
    const v = validarTituloEleitor(titulo)
    if (!v.ok) {
      return {
        ok: false,
        field: 'titulo_eleitor',
        message: `Título de eleitor inválido: ${v.motivo} Confira os 12 dígitos (sem a zona/seção).`,
      }
    }
  }

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
  const ip = obterIpCliente(h)
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

  // 2a. Voto único por WhatsApp: outro CPF já votou usando este número?
  //     Defesa em profundidade: o índice UNIQUE parcial
  //     (edicao_id, whatsapp_e164) WHERE wa_validado=true trava no DB.
  //     Aqui antecipa o erro pra mensagem amigável.
  const { data: outroPorWa } = await db
    .from('eleitores_pesquisa')
    .select('id')
    .eq('edicao_id', draft.edicaoId)
    .eq('whatsapp_e164', whatsappE164)
    .eq('wa_validado', true)
    .neq('cpf_hash', draft.cpfHash)
    .maybeSingle()
  if (outroPorWa) {
    return {
      ok: false,
      field: 'whatsapp',
      message:
        'Este número de WhatsApp já foi usado para votar nesta pesquisa por outro CPF.',
    }
  }

  // 2b. NÃO travamos por aparelho. O device_fingerprint (canvas + UA +
  //     tela + fuso + núcleos) NÃO identifica um aparelho de forma
  //     confiável: celulares do mesmo modelo com a mesma configuração
  //     produzem a MESMA digital. Medido na coleta de 01/09/2026, com
  //     ~145 eleitores, 16% das digitais apareciam em 2 a 4 CPFs — e
  //     eleitores que comprovadamente não tinham votado eram barrados.
  //     Bloquear por um sinal que erra assim custa voto legítimo sem
  //     ganho real de segurança.
  //
  //     O voto único continua garantido por dois identificadores fortes
  //     e sem colisão: CPF (validado na Receita via SPC, UNIQUE por
  //     edição) e WhatsApp (validado por OTP, UNIQUE por edição). Pra
  //     votar duas vezes seria preciso outro CPF válido E outro número
  //     com OTP — o fingerprint não acrescentava barreira a isso.
  //
  //     A digital continua sendo GRAVADA: serve pra auditoria posterior
  //     (detectar padrão de abuso em massa sem barrar ninguém na hora).

  if (existing) {
    const { error: errUpd } = await db
      .from('eleitores_pesquisa')
      .update({
        municipio_ibge,
        sexo,
        faixa_etaria,
        escolaridade,
        nivel_economico,
        whatsapp_e164: whatsappE164,
        ip,
        user_agent: userAgent,
        device_fingerprint: device_fingerprint ?? null,
        opt_in_resultados_wa: optInResultadosWa,
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
      nivel_economico,
      whatsapp_e164: whatsappE164,
      spc_validado: draft.spcValidado,
      wa_validado: false,
      fonte: draft.fonte,
      ip,
      user_agent: userAgent,
      device_fingerprint: device_fingerprint ?? null,
      opt_in_resultados_wa: optInResultadosWa,
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
          nivel_economico,
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
          nivel_economico,
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

  // 5. Atualizar cookie com whatsapp + municipio + nivel_economico
  //    confirmados. Esses dados propagam pro cookie da capsula em
  //    /votar/otp via setVotoToken, e entram em votos_pesquisa como
  //    cópia controlada (sem cpf_hash).
  await setPreVoto({
    ...draft,
    municipioIbge: municipio_ibge,
    whatsappE164,
    ...(sexo ? { sexo } : {}),
    escolaridade,
    nivelEconomico: nivel_economico,
  })

  redirect('/votar/otp')
}
