'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireAdmin } from '@/lib/admin-auth'
import { registrarAcessoAdmin } from '@/lib/admin-audit'
import { SERVER_ENV } from '@/lib/env'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyTotp } from '@/lib/totp'

export type EdicaoState = { ok: boolean; message?: string }

const novaEdicaoSchema = z.object({
  nome: z.string().trim().min(3, 'Nome curto demais.').max(120),
  inicio: z.string().min(10),
  fim: z.string().min(10),
  registro_tre: z.string().trim().max(60).optional(),
})

export async function criarEdicao(
  _prev: EdicaoState,
  formData: FormData,
): Promise<EdicaoState> {
  await requireAdmin()
  const parsed = novaEdicaoSchema.safeParse({
    nome: formData.get('nome'),
    inicio: formData.get('inicio'),
    fim: formData.get('fim'),
    registro_tre: formData.get('registro_tre') || undefined,
  })
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? 'Dados inválidos.',
    }
  }

  const inicio = new Date(parsed.data.inicio)
  const fim = new Date(parsed.data.fim)
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
    return { ok: false, message: 'Datas inválidas.' }
  }
  if (fim <= inicio) {
    return { ok: false, message: 'Data de fim deve ser depois do início.' }
  }

  const db = supabaseAdmin()
  const { error } = await db.from('edicao').insert({
    nome: parsed.data.nome,
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
    ativa: false,
    registro_tre: parsed.data.registro_tre ?? null,
  })
  if (error) {
    console.error('[admin] erro criar edicao:', error)
    return { ok: false, message: error.message }
  }

  revalidatePath('/admin/edicoes')
  revalidatePath('/admin')
  return { ok: true }
}

export async function ativarEdicao(formData: FormData): Promise<void> {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) return
  const db = supabaseAdmin()

  // Desativa qualquer outra edicao ativa primeiro (constraint unique
  // permite no maximo uma com ativa=true).
  await db.from('edicao').update({ ativa: false }).eq('ativa', true)
  await db.from('edicao').update({ ativa: true }).eq('id', id)

  revalidatePath('/admin/edicoes')
  revalidatePath('/admin')
}

export async function desativarEdicao(formData: FormData): Promise<void> {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) return
  const db = supabaseAdmin()
  await db.from('edicao').update({ ativa: false }).eq('id', id)
  revalidatePath('/admin/edicoes')
  revalidatePath('/admin')
}

/**
 * Marca a edicao como divulgada. A pagina publica /resultados passa a
 * exibir os numeros a partir deste momento. Exige que registro_tre
 * esteja preenchido (Resolucao TSE 23.747/2026 — minimo 5 dias antes
 * da divulgacao).
 */
