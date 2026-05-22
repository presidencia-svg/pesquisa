-- Migration 020 — Voto único por CPF + WhatsApp + dispositivo
--
-- Já existia: UNIQUE (edicao_id, cpf_hash) → 1 voto por CPF
--
-- Adicionado aqui:
--   • UNIQUE parcial (edicao_id, whatsapp_e164) WHERE wa_validado = true
--     → 1 voto por número de WhatsApp por edição
--   • UNIQUE parcial (edicao_id, device_fingerprint) WHERE wa_validado=true
--     → 1 voto por dispositivo por edição
--
-- Os índices são PARCIAIS (WHERE wa_validado = true) porque eleitores
-- ainda em fase de cadastro (sem OTP validado) podem temporariamente
-- coexistir com mesmo WA — só o "consumado" trava futuros usos.
--
-- Para o device_fingerprint, também filtra IS NOT NULL pra permitir
-- entradas legadas sem fingerprint preenchido.

CREATE UNIQUE INDEX IF NOT EXISTS eleitores_wa_unico_validado_idx
  ON public.eleitores_pesquisa (edicao_id, whatsapp_e164)
  WHERE wa_validado = true AND whatsapp_e164 IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS eleitores_device_unico_validado_idx
  ON public.eleitores_pesquisa (edicao_id, device_fingerprint)
  WHERE wa_validado = true AND device_fingerprint IS NOT NULL;

-- Index auxiliar para o check da aplicação (não-unique, cobre os
-- WHERE clauses de checagem antes de tentar gravar).
CREATE INDEX IF NOT EXISTS eleitores_whatsapp_validado_idx
  ON public.eleitores_pesquisa (edicao_id, whatsapp_e164)
  WHERE wa_validado = true;

CREATE INDEX IF NOT EXISTS eleitores_device_validado_idx
  ON public.eleitores_pesquisa (edicao_id, device_fingerprint)
  WHERE wa_validado = true;
