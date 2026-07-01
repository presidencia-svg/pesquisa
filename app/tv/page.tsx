/**
 * Apresentação PÚBLICA pra telona/TV Atalaia — SEM login.
 *
 * Gateada por divulgada_em (carregarResultados sem ignorarDivulgacao):
 * antes da divulgação oficial mostra "em breve"; depois, a apresentação
 * em tela cheia (mesma da TV interna). É só abrir /tv no navegador da
 * telona e deixar em tela cheia (F11).
 *
 * Não expõe nada além do que o /resultados público já mostra — os dois
 * respeitam o mesmo gate de divulgação (compliance TRE).
 */
import { ApresentacaoTV } from '@/components/apresentacao-tv'
import { construirApresData } from '@/lib/apresentacao-data'
import { carregarResultados } from '@/lib/resultados-data'

export const metadata = {
  title: 'Pesquisa Eleitoral Sergipe 2026 · Ao vivo',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

export default async function TvPage() {
  const r = await carregarResultados()

  if (r.status === 'aguardando') {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
          textAlign: 'center',
          padding: 32,
          background: 'radial-gradient(120% 120% at 80% 0%,#0a1741 0%,#05102e 60%)',
          color: '#eaf0ff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.01em' }}>
          Pesquisa Eleitoral Sergipe 2026
        </div>
        <div style={{ fontSize: 22, color: '#9fb0d8', maxWidth: 640 }}>
          Resultados em breve — aguardando a divulgação oficial (registro no TRE/SE).
        </div>
      </main>
    )
  }

  const data = await construirApresData(r.pesquisa, r.patroPorCota)
  return <ApresentacaoTV data={data} />
}
