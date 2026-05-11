-- ==========================================================================
-- Migration 005 — permite cargo='federal' e 'estadual' em candidatos_pesquisa
--
-- A CHECK constraint original (migration 001) so deixava entrar pres/gov/sen
-- porque na metodologia federal/estadual sao votados por LEGENDA (partido),
-- nao por candidato — entao nao precisava cadastrar candidato individual.
--
-- Mas agora cadastramos os candidatos federais/estaduais eleitos em 2022
-- pra mostrar nome+foto na cedula quando o eleitor digita os 4/5 digitos
-- completos (espelho da urna). O voto continua agregado por legenda.
-- ==========================================================================

alter table candidatos_pesquisa drop constraint if exists candidatos_pesquisa_cargo_check;

alter table candidatos_pesquisa
  add constraint candidatos_pesquisa_cargo_check
  check (cargo in ('presidente', 'governador', 'senador', 'federal', 'estadual'));
