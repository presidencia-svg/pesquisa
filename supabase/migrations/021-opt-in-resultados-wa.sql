-- Migration 021 — Opt-in para receber resultados por WhatsApp
--
-- Adiciona campo opcional em eleitores_pesquisa para o eleitor sinalizar
-- (no momento do cadastro) que deseja receber os resultados consolidados
-- da pesquisa via WhatsApp, em primeira mão.
--
-- LGPD:
--   • Base legal: consentimento específico (art. 7º, I da LGPD)
--   • Opt-in EXPLÍCITO (default false, checkbox não pré-marcado)
--   • Finalidade: comunicação dos resultados ao eleitor que participou
--   • Retenção: dado vive em eleitores_pesquisa, deletado pelo cron
--     de retenção 6 meses após edicao.fim — não cria base de marketing
--     permanente
--   • Revogação: eleitor pode pedir exclusão a qualquer momento via
--     /privacidade/excluir, ou retirar consentimento na próxima edição
--
-- Campo separado de outros opt-ins futuros (ex: campanhas, newsletters)
-- pra cada propósito ter sua coluna própria — granular conforme LGPD
-- recomenda.

ALTER TABLE public.eleitores_pesquisa
  ADD COLUMN IF NOT EXISTS opt_in_resultados_wa boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.eleitores_pesquisa.opt_in_resultados_wa IS
  'Consentimento específico (LGPD art. 7º I) do eleitor para receber os '
  'resultados consolidados da pesquisa via WhatsApp. Default false. '
  'Marcado pelo eleitor no formulário /votar/confirma. Deletado junto '
  'com a linha pela rotina de retenção em /api/cron/retencao.';

-- Index para consulta na hora do disparo (depois que resultados forem
-- divulgados no telejornal, query "quem ainda não recebeu?" será comum).
CREATE INDEX IF NOT EXISTS eleitores_opt_in_resultados_idx
  ON public.eleitores_pesquisa (edicao_id)
  WHERE opt_in_resultados_wa = true AND wa_validado = true;
