import { ROTULO_COTA, type CotaPatro, type PatroFaixa } from '@/lib/patrocinadores'

/**
 * Faixa de patrocinadores exibida na jornada do votante (entrada, cabine,
 * encerramento) e na página de demonstração pra patrocinadores.
 *
 * - `tema`: 'claro' (fundo branco) ou 'escuro' (cápsula) — muda só a cor do
 *   rótulo; os logos ficam sempre em chip branco (foram feitos pra fundo claro).
 * - `detalhado`: mostra os rótulos por cota (Oferecimento/Patrocínio/Apoio),
 *   pra apresentação ao patrocinador. Padrão: faixa compacta única.
 * - `variante`: quando não há patrocinador, mostra slots "Sua marca aqui"
 *   (útil na demo) se `mostrarVazio`.
 */
const ALT_LOGO: Record<CotaPatro, string> = {
  diamante: 'max-h-11', // ~44px
  ouro: 'max-h-9', // ~36px
  prata: 'max-h-7', // ~28px
}

function Chip({ p }: { p: PatroFaixa }) {
  return (
    <div className="bg-white rounded-lg px-4 py-2 flex items-center justify-center shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={p.logoUrl}
        alt={p.empresa}
        className={`${ALT_LOGO[p.cota]} w-auto object-contain`}
      />
    </div>
  )
}

export function FaixaPatrocinadores({
  patrocinadores,
  tema = 'claro',
  detalhado = false,
  titulo = 'Patrocínio',
}: {
  patrocinadores: PatroFaixa[]
  tema?: 'claro' | 'escuro'
  detalhado?: boolean
  titulo?: string
}) {
  if (patrocinadores.length === 0) return null

  const corRotulo = tema === 'escuro' ? 'text-white/55' : 'text-muted-foreground'
  const corBorda = tema === 'escuro' ? 'border-white/15' : 'border-border'

  if (detalhado) {
    const cotas: CotaPatro[] = ['diamante', 'ouro', 'prata']
    return (
      <div className={`border-t ${corBorda} pt-5 flex flex-col gap-4`}>
        {cotas.map((cota) => {
          const lista = patrocinadores.filter((p) => p.cota === cota)
          if (lista.length === 0) return null
          return (
            <div key={cota} className="flex flex-col items-center gap-2">
              <span
                className={`text-[10px] uppercase tracking-[0.22em] ${corRotulo}`}
              >
                {ROTULO_COTA[cota]}
              </span>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {lista.map((p) => (
                  <Chip key={p.empresa} p={p} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div
      className={`border-t ${corBorda} pt-4 flex flex-col items-center gap-3`}
    >
      <span className={`text-[10px] uppercase tracking-[0.22em] ${corRotulo}`}>
        {titulo}
      </span>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {patrocinadores.map((p) => (
          <Chip key={p.empresa} p={p} />
        ))}
      </div>
    </div>
  )
}
