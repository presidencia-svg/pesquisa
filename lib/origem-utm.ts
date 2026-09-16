/**
 * Origem de tráfego (UTM) do cadastro — migration 057.
 *
 * Os links dos anúncios chegam em /votar?utm_source=meta&utm_medium=pago&
 * utm_campaign=...&utm_content={{ad.name}}&utm_term={{adset.name}}. O
 * formulário manda os cinco campos escondidos, o servidor saneia aqui e
 * o rascunho pre_voto carrega até a linha em eleitores_pesquisa.
 *
 * Saneamento deliberadamente estrito: só o que cabe num nome de campanha.
 * Qualquer coisa fora do alfabeto vira '-' e o valor é truncado. Nunca é
 * dado pessoal — é o nome do anúncio, não do eleitor.
 */

export const UTM_CAMPOS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const

export type UtmCampo = (typeof UTM_CAMPOS)[number]

export type OrigemUtm = Partial<Record<UtmCampo, string>>

const MAX_LEN = 80

/** Normaliza um valor de UTM: minúsculo, sem acento, [a-z0-9._-], ≤80. */
export const sanearUtm = (raw: unknown): string | undefined => {
  if (typeof raw !== 'string') return undefined
  const limpo = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_LEN)
  return limpo.length > 0 ? limpo : undefined
}

/**
 * Lê os utm_* de um FormData (ou de qualquer objeto chave→valor).
 * Só existe origem se utm_source vier preenchido — sem ele os demais
 * são descartados, pra não gravar lixo solto.
 */
export const lerOrigemUtm = (
  get: (campo: UtmCampo) => unknown,
): OrigemUtm | undefined => {
  const source = sanearUtm(get('utm_source'))
  if (!source) return undefined
  const origem: OrigemUtm = { utm_source: source }
  for (const campo of UTM_CAMPOS) {
    if (campo === 'utm_source') continue
    const v = sanearUtm(get(campo))
    if (v) origem[campo] = v
  }
  return origem
}

/** Colunas pra insert/update em eleitores_pesquisa (null quando ausente). */
export const colunasOrigemUtm = (
  origem: OrigemUtm | undefined,
): Record<UtmCampo, string | null> => ({
  utm_source: origem?.utm_source ?? null,
  utm_medium: origem?.utm_medium ?? null,
  utm_campaign: origem?.utm_campaign ?? null,
  utm_content: origem?.utm_content ?? null,
  utm_term: origem?.utm_term ?? null,
})
