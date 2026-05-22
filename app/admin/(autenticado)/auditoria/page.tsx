import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const LIMITE = 200

const LABELS: Record<string, string> = {
  view_resultados_pos_divulgacao: '👁️ Resultados (pós-divulgação)',
  view_resultados_pre_divulgacao: '⚠️ Resultados (PRÉ-divulgação)',
  view_eleitores: '👤 Listagem de eleitores',
  marcar_divulgacao: '📢 Marcou divulgação',
  editar_candidato: '✏️ Editou candidato',
  notificar_resultado: '📲 Disparou notificação WhatsApp',
  view_diagnostico_spc: '🔎 Diagnóstico SPC',
}

export default async function AuditoriaPage() {
  await requireAdmin()

  const db = supabaseAdmin()

  const { data: registros, error } = await db
    .from('admin_audit_log')
    .select('id, acao, recurso, detalhe, ip, user_agent, criado_em')
    .order('criado_em', { ascending: false })
    .limit(LIMITE)

  const { count: total } = await db
    .from('admin_audit_log')
    .select('id', { count: 'exact', head: true })

  const acoes = new Map<string, number>()
  for (const r of registros ?? []) {
    acoes.set(r.acao, (acoes.get(r.acao) ?? 0) + 1)
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          LGPD · Art. 37
        </p>
        <h1 className="text-2xl font-semibold">Auditoria de acessos admin</h1>
        <p className="text-sm text-muted-foreground">
          Registros de operações de tratamento via painel admin. Mostra as
          últimas {LIMITE} ações.
        </p>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card label="Total no log" valor={total ?? 0} />
        <Card label="Ações distintas" valor={acoes.size} />
        <Card
          label="Pré-divulgação"
          valor={acoes.get('view_resultados_pre_divulgacao') ?? 0}
          destaque
        />
        <Card
          label="Pós-divulgação"
          valor={acoes.get('view_resultados_pos_divulgacao') ?? 0}
        />
      </section>

      {error ? (
        <div className="rounded-md border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          Erro ao carregar log: {error.message}
        </div>
      ) : null}

      <section className="rounded-md border border-border bg-background overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Quando</th>
              <th className="text-left px-3 py-2">Ação</th>
              <th className="text-left px-3 py-2">Recurso</th>
              <th className="text-left px-3 py-2">IP</th>
              <th className="text-left px-3 py-2">Detalhe</th>
            </tr>
          </thead>
          <tbody>
            {(registros ?? []).map((r) => (
              <tr
                key={r.id}
                className="border-t border-border align-top hover:bg-muted/40"
              >
                <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                  {new Date(r.criado_em).toLocaleString('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'medium',
                  })}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={
                      r.acao === 'view_resultados_pre_divulgacao'
                        ? 'text-amber-700 font-medium'
                        : 'text-foreground'
                    }
                  >
                    {LABELS[r.acao] ?? r.acao}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs font-mono text-muted-foreground">
                  {r.recurso ?? '—'}
                </td>
                <td className="px-3 py-2 text-xs font-mono">{r.ip ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {r.detalhe ? (
                    <pre className="text-[10px] whitespace-pre-wrap break-all max-w-md">
                      {JSON.stringify(r.detalhe)}
                    </pre>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
            {!registros || registros.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-muted-foreground italic"
                >
                  Nenhum registro ainda. Comece a usar o painel pra ver.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <p className="text-xs text-muted-foreground">
        Retenção: registros são limpos pelo cron 1 ano após a edição mais
        antiga encerrar. Auditoria preservada para LGPD art. 37.
      </p>
    </div>
  )
}

function Card({
  label,
  valor,
  destaque,
}: {
  label: string
  valor: number
  destaque?: boolean
}) {
  return (
    <div
      className={
        destaque
          ? 'rounded-md border border-amber-200 bg-amber-50 p-4 flex flex-col gap-1'
          : 'rounded-md border border-border bg-background p-4 flex flex-col gap-1'
      }
    >
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p
        className={
          destaque
            ? 'text-3xl font-bold tabular-nums text-amber-800'
            : 'text-3xl font-bold tabular-nums text-foreground'
        }
      >
        {valor}
      </p>
    </div>
  )
}
