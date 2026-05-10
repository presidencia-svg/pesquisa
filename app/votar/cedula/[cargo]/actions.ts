'use server'

import { redirect } from 'next/navigation'

import { compararHashes, hashTokenVoto } from '@/lib/crypto'
import { CARGO_CONFIG, isCargo, type Cargo } from '@/lib/cargos'
import { clearVotoToken, getVotoToken } from '@/lib/sessao'
import { supabaseAdmin } from '@/lib/supabase/admin'

export type VotoState = {
  ok: boolean
  message?: string
}

/**
 * Submete um voto.
 *
 * Inputs (FormData):
 *   cargo:  'presidente' | 'governador' | 'senador' | 'federal' | 'estadual'
 *   metodo: 'numero' | 'branco' | 'nao_sabe'
 *   numero: string — so quando metodo='numero'
 *   slot:   '1' | '2' — apenas pra senador (qual dos 2 votos)
 *
 * Fluxo:
 *   1. Le cookie `voto`, valida que existe e que o hash bate em tokens_emitidos.
 *   2. Valida cargo + metodo + numero (zod-style inline pra ficar conciso).
 *   3. Se metodo='numero': lookup em candidatos_pesquisa OU partidos pra pegar o id.
 *   4. Insert em votos_pesquisa com criado_hora truncado pra hora cheia.
 *   5. Detecta se ja completou todas as vagas deste cargo (1 ou 2). Se sim,
 *      redireciona pro proximo cargo (ou /votar/obrigado se foi o ultimo).
 */
export async function submeterVoto(
  _prev: VotoState,
  formData: FormData,
): Promise<VotoState> {
  const tokenClaro = await getVotoToken()
  if (!tokenClaro) {
    return { ok: false, message: 'Sua cápsula expirou. Volte ao início.' }
  }

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
    return proximoCargo(cargo)
  }

  // 3. Resolve candidato_id ou partido_id se metodo='numero'
  let candidatoId: string | null = null
  let partidoId: string | null = null

  if (metodo === 'numero') {
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
      // Extrai os 2 primeiros digitos pra encontrar a legenda.
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

  // 4. Insert do voto. criado_hora truncado pra hora cheia.
  const horaCheia = new Date()
  horaCheia.setMinutes(0, 0, 0)

  const { error: errVoto } = await db.from('votos_pesquisa').insert({
    token_hash: tokenHash,
    edicao_id: edicaoId,
    cargo,
    candidato_id: candidatoId,
    partido_id: partidoId,
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
    if (!cfg.proximo) {
      // Ultimo cargo. Marca token como usado e ENCERRA A CAPSULA: limpa
      // o cookie agora (estamos em Server Action, podemos setar cookie).
      // /votar/obrigado vai ler "sem cookie" e mostrar so o agradecimento.
      await db
        .from('tokens_emitidos')
        .update({ usado: true })
        .eq('token_hash', tokenHash)
      await clearVotoToken()
    }
    return proximoCargo(cargo)
  }

  // Senador com 1 voto feito ainda: fica na mesma cedula pro 2o voto.
  // Retorna sucesso sem redirect — o form vai resetar e mostrar slot 2.
  return { ok: true }
}

const proximoCargo = (atual: Cargo): never => {
  const cfg = CARGO_CONFIG[atual]
  if (cfg.proximo) {
    redirect(`/votar/cedula/${cfg.proximo}`)
  } else {
    redirect('/votar/obrigado')
  }
}
