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

// Coleta encerrada: numeros finais. 5 min de cache — a cada revalidacao a pagina
// roda ~11 agregacoes sobre 59 mil votos; a 15 s isso saturou o banco no pico.
export const revalidate = 300

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

// Sem generateStaticParams o segmento dinâmico era renderizado a cada
// request (cache-control: private, no-store) e o `revalidate` não valia:
// no pico pós-divulgação cada visitante disparava ~14 consultas no banco.
// Com os slugs declarados, as 6 páginas viram ISR de verdade (300 s).
export function generateStaticParams() {
  return (Object.keys(SLUG_PARA_CARGO) as Slug[]).map((cargo) => ({ cargo }))
}

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
