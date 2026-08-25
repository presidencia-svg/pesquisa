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
  // Edição sem registro no TRE = demonstração: faixa fixa no topo do telão.
  const ehDemo = !r.pesquisa.meta.registro_tre
  return (
    <>
      {ehDemo && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            background: '#b45309',
            color: '#fff',
            textAlign: 'center',
            padding: '6px 16px',
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: '0.03em',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          DEMONSTRAÇÃO · dados ilustrativos, sem valor de pesquisa registrada
        </div>
      )}
      <ApresentacaoTV data={data} />
    </>
  )
}
