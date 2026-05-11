'use server'

import { redirect } from 'next/navigation'

import { setAdminSessao, verificarSenha } from '@/lib/admin-auth'
import { SERVER_ENV } from '@/lib/env'
import { verifyTotp } from '@/lib/totp'

export type LoginState = { ok: boolean; message?: string }

export async function entrarAdmin(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const senha = String(formData.get('senha') ?? '')
  const codigo = String(formData.get('codigo') ?? '').replace(/\s/g, '')

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
