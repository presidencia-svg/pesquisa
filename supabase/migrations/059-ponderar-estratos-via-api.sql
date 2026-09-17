-- 059 — ponderar_estratos_raking chamável via API (scripts/ponderar-estratos.mjs).
--
-- O script chama a função por RPC (PostgREST, role authenticator), que
-- carrega a extensão safeupdate e tem statement_timeout = 8s. Resultado:
--   ERRO ponderar_estratos_raking: DELETE requires a WHERE clause
-- no `delete from tmp_fac` dentro do laço do raking, e risco de estourar
-- os 8s numa base de ~20 mil respondentes.
--
-- Mudanças, só de infraestrutura (o algoritmo é o mesmo da 048):
--   1. `delete from tmp_fac`  →  `truncate tmp_fac` (safeupdate não barra);
--   2. `set statement_timeout = '300s'` na função (vale só durante a chamada).
-- Idempotente.
create or replace function public.ponderar_estratos_raking(
  p_edicao uuid,
  p_importacao uuid default null,
  p_executado_por text default null,
  p_max_iter int default 1000,
  p_tol double precision default 1e-10
) returns uuid
language plpgsql
security definer
set search_path = public
set statement_timeout = '300s'
as $$
declare
  v_imp uuid;
  v_exec uuid;
  v_n int;            -- respondentes em SE
  v_total int;
  v_fora int;
  v_sem_mun int;
  v_p double precision;  -- eleitorado mapeado
  v_n_ni int;
  v_tem_16_17 boolean;
  v_iter int := 0;
  v_dev double precision := 1;
  v_dim text;
  v_alvos jsonb;
  v_amostra jsonb;
  v_sw double precision; v_sw2 double precision; v_neff double precision;
  v_min double precision; v_med double precision; v_p95 double precision; v_p99 double precision; v_max double precision;
  v_npos int;
