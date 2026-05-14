'use server'

import { hashCpf } from '@/lib/crypto'
import { checarRateLimit } from '@/lib/rate-limit'
import { supabaseAdmin } from '@/lib/supabase/admin'

export type ExclusaoState = {
  ok: boolean
  message?: string
  excluido?: boolean
}

/**
 * Direito de exclusao do titular (Art. 18 VI da LGPD).
 *
 * Fluxo:
 *   1. Eleitor digita CPF + confirma intencao via checkbox.
 *   2. Sistema valida formato do CPF.
 *   3. Hash do CPF e' usado pra apagar (anonimizar) em TODAS as bases:
 *      - eleitores_pesquisa (Sala 1)  — apaga linha completa
 *      - cdl_base                     — apaga registro
 *      - whatsapp_codigos             — apaga historico de OTPs
 *   4. NOTA: votos_pesquisa (Sala 2) e tokens_emitidos NAO sao tocados.
 *      Eles ja' nao tem ligacao com o CPF (arquitetura duas salas).
 *      Os votos permanecem anonimamente computados na pesquisa.
 *
 * Limites:
 *   - Rate limit 3 tentativas / 1h por IP — protecao DoS + proteccao
 *     do eleitor (atacante nao consegue spammar exclusao de outras
 *     pessoas).
 *   - Sem confirmacao via OTP (deixa a barreira mais leve — UX
 *     prioritaria pra exercicio de direito). Em troca, atacante que
 *     descobrir o CPF de outra pessoa poderia apagar dados dela.
 *     Justificavel pq atacante nao ganha nada com isso (vote ja foi
 *     computado, identidade apaga, nada inflado).
 */
export async function solicitarExclusao(
  _prev: ExclusaoState,
  formData: FormData,
): Promise<ExclusaoState> {
  // 1. Rate limit por IP
  const rl = await checarRateLimit({
    acao: 'lgpd_excluir',
    max: 3,
    janelaMin: 60,
  })
  if (!rl.ok) {
    return { ok: false, message: rl.message }
  }

  // 2. Valida CPF
  const cpfRaw = String(formData.get('cpf') ?? '').replace(/\D/g, '')
  if (cpfRaw.length !== 11 || !validarCpf(cpfRaw)) {
    return { ok: false, message: 'CPF inválido.' }
  }
  const confirmou = formData.get('confirmar') === 'on'
  if (!confirmou) {
    return {
      ok: false,
      message: 'Marque a caixa pra confirmar a exclusão.',
    }
  }

  // 3. Hash do CPF
  const cpfHash = hashCpf(cpfRaw)

  // 4. Apaga em todas as bases
  const db = supabaseAdmin()

  // 4a. Apaga whatsapp_codigos primeiro (FK reference em eleitores_pesquisa)
  await db.from('whatsapp_codigos').delete().eq('cpf_hash', cpfHash)

  // 4b. Apaga eleitores_pesquisa (Sala 1)
  const { count: eleitoresApagados } = await db
    .from('eleitores_pesquisa')
    .delete({ count: 'exact' })
    .eq('cpf_hash', cpfHash)

  // 4c. Apaga cdl_base
  await db.from('cdl_base').delete().eq('cpf_hash', cpfHash)

  // 5. Nada acontece com votos_pesquisa nem tokens_emitidos:
  //    eles nao tem cpf_hash. Os votos permanecem anonimos no agregado.

  return {
    ok: true,
    excluido: (eleitoresApagados ?? 0) > 0,
    message:
      (eleitoresApagados ?? 0) > 0
        ? 'Dados pessoais excluídos. Seus votos permanecem anonimamente computados na pesquisa.'
        : 'Nenhum dado encontrado pra esse CPF (talvez você nunca tenha se cadastrado nesta pesquisa, ou os dados já foram excluídos).',
  }
}

/** Validacao do digito verificador do CPF. */
function validarCpf(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf)) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false
  let soma = 0
  for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i)
  let dig = 11 - (soma % 11)
  if (dig >= 10) dig = 0
  if (dig !== parseInt(cpf[9])) return false
  soma = 0
  for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i)
  dig = 11 - (soma % 11)
  if (dig >= 10) dig = 0
  return dig === parseInt(cpf[10])
}
