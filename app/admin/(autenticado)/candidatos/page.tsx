import { supabaseAdmin } from '@/lib/supabase/admin'

import { alternarAtivo } from './actions'
import { NovoCandidatoForm } from './novo-candidato-form'

export const metadata = { title: 'Candidatos · Admin' }

type Candidato = {
  id: string
  cargo: 'presidente' | 'governador' | 'senador' | 'federal' | 'estadual'
  numero: number
  nome_urna: string
  nome_completo: string | null
  ativo: boolean
  foto_url: string | null
  partidos: { sigla: string; cor_hex: string | null } | null
}

const ROTULO_CARGO: Record<Candidato['cargo'], string> = {
  presidente: 'Presidente',
  governador: 'Governador',
  senador: 'Senador',
  federal: 'Deputado Federal',
  estadual: 'Deputado Estadual',
}

export default async function CandidatosPage() {
  const db = supabaseAdmin()

  const { data: edicao } = await db
    .from('edicao')
    .select('id, nome')
    .eq('ativa', true)
    .maybeSingle()

  const { data: partidos } = await db
    .from('partidos')
    .select('id, numero, sigla, nome')
    .eq('ativo', true)
    .order('numero')

  const candidatos = edicao
    ? (
        await db
          .from('candidatos_pesquisa')
          .select(
            'id, cargo, numero, nome_urna, nome_completo, ativo, foto_url, partidos!inner ( sigla, cor_hex )',
          )
          .eq('edicao_id', edicao.id)
          .order('cargo')
          .order('numero')
          .returns<Candidato[]>()
      ).data ?? []
    : []

  // Agrupa por cargo
  const porCargo = new Map<Candidato['cargo'], Candidato[]>()
  for (const c of candidatos) {
    const arr = porCargo.get(c.cargo) ?? []
    arr.push(c)
    porCargo.set(c.cargo, arr)
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Candidatos</h1>
        <p className="text-sm text-muted-foreground">
          Cadastrados na edição ativa
          {edicao ? (
            <>
              :{' '}
              <span className="font-medium text-foreground">{edicao.nome}</span>
            </>
          ) : (
            <span className="text-error"> · sem edição ativa</span>
          )}
          .
        </p>
        <p className="text-xs text-muted-foreground">
          Federal e Estadual armazenam o voto como <strong>legenda</strong>
          (metodologia). Os candidatos individuais aqui servem só pra
          mostrar nome + foto na cédula quando o eleitor digita o número
          completo de 4/5 dígitos — espelho da urna.
        </p>
      </header>

      {edicao ? <NovoCandidatoForm partidos={partidos ?? []} /> : null}

      {(['presidente', 'governador', 'senador', 'federal', 'estadual'] as const).map((cargo) => (
        <section key={cargo} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            {ROTULO_CARGO[cargo]}{' '}
            <span className="text-muted-foreground">
              ({(porCargo.get(cargo) ?? []).length})
            </span>
          </h2>
          {(porCargo.get(cargo) ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground italic px-3 py-2">
              Nenhum candidato cadastrado neste cargo.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {(porCargo.get(cargo) ?? []).map((c) => (
                <div
                  key={c.id}
                  className={`rounded-md border px-4 py-3 flex items-center gap-4 ${
                    c.ativo
                      ? 'border-border bg-background'
                      : 'border-border/50 bg-muted opacity-60'
                  }`}
                >
                  <div
                    className="w-12 h-12 rounded-md flex items-center justify-center text-xs font-bold text-white tabular-nums"
                    style={{ background: c.partidos?.cor_hex ?? '#52525b' }}
                  >
                    {c.numero}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {c.nome_urna}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.partidos?.sigla}
                      {c.nome_completo ? ` · ${c.nome_completo}` : ''}
                    </p>
                  </div>
                  <form action={alternarAtivo}>
                    <input type="hidden" name="id" value={c.id} />
                    <input
                      type="hidden"
                      name="ativo"
                      value={String(!c.ativo)}
                    />
                    <button
                      type="submit"
                      className="h-8 px-3 rounded-md border border-border text-xs hover:bg-muted transition whitespace-nowrap"
                    >
                      {c.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
