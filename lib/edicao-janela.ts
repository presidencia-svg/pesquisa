/**
 * Janela de coleta de uma edição (Res.-TSE 23.600/2019, art. 2º, III:
 * o período de realização declarado no PesqEle).
 *
 * Toda etapa que grava algo em nome do eleitor — CPF, OTP, reenvio de OTP,
 * voto — tem que checar a janela. Antes desta função só a etapa do CPF
 * conferia `fim`; quem já tinha cápsula conseguia votar depois do encerramento
 * declarado no registro (auditoria de conformidade, set/2026).
 */
export type JanelaColeta = 'antes' | 'aberta' | 'encerrada'

export function janelaColeta(
  edicao: { inicio: string; fim: string },
  agora: Date = new Date(),
): JanelaColeta {
  if (agora.getTime() < new Date(edicao.inicio).getTime()) return 'antes'
  if (agora.getTime() > new Date(edicao.fim).getTime()) return 'encerrada'
  return 'aberta'
}

/** Mensagem pública padronizada quando a janela não está aberta. */
export function mensagemJanela(estado: Exclude<JanelaColeta, 'aberta'>): string {
  return estado === 'antes'
    ? 'A votação ainda não começou.'
    : 'Esta edição da pesquisa já foi encerrada.'
}
