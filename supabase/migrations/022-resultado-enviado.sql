-- Migration 022 — Marca de envio do resultado por WhatsApp
--
-- Adiciona timestamp para registrar quando o eleitor recebeu a mensagem
-- com os resultados consolidados (opt_in_resultados_wa = true).
--
-- Função:
--   • Idempotência: não envia duas vezes pro mesmo eleitor por edição
--   • Auditoria: quando cada destinatário foi acionado
--   • Reprocessar falhas: enviado_em NULL = não enviado ainda

ALTER TABLE public.eleitores_pesquisa
  ADD COLUMN IF NOT EXISTS resultado_enviado_em timestamptz NULL;

COMMENT ON COLUMN public.eleitores_pesquisa.resultado_enviado_em IS
  'Timestamp em que a mensagem dos resultados da pesquisa foi enviada '
  'pelo WhatsApp ao eleitor (somente quando opt_in_resultados_wa = true). '
  'NULL significa não enviado ainda — usado pela rotina admin de envio '
  'pra paginar e idempotente.';

-- Index parcial para a query principal: "quem ainda não recebeu?"
-- Cobre exatamente o filtro do action de envio.
CREATE INDEX IF NOT EXISTS eleitores_resultado_pendente_idx
  ON public.eleitores_pesquisa (edicao_id, criado_em)
  WHERE
    opt_in_resultados_wa = true
    AND wa_validado = true
    AND resultado_enviado_em IS NULL;
