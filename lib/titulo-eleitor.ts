/**
 * Validação do número de inscrição do Título de Eleitor (TSE).
 *
 * Estrutura (número de inscrição, sem zona/seção): até 12 dígitos =
 *   [sequencial (variável, à esquerda)][UF: 2 díg, 01–28][DV1][DV2]
 *
 * DV1: sequencial (zero-preenchido a 8) × pesos 2..9 (posição 0→2 … 7→9),
 *      soma mod 11; resto 10 → 0. Exceção SP(01)/MG(02): resto 0 → 1.
 * DV2: UF(2 díg) + DV1 × pesos 7,8,9, soma mod 11; resto 10 → 0.
 *      Exceção SP/MG: resto 0 → 1.
 *
 * Isto valida FORMATO + dígitos verificadores + UF — NÃO confirma que o
 * título é ativo nem que pertence à pessoa (não há API pública do TSE por
 * CPF). É um controle de elegibilidade, não uma prova de titularidade.
 *
 * Pure — sem I/O. Importável em client e server.
 */

export type TituloResultado =
  | { ok: true; uf: number }
  | { ok: false; motivo: string }

export function validarTituloEleitor(raw: string): TituloResultado {
  const s = (raw ?? '').replace(/\D/g, '')
  if (s.length < 5) return { ok: false, motivo: 'Título curto demais.' }
  if (s.length > 12) return { ok: false, motivo: 'Título tem dígitos demais.' }

  const dv2 = Number(s[s.length - 1])
  const dv1 = Number(s[s.length - 2])
  const ufStr = s.slice(s.length - 4, s.length - 2)
  const uf = Number(ufStr)
  const seq = s.slice(0, s.length - 4).padStart(8, '0')

  if (uf < 1 || uf > 28) return { ok: false, motivo: 'Código de UF do título inválido.' }
  const spMg = uf === 1 || uf === 2

  // DV1 sobre o sequencial
  let soma1 = 0
  for (let i = 0; i < 8; i++) soma1 += Number(seq[i]) * (i + 2)
  let d1 = soma1 % 11
  if (d1 === 10) d1 = 0
  if (d1 === 0 && spMg) d1 = 1
  if (d1 !== dv1) return { ok: false, motivo: 'Dígito verificador do título não confere.' }

  // DV2 sobre UF + DV1
  let soma2 = Number(ufStr[0]) * 7 + Number(ufStr[1]) * 8 + d1 * 9
  let d2 = soma2 % 11
  if (d2 === 10) d2 = 0
  if (d2 === 0 && spMg) d2 = 1
  if (d2 !== dv2) return { ok: false, motivo: 'Dígito verificador do título não confere.' }

  return { ok: true, uf }
}

/** Gera um número de título válido (uso em testes). */
export function _gerarTituloValido(seqNum: number, uf: number): string {
  const seq = String(seqNum).padStart(8, '0').slice(0, 8)
  const ufStr = String(uf).padStart(2, '0')
  const spMg = uf === 1 || uf === 2
  let soma1 = 0
  for (let i = 0; i < 8; i++) soma1 += Number(seq[i]) * (i + 2)
  let d1 = soma1 % 11
  if (d1 === 10) d1 = 0
  if (d1 === 0 && spMg) d1 = 1
  let soma2 = Number(ufStr[0]) * 7 + Number(ufStr[1]) * 8 + d1 * 9
  let d2 = soma2 % 11
  if (d2 === 10) d2 = 0
  if (d2 === 0 && spMg) d2 = 1
  return `${seq}${ufStr}${d1}${d2}`
}