export async function divulgarEdicao(formData: FormData): Promise<EdicaoState> {
  await requireAdmin()

  // Trava extra: a divulgação de resultado exige o código do Google
  // Authenticator (TOTP) NO MOMENTO de divulgar — não basta estar logado.
  const totpSecret = SERVER_ENV.ADMIN_TOTP_SECRET
  if (!totpSecret) {
    return {
      ok: false,
      message:
        'TOTP do responsável não configurado (ADMIN_TOTP_SECRET). A divulgação exige o código — configure antes.',
    }
  }
  const totp = String(formData.get('totp') ?? '').replace(/\s/g, '')
  if (!verifyTotp(totpSecret, totp)) {
    return {
      ok: false,
      message:
        'Código do Google Authenticator inválido ou vazio. A divulgação do resultado só é liberada com o código.',
    }
  }

  const id = String(formData.get('id') ?? '')
  if (!id) return { ok: false, message: 'ID invalido.' }

  const db = supabaseAdmin()
  const { data: ed } = await db
    .from('edicao')
    .select(
      'id, registro_tre, divulgada_em, numero_conre_responsavel, data_registro_pesqele, fim, ponderacao_metodo, ponderacao_execucao_id, ponderacao_aprovada_em, ponderacao_aprovada_por, complementacao_pesqele_em',
    )
    .eq('id', id)
    .maybeSingle()
  if (!ed) return { ok: false, message: 'Edição não encontrada.' }
  if (ed.divulgada_em) {
    return { ok: false, message: 'Edição já está divulgada.' }
  }

  // --- Gate de compliance (Lei 9.504/97 art. 33 + Res. TSE 23.747/2026) ---
  // Formato do nº de registro PesqEle: UF/BR + dígitos + /ano (ex.: SE-06661/2026).
  // Pode haver MAIS DE UM registro (TSE pra presidente + TRE pros demais):
  // "SE-09441/2026 · BR-04041/2026". Cada um precisa estar no formato.
  const registro = (ed.registro_tre ?? '').trim()
  // Aceita qualquer separador entre eles (espaco, ·, •, virgula, ponto e
  // virgula, barra vertical): extrai os numeros validos e exige que o
  // resto do campo seja so pontuacao/espaco.
  const RE = /[A-Za-z]{2}-?\d{1,6}\/\d{4}/g
  const encontrados = String(registro).match(RE) ?? []
  const sobra = String(registro).replace(RE, "").replace(/[\s\p{P}\p{S}]/gu, "")
  const formatoOk = encontrados.length > 0 && sobra === ""
  if (!formatoOk) {
    return {
      ok: false,
      message:
        'Nº de registro PesqEle inválido. Use o formato UF-NNNNN/AAAA (ex.: SE-06661/2026) antes de divulgar.',
    }
  }
  if (
    !ed.numero_conre_responsavel ||
    ed.numero_conre_responsavel.trim().length === 0
  ) {
    return {
      ok: false,
      message:
        'Informe o nº CONRE do estatístico responsável (Res. 23.747/2026 art. 2º IX) antes de divulgar.',
    }
  }
  if (!ed.data_registro_pesqele) {
    return {
      ok: false,
      message: 'Informe a data do registro no PesqEle antes de divulgar.',
    }
  }
  // Registro deve ter sido feito com pelo menos 5 dias de antecedência.
  const dataRegistro = new Date(ed.data_registro_pesqele + 'T00:00:00Z')
  const cincoDias = 5 * 24 * 60 * 60 * 1000
  if (Date.now() - dataRegistro.getTime() < cincoDias) {
    return {
      ok: false,
      message:
        'A divulgação só é liberada 5 dias após o registro no PesqEle (Lei 9.504/97 art. 33). Aguarde o prazo.',
    }
  }

  // --- Gate de ponderação (auditoria de conformidade, set/2026) ---
  // Lição da Rp 0601015-42: o registro prometia ponderação por município ×
  // sexo × faixa × instrução e o site publicou só por município. Agora a
  // divulgação exige que o método vigente seja o registrado, que a execução
  // exista e que o estatístico CONRE tenha aprovado os pesos.
  const metodo = ed.ponderacao_metodo ?? 'municipio'
  if (metodo === 'estratos_raking') {
    if (!ed.ponderacao_execucao_id) {
      return {
        ok: false,
        message:
          'Método por estratos definido, mas nenhuma execução de ponderação foi gravada. Rode a ponderação (scripts/ponderar-estratos.mjs) antes de divulgar.',
      }
    }
    const { data: exec } = await db
      .from('ponderacao_execucao')
      .select('id, convergiu, executado_em')
      .eq('id', ed.ponderacao_execucao_id)
      .maybeSingle()
    if (!exec) {
      return { ok: false, message: 'A execução de ponderação apontada não existe mais.' }
    }
    if (exec.convergiu === false) {
      return {
        ok: false,
        message: 'A execução de ponderação vigente não convergiu. Reexecute antes de divulgar.',
      }
    }
    // Pesos calculados ANTES do fim da coleta ficam desatualizados: novos
    // respondentes entrariam sem célula/peso. Exige execução pós-encerramento.
    if (ed.fim && new Date(exec.executado_em).getTime() < new Date(ed.fim).getTime()) {
      return {
        ok: false,
        message:
          'A execução de ponderação é anterior ao fim da coleta. Reexecute a ponderação com a base final antes de divulgar.',
      }
    }
  }
  if (!ed.ponderacao_aprovada_em || !ed.ponderacao_aprovada_por) {
    return {
      ok: false,
      message:
        'A ponderação vigente ainda não foi aprovada pelo estatístico responsável (Res. 23.747/2026 art. 2º IX). Registre a aprovação antes de divulgar.',
    }
  }
  // Aprovação anterior à execução vigente não vale (aprovou outros pesos).
  if (ed.ponderacao_execucao_id) {
    const { data: exec2 } = await db
      .from('ponderacao_execucao')
      .select('executado_em')
      .eq('id', ed.ponderacao_execucao_id)
      .maybeSingle()
    if (
      exec2 &&
      new Date(ed.ponderacao_aprovada_em).getTime() < new Date(exec2.executado_em).getTime()
    ) {
      return {
        ok: false,
        message:
          'A aprovação do estatístico é anterior à execução de ponderação vigente. Aprove novamente os pesos atuais.',
      }
    }
  }
  // Art. 2º §7º III/IV (Res. 23.600 c/ 23.747): eleitores por unidade
  // territorial e composição da amostra final vão pro PesqEle ANTES da
  // divulgação. Sem o registro da complementação, não divulga.
  if (!ed.complementacao_pesqele_em) {
    return {
      ok: false,
      message:
        'Registre a complementação do PesqEle (art. 2º §7º III/IV — pesquisados por município e composição final da amostra) antes de divulgar.',
    }
  }

  const divulgadaEm = new Date().toISOString()
  const { error } = await db
    .from('edicao')
    .update({ divulgada_em: divulgadaEm })
    .eq('id', id)
  if (error) {
    return { ok: false, message: error.message }
  }

  await registrarAcessoAdmin(
    'marcar_divulgacao',
    {
      edicao_id: id,
      divulgada_em: divulgadaEm,
      registro_tre: ed.registro_tre,
      ponderacao_metodo: metodo,
      ponderacao_execucao_id: ed.ponderacao_execucao_id,
      ponderacao_aprovada_por: ed.ponderacao_aprovada_por,
      complementacao_pesqele_em: ed.complementacao_pesqele_em,
    },
    `edicao:${id}`,
  )

  revalidatePath('/admin/edicoes')
  revalidatePath('/admin')
  revalidatePath('/resultados')
  return { ok: true }
}

