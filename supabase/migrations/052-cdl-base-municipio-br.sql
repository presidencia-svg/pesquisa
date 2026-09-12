-- 052 — cdl_base.municipio_ibge passa a aceitar município de fora de Sergipe
--
-- Desde 01/09/2026 o formulário aceita domicílio eleitoral em qualquer
-- município do país (tabela municipios_br, 5.571 do IBGE; quem é de fora
-- vota só para presidente). eleitores_pesquisa já grava esses códigos, mas
-- cdl_base ainda tinha FK para municipios_se (75 de Sergipe): o UPDATE de
-- enriquecimento em /votar/confirma falhava (só logava) para eleitor de
-- fora do estado, e a recuperação dos dados da 1ª edição (12/09/2026)
-- estourou em "Key (municipio_ibge)=(2513901) is not present in table
-- municipios_se".
--
-- Troca a FK para municipios_br. O bloco DO garante, na hora de aplicar,
-- que todo código de municipios_se existe em municipios_br — senão aborta
-- sem mexer em nada.

do $$
begin
  if exists (
    select 1 from municipios_se s
    where not exists (select 1 from municipios_br b where b.ibge_codigo = s.ibge_codigo)
  ) then
    raise exception 'municipios_br não contém todos os municípios de municipios_se; abortando 052';
  end if;
end $$;

alter table cdl_base drop constraint if exists cdl_base_municipio_ibge_fkey;
alter table cdl_base
  add constraint cdl_base_municipio_ibge_fkey
  foreign key (municipio_ibge) references municipios_br (ibge_codigo);

comment on column cdl_base.municipio_ibge is
  'Domicílio eleitoral informado pelo eleitor (IBGE, qualquer UF — FK municipios_br desde a 052). Sergipe = 28xxxxx.';
