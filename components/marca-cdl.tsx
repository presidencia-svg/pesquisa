import Image from 'next/image'

/**
 * Marca do produto — CDL Pesquisas.
 *
 * Renderiza `/public/cdl-pesquisas-logo.png` — mesmo símbolo e "CDL" do
 * logo institucional da CDL Aracaju, com "Aracaju" trocado por
 * "Pesquisas" (verde #008141 itálico), conforme o design importado do
 * Claude Design ("Logo CDL Pesquisas"). É a marca do produto de pesquisa
 * eleitoral, usada em todo o site.
 *
 * O logo institucional original continua em `/public/cdl-logo.png` caso
 * precise voltar. Usar em telas FORA da cápsula — dentro dela a marca é
 * omitida pra preservar o foco no ato de votar.
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
        src="/cdl-pesquisas-logo.png"
        alt="CDL Pesquisas — Câmara de Dirigentes Lojistas de Aracaju"
        width={dimensoes.width}
        height={dimensoes.height}
        priority={tamanho === 'lg'}
        className="h-auto"
      />
    </div>
  )
}
