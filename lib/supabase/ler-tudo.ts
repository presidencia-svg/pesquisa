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
