'use server'

import { redirect } from 'next/navigation'

import { compararHashes, hashTokenVoto } from '@/lib/crypto'
import {
  CARGO_CONFIG,
  isCargo,
  proximoCargoConsiderandoMunicipio,
  type Cargo,
} from '@/lib/cargos'
import { clearVotoToken, getVotoData } from '@/lib/sessao'
import { supabaseAdmin } from '@/lib/supabase/admin'

export type VotoState = {
  ok: boolean
  message?: string
}

/**
 * Submete um voto.
 *
 * Inputs (FormData):
 *   cargo:    'presidente' | 'governador' | 'senador' | 'federal' | 'estadual' | 'zona_expansao'
 *   metodo:   'numero' | 'branco' | 'nao_sabe'
 *   numero:   string — quando metodo='numero' e cargo nao e' consulta
 *   resposta: string — quando metodo='numero' e cargo='zona_expansao'
 *   slot:     '1' | '2' — apenas pra senador (qual dos 2 votos)
 *
 * Apos o ultimo cargo (estadual), se municipio for Aracaju/Sao Cristovao,
 * o proximo e' zona_expansao. Caso contrario, vai pra /obrigado.
 */
export async function submeterVoto(
  _prev: VotoState,
  formData: FormData,
): Promise<VotoState> {
  const votoData = await getVotoData()
  if (!votoData) {
    return { ok: false, message: 'Sua cápsula expirou. Volte ao início.' }
  }
  const tokenClaro = votoData.token
  const municipioIbge = votoData.municipioIbge ?? null

  const cargoRaw = String(formData.get('cargo') ?? '')
  if (!isCargo(cargoRaw)) {
    return { ok: false, message: 'Cargo inválido.' }
  }
  const cargo: Cargo = cargoRaw
  const cfg = CARGO_CONFIG[cargo]

  const metodo = String(formData.get('metodo') ?? '')
  if (!['numero', 'branco', 'nao_sabe'].includes(metodo)) {
    return { ok: false, message: 'Tipo de voto inválido.' }
  }

  // Se for zona_expansao mas municipio nao bate, bloqueia
  if (
    cfg.municipiosAplicaveis &&
    (!municipioIbge || !cfg.municipiosAplicaveis.includes(municipioIbge))
  ) {
    return { ok: false, message: 'Esta consulta não se aplica ao seu município.' }
  }

  const db = supabaseAdmin()

  // 1. Confere token em tokens_emitidos
  const tokenHash = hashTokenVoto(tokenClaro)
  const { data: tokenReg } = await db
    .from('tokens_emitidos')
    .select('token_hash, edicao_id, usado')
    .eq('token_hash', tokenHash)
    .maybeSingle()
  if (!tokenReg) {
    return { ok: false, message: 'Cápsula inválida. Volte ao início.' }
  }
  if (!compararHashes(tokenReg.token_hash, tokenHash)) {
    return { ok: false, message: 'Cápsula inválida. Volte ao início.' }
  }
  const edicaoId = tokenReg.edicao_id

  // 2. Conta votos ja emitidos por este token neste cargo
  const { count: votosFeitos } = await db
    .from('votos_pesquisa')
    .select('id', { count: 'exact', head: true })
    .eq('token_hash', tokenHash)
    .eq('cargo', cargo)

  if ((votosFeitos ?? 0) >= cfg.vagas) {
    return proximoCargoOuObrigado(cargo, municipioIbge)
  }

  // 3. Resolve candidato_id / partido_id / resposta conforme tipo
  let candidatoId: string | null = null
  let partidoId: string | null = null
  let resposta: string | null = null

  if (metodo === 'numero') {
    if (cfg.tipo === 'consulta') {
      // Consulta: le campo `resposta` e valida contra opcoesConsulta
      const respostaRaw = String(formData.get('resposta') ?? '')
      const valida = cfg.opcoesConsulta?.some((o) => o.valor === respostaRaw)
      if (!valida) {
        return { ok: false, message: 'Resposta inválida.' }
      }
      resposta = respostaRaw
    } else {
      const numeroRaw = String(formData.get('numero') ?? '').replace(/\D/g, '')
      if (numeroRaw.length !== cfg.digitos) {
        return {
          ok: false,
          message: `Número inválido. Digite ${cfg.digitos} dígitos.`,
        }
      }
      const numero = Number(numeroRaw)

      if (cfg.tipo === 'candidato') {
        const { data: cand } = await db
          .from('candidatos_pesquisa')
          .select('id')
          .eq('edicao_id', edicaoId)
          .eq('cargo', cargo)
          .eq('numero', numero)
          .eq('ativo', true)
          .maybeSingle()
        if (!cand) {
          return {
            ok: false,
            message: 'Número não corresponde a nenhum candidato. Confira ou vote em branco.',
          }
        }
        candidatoId = cand.id
      } else {
        // Legenda: o eleitor digita o numero como na urna (4 digitos pra
        // federal, 5 pra estadual), mas a pesquisa armazena so o partido.
        const numeroPartido = Number(numeroRaw.slice(0, 2))
        const { data: part } = await db
          .from('partidos')
          .select('id')
          .eq('numero', numeroPartido)
          .eq('ativo', true)
          .maybeSingle()
        if (!part) {
          return {
            ok: false,
            message: 'Legenda não encontrada. Confira os 2 primeiros dígitos ou vote em branco.',
          }
        }
        partidoId = part.id
      }

      // Pra senador (2 vagas): nao deixa votar 2x no mesmo candidato
      if (cargo === 'senador' && candidatoId) {
        const { count: jaTem } = await db
          .from('votos_pesquisa')
          .select('id', { count: 'exact', head: true })
          .eq('token_hash', tokenHash)
          .eq('cargo', cargo)
          .eq('candidato_id', candidatoId)
        if ((jaTem ?? 0) > 0) {
          return {
            ok: false,
            message: 'Você já votou neste candidato. Escolha outro pra a 2ª vaga.',
          }
        }
      }
    }
  }

  // 4. Insert do voto. criado_hora truncado pra hora cheia.
  const horaCheia = new Date()
  horaCheia.setMinutes(0, 0, 0)

  const { error: errVoto } = await db.from('votos_pesquisa').insert({
    token_hash: tokenHash,
    edicao_id: edicaoId,
    cargo,
    candidato_id: candidatoId,
    partido_id: partidoId,
    resposta,
    metodo,
    criado_hora: horaCheia.toISOString(),
  })
  if (errVoto) {
    console.error('[voto] erro insert:', errVoto)
    return {
      ok: false,
      message: `Erro ao registrar voto. Tente novamente.${
        process.env.DEV_MODE === 'true' ? ` [${errVoto.message}]` : ''
      }`,
    }
  }

  // 5. Verifica se completou todas as vagas deste cargo. Se sim, avanca.
  const novoTotal = (votosFeitos ?? 0) + 1
  if (novoTotal >= cfg.vagas) {
    const proximo = proximoCargoConsiderandoMunicipio(cargo, municipioIbge)
    if (!proximo) {
      // Fim do fluxo. Marca token como usado e ENCERRA A CAPSULA.
      await db
        .from('tokens_emitidos')
        .update({ usado: true })
        .eq('token_hash', tokenHash)
      await clearVotoToken()
    }
    return proximoCargoOuObrigado(cargo, municipioIbge)
  }

  // Senador com 1 voto feito ainda: fica na mesma cedula pro 2o voto.
  return { ok: true }
}

const proximoCargoOuObrigado = (
  atual: Cargo,
  municipioIbge: number | null,
): never => {
  const proximo = proximoCargoConsiderandoMunicipio(atual, municipioIbge)
  if (proximo) {
    redirect(`/votar/cedula/${proximo}`)
  } else {
    redirect('/votar/obrigado')
  }
}
