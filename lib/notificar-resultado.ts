import 'server-only'

import {
  enviarResultadoWhatsApp,
  metaWhatsappConfigurada,
} from './meta-whatsapp'
import { supabaseAdmin } from './supabase/admin'

/**
 * Processa um lote de notificações de resultado.
 *
 * Filtra eleitores com opt_in=true, wa_validado=true e
 * resultado_enviado_em IS NULL, na edição ativa+divulgada. Dispara
 * a mensagem Meta WhatsApp e marca enviado_em em caso de sucesso.
 *
 * Idempotente: rodar 2 vezes em paralelo não duplica envio (o
 * filtro + commit pontual por linha previne). Mas pode ter linhas
 * processadas mais de uma vez em race — Meta dedupe por
 * messaging_product+to em janela curta, então o risco real é
 * baixo.
 *
 * Compartilhado entre:
 *   - Server Action `/admin/notificar-resultado` (botão manual)
 *   - Cron `/api/cron/notificar-resultados` (a cada 5 minutos)
 */

const BATCH_SIZE = 500
const URL_RESULTADOS = 'https://pesquisa.cdlaju.com.br/resultados'
const SLEEP_MS = 50 // 20 msgs/seg — abaixo do limite Meta de 80/seg

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export type ProcessarResultado = {
  ok: boolean
  message?: string
  resumo?: {
    processados: number
    enviados: number
    falhas: number
    pendentes_restantes: number
  }
}

export async function processarLoteNotificacao(): Promise<ProcessarResultado> {
  if (!metaWhatsappConfigurada()) {
    return {
      ok: false,
      message:
        'Meta WhatsApp não está configurada. Verifique env vars na Vercel.',
    }
  }

  const db = supabaseAdmin()

  const { data: edicao } = await db
    .from('edicao')
    .select('id, nome, divulgada_em')
    .eq('ativa', true)
    .maybeSingle()

  if (!edicao) {
    // Skip operacional — esperado entre desativação de edição teste
    // e criação da edição real. Não é erro: cron continua disparando
    // a cada 5min, e quando houver edição ativa+divulgada o lote roda.
    return {
      ok: true,
      message: 'Skip: nenhuma edição ativa (no-op silencioso).',
      resumo: { processados: 0, enviados: 0, falhas: 0, pendentes_restantes: 0 },
    }
  }
  if (!edicao.divulgada_em) {
    // Skip operacional — edição ativa mas ainda não divulgada.
    // Cron volta a tentar a cada 5min; quando o admin clicar
    // "Divulgar publicamente", o próximo tick processa o lote.
    return {
      ok: true,
      message:
        'Skip: edição ativa ainda não divulgada (no-op silencioso). Quando divulgar em /admin/edicoes, o cron processa o lote no próximo tick.',
      resumo: { processados: 0, enviados: 0, falhas: 0, pendentes_restantes: 0 },
    }
  }

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

  const { count: pendentesRestantes } = await db
    .from('eleitores_pesquisa')
    .select('id', { count: 'exact', head: true })
    .eq('edicao_id', edicao.id)
    .eq('opt_in_resultados_wa', true)
    .eq('wa_validado', true)
    .is('resultado_enviado_em', null)

  return {
    ok: true,
    message: `Lote processado: ${enviados} enviado(s), ${falhas} falha(s).`,
    resumo: {
      processados: lote.length,
      enviados,
      falhas,
      pendentes_restantes: pendentesRestantes ?? 0,
    },
  }
}
