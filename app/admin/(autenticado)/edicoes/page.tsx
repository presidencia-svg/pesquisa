import { supabaseAdmin } from '@/lib/supabase/admin'

import { ativarEdicao, desativarEdicao } from './actions'
import {
  ControlesDivulgacao,
  type PonderacaoExecucaoResumo,
} from './controles-divulgacao'
import { NovaEdicaoForm } from './nova-edicao-form'

export const metadata = { title: 'Edições · Admin' }

type Edicao = {
  id: string
  nome: string
  inicio: string
  fim: string
  ativa: boolean
  registro_tre: string | null
  numero_conre_responsavel: string | null
  data_registro_pesqele: string | null
  meta_amostra: number | null
  divulgada_em: string | null
  divulgacao_prevista: string | null
  turno: number
  consulta_zona_ativa: boolean | null
  exigir_localizacao: boolean | null
  suspensa_em: string | null
  suspensao_motivo: string | null
  ponderacao_metodo: 'municipio' | 'estratos_raking' | null
  ponderacao_execucao_id: string | null
  ponderacao_aprovada_em: string | null
  ponderacao_aprovada_por: string | null
  complementacao_pesqele_em: string | null
  criado_em: string
}

export default async function EdicoesPage() {
  const db = supabaseAdmin()
  const { data: edicoes } = await db
    .from('edicao')
    .select('*')
    .order('criado_em', { ascending: false })
    .returns<Edicao[]>()

  // Execuções de ponderação apontadas pelas edições (diagnósticos pro bloco
  // de ponderação: n efetivo, deff, margem efetiva, convergência).
  const execIds = (edicoes ?? [])
    .map((e) => e.ponderacao_execucao_id)
    .filter((x): x is string => Boolean(x))
  const execPorId = new Map<string, PonderacaoExecucaoResumo>()
  if (execIds.length > 0) {
    const { data: execs } = await db
      .from('ponderacao_execucao')
      .select(
        'id, executado_em, executado_por, iteracoes, convergiu, n_peso_positivo, n_eff, deff, peso_max, margem_nominal, margem_efetiva',
      )
      .in('id', execIds)
    for (const x of execs ?? []) {
      execPorId.set(x.id as string, {
        id: x.id as string,
        executado_em: x.executado_em as string,
        executado_por: (x.executado_por as string | null) ?? null,
        iteracoes: x.iteracoes == null ? null : Number(x.iteracoes),
        convergiu: x.convergiu == null ? null : Boolean(x.convergiu),
        n_peso_positivo: x.n_peso_positivo == null ? null : Number(x.n_peso_positivo),
        n_eff: x.n_eff == null ? null : Number(x.n_eff),
        deff: x.deff == null ? null : Number(x.deff),
        peso_max: x.peso_max == null ? null : Number(x.peso_max),
        margem_nominal: x.margem_nominal == null ? null : Number(x.margem_nominal),
        margem_efetiva: x.margem_efetiva == null ? null : Number(x.margem_efetiva),
      })
    }
  }

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
              className="rounded-md border border-border bg-background p-5 flex flex-col gap-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <p className="text-base font-semibold">{e.nome}</p>
                    {e.ativa ? (
                      <span className="text-[10px] uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                        ativa
                      </span>
                    ) : null}
                    {e.divulgada_em ? (
                      <span className="text-[10px] uppercase tracking-widest text-accent bg-accent/10 border border-accent/30 rounded-full px-2 py-0.5">
                        divulgada
                      </span>
                    ) : null}
                    {e.suspensa_em ? (
                      <span className="text-[10px] uppercase tracking-widest text-error bg-error/10 border border-error/40 rounded-full px-2 py-0.5 font-semibold">
                        suspensa · ordem judicial
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
                  ) : (
                    <p className="text-[11px] text-amber-700">
                      Sem registro no PesqEle ainda — divulgação bloqueada até registrar (≥5 dias antes).
                    </p>
                  )}
                  {e.meta_amostra ? (
                    <p className="text-[11px] text-muted-foreground">
                      Meta mínima: {e.meta_amostra.toLocaleString('pt-BR')} respondentes validados
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

              <ControlesDivulgacao
                edicaoId={e.id}
                divulgadaEm={e.divulgada_em}
                registroTre={e.registro_tre}
                conreResponsavel={e.numero_conre_responsavel}
                dataRegistroPesqele={e.data_registro_pesqele}
                metaAmostra={e.meta_amostra ?? null}
                divulgacaoPrevista={e.divulgacao_prevista}
                turno={e.turno ?? 1}
                consultaZonaAtiva={e.consulta_zona_ativa ?? true}
                exigirLocalizacao={e.exigir_localizacao ?? false}
                suspensaEm={e.suspensa_em ?? null}
                suspensaoMotivo={e.suspensao_motivo ?? null}
                ponderacaoMetodo={e.ponderacao_metodo ?? 'municipio'}
                ponderacaoExecucao={
                  e.ponderacao_execucao_id
                    ? (execPorId.get(e.ponderacao_execucao_id) ?? null)
                    : null
                }
                ponderacaoAprovadaEm={e.ponderacao_aprovada_em ?? null}
                ponderacaoAprovadaPor={e.ponderacao_aprovada_por ?? null}
                complementacaoPesqeleEm={e.complementacao_pesqele_em ?? null}
                fim={e.fim}
              />
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