/**
 * Atualiza o turno da pesquisa (1 ou 2). Aparece como badge no
 * /resultados publico e no header.
 */
export async function atualizarTurno(formData: FormData): Promise<void> {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const turnoRaw = String(formData.get('turno') ?? '1')
  const turno = turnoRaw === '2' ? 2 : 1
  if (!id) return
  const db = supabaseAdmin()
  await db.from('edicao').update({ turno }).eq('id', id)
  revalidatePath('/admin/edicoes')
  revalidatePath('/admin')
  revalidatePath('/resultados')
}

/**
 * Liga/desliga a consulta "Zona de Expansão" (Aracaju × São Cristóvão)
 * nesta edicao. Quando desligada, a cedula some do fluxo de votacao
 * (mesmo pra eleitores de Aracaju/SC) e do bloco de resultados.
 */
/**
 * Liga/desliga o fator de LOCALIZAÇÃO do /votar (por edição).
 * Desligado (default): nenhuma checagem de localização — voto único fica
 * por CPF + WhatsApp. Ligado: IP do Brasil entra direto; IP estrangeiro
 * precisa de GPS em Sergipe.
 */
export async function alternarExigirLocalizacao(formData: FormData): Promise<void> {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const exigir = String(formData.get('exigir') ?? '') === 'true'
  if (!id) return
  const db = supabaseAdmin()
  await db.from('edicao').update({ exigir_localizacao: exigir }).eq('id', id)
  await registrarAcessoAdmin(
    'alternar_exigir_localizacao',
    { edicao_id: id, exigir_localizacao: exigir },
    `edicao:${id}`,
  )
  revalidatePath('/admin/edicoes')
  revalidatePath('/votar')
}

export async function alternarConsultaZona(formData: FormData): Promise<void> {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const ativa = String(formData.get('ativa') ?? '') === 'true'
  if (!id) return
  const db = supabaseAdmin()
  await db.from('edicao').update({ consulta_zona_ativa: ativa }).eq('id', id)
  await registrarAcessoAdmin(
    'alternar_consulta_zona',
    { edicao_id: id, consulta_zona_ativa: ativa },
    `edicao:${id}`,
  )
  revalidatePath('/admin/edicoes')
  revalidatePath('/resultados')
}

/**
 * Tira a divulgacao publica (volta /resultados pra o estado de
 * "aguarde"). Util pra corrigir erro ou desfazer durante o piloto.
 */
export async function retirarDivulgacao(formData: FormData): Promise<void> {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) return
  const db = supabaseAdmin()
  await db.from('edicao').update({ divulgada_em: null }).eq('id', id)
  await registrarAcessoAdmin(
    'retirar_divulgacao',
    { edicao_id: id },
    `edicao:${id}`,
  )
  revalidatePath('/admin/edicoes')
  revalidatePath('/admin')
  revalidatePath('/resultados')
}

