/**
 * Mapa choropleth de Sergipe com 75 municípios.
 *
 * Renderiza SVG estático — funciona em RSC. Tooltip via <title> nativo
 * SVG (mostra ao hover sem JS). Pra coloração, recebe `pintura` que
 * mapeia ibge_codigo → { cor, label }.
 *
 * Municípios sem entrada em `pintura` ficam cinza claro (#e5e7eb).
 *
 * O SVG é responsivo (preserveAspectRatio=meet). Defina largura via
 * style/className do container.
 */
import { SERGIPE_PATHS, SERGIPE_VIEWBOX } from '@/lib/sergipe-paths.generated'

export type PinturaMunicipio = {
  cor: string
  label: string
}

type Props = {
  pintura: Map<number, PinturaMunicipio>
  destaque?: number | null
  className?: string
}

export function MapaSergipe({ pintura, destaque, className }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${SERGIPE_VIEWBOX.width} ${SERGIPE_VIEWBOX.height}`}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      style={{ width: '100%', height: 'auto' }}
      aria-label="Mapa choropleth de Sergipe: 75 municípios coloridos pelo candidato vencedor"
    >
      {SERGIPE_PATHS.map((m) => {
        const info = pintura.get(m.ibge_codigo)
        const isDestaque = destaque === m.ibge_codigo
        return (
          <path
            key={m.ibge_codigo}
            d={m.d}
            fill={info?.cor ?? '#e5e7eb'}
            stroke={isDestaque ? '#0a2a6e' : '#fff'}
            strokeWidth={isDestaque ? 0.006 : 0.003}
            strokeLinejoin="round"
          >
            <title>{info?.label ?? `Município ${m.ibge_codigo}`}</title>
          </path>
        )
      })}
    </svg>
  )
}
