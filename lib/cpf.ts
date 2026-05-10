/**
 * Validacao de CPF.
 *
 * Funcoes puras, sem dependencia de servidor. Pode ser importado em
 * Client Components.
 */

/**
 * Remove qualquer caractere nao numerico. Uso pra normalizar a entrada
 * do usuario antes de validar/hashear.
 */
export const normalizarCpf = (raw: string): string => raw.replace(/\D/g, '')

/**
 * Mascara CPF pra exibicao/armazenamento conforme LGPD.
 * Ex: 12345678901 -> '***.***.789-XX'
 */
export const mascararCpf = (digits11: string): string => {
  if (digits11.length !== 11) return '***.***.***-**'
  return `***.***.${digits11.slice(6, 9)}-XX`
}

/**
 * Formata CPF pra exibicao normal (so usar em interfaces administrativas
 * onde o CPF inteiro pode aparecer; nunca em tela de eleitor).
 */
export const formatarCpf = (digits11: string): string => {
  if (digits11.length !== 11) return digits11
  return `${digits11.slice(0, 3)}.${digits11.slice(3, 6)}.${digits11.slice(6, 9)}-${digits11.slice(9)}`
}

/**
 * Valida CPF por checksum (algoritmo modulo 11).
 *
 * Nao verifica se o CPF existe na Receita Federal — isso e papel do SPC.
 * Aqui so cortamos lixo obvio (formato errado, sequenciais, soma invalida).
 */
export const cpfValido = (raw: string): boolean => {
  const cpf = normalizarCpf(raw)
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false // 11111111111, etc

  const calcDigito = (slice: string, fatorInicial: number): number => {
    let soma = 0
    for (let i = 0; i < slice.length; i++) {
      soma += Number(slice[i]) * (fatorInicial - i)
    }
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }

  const d1 = calcDigito(cpf.slice(0, 9), 10)
  if (d1 !== Number(cpf[9])) return false

  const d2 = calcDigito(cpf.slice(0, 10), 11)
  if (d2 !== Number(cpf[10])) return false

  return true
}
