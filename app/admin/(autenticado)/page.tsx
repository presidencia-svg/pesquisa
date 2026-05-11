import Link from 'next/link'

import { supabaseAdmin } from '@/lib/supabase/admin'

export const metadata = { title: 'Visão geral · Admin' }

type Resumo = {
  edicao_id: string
  nome: string
  ativa: boolean
  eleitores_cadastrados: number | null
  via_cdl_base: number | null
  via_spc: number | null
  com_wa: number | null
  tokens_emitidos: number | null
  tokens_usados: number | null
  votos_validos: number | null
  votos_brancos: number | null
  votos_nao_sabe: number | null
}

export default async function DashboardPage() {
  const db = supabaseAdmin()
  const { data: resumo } = await db
    .from('v_resumo_edicao')
    .select('*')
    .maybeSingle<Resumo>()

  const { count: candidatosCount } = await db
    .from('candidatos_pesquisa')
    .select('id', { count: 'exact', head: true })
    .eq('ativo', true)

  const { count: municipiosCount } = await db
    .from('municipios_se')
    .select('ibge_codigo', { count: 'exact', head: true })

  const { count: cdlCount } = await db
    .from('cdl_base')
    .select('cpf_hash', { count: 'exact', head: true })

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Visão geral</h1>
        <p className="text-sm text-muted-foreground">
          Estado atual da pesquisa e atalhos administrativos.
        </p>
      </header>

      {!resumo ? (
        <div className="rounded-md border border-accent/30 bg-accent/5 px-5 py-4 flex flex-col gap-3">
          <p className="text-sm font-semibold text-foreground">
            Nenhuma edição ativa.
          </p>
          <p className="text-sm text-muted-foreground">
            Pra começar, crie uma edição em{' '}
            <Link
              href="/admin/edicoes"
              className="text-primary hover:underline"
            >
              Edições
            </Link>{' '}
            e marque como ativa.
          </p>
        </div>
      ) : (
        <section className="flex flex-col gap-4">
          <div className="flex items-baseline gap-3">
            <h2 className="text-lg font-semibold">{resumo.nome}</h2>
            <span className="text-[10px] uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
              ativa
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card titulo="Eleitores cadastrados" valor={resumo.eleitores_cadastrados ?? 0} />
            <Card titulo="Via base CDL" valor={resumo.via_cdl_base ?? 0} />
            <Card titulo="Via SPC" valor={resumo.via_spc ?? 0} />
            <Card titulo="Com WhatsApp validado" valor={resumo.com_wa ?? 0} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card titulo="Tokens emitidos" valor={resumo.tokens_emitidos ?? 0} />
            <Card titulo="Tokens usados" valor={resumo.tokens_usados ?? 0} />
            <Card titulo="Votos válidos" valor={resumo.votos_validos ?? 0} />
            <Card
              titulo="Branco/Não sei"
              valor={(resumo.votos_brancos ?? 0) + (resumo.votos_nao_sabe ?? 0)}
            />
          </div>

          <Link
            href="/admin/resultados"
            className="self-start text-sm text-primary hover:underline"
          >
            Ver apuração detalhada por candidato/legenda →
          </Link>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide">
          Configuração
        </h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <CardConfig
            titulo="Municípios SE"
            valor={municipiosCount ?? 0}
            esperado={75}
            href="/admin/edicoes"
          />
          <CardConfig
            titulo="Candidatos ativos"
            valor={candidatosCount ?? 0}
            href="/admin/candidatos"
          />
          <CardConfig titulo="Base CDL" valor={cdlCount ?? 0} href="/admin" />
        </div>
      </section>
    </div>
  )
}

function Card({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="rounded-md border border-border bg-background px-4 py-3 flex flex-col gap-1">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {titulo}
      </p>
      <p className="text-2xl font-semibold tabular-nums text-foreground">
        {valor.toLocaleString('pt-BR')}
      </p>
    </div>
  )
}

function CardConfig({
  titulo,
  valor,
  esperado,
  href,
}: {
  titulo: string
  valor: number
  esperado?: number
  href: string
}) {
  const ok = esperado === undefined ? valor > 0 : valor >= esperado
  return (
    <Link
      href={href}
      className="rounded-md border border-border bg-background px-4 py-3 flex flex-col gap-1 hover:border-primary transition"
    >
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {titulo}
      </p>
      <p className="text-2xl font-semibold tabular-nums text-foreground">
        {valor.toLocaleString('pt-BR')}
        {esperado !== undefined ? (
          <span className="text-base text-muted-foreground"> / {esperado}</span>
        ) : null}
      </p>
      <p
        className={`text-[10px] uppercase tracking-widest ${ok ? 'text-emerald-700' : 'text-error'}`}
      >
        {ok ? '✓ ok' : '⚠ pendente'}
      </p>
    </Link>
  )
}
