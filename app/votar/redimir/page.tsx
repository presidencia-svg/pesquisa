import Link from 'next/link'
import { redirect } from 'next/navigation'

import { hashTokenVoto } from '@/lib/crypto'
import { setVotoToken } from '@/lib/sessao'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const metadata = {
  title: 'Redimir token · Pesquisa Eleitoral Sergipe 2026',
  robots: { index: false, follow: false },
}

/**
 * Pagina pra "redimir" um token de voto numa nova sessao do navegador
 * (ideal: aba anonima ou outro dispositivo).
 *
 * Fluxo:
 *   1. Usuario clica em "Copiar link" na /votar/anonimo (origem).
 *   2. Abre janela anonima manualmente, cola o link.
 *   3. Esta pagina recebe ?t=<token>, valida, seta cookie `voto` na
 *      sessao isolada do navegador anonimo, e redireciona pra cedula.
 *
 * O cookie original na janela "publica" continua valido em paralelo —
 * se o eleitor abandonar a anonima, pode voltar e votar la. As duas
 * janelas competem pra emitir voto em cada cargo (so um vence).
 */
type SearchParams = Promise<{ t?: string }>

export default async function RedimirPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { t } = await searchParams

  // 1. Sem token no URL: explica o que fazer.
  if (!t) {
    return (
      <main className="flex flex-col flex-1 bg-capsule text-capsule-foreground items-center justify-center px-6 py-16">
        <div className="max-w-md w-full flex flex-col gap-6 text-center">
          <h1 className="text-2xl font-semibold">Token não recebido</h1>
          <p className="text-capsule-foreground/85 leading-relaxed">
            Esta página aceita um token de voto via URL. Volte para a janela
            onde você confirmou o WhatsApp, copie o link inteiro (com{' '}
            <code className="font-mono">?t=…</code>) e cole aqui na barra de
            endereço.
          </p>
          <Link
            href="/"
            className="text-sm underline hover:text-capsule-foreground/70"
          >
            Voltar ao início
          </Link>
        </div>
      </main>
    )
  }

  // 2. Validacao basica de formato (token em claro tem 64 hex chars).
  if (!/^[0-9a-f]{64}$/.test(t)) {
    return tokenInvalido('Formato do token inválido.')
  }

  // 3. Confere que o hash bate em tokens_emitidos.
  const tokenHash = hashTokenVoto(t)
  const db = supabaseAdmin()
  const { data: registro, error } = await db
    .from('tokens_emitidos')
    .select('token_hash, edicao_id, usado')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (error) {
    console.error('[redimir] erro consultando tokens_emitidos:', error)
    return tokenInvalido('Erro de sistema. Tente novamente em instantes.')
  }
  if (!registro) {
    return tokenInvalido(
      'Token não encontrado. Pode ter expirado ou não vir desta pesquisa.',
    )
  }
  if (registro.usado) {
    return tokenInvalido('Este token já foi totalmente usado.')
  }

  // 4. Valido — seta cookie na sessao deste navegador (anonimo) e
  //    redireciona pra cedula. O `redirect()` vai pra outra URL e a
  //    barra de endereco se limpa do ?t naturalmente.
  await setVotoToken(t)
  redirect('/votar/cedula/presidente')
}

function tokenInvalido(mensagem: string) {
  return (
    <main className="flex flex-col flex-1 bg-capsule text-capsule-foreground items-center justify-center px-6 py-16">
      <div className="max-w-md w-full flex flex-col gap-6 text-center">
        <h1 className="text-2xl font-semibold">Token inválido</h1>
        <p className="text-capsule-foreground/85 leading-relaxed">{mensagem}</p>
        <Link
          href="/"
          className="text-sm underline hover:text-capsule-foreground/70"
        >
          Voltar ao início
        </Link>
      </div>
    </main>
  )
}
