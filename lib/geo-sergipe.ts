/**
 * Gate de localização: o eleitor deve estar no estado de Sergipe.
 *
 * Caixa envolvente (bounding box) dos extremos de Sergipe + ~5 km de
 * margem. É um FATOR DE SEGURANÇA (barrar votação em massa de fora do
 * estado), não prova cartográfica — a margem erra a favor de INCLUIR
 * (não excluir eleitor real perto da divisa/litoral). A coordenada é
 * validada e descartada: nada de localização é armazenado (LGPD).
 *
 * Pure — usada no client (feedback instantâneo) e no servidor (autoritativa).
 */
const LIMITES = { latMin: -11.62, latMax: -9.46, lngMin: -38.3, lngMax: -36.34 }

export function dentroDeSergipe(lat: unknown, lng: unknown): boolean {
  const la = typeof lat === 'number' ? lat : Number(lat)
  const lo = typeof lng === 'number' ? lng : Number(lng)
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return false
  return (
    la >= LIMITES.latMin &&
    la <= LIMITES.latMax &&
    lo >= LIMITES.lngMin &&
    lo <= LIMITES.lngMax
  )
}