/**
 * Salva nº de registro PesqEle + data prevista de divulgacao na
 * edicao. Esses dados aparecem na pagina publica /resultados.
 */
export async function salvarMetadadosDivulgacao(
  _prev: EdicaoState,
  formData: FormData,
): Promise<EdicaoState> {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) return { ok: false, message: 'ID inválido.' }
  const registro = String(formData.get('registro_tre') ?? '').trim()
  const previstaRaw = String(formData.get('divulgacao_prevista') ?? '').trim()
  const conre = String(formData.get('numero_conre_responsavel') ?? '').trim()
  const dataRegistroRaw = String(formData.get('data_registro_pesqele') ?? '').trim()
  const metaRaw = String(formData.get('meta_amostra') ?? '').trim()

  const update: Record<string, string | number | null> = {}
  update.registro_tre = registro.length > 0 ? registro : null
  update.numero_conre_responsavel = conre.length > 0 ? conre : null
  update.data_registro_pesqele = dataRegistroRaw.length > 0 ? dataRegistroRaw : null

  // Meta mínima de respondentes validados (migration 049): só orienta o
  // monitor /admin/amostra; não é cota nem trava de coleta.
  if (metaRaw.length > 0) {
    const meta = Number(metaRaw.replace(/\D/g, ''))
    if (!Number.isInteger(meta) || meta <= 0) {
      return { ok: false, message: 'Meta de amostra inválida (inteiro positivo).' }
    }
    update.meta_amostra = meta
  } else {
    update.meta_amostra = null
  }

  if (previstaRaw.length > 0) {
    const dt = new Date(previstaRaw)
    if (Number.isNaN(dt.getTime())) {
      return { ok: false, message: 'Data prevista inválida.' }
    }
    update.divulgacao_prevista = dt.toISOString()
  } else {
    update.divulgacao_prevista = null
  }

  const db = supabaseAdmin()
  const { error } = await db.from('edicao').update(update).eq('id', id)
  if (error) return { ok: false, message: error.message }

  revalidatePath('/admin/edicoes')
  revalidatePath('/admin')
  revalidatePath('/admin/amostra')
  revalidatePath('/resultados')
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Chave de emergência — ORDEM JUDICIAL
// Rp 0601015-42.2026.6.25.0000 (TRE-SE, tutela de urgência, 07/09/2026):
// "suspender a divulgação, replicação e utilização pública dos resultados"
// em 24 h, sob pena de multa de R$ 20.000,00 por ato.
//
// Desenho: NÃO apaga divulgada_em (prova da data real da divulgação,
// 04/09/2026 09h14 BRT). Preenche suspensa_em; com isso /resultados,
// /resultados/[cargo], /resultados/mapa, /tv e /api/divulgacao (pop-up do
// site da CDL) deixam de mostrar qualquer número, e o cron de WhatsApp não
// envia resultado. Liga/desliga só com TOTP; tudo vai pro admin_audit_log.
// ---------------------------------------------------------------------------

function validarTotp(formData: FormData): EdicaoState | null {
  const totpSecret = SERVER_ENV.ADMIN_TOTP_SECRET
  if (!totpSecret) {
    return {
      ok: false,
      message:
        'TOTP do responsável não configurado (ADMIN_TOTP_SECRET). A operação exige o código.',
    }
  }
  const totp = String(formData.get('totp') ?? '').replace(/\s/g, '')
  if (!verifyTotp(totpSecret, totp)) {
    return {
      ok: false,
      message: 'Código do Google Authenticator inválido ou vazio.',
    }
  }
  return null
}

function revalidarSuperficiesPublicas() {
  revalidatePath('/admin/edicoes')
  revalidatePath('/admin')
  revalidatePath('/resultados')
  revalidatePath('/resultados/[cargo]', 'page')
  revalidatePath('/resultados/mapa')
  revalidatePath('/tv')
  revalidatePath('/api/divulgacao')
}

