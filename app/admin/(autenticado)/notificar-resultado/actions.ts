'use server'

import { revalidatePath } from 'next/cache'

import { requireAdmin } from '@/lib/admin-auth'
import { enviarResultadoWhatsApp, metaWhatsappConfigurada } from '@/lib/meta-whatsapp'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Envia, em batch, a mensagem de resultado consolidado da pesquisa
 * pra eleitores que marcaram opt-in no cadastro.
 *
 * Processa BATCH_SIZE elegíveis por execução (pra ficar dentro do
 * timeout de Vercel Functions). O admin pode disparar várias vezes
 * até a fila zerar.
 *
 * Idempotência: filtra `resultado_enviado_em IS NULL`; ao enviar com
 * sucesso, marca `resultado_enviado_em = now()`. Se falhar, mantém
 * NULL — pode reprocessar na próxima rodada.
 *
 * Throttle interno: 200ms entre envios (~5 req/s) — abaixo do limite
 * Meta de 80 msgs/s por phone_number_id.
 */

export type NotificarResultadoState = {
  ok: boolean
  message?: string
  resumo?: {
    processados: number
    enviados: number
    falhas: number
    pendentes_restantes: number
  }
}

const BATCH_SIZE = 100
const URL_RESULTADOS = 'https://pesquisa.cdlaju.com.br/resultados'
const SLEEP_MS = 200

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function dispararLoteNotificacao(): Promise<NotificarResultadoState> {
  await requireAdmin()

  if (!metaWhatsappConfigurada()) {
    return {
      ok: false,
      message: 'Meta WhatsApp não está configurada. Verifique env vars na Vercel.',
    }
  }

  const db = supabaseAdmin()

  // Edição ativa OU divulgada (não envia sem ter resultado publicado)
  const { data: edicao } = await db
    .from('edicao')
    .select('id, nome, divulgada_em')
    .eq('ativa', true)
    .maybeSingle()

  if (!edicao) {
    return { ok: false, message: 'Nenhuma edição ativa encontrada.' }
  }
  if (!edicao.divulgada_em) {
    return {
      ok: false,
      message:
        'Esta edição ainda não foi divulgada. Antes de notificar eleitores, marque a divulgação em /admin/edicoes.',
    }
  }

  // Busca o próximo lote de eleitores elegíveis
  const { data: lote, error: errFetch } = await db
    .from('eleitores_pesquisa')
    .select('id, whatsapp_e164')
    .eq('edicao_id', edicao.id)
    .eq('opt_in_resultados_wa', true)
    .eq('wa_validado', true)
    .is('resultado_enviado_em', null)
    .order('criado_em', { ascending: true })
    .limit(BATCH_SIZE)

  if (errFetch) {
    console.error('[notificar-resultado] erro buscando lote:', errFetch)
    return { ok: false, message: 'Erro ao buscar fila de envio.' }
  }

  if (!lote || lote.length === 0) {
    return {
      ok: true,
      message: 'Nenhum eleitor pendente. Fila de envio zerada.',
      resumo: {
        processados: 0,
        enviados: 0,
        falhas: 0,
        pendentes_restantes: 0,
      },
    }
  }

  let enviados = 0
  let falhas = 0

  for (const eleitor of lote) {
    if (!eleitor.whatsapp_e164) {
      falhas++
      continue
    }
    const envio = await enviarResultadoWhatsApp(
      eleitor.whatsapp_e164,
      URL_RESULTADOS,
    )
    if (envio.ok) {
      const { error: errUpd } = await db
        .from('eleitores_pesquisa')
        .update({ resultado_enviado_em: new Date().toISOString() })
        .eq('id', eleitor.id)
      if (errUpd) {
        console.error('[notificar-resultado] erro marcando enviado:', errUpd)
        falhas++
      } else {
        enviados++
      }
    } else {
      console.error(
        '[notificar-resultado] falha envio',
        eleitor.id,
        envio.detalhe,
      )
      falhas++
    }
    await sleep(SLEEP_MS)
  }

  // Quantos restam após este lote
  const { count: pendentesRestantes } = await db
    .from('eleitores_pesquisa')
    .select('id', { count: 'exact', head: true })
    .eq('edicao_id', edicao.id)
    .eq('opt_in_resultados_wa', true)
    .eq('wa_validado', true)
    .is('resultado_enviado_em', null)

  revalidatePath('/admin/notificar-resultado')

  return {
    ok: true,
    message:
      enviados > 0
        ? `Lote processado: ${enviados} enviado(s), ${falhas} falha(s).`
        : `Lote processado sem sucesso: ${falhas} falha(s). Veja logs Vercel.`,
    resumo: {
      processados: lote.length,
      enviados,
      falhas,
      pendentes_restantes: pendentesRestantes ?? 0,
    },
  }
}
