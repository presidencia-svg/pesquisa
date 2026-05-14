'use server'

import { redirect } from 'next/navigation'

import { setAdminSessao, verificarSenha } from '@/lib/admin-auth'
import { SERVER_ENV } from '@/lib/env'
import { checarRateLimit } from '@/lib/rate-limit'
import { verifyTotp } from '@/lib/totp'

export type LoginState = { ok: boolean; message?: string }

export async function entrarAdmin(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const senha = String(formData.get('senha') ?? '')
  const codigo = String(formData.get('codigo') ?? '').replace(/\s/g, '')

  // Rate limit por IP — critico. Sem isso, ataque ao TOTP (10^6 com
  // janela de 90s) so' precisa de senha admin pra ficar viavel em
  // ~14min. Com 5 tentativas / 15min, o ataque mais rapido seria de
  // 1.000.000 / 5 * 15min = 5.700 anos. RESISTENTE.
  const rl = await checarRateLimit({
    acao: 'admin_login',
    max: 5,
    janelaMin: 15,
  })
  if (!rl.ok) {
    return {
      ok: false,
      message:
        'Muitas tentativas de login. Aguarde 15 minutos e tente novamente.',
    }
  }

  // Pequeno atraso constante pra dificultar timing attacks de fora,
  // alem do timingSafeEqual interno. ~50ms eh aceitavel pro UX.
  await new Promise((r) => setTimeout(r, 50))

  if (!verificarSenha(senha)) {
    return { ok: false, message: 'Senha ou código incorreto.' }
  }

  // 2FA opcional: se ADMIN_TOTP_SECRET estiver definido, exige codigo.
  // Se nao estiver, mantém o fluxo antigo (so' senha).
  const totpSecret = SERVER_ENV.ADMIN_TOTP_SECRET
  if (totpSecret) {
    if (!codigo) {
      return {
        ok: false,
        message: 'Informe o código de 6 dígitos do Google Authenticator.',
      }
    }
    if (!verifyTotp(totpSecret, codigo)) {
      return { ok: false, message: 'Senha ou código incorreto.' }
    }
  }

  await setAdminSessao()
  redirect('/admin')
}
