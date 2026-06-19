'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import {
  Detalhe,
  DetalheZona,
  type CargoCandidato,
  type CargoZona,
} from './resultados-dashboard'

/**
 * Tela dedicada de um cargo (rota /resultados/[cargo]).
 *
 * Reaproveita os componentes Detalhe/DetalheZona do dashboard, mas em vez
 * de "fechar e voltar pro topo da mesma página" (modelo antigo de drill-down),
 * o "fechar" navega de volta pro hub /resultados. Header com botão Voltar
 * em cima e embaixo pra leitura confortável em TV/celular.
 */
export function CargoDetalheScreen({
  kind,
  cargoCandidato,
  cargoZona,
  edicaoLabel,
  turno,
}: {
  kind: 'candidato' | 'zona'
  cargoCandidato?: CargoCandidato
  cargoZona?: CargoZona
  edicaoLabel: string
  turno: 1 | 2
}) {
  const router = useRouter()
  const voltar = () => router.push('/resultados')

  return (
    <>
      <header className="rs-cargoscreen-top">
        <div className="rs-cargoscreen-top-inner">
          <button
            type="button"
            onClick={voltar}
            className="rs-cargoscreen-back"
          >
            ← Voltar aos resultados
          </button>
          <span className="rs-cargoscreen-edicao">
            {turno}º TURNO · {edicaoLabel}
          </span>
        </div>
      </header>

      <main className="rs-cargoscreen">
        <div className="rs-cargoscreen-inner">
          {kind === 'zona' && cargoZona ? (
            <DetalheZona cargo={cargoZona} onClose={voltar} />
          ) : cargoCandidato ? (
            <Detalhe cargo={cargoCandidato} onClose={voltar} />
          ) : null}

          <div className="rs-cargoscreen-foot">
            <button
              type="button"
              onClick={voltar}
              className="rs-cargoscreen-back rs-cargoscreen-back-foot"
            >
              ← Voltar aos resultados
            </button>
            <Link href="/resultados/mapa" className="rs-cargoscreen-mapa">
              Ver mapa por cidade →
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
