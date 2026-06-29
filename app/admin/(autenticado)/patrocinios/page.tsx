import { registrarAcessoAdmin } from '@/lib/admin-audit'
import { supabaseAdmin } from '@/lib/supabase/admin'

import { LinhaInteressado } from './linha-cliente'

export const metadata = { title: 'Patrocínios · Admin' }
export const dynamic = 'force-dynamic'

type Lead = {
  id: string
  empresa: string
  cnpj: string | null
  contato_nome: string
  contato_email: string
  contato_telefone: string | null
  cota: 'diamante' | 'ouro' | 'prata'
  mensagem: string | null
  status: 'novo' | 'em_contato' | 'firmado' | 'recusado'
  criado_em: string
  logo_url: string | null
  site_url: string | null
  mostrar_publico: boolean
}

const COTAS_VALOR = { diamante: 100_000, ouro: 80_000, prata: 30_000 } as const

export default async function PatrociniosPage() {
  await registrarAcessoAdmin('view_patrocinios', {})

  const db = supabaseAdmin()
  const { data: leads } = await db
    .from('interessados_patrocinio')
    .select(
      'id, empresa, cnpj, contato_nome, contato_email, contato_telefone, cota, mensagem, status, criado_em, logo_url, site_url, mostrar_publico',
    )
    .order('criado_em', { ascending: false })
    .returns<Lead[]>()

  const rows = leads ?? []
  const totais = {
    novo: rows.filter((l) => l.status === 'novo').length,
    em_contato: rows.filter((l) => l.status === 'em_contato').length,
    firmado: rows.filter((l) => l.status === 'firmado'),
    recusado: rows.filter((l) => l.status === 'recusado').length,
  }
  const receitaFirmada = totais.firmado.reduce(
    (acc, l) => acc + COTAS_VALOR[l.cota],
    0,
  )

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Patrocínios</h1>
        <p className="text-sm text-muted-foreground">
          Leads de patrocínio institucional B2B vindos de{' '}
          <code>/patrocinio</code>. Lei 9.504/97 art. 33 — contratantes devem
          ser declarados no PesqEle.
        </p>
      </header>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Card titulo="Novos" valor={totais.novo} cor="rgb(56, 189, 248)" />
        <Card
          titulo="Em contato"
          valor={totais.em_contato}
          cor="rgb(245, 158, 11)"
        />
        <Card
          titulo="Firmados"
          valor={totais.firmado.length}
          cor="rgb(16, 185, 129)"
        />
        <Card
          titulo="Receita firmada"
          valor={`R$ ${receitaFirmada.toLocaleString('pt-BR')}`}
          cor="rgb(34, 197, 94)"
        />
      </div>

      {/* Lista */}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          Nenhum lead ainda. Divulgue{' '}
          <a href="/patrocinio" className="text-primary hover:underline">
            /patrocinio
          </a>{' '}
          pra atrair interessados.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((lead) => (
            <LinhaInteressado key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </div>
  )
}

function Card({
  titulo,
  valor,
  cor,
}: {
  titulo: string
  valor: number | string
  cor: string
}) {
  return (
    <div
      className="rounded-md border border-border bg-background p-4 flex flex-col gap-1"
      style={{ borderLeftColor: cor, borderLeftWidth: 4 }}
    >
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {titulo}
      </p>
      <p className="text-2xl font-semibold tabular-nums">{valor}</p>
    </div>
  )
}
