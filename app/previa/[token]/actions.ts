'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { registrarAcessoAdmin } from '@/lib/admin-audit'
import { obterIpCliente } from '@/lib/ip'
import { consumirLink, PREVIA_COOKIE, PREVIA_SESSAO_HORAS } from '@/lib/previa-link'

/**
 * Consome o link de uso único e amarra a prévia a este navegador.
 * Só POST (formulário) chega aqui — GET de robô de prévia de link não consome.
 */
export async function abrirPrevia(formData: FormData): Promise<void> {
  const token = String(formData.get('token') ?? '')
  const h = await headers()
  const aberto = await consumirLink(token, {
    ip: obterIpCliente(h),
    userAgent: h.get('user-agent'),
  })

  if (!aberto) {
    await registrarAcessoAdmin('previa_link_recusado', { motivo: 'indisponivel_no_abrir' })
    redirect(`/previa/${encodeURIComponent(token)}`)
  }

  ;(await cookies()).set(PREVIA_COOKIE, aberto.segredo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/previa',
    maxAge: PREVIA_SESSAO_HORAS * 3600,
  })
  await registrarAcessoAdmin(
    'previa_link_aberto',
    { destinatario: aberto.link.destinatario, edicao_id: aberto.link.edicao_id },
    `previa_link:${aberto.link.id}`,
  )
  redirect('/previa/ver')
}
