import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

import { DispararLoteForm } from './disparar-lote-form'

export const dynamic = 'force-dynamic'

export default async function NotificarResultadoPage() {
  await requireAdmin()

  const db = supabaseAdmin()

  const { data: edicao } = await db
    .from('edicao')
    .select('id, nome, divulgada_em')
    .eq('ativa', true)
    .maybeSingle()

  let stats = {
    optIn: 0,
    enviados: 0,
    pendentes: 0,
  }

  if (edicao) {
    const [
      { count: optIn },
      { count: enviados },
      { count: pendentes },
    ] = await Promise.all([
      db
        .from('eleitores_pesquisa')
        .select('id', { count: 'exact', head: true })
        .eq('edicao_id', edicao.id)
        .eq('opt_in_resultados_wa', true)
        .eq('wa_validado', true),
      db
        .from('eleitores_pesquisa')
        .select('id', { count: 'exact', head: true })
        .eq('edicao_id', edicao.id)
        .eq('opt_in_resultados_wa', true)
        .eq('wa_validado', true)
        .not('resultado_enviado_em', 'is', null),
      db
        .from('eleitores_pesquisa')
        .select('id', { count: 'exact', head: true })
        .eq('edicao_id', edicao.id)
        .eq('opt_in_resultados_wa', true)
        .eq('wa_validado', true)
        .is('resultado_enviado_em', null),
    ])
    stats = {
      optIn: optIn ?? 0,
      enviados: enviados ?? 0,
      pendentes: pendentes ?? 0,
    }
  }

  const divulgada = Boolean(edicao?.divulgada_em)

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          Comunicação
        </p>
        <h1 className="text-2xl font-semibold">
          Notificar resultados por WhatsApp
        </h1>
        <p className="text-sm text-muted-foreground">
          Eleitores que marcaram a opção &quot;Quero receber em primeira
          mão&quot; recebem mensagem com link para{' '}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">
            /resultados
          </code>
          .
        </p>
      </header>

      {!edicao ? (
        <div className="rounded-md border border-error/30 bg-error/5 text-error px-4 py-3 text-sm">
          Nenhuma edição ativa encontrada. Crie/ative uma edição em{' '}
          <code>/admin/edicoes</code>.
        </div>
      ) : !divulgada ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 text-sm flex flex-col gap-1">
          <p className="font-medium">
            Edição &quot;{edicao.nome}&quot; ainda não foi marcada como
            divulgada.
          </p>
          <p>
            O envio só é permitido após a divulgação pública no telejornal
            parceiro (Cláusula 2ª, V do convênio com a TV Atalaia). Marque a
            divulgação em <code>/admin/edicoes</code> antes de notificar.
          </p>
        </div>
      ) : null}

      <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-md border border-border bg-background p-4 flex flex-col gap-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Opt-in total
          </p>
          <p className="text-3xl font-bold tabular-nums">{stats.optIn}</p>
          <p className="text-xs text-muted-foreground">
            Eleitores validados que marcaram &quot;quero receber&quot;
          </p>
        </div>
        <div className="rounded-md border border-border bg-background p-4 flex flex-col gap-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Já notificados
          </p>
          <p className="text-3xl font-bold tabular-nums text-accent">
            {stats.enviados}
          </p>
        </div>
        <div className="rounded-md border border-border bg-background p-4 flex flex-col gap-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Pendentes
          </p>
          <p className="text-3xl font-bold tabular-nums text-primary">
            {stats.pendentes}
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-md border border-border bg-muted/40 p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">Disparar próximo lote</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Processa até <strong>100 eleitores por clique</strong>. O envio é
            limitado a ~5 mensagens/segundo (Meta tolera 80/s — folga ampla).
            Você pode clicar várias vezes em sequência até a fila zerar.
          </p>
        </div>
        <DispararLoteForm
          desabilitado={!edicao || !divulgada || stats.pendentes === 0}
          pendentes={stats.pendentes}
        />
      </section>

      <details className="text-sm text-muted-foreground">
        <summary className="cursor-pointer hover:text-foreground">
          Como funciona?
        </summary>
        <ul className="list-disc pl-5 mt-2 flex flex-col gap-1 leading-relaxed">
          <li>
            Apenas eleitores com <code>opt_in_resultados_wa = true</code> e{' '}
            <code>wa_validado = true</code> são considerados.
          </li>
          <li>
            Idempotente: o campo <code>resultado_enviado_em</code> evita
            envio duplicado.
          </li>
          <li>
            Usa template Meta WhatsApp (categoria UTILITY) pré-aprovado:{' '}
            <code>resultado_pesquisa_sergipe</code>.
          </li>
          <li>
            Em caso de falha de envio (Meta API), a linha permanece pendente
            — pode clicar de novo pra reprocessar.
          </li>
          <li>
            Throttle interno de 200ms entre mensagens, dentro do limite Meta.
          </li>
        </ul>
      </details>
    </div>
  )
}