export async function suspenderDivulgacao(formData: FormData): Promise<EdicaoState> {
  await requireAdmin()
  const erroTotp = validarTotp(formData)
  if (erroTotp) return erroTotp

  const id = String(formData.get('id') ?? '')
  if (!id) return { ok: false, message: 'ID inválido.' }
  const motivo =
    String(formData.get('motivo') ?? '').trim().slice(0, 300) ||
    'Decisão TRE-SE — Rp 0601015-42.2026.6.25.0000 (tutela de urgência, 07/09/2026)'
  const suspensaEm = new Date().toISOString()

  const db = supabaseAdmin()
  const { data: ed } = await db
    .from('edicao')
    .select('id, divulgada_em, suspensa_em')
    .eq('id', id)
    .maybeSingle()
  if (!ed) return { ok: false, message: 'Edição não encontrada.' }
  if (ed.suspensa_em) return { ok: false, message: 'Divulgação já está suspensa.' }

  const { error } = await db
    .from('edicao')
    .update({ suspensa_em: suspensaEm, suspensao_motivo: motivo })
    .eq('id', id)
  if (error) return { ok: false, message: error.message }

  await registrarAcessoAdmin(
    'suspender_divulgacao',
    { edicao_id: id, suspensa_em: suspensaEm, motivo, divulgada_em: ed.divulgada_em },
    `edicao:${id}`,
  )
  revalidarSuperficiesPublicas()
  return { ok: true, message: `Divulgação suspensa (${suspensaEm}). Confira /resultados, /tv e o pop-up do site.` }
}

export async function retomarDivulgacao(formData: FormData): Promise<EdicaoState> {
  await requireAdmin()
  const erroTotp = validarTotp(formData)
  if (erroTotp) return erroTotp

  const id = String(formData.get('id') ?? '')
  if (!id) return { ok: false, message: 'ID inválido.' }

  const db = supabaseAdmin()
  const { data: ed } = await db
    .from('edicao')
    .select('id, suspensa_em, suspensao_motivo')
    .eq('id', id)
    .maybeSingle()
  if (!ed) return { ok: false, message: 'Edição não encontrada.' }
  if (!ed.suspensa_em) return { ok: false, message: 'Divulgação não está suspensa.' }

  const { error } = await db
    .from('edicao')
    .update({ suspensa_em: null, suspensao_motivo: null })
    .eq('id', id)
  if (error) return { ok: false, message: error.message }

  await registrarAcessoAdmin(
    'retomar_divulgacao',
    {
      edicao_id: id,
      suspensa_em_anterior: ed.suspensa_em,
      motivo_anterior: ed.suspensao_motivo,
    },
    `edicao:${id}`,
  )
  revalidarSuperficiesPublicas()
  return { ok: true, message: 'Divulgação pública retomada.' }
}

// ---------------------------------------------------------------------------
// Ponderação (migration 048) — método, execução, aprovação do estatístico
// e complementação do PesqEle. Todas com TOTP e trilha de auditoria.
// ---------------------------------------------------------------------------

/**
 * Define o método de ponderação vigente da edição. Muda o que o público vê
 * em /resultados, /tv e /api/divulgacao → exige TOTP. Trocar de método
 * INVALIDA a aprovação do estatístico (ele aprovou outros pesos).
 */
export async function definirMetodoPonderacao(formData: FormData): Promise<EdicaoState> {
  await requireAdmin()
  const erroTotp = validarTotp(formData)
  if (erroTotp) return erroTotp

  const id = String(formData.get('id') ?? '')
  const metodoRaw = String(formData.get('metodo') ?? '')
  if (!id) return { ok: false, message: 'ID inválido.' }
  if (metodoRaw !== 'municipio' && metodoRaw !== 'estratos_raking') {
    return { ok: false, message: 'Método inválido.' }
  }

  const db = supabaseAdmin()
  const { data: ed } = await db
    .from('edicao')
    .select('id, ponderacao_metodo, ponderacao_execucao_id')
    .eq('id', id)
    .maybeSingle()
  if (!ed) return { ok: false, message: 'Edição não encontrada.' }
  if (ed.ponderacao_metodo === metodoRaw) {
    return { ok: true, message: 'Método já era esse.' }
  }
  if (metodoRaw === 'estratos_raking' && !ed.ponderacao_execucao_id) {
    return {
      ok: false,
      message:
        'Antes de adotar o método por estratos, execute a ponderação (scripts/ponderar-estratos.mjs) — ela grava a execução e aponta a edição pra ela.',
    }
  }

  const { error } = await db
    .from('edicao')
    .update({
      ponderacao_metodo: metodoRaw,
      ponderacao_aprovada_em: null,
      ponderacao_aprovada_por: null,
    })
    .eq('id', id)
  if (error) return { ok: false, message: error.message }

  await registrarAcessoAdmin(
    'definir_metodo_ponderacao',
    { edicao_id: id, de: ed.ponderacao_metodo, para: metodoRaw },
    `edicao:${id}`,
  )
  revalidarSuperficiesPublicas()
  return {
    ok: true,
    message: `Método alterado para "${metodoRaw}". A aprovação do estatístico foi zerada — registre de novo.`,
  }
}

