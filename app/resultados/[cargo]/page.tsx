import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { CargoDetalheScreen } from '@/components/cargo-detalhe-screen'
import { RodapeInstitucional } from '@/components/rodape-institucional'
import type {
  CargoCandidato,
  CargoZona,
} from '@/components/resultados-dashboard'
import { carregarResultados } from '@/lib/resultados-data'

import '../resultados.css'

export const revalidate = 15

// Slug da URL → chave do cargo em Pesquisa. 'mapa' não cai aqui porque
// /resultados/mapa é rota estática (Next prioriza segmento estático).
const SLUG_PARA_CARGO = {
  presidente: 'presidente',
  governador: 'governador',
  senador: 'senador',
  'deputado-federal': 'federal',
  'deputado-estadual': 'estadual',
  'zona-expansao': 'zona_expansao',
} as const

type Slug = keyof typeof SLUG_PARA_CARGO

const ROTULO: Record<Slug, string> = {
  presidente: 'Presidente',
  governador: 'Governador',
  senador: 'Senador',
  'deputado-federal': 'Deputado Federal',
  'deputado-estadual': 'Deputado Estadual',
  'zona-expansao': 'Zona de Expansão',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cargo: string }>
}) {
  const { cargo } = await params
  const rotulo = ROTULO[cargo as Slug]
  if (!rotulo) return { title: 'Resultados · Pesquisa Eleitoral Sergipe 2026' }
  return {
    title: `${rotulo} · Resultados Pesquisa Eleitoral Sergipe 2026`,
    robots: { index: false, follow: true },
  }
}

export default async function CargoResultadoPage({
  params,
}: {
  params: Promise<{ cargo: string }>
}) {
  const { cargo: slug } = await params
  const cargoKey = SLUG_PARA_CARGO[slug as Slug]
  if (!cargoKey) notFound()

  const r = await carregarResultados()
  if (r.status === 'aguardando') {
    // Edição não divulgada — não expõe cargo isolado, volta pro hub
    // (que mostra "em breve").
    redirect('/resultados')
  }

  const cargo = r.pesquisa[cargoKey]

  if (!cargo) {
    return (
      <>
        <main className="rs-cargoscreen">
          <div className="rs-cargoscreen-inner">
            <div className="rs-cargoscreen-semdados">
              <h1>{ROTULO[slug as Slug]}</h1>
              <p>
                Ainda não há dados suficientes para este cargo nesta edição.
              </p>
              <Link href="/resultados" className="rs-cargoscreen-back">
                ← Voltar aos resultados
              </Link>
            </div>
          </div>
        </main>
        <RodapeInstitucional />
      </>
    )
  }

  const isZona = cargoKey === 'zona_expansao'

  return (
    <>
      <CargoDetalheScreen
        kind={isZona ? 'zona' : 'candidato'}
        {...(isZona
          ? { cargoZona: cargo as CargoZona }
          : { cargoCandidato: cargo as CargoCandidato })}
        edicaoLabel={r.pesquisa.meta.edicao}
        turno={r.pesquisa.meta.turno}
        amostra={r.pesquisa.meta.n}
      />
      <RodapeInstitucional />
    </>
  )
}
