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
  fazerQuery: (de: number, ate: number) => PromiseLike<{ data: T[] | null }>,
): Promise<T[]> {
  const PAGINA = 1000
  const out: T[] = []
  for (let de = 0; ; de += PAGINA) {
    const { data } = await fazerQuery(de, de + PAGINA - 1)
    if (!data || data.length === 0) break
    out.push(...data)
    if (data.length < PAGINA) break
  }
  return out
}
