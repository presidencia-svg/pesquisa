import Image from 'next/image'

/**
 * Marca CDL Aracaju.
 *
 * Renderiza o logo PNG oficial do projeto (`/public/cdl-logo.png`). O
 * arquivo veio dos projetos irmaos da CDL (compre-daqui / cupompro), o
 * mesmo que e usado neles — garantindo identidade visual coerente entre
 * os produtos da casa.
 *
 * Usar em telas FORA da capsula. Dentro da capsula a marca e omitida
 * intencionalmente pra preservar o foco no ato de votar.
 */
export function MarcaCdl({
  tamanho = 'md',
  alinhamento = 'left',
}: {
  tamanho?: 'sm' | 'md' | 'lg'
  alinhamento?: 'left' | 'center'
}) {
  const dimensoes =
    tamanho === 'lg'
      ? { width: 200, height: 98 }
      : tamanho === 'sm'
        ? { width: 96, height: 47 }
        : { width: 140, height: 69 }

  return (
    <div
      className={`flex ${
        alinhamento === 'center' ? 'justify-center' : 'justify-start'
      }`}
    >
      <Image
        src="/cdl-logo.png"
        alt="CDL Aracaju — Câmara de Dirigentes Lojistas"
        width={dimensoes.width}
        height={dimensoes.height}
        priority={tamanho === 'lg'}
        className="h-auto"
      />
    </div>
  )
}
