/**
 * "Ponte" entre a Sala 1 (CPF identificado) e a Sala 2 (cápsula anônima).
 *
 * Extraído de app/votar/otp/actions.ts em 15/09/2026 pra que o mesmo
 * trecho sirva tanto ao caminho normal (depois do OTP validado) quanto ao
 * caminho de contingência `OTP_DESATIVADO=true` (WABA banida pela Meta —
 * o código nunca chega ao eleitor). A lógica é idêntica nos dois casos:
 *   1. Marca eleitor.wa_validado = true e token_emitido = true (CAS).
 *   2. Grava sexo autodeclarado no cache cdl_base (onde não há cadastral).
 *   3. Gera token de voto; só o hash entra em tokens_emitidos (sem CPF).
 *   4. Apaga o cookie `pre_voto` e planta o cookie `voto`.
 *
 * Depois disto o servidor não tem como ligar o token a um CPF. Quem chama
 * faz o redirect('/votar/anonimo') se o retorno for ok.
 */

import { gerarTokenVoto, hashTokenVoto } from '@/lib/crypto'
import { janelaColeta } from '@/lib/edicao-janela'
import { clearPreVoto, setVotoToken, type PreVotoDraft } from '@/lib/sessao'
import type { supabaseAdmin } from '@/lib/supabase/admin'

type Db = ReturnType<typeof supabaseAdmin>

export type PonteResultado = { ok: true } | { ok: false; message: string }

/**
 * Lê inicio/fim da edição e classifica a janela de coleta declarada no
 * PesqEle. Edição inexistente conta como encerrada (não emite cápsula
 * pra edição fantasma).
 */
export async function checarJanela(
  db: Db,
  edicaoId: string,
): Promise<ReturnType<typeof janelaColeta>> {
  const { data } = await db
    .from('edicao')
    .select('inicio, fim')
    .eq('id', edicaoId)
    .maybeSingle<{ inicio: string; fim: string }>()
  if (!data) return 'encerrada'
  return janelaColeta(data)
}

export async function atravessarPonte(
  db: Db,
  draft: PreVotoDraft,
  log = '[ponte]',
): Promise<PonteResultado> {
  // 1. Marca o eleitor como validado.
  //    Defesa em profundidade: os índices UNIQUE parciais
  //    eleitores_wa_unico_validado_idx e eleitores_device_unico_validado_idx
  //    (migration 020) garantem que mesmo numa race condition entre dois
  //    eleitores validando ao mesmo tempo, só um vai conseguir. O outro
  //    recebe constraint violation (Postgres 23505).
  //    TRAVA DE TOKEN ÚNICO POR CPF (compare-and-swap atômico): o UPDATE só
  //    afeta a linha se token_emitido ainda for false. Assim um CPF gera NO
  //    MÁXIMO um token por edição.
  const { data: claimed, error: errEleitor } = await db
    .from('eleitores_pesquisa')
    .update({ wa_validado: true, token_emitido: true })
    .eq('edicao_id', draft.edicaoId)
    .eq('cpf_hash', draft.cpfHash)
    .eq('token_emitido', false)
    .select('id')
  if (errEleitor) {
    console.error(`${log} erro marcando eleitor wa_validado:`, errEleitor)
    if (errEleitor.code === '23505') {
      const msg = (errEleitor.message ?? '').toLowerCase()
      if (msg.includes('whatsapp') || msg.includes('wa_unico')) {
        return {
          ok: false,
          message:
            'Este número de WhatsApp já foi usado por outro CPF. Cada número participa uma única vez.',
        }
      }
      if (msg.includes('device')) {
        return {
          ok: false,
          message:
            'Este dispositivo já foi usado por outro CPF. Cada aparelho participa uma única vez.',
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

  // 2. Sexo autodeclarado entra no cache cdl_base só agora e só onde não
  //    há valor cadastral (sexo nulo, ou marcado 'eleitor' em edição
  //    anterior). Falha só loga — cache é otimização, não pré-requisito.
  if (draft.sexo && draft.sexoOrigem === 'eleitor') {
    const { error: errSexo } = await db
      .from('cdl_base')
      .update({
        sexo: draft.sexo,
        sexo_fonte: 'eleitor',
        atualizado_em: new Date().toISOString(),
      })
      .eq('cpf_hash', draft.cpfHash)
      .or('sexo.is.null,sexo_fonte.eq.eleitor')
    if (errSexo) {
      console.error(`${log} erro ao gravar sexo autodeclarado em cdl_base:`, errSexo)
    }
  }

  // 3. Gera token de voto. Hash entra em tokens_emitidos SEM nenhuma
  //    ligação ao CPF. criado_hora truncado pra hora cheia (análise
  //    temporal sem permitir cruzamento minuto-a-minuto).
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
    console.error(`${log} erro gravando token:`, errToken)
    return { ok: false, message: 'Erro de sistema. Tente novamente.' }
  }

  // 4. PONTE DESTRUÍDA: limpa cookie da Sala 1, planta cookie da Sala 2.
  //    Cookie da cápsula carrega token (sem CPF), municipioIbge (roteamento
  //    de zona_expansao) e a cópia controlada dos demográficos que entra
  //    em votos_pesquisa (migration 026).
  await clearPreVoto()
  await setVotoToken(tokenClaro, {
    municipioIbge: draft.municipioIbge,
    sexo: draft.sexo,
    faixaEtaria: draft.faixaEtaria,
    escolaridade: draft.escolaridade,
    nivelEconomico: draft.nivelEconomico,
  })

  return { ok: true }
}
