/**
 * Aviso público de registro da pesquisa na Justiça Eleitoral.
 *
 * O aviso em si é publicado pela própria Justiça Eleitoral (Lei 9.504/97,
 * art. 33, § 2º: "afixará no prazo de vinte e quatro horas, no local de
 * costume, bem como divulgará em seu sítio na internet, aviso comunicando o
 * registro das informações"). Aqui reproduzimos os dados do registro da
 * edição ATIVA — tudo lido do banco (número, data, período de coleta,
 * CONRE do estatístico responsável) — com o caminho pra qualquer
 * interessado conferir no sistema PesqEle. Nenhum número de registro fica
 * fixo no código: os registros da 1ª edição só aparecem no histórico da
 * página /transparencia.
 *
 * Dois estados, conforme `edicao.registro_tre`:
 *   - edição com registro: números e datas lidos da edição;
 *   - edição sem registro (coleta em campo, registro antes da divulgação):
 *     aviso de "registro pendente" — o art. 33 exige o registro até 5 dias
 *     antes da DIVULGAÇÃO, e a plataforma só libera o botão Divulgar com
 *     número e data do registro (app/admin/(autenticado)/edicoes/actions.ts).
 *
 * Server component assíncrono: só é usado em páginas server (/resultados,
 * /transparencia), ambas com `revalidate = 300`.
 */
import { supabaseAdmin } from '@/lib/supabase/admin'

export const CONTRATANTE = {
  nome: 'CÂMARA DE DIRIGENTES LOJISTAS DE ARACAJU / C.D.L.',
  cnpj: '13.045.935/0001-36',
  /** Consulta pública do TSE às pesquisas registradas (PesqEle). */
  urlConsulta:
    'https://www.tse.jus.br/eleicoes/pesquisa-eleitorais/consulta-as-pesquisas-registradas',
} as const

export type EdicaoAviso = {
  nome: string
  registro_tre: string | null
  data_registro_pesqele: string | null
  inicio: string
  fim: string
  numero_conre_responsavel: string | null
}

const fmtData = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', {
    timeZone: 'America/Recife',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

/** Data-only (YYYY-MM-DD) do banco → dd/mm/aaaa sem deslocamento de fuso. */
const fmtDataSemFuso = (ymd: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ymd
}

async function carregarEdicaoAtiva(): Promise<EdicaoAviso | null> {
  const { data } = await supabaseAdmin()
    .from('edicao')
    .select('nome, registro_tre, data_registro_pesqele, inicio, fim, numero_conre_responsavel')
    .eq('ativa', true)
    .maybeSingle<EdicaoAviso>()
  return data ?? null
}

/**
 * Estatístico responsável: somente o que está na edição
 * (`numero_conre_responsavel`). Sem fallback fixo — enquanto o campo estiver
 * vazio, mostramos "a designar".
 */
function estatisticoDe(ed: EdicaoAviso | null): string {
  const conre = ed?.numero_conre_responsavel?.trim()
  if (!conre) return 'A designar (será informado no registro no PesqEle)'
  return `Estatístico responsável — CONRE ${conre}`
}

function Titulo({ children, sobre }: { children: React.ReactNode; sobre: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
        {sobre}
      </p>
      <h2 id="aviso-registro-titulo" className="text-lg font-semibold text-foreground">
        {children}
      </h2>
    </div>
  )
}

function Item({ dt, dd }: { dt: string; dd: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{dt}</dt>
      <dd className="text-foreground">{dd}</dd>
    </div>
  )
}

function LinkConsulta({ numeros }: { numeros: string[] }) {
  return (
    <p className="text-sm text-muted-foreground">
      Qualquer interessado pode conferir os registros e a ficha técnica no sistema PesqEle, pela
      consulta pública da Justiça Eleitoral:{' '}
      <a
        href={CONTRATANTE.urlConsulta}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline hover:opacity-80"
      >
        Consulta às pesquisas registradas (tse.jus.br)
      </a>
      {numeros.length > 0 && <> (buscar pelos números {numeros.join(' e ')})</>}.
    </p>
  )
}

export async function AvisoRegistro({
  compacto = false,
  edicao,
}: {
  compacto?: boolean
  /** Opcional — quando a página já carregou a edição ativa. */
  edicao?: EdicaoAviso | null
}) {
  const ed = edicao === undefined ? await carregarEdicaoAtiva() : edicao
  const registro = ed?.registro_tre?.trim() ?? ''

  const secao = 'w-full rounded-lg border border-border bg-muted/30 px-5 py-5 flex flex-col gap-4'

  // --- Edição registrada (números lidos da edição) ------------------------
  if (ed && registro) {
    const numeros = registro
      .split(/[·;,]/)
      .map((x) => x.trim())
      .filter(Boolean)
    return (
      <section aria-labelledby="aviso-registro-titulo" className={secao}>
        <Titulo sobre="Justiça Eleitoral">Pesquisa registrada — Lei 9.504/97, art. 33</Titulo>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Item
            dt="Registro(s) no PesqEle"
            dd={<span className="font-mono font-semibold">{numeros.join(' · ')}</span>}
          />
          <Item
            dt="Data do registro"
            dd={ed.data_registro_pesqele ? fmtDataSemFuso(ed.data_registro_pesqele) : '—'}
          />
          <Item dt="Período de coleta" dd={`${fmtData(ed.inicio)} a ${fmtData(ed.fim)}`} />
          <Item dt="Edição" dd={ed.nome} />
          <Item dt="Contratante e realizadora" dd={<>CDL Aracaju · CNPJ {CONTRATANTE.cnpj}</>} />
          <Item dt="Estatístico responsável" dd={estatisticoDe(ed)} />
        </dl>
        <LinkConsulta numeros={numeros} />
      </section>
    )
  }

  // --- Edição em campo, ainda sem registro --------------------------------
  return (
    <section aria-labelledby="aviso-registro-titulo" className={secao}>
      <Titulo sobre="Justiça Eleitoral">Registro no PesqEle antes de qualquer divulgação</Titulo>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <Item
          dt="Situação"
          dd={<span className="font-semibold">Coleta em andamento · registro pendente</span>}
        />
        <Item dt="Período de coleta" dd={ed ? `${fmtData(ed.inicio)} a ${fmtData(ed.fim)}` : '—'} />
        {ed && <Item dt="Edição" dd={ed.nome} />}
        <Item dt="Contratante e realizadora" dd={<>CDL Aracaju · CNPJ {CONTRATANTE.cnpj}</>} />
        <Item dt="Estatístico responsável" dd={estatisticoDe(ed)} />
      </dl>
      {!compacto && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          A Lei 9.504/97 (art. 33, § 1º) exige o registro da pesquisa na Justiça Eleitoral até cinco
          dias antes da divulgação (Res.-TSE 23.600/2019, com a redação da Res.-TSE 23.747/2026). O
          registro desta edição no PesqEle (TSE e TRE-SE) será feito quando a amostra alcançar 20 mil
          eleitores — e sempre antes de qualquer divulgação — com o questionário, o plano amostral, o
          período de coleta e o sistema de controle exatamente como aplicados. Nenhum resultado será
          publicado antes de decorrido esse prazo. Quando o registro for feito, os números e a data
          aparecem aqui.
        </p>
      )}
      <LinkConsulta numeros={[]} />
    </section>
  )
}
