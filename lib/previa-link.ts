import 'server-only'

import { createHash, randomBytes } from 'node:crypto'

import { cookies } from 'next/headers'

import { supabaseAdmin } from './supabase/admin'

/**
 * Link de prévia de uso único (migration 060) — o estatístico responsável vê
 * o resultado já ponderado antes da divulgação, sem login de admin.
 *
 * O GET de /previa/<token> NÃO consome o link (robôs de prévia de link do
 * WhatsApp/e-mail fazem GET). Só o botão "Abrir" consome, num UPDATE atômico,
 * e amarra a sessão ao navegador por cookie httpOnly. Repassar o link depois
 * disso não adianta: quem não tem o cookie vê "link já utilizado".
 */
export const PREVIA_COOKIE = 'previa_sessao'
export const PREVIA_SESSAO_HORAS = 4

const TOKEN_RE = /^[a-f0-9]{64}$/
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

export type PreviaLinkRow = {
  id: string
  edicao_id: string
  destinatario: string
  expira_em: string
  aberto_em: string | null
  sessao_hash: string | null
  sessao_expira_em: string | null
  ip: string | null
  visualizacoes: number
  revogado_em: string | null
}

const COLUNAS =
  'id, edicao_id, destinatario, expira_em, aberto_em, sessao_hash, sessao_expira_em, ip, visualizacoes, revogado_em'

export type SituacaoLink =
  | { status: 'invalido' }
  | { status: 'revogado' | 'expirado' | 'usado' | 'disponivel'; link: PreviaLinkRow }

export async function situacaoDoLink(token: string): Promise<SituacaoLink> {
  if (!TOKEN_RE.test(token)) return { status: 'invalido' }
  const { data } = await supabaseAdmin()
    .from('previa_link')
    .select(COLUNAS)
    .eq('token_hash', sha256(token))
    .maybeSingle<PreviaLinkRow>()
  if (!data) return { status: 'invalido' }
  if (data.revogado_em) return { status: 'revogado', link: data }
  if (data.aberto_em) return { status: 'usado', link: data }
  if (new Date(data.expira_em).getTime() <= Date.now()) return { status: 'expirado', link: data }
  return { status: 'disponivel', link: data }
}

/**
 * Consome o link. O filtro `aberto_em is null` no próprio UPDATE garante que
 * só uma requisição vence, mesmo com dois cliques simultâneos.
 * Devolve o segredo da sessão (vai pro cookie) ou null se o link não estava
 * mais disponível.
 */
export async function consumirLink(
  token: string,
  origem: { ip: string | null; userAgent: string | null },
): Promise<{ segredo: string; link: PreviaLinkRow } | null> {
  if (!TOKEN_RE.test(token)) return null
  const agora = new Date()
  const segredo = randomBytes(32).toString('hex')
  const { data } = await supabaseAdmin()
    .from('previa_link')
    .update({
      aberto_em: agora.toISOString(),
      sessao_hash: sha256(segredo),
      sessao_expira_em: new Date(agora.getTime() + PREVIA_SESSAO_HORAS * 3_600_000).toISOString(),
      ip: origem.ip,
      user_agent: origem.userAgent,
    })
    .eq('token_hash', sha256(token))
    .is('aberto_em', null)
    .is('revogado_em', null)
    .gt('expira_em', agora.toISOString())
    .select(COLUNAS)
    .maybeSingle<PreviaLinkRow>()
  return data ? { segredo, link: data } : null
}

/** Sessão de prévia válida deste navegador (cookie), ou null. */
export async function sessaoDePrevia(): Promise<PreviaLinkRow | null> {
  const segredo = (await cookies()).get(PREVIA_COOKIE)?.value
  if (!segredo || !TOKEN_RE.test(segredo)) return null
  const { data } = await supabaseAdmin()
    .from('previa_link')
    .select(COLUNAS)
    .eq('sessao_hash', sha256(segredo))
    .is('revogado_em', null)
    .gt('sessao_expira_em', new Date().toISOString())
    .maybeSingle<PreviaLinkRow>()
  return data ?? null
}

export async function contarVisualizacao(link: PreviaLinkRow): Promise<void> {
  await supabaseAdmin()
    .from('previa_link')
    .update({
      visualizacoes: link.visualizacoes + 1,
      ultima_visualizacao_em: new Date().toISOString(),
    })
    .eq('id', link.id)
}
