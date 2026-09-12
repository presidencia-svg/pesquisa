/**
 * Interpreta o campo `edicao.registro_tre` (texto livre, ex.:
 * "SE-09441/2026 · BR-04041/2026") e devolve os registros PesqEle com o
 * órgão correspondente. Mesmo formato aceito pelo gate de divulgação em
 * app/admin/(autenticado)/edicoes/actions.ts.
 *
 * Sem dependência de servidor — pode ser usado em qualquer lado.
 */
export type RegistroPesqele = { orgao: string; numero: string }

const RE = /([A-Za-z]{2})-?(\d{1,6})\/(\d{4})/g

export function extrairRegistros(registro: string | null | undefined): RegistroPesqele[] {
  const texto = (registro ?? '').trim()
  if (!texto) return []
  const out: RegistroPesqele[] = []
  for (const m of texto.matchAll(RE)) {
    const uf = m[1].toUpperCase()
    out.push({
      orgao: uf === 'BR' ? 'TSE' : `TRE-${uf}`,
      numero: `${uf}-${m[2]}/${m[3]}`,
    })
  }
  return out
}
