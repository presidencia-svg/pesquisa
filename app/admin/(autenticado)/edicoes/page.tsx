import { supabaseAdmin } from '@/lib/supabase/admin'

import { ativarEdicao, desativarEdicao } from './actions'
import { NovaEdicaoForm } from './nova-edicao-form'

export const metadata = { title: 'Edições · Admin' }

type Edicao = {
  id: string
  nome: string
  inicio: string
  fim: string
  ativa: boolean
  registro_tre: string | null
  criado_em: string
}

export default async function EdicoesPage() {
  const db = supabaseAdmin()
  const { data: edicoes } = await db
    .from('edicao')
    .select('*')
    .order('criado_em', { ascending: false })
    .returns<Edicao[]>()

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Edições</h1>
        <p className="text-sm text-muted-foreground">
          Cada edição é uma rodada da pesquisa (piloto, principal, etc).
          Apenas uma pode estar ativa por vez.
        </p>
      </header>

      <NovaEdicaoForm />

      <div className="flex flex-col gap-3">
        {(edicoes ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            Nenhuma edição cadastrada ainda.
          </p>
        ) : (
          (edicoes ?? []).map((e) => (
            <div
              key={e.id}
              className="rounded-md border border-border bg-background p-5 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex items-baseline gap-3">
                  <p className="text-base font-semibold">{e.nome}</p>
                  {e.ativa ? (
                    <span className="text-[10px] uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                      ativa
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatarDataCurta(e.inicio)} → {formatarDataCurta(e.fim)}
                </p>
                {e.registro_tre ? (
                  <p className="text-[11px] text-muted-foreground">
                    Registro TRE/SE:{' '}
                    <span className="font-mono">{e.registro_tre}</span>
                  </p>
                ) : null}
              </div>

              <div className="flex gap-2">
                {e.ativa ? (
                  <form action={desativarEdicao}>
                    <input type="hidden" name="id" value={e.id} />
                    <button
                      type="submit"
                      className="h-9 px-3 rounded-md border border-border text-xs hover:bg-muted transition"
                    >
                      Desativar
                    </button>
                  </form>
                ) : (
                  <form action={ativarEdicao}>
                    <input type="hidden" name="id" value={e.id} />
                    <button
                      type="submit"
                      className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition"
                    >
                      Ativar
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function formatarDataCurta(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
