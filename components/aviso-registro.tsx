/**
 * Aviso público de registro da pesquisa na Justiça Eleitoral.
 *
 * O aviso em si é publicado pela própria Justiça Eleitoral (Lei 9.504/97,
 * art. 33, § 2º: "afixará no prazo de vinte e quatro horas, no local de
 * costume, bem como divulgará em seu sítio na internet, aviso comunicando o
 * registro das informações"). Aqui reproduzimos o texto oficial recebido
 * pro registro do TSE e os dados do registro do TRE-SE, com o caminho pra
 * qualquer interessado conferir no sistema PesqEle.
 */

export const REGISTROS = {
  contratante: 'CÂMARA DE DIRIGENTES LOJISTAS DE ARACAJU / C.D.L.',
  cnpj: '13.045.935/0001-36',
  dataRegistro: '22/08/2026',
  coleta: '01/09/2026 a 03/09/2026',
  estatistico: 'Danilio Silva Santos — CONRE 8223',
  tse: { numero: 'BR-04041/2026', orgao: 'TSE', cargos: 'Presidente da República' },
  tre: {
    numero: 'SE-09441/2026',
    orgao: 'TRE-SE',
    cargos: 'Governador, Senador, Deputado Federal e Deputado Estadual',
  },
  /** Consulta pública do TSE às pesquisas registradas (PesqEle). */
  urlConsulta:
    'https://www.tse.jus.br/eleicoes/pesquisa-eleitorais/consulta-as-pesquisas-registradas',
} as const

/** Texto oficial do aviso, como emitido pela Justiça Eleitoral pro registro do TSE. */
export const AVISO_TSE = `Em cumprimento ao que dispõe o art. 33º e seus §§ 1º e 2º da Lei nº 9.504/97, assim como o art. 8º da Resolução TSE nº 23.549/2017, comunicamos, para ciência dos interessados, que a empresa ${REGISTROS.contratante} encaminhou à Justiça Eleitoral os dados referentes à pesquisa eleitoral das eleições Eleições Gerais 2026, protocolizada sob o nº ${REGISTROS.tse.numero}, contratada por ${REGISTROS.contratante} e registrada no sistema de registro de pesquisas eleitorais em ${REGISTROS.dataRegistro}.`

export function AvisoRegistro({ compacto = false }: { compacto?: boolean }) {
  const r = REGISTROS
  return (
    <section
      aria-labelledby="aviso-registro-titulo"
      className="w-full rounded-lg border border-border bg-muted/30 px-5 py-5 flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          Justiça Eleitoral
        </p>
        <h2 id="aviso-registro-titulo" className="text-lg font-semibold text-foreground">
          Pesquisa registrada — Lei 9.504/97, art. 33
        </h2>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">
            {r.tse.orgao} · {r.tse.cargos}
          </dt>
          <dd className="font-mono font-semibold text-foreground">{r.tse.numero}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">
            {r.tre.orgao} · {r.tre.cargos}
          </dt>
          <dd className="font-mono font-semibold text-foreground">{r.tre.numero}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">Registro no PesqEle</dt>
          <dd className="text-foreground">{r.dataRegistro}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">Período de coleta</dt>
          <dd className="text-foreground">{r.coleta}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">Contratante e realizadora</dt>
          <dd className="text-foreground">
            CDL Aracaju · CNPJ {r.cnpj}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">Estatístico responsável</dt>
          <dd className="text-foreground">{r.estatistico}</dd>
        </div>
      </dl>

      {!compacto && (
        <blockquote className="border-l-2 border-accent pl-4 text-sm leading-relaxed text-muted-foreground">
          <p>{AVISO_TSE}</p>
          <footer className="mt-2 text-xs">
            Aviso emitido pela Justiça Eleitoral (art. 33, § 2º) pro registro {r.tse.numero}. O
            registro {r.tre.numero} (TRE-SE) tem aviso equivalente publicado pelo Tribunal
            Regional.
          </footer>
        </blockquote>
      )}

      <p className="text-sm text-muted-foreground">
        Qualquer interessado pode conferir os registros e a ficha técnica no sistema
        PesqEle, pela consulta pública da Justiça Eleitoral:{' '}
        <a
          href={r.urlConsulta}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:opacity-80"
        >
          Consulta às pesquisas registradas (tse.jus.br)
        </a>{' '}
        (buscar pelos números {r.tse.numero} e {r.tre.numero}).
      </p>
    </section>
  )
}
