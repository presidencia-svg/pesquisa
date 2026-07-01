/**
 * Apresentação da pesquisa pra TV Atalaia (INTERNA — ensaio antes da
 * divulgação). Usa ignorarDivulgacao=true pra o operador montar/ensaiar.
 *
 * A versão PÚBLICA (gateada por divulgada_em, sem login, pra abrir na
 * telona) fica em /tv. Ambas usam o mesmo builder (lib/apresentacao-data).
 */
import { ApresentacaoTV } from '@/components/apresentacao-tv'
import { registrarAcessoAdmin } from '@/lib/admin-audit'
import { construirApresData } from '@/lib/apresentacao-data'
import { carregarResultados } from '@/lib/resultados-data'

export const metadata = { title: 'Apresentação TV · Pesquisa Eleitoral Sergipe 2026' }
export const dynamic = 'force-dynamic'

export default async function ApresentacaoPage() {
  const r = await carregarResultados({ ignorarDivulgacao: true })

  if (r.status === 'aguardando') {
    return (
      <main style={{ padding: 48, color: '#fff', background: '#05102e', minHeight: '100vh' }}>
        <h1>Sem edição ativa</h1>
        <p>Ative uma edição em /admin/edicoes pra montar a apresentação.</p>
      </main>
    )
  }

  await registrarAcessoAdmin(
    'abrir_apresentacao_tv',
    { edicao: r.pesquisa.meta.edicao, n: r.pesquisa.meta.n },
    'apresentacao',
  )

  const data = await construirApresData(r.pesquisa, r.patroPorCota)
  return <ApresentacaoTV data={data} />
}