begin
  v_imp := coalesce(p_importacao, (select id from eleitorado_tse_importacao order by importado_em desc limit 1));
  if v_imp is null then raise exception 'nenhuma importação do eleitorado TSE (rode scripts/importar-eleitorado-tse.mjs)'; end if;
  if not exists (select 1 from edicao where id = p_edicao) then raise exception 'edição % não existe', p_edicao; end if;

  drop table if exists tmp_resp, tmp_cel, tmp_alvo, tmp_fac;

  -- 1. respondentes (último valor não nulo por token)
  create temp table tmp_resp on commit drop as
    select token_hash,
      (array_remove(array_agg(municipio_ibge order by id), null))[cardinality(array_remove(array_agg(municipio_ibge order by id), null))] as mun,
      (array_remove(array_agg(sexo order by id), null))[cardinality(array_remove(array_agg(sexo order by id), null))] as sexo,
      (array_remove(array_agg(faixa_etaria order by id), null))[cardinality(array_remove(array_agg(faixa_etaria order by id), null))] as fx,
      (array_remove(array_agg(escolaridade order by id), null))[cardinality(array_remove(array_agg(escolaridade order by id), null))] as esc
    from votos_pesquisa where edicao_id = p_edicao group by token_hash;

  select count(*), count(*) filter (where mun is null),
         count(*) filter (where mun is not null and mun not in (select ibge_codigo from municipios_se))
    into v_total, v_sem_mun, v_fora from tmp_resp;

  -- 2. células da amostra (só SE); sexo nulo vira 'NI'
  create temp table tmp_cel on commit drop as
    select mun, fx, esc, coalesce(sexo, 'NI') as sexo, count(*)::int as n, 1::double precision as w
    from tmp_resp where mun in (select ibge_codigo from municipios_se)
    group by mun, fx, esc, coalesce(sexo, 'NI');
  select coalesce(sum(n), 0) into v_n from tmp_cel;
  if v_n = 0 then raise exception 'edição sem respondentes em Sergipe'; end if;
  if exists (select 1 from tmp_cel where fx is null or esc is null) then
    raise exception 'há respondentes de SE sem faixa etária ou instrução — regra não prevista';
  end if;
  select coalesce(sum(n), 0) into v_n_ni from tmp_cel where sexo = 'NI';
  select exists (select 1 from tmp_cel where fx = '16-17') into v_tem_16_17;

  -- 3. eleitorado mapeado e alvos por dimensão
  select sum(eleitores)::double precision into v_p from eleitorado_tse_estratos where importacao_id = v_imp;
  if coalesce(v_p, 0) = 0 then raise exception 'importação % sem eleitorado', v_imp; end if;

  create temp table tmp_alvo (dim text, cat text, alvo double precision, primary key (dim, cat)) on commit drop;
  insert into tmp_alvo
    select 'municipio', m.ibge_codigo::text, v_n * coalesce(sum(t.eleitores), 0) / v_p
    from municipios_se m left join eleitorado_tse_estratos t on t.municipio_ibge = m.ibge_codigo and t.importacao_id = v_imp
    group by m.ibge_codigo;
  insert into tmp_alvo
    select 'faixa', case when not v_tem_16_17 and faixa_etaria = '16-17' then '18-24' else faixa_etaria end,
           v_n * sum(eleitores) / v_p
    from eleitorado_tse_estratos where importacao_id = v_imp
    group by 2;
  insert into tmp_alvo
    select 'escolaridade', escolaridade, v_n * sum(eleitores) / v_p
    from eleitorado_tse_estratos where importacao_id = v_imp group by 2;
  insert into tmp_alvo values ('sexo', 'NI', v_n_ni);
  insert into tmp_alvo
    select 'sexo', sexo, (v_n - v_n_ni) * sum(eleitores) / v_p
    from eleitorado_tse_estratos where importacao_id = v_imp group by 2;

  -- 4. raking
  create temp table tmp_fac (cat text primary key, fac double precision, dev double precision) on commit drop;
  while v_iter < p_max_iter and v_dev > p_tol loop
    v_dev := 0;
    foreach v_dim in array array['municipio', 'faixa', 'escolaridade', 'sexo'] loop
      truncate tmp_fac;
      insert into tmp_fac
        select a.cat,
               case when s.s > 0 and a.alvo > 0 then a.alvo / s.s else 0 end,
               case when s.s > 0 and a.alvo > 0 then abs(a.alvo - s.s) / a.alvo else 0 end
        from tmp_alvo a
        left join (
          select case v_dim when 'municipio' then mun::text when 'faixa' then fx when 'escolaridade' then esc else sexo end as cat,
                 sum(n * w) as s
          from tmp_cel group by 1
        ) s on s.cat = a.cat
        where a.dim = v_dim;
      select greatest(v_dev, coalesce(max(dev), 0)) into v_dev from tmp_fac;
      update tmp_cel c set w = c.w * coalesce(f.fac, 0)
        from tmp_fac f
        where f.cat = case v_dim when 'municipio' then c.mun::text when 'faixa' then c.fx when 'escolaridade' then c.esc else c.sexo end;
      -- célula cuja categoria não tem alvo (não deveria ocorrer) fica com peso 0
      update tmp_cel c set w = 0
        where not exists (select 1 from tmp_fac f where f.cat = case v_dim when 'municipio' then c.mun::text when 'faixa' then c.fx when 'escolaridade' then c.esc else c.sexo end);
    end loop;
    v_iter := v_iter + 1;
  end loop;

  -- 5. Kish sobre os pesos individuais (cada respondente da célula tem peso w)
  select sum(n * w), sum(n * w * w), sum(n) filter (where w > 0)
    into v_sw, v_sw2, v_npos from tmp_cel;
  v_neff := v_sw * v_sw / v_sw2;
  with ind as (
    select w from tmp_cel c, generate_series(1, c.n) where w > 0
  )
  select min(w),
         percentile_cont(0.5) within group (order by w),
         percentile_cont(0.95) within group (order by w),
         percentile_cont(0.99) within group (order by w),
         max(w)
    into v_min, v_med, v_p95, v_p99, v_max from ind;

  select jsonb_object_agg(dim, cats) into v_alvos
    from (select dim, jsonb_object_agg(cat, alvo) as cats from tmp_alvo group by dim) x;
  select jsonb_build_object(
    'municipio', (select jsonb_object_agg(mun, n) from (select mun, sum(n) n from tmp_cel group by mun) a),
    'faixa', (select jsonb_object_agg(fx, n) from (select fx, sum(n) n from tmp_cel group by fx) a),
    'escolaridade', (select jsonb_object_agg(esc, n) from (select esc, sum(n) n from tmp_cel group by esc) a),
    'sexo', (select jsonb_object_agg(sexo, n) from (select sexo, sum(n) n from tmp_cel group by sexo) a)
  ) into v_amostra;

  insert into ponderacao_execucao (
    edicao_id, importacao_id, executado_por, respondentes_total, respondentes_se, respondentes_fora_se, respondentes_sem_municipio,
    iteracoes, desvio_max, convergiu, n_peso_positivo, soma_w, soma_w2, n_eff, deff,
    peso_min, peso_mediana, peso_p95, peso_p99, peso_max, margem_nominal, margem_efetiva, alvos, amostra, parametros)
  values (
    p_edicao, v_imp, p_executado_por, v_total, v_n, v_fora, v_sem_mun,
    v_iter, v_dev, v_dev <= p_tol, v_npos, v_sw, v_sw2, v_neff, v_n / v_neff,
    v_min, v_med, v_p95, v_p99, v_max, 1.96 * sqrt(0.25 / v_n), 1.96 * sqrt(0.25 / v_neff), v_alvos, v_amostra,
    jsonb_build_object('max_iter', p_max_iter, 'tol', p_tol, 'dimensoes', array['municipio', 'faixa', 'escolaridade', 'sexo'],
                       'faixa_16_17_agregada_a_18_24', not v_tem_16_17, 'sexo_ni_categoria_propria', true))
  returning id into v_exec;

  insert into pesos_celula (execucao_id, municipio_ibge, faixa_etaria, escolaridade, sexo, respondentes, peso)
    select v_exec, mun, fx, esc, sexo, n, w from tmp_cel;

  return v_exec;
end $$;
