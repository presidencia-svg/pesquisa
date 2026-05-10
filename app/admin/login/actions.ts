'use server'

import { redirect } from 'next/navigation'

import { setAdminSessao, verificarSenha } from '@/lib/admin-auth'

export type LoginState = { ok: boolean; message?: string }

export async function entrarAdmin(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const senha = String(formData.get('senha') ?? '')

  // Pequeno atraso constante pra dificultar timing attacks de fora,
  // alem do timingSafeEqual interno. ~50ms eh aceitavel pro UX.
  await new Promise((r) => setTimeout(r, 50))

  if (!verificarSenha(senha)) {
    return { ok: false, message: 'Senha incorreta.' }
  }

  await setAdminSessao()
  redirect('/admin')
}
