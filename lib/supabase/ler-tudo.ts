/**
 * Lê TODAS as linhas de uma consulta PostgREST, página a página.
 *
 * O Supabase devolve no máximo 1.000 linhas por requisição (max-rows).
 * Qualquer `.select()` cru numa tabela grande sem `.range()` volta
 * silenciosamente truncado — foi assim que a apresentação/TV passou a
 * contar líderes regionais sobre 1.000 dos ~36 mil votos.
 *
 * Preferir sempre uma view agregada; quando mesmo agregada a resposta
 * pode passar de 1.000 linhas, paginar com este helper.
 *
 * A consulta PRECISA ter `.order()` por uma chave estável (ex.: candidato_id,
 * municipio_ibge). Sem ORDER BY o Postgres não garante a mesma ordem entre
 * uma página e a seguinte: linhas se repetem numa e somem na outra — foi
 * assim que a projeção ponderada do admin mostrou a Delegada Katarina com
 * 389 votos em vez de 653 (perdeu a linha de Aracaju).
 */
export async function lerTudo<T>(
  fazerQuery: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error?: unknown }>,
  /**
   * Chave única de cada linha (ex.: `${r.candidato_id}:${r.municipio_ibge}`).
   * Se a mesma chave aparecer duas vezes — sintoma de paginação sem ORDER BY
   * estável — a leitura FALHA em vez de somar errado em silêncio.
   */
  chave?: (row: T) => string,
): Promise<T[]> {
  const PAGINA = 1000
  const out: T[] = []
  const vistas = new Set<string>()
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await fazerQuery(de, de + PAGINA - 1)
    if (error) throw new Error(`lerTudo: ${String((error as { message?: string })?.message ?? error)}`)
    if (!data || data.length === 0) break
    if (chave) {
      for (const row of data) {
        const k = chave(row)
        if (vistas.has(k)) {
          throw new Error(
            `lerTudo: linha repetida entre páginas (${k}) — a consulta precisa de .order() por chave estável`,
          )
        }
        vistas.add(k)
      }
    }
    out.push(...data)
    if (data.length < PAGINA) break
  }
  return out
}