/**
 * Registra a aprovação do estatístico CONRE sobre a execução de ponderação
 * vigente. É o "de acordo" técnico exigido antes de divulgar; fica gravado
 * quem aprovou, quando e qual execução.
 */
export async function aprovarPonderacao(formData: FormData): Promise<EdicaoState> {
  await requireAdmin()
  const erroTotp = validarTotp(formData)
  if (erroTotp) return erroTotp

  const id = String(formData.get('id') ?? '')
  const aprovador = String(formData.get('aprovador') ?? '').trim().slice(0, 120)
  if (!id) return { ok: false, message: 'ID inválido.' }
  if (aprovador.length < 5) {
    return {
      ok: false,
      message: 'Informe nome e CONRE do estatístico que aprovou (ex.: "Danilio Silva Santos — CONRE 8223").',
    }
  }

  const db = supabaseAdmin()
  const { data: ed } = await db
    .from('edicao')
    .select('id, ponderacao_metodo, ponderacao_execucao_id')
    .eq('id', id)
    .maybeSingle()
  if (!ed) return { ok: false, message: 'Edição não encontrada.' }
  if (ed.ponderacao_metodo === 'estratos_raking' && !ed.ponderacao_execucao_id) {
    return { ok: false, message: 'Não há execução de ponderação pra aprovar.' }
  }

  const aprovadaEm = new Date().toISOString()
  const { error } = await db
    .from('edicao')
    .update({ ponderacao_aprovada_em: aprovadaEm, ponderacao_aprovada_por: aprovador })
    .eq('id', id)
  if (error) return { ok: false, message: error.message }

  await registrarAcessoAdmin(
    'aprovar_ponderacao',
    {
      edicao_id: id,
      metodo: ed.ponderacao_metodo,
      execucao_id: ed.ponderacao_execucao_id,
      aprovado_por: aprovador,
      aprovada_em: aprovadaEm,
    },
    `edicao:${id}`,
  )
  revalidatePath('/admin/edicoes')
  return { ok: true, message: `Ponderação aprovada por ${aprovador}.` }
}

/**
 * Marca que a complementação do art. 2º §7º III/IV (eleitores pesquisados
 * por município + composição final da amostra) foi lançada no PesqEle.
 * Sem esta marca a divulgação fica travada.
 */
export async function registrarComplementacaoPesqele(
  formData: FormData,
): Promise<EdicaoState> {
  await requireAdmin()
  const erroTotp = validarTotp(formData)
  if (erroTotp) return erroTotp

  const id = String(formData.get('id') ?? '')
  if (!id) return { ok: false, message: 'ID inválido.' }
  const quandoRaw = String(formData.get('quando') ?? '').trim()
  const quando = quandoRaw ? new Date(quandoRaw) : new Date()
  if (Number.isNaN(quando.getTime())) return { ok: false, message: 'Data inválida.' }
  if (quando.getTime() > Date.now() + 5 * 60_000) {
    return { ok: false, message: 'A data da complementação não pode ser futura.' }
  }

  const db = supabaseAdmin()
  const { data: ed } = await db
    .from('edicao')
    .select('id, complementacao_pesqele_em')
    .eq('id', id)
    .maybeSingle()
  if (!ed) return { ok: false, message: 'Edição não encontrada.' }

  const { error } = await db
    .from('edicao')
    .update({ complementacao_pesqele_em: quando.toISOString() })
    .eq('id', id)
  if (error) return { ok: false, message: error.message }

  await registrarAcessoAdmin(
    'registrar_complementacao_pesqele',
    { edicao_id: id, anterior: ed.complementacao_pesqele_em, complementacao_pesqele_em: quando.toISOString() },
    `edicao:${id}`,
  )
  revalidatePath('/admin/edicoes')
  return { ok: true, message: 'Complementação do PesqEle registrada.' }
}
