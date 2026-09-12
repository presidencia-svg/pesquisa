-- 048 — Ponderação por estratos (município × sexo × faixa etária × grau de
-- instrução) calculada NO BANCO, com aprovação formal do estatístico.
--
-- Contexto (Rp 0601015-42 TRE-SE): o plano amostral registrado no PesqEle
-- prometia pós-estratificação nas quatro variáveis; a plataforma só tinha a
-- ponderação por município (migration 045). A ponderação completa foi feita
-- offline (scripts/ponderacao-estratos.mjs, variante C = raking/IPF) e
-- adotada pelo estatístico. Esta migration traz o procedimento pra dentro do
-- banco, versionado e auditável, pra que toda edição futura:
--   1. tenha o parâmetro oficial do TSE (perfil do eleitorado por seção)
--      carregado em tabela própria (eleitorado_tse_estratos) — sem tocar
--      municipios_se.eleitorado, que sustenta a ponderação por município já
--      divulgada na 1ª edição;
--   2. calcule os pesos por raking no banco (ponderar_estratos_raking),
--      gravando execução, alvos, diagnósticos (n efetivo, deff, margem
--      efetiva) e pesos por célula — nunca em memória a partir de páginas;
--   3. só possa ser divulgada depois que o estatístico CONRE aprovar a
--      execução (edicao.ponderacao_aprovada_em/por) e a complementação do
--      art. 2º §7º III/IV for registrada no PesqEle;
--   4. publique a margem EFETIVA (Kish) junto com a nominal.
--
-- Nada aqui muda o que o público vê: edicao.ponderacao_metodo nasce como
-- 'municipio' (o que foi divulgado em 04/09 e complementado em 08/09).
-- Reversível: drop das views/função/tabelas e das colunas novas de edicao.

-- ---------------------------------------------------------------- TSE
create table if not exists public.eleitorado_tse_importacao (
  id uuid primary key default gen_random_uuid(),
  arquivo text not null,
  geracao text,
  ano text,
  linhas int not null,
  total_se bigint not null,
  total_mapeado bigint not null,
  excluidos jsonb,
  importado_em timestamptz not null default now(),
  importado_por text
);
comment on table public.eleitorado_tse_importacao is
  'Cada carga do arquivo "perfil do eleitorado por seção" (dados abertos do TSE) usada como parâmetro de ponderação.';

create table if not exists public.eleitorado_tse_estratos (
  importacao_id uuid not null references public.eleitorado_tse_importacao(id) on delete cascade,
  municipio_ibge int not null references public.municipios_se(ibge_codigo),
  sexo text not null check (sexo in ('M', 'F')),
  faixa_etaria text not null check (faixa_etaria in ('16-17', '18-24', '25-34', '35-44', '45-59', '60+')),
  escolaridade text not null check (escolaridade in ('fundamental', 'medio', 'superior')),
  eleitores int not null check (eleitores >= 0),
  primary key (importacao_id, municipio_ibge, sexo, faixa_etaria, escolaridade)
);
comment on table public.eleitorado_tse_estratos is
  'Eleitorado por município × sexo × faixa etária × grau de instrução (agregado dos 3 níveis usados na pesquisa), por importação.';
create index if not exists eleitorado_tse_estratos_imp_idx on public.eleitorado_tse_estratos (importacao_id);

alter table public.eleitorado_tse_importacao enable row level security;
alter table public.eleitorado_tse_estratos enable row level security;

-- ----------------------------------------------------------- execuções
create table if not exists public.ponderacao_execucao (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.edicao(id) on delete cascade,
  importacao_id uuid not null references public.eleitorado_tse_importacao(id),
  metodo text not null default 'estratos_raking' check (metodo in ('estratos_raking')),
  executado_em timestamptz not null default now(),
  executado_por text,
  respondentes_total int not null,
  respondentes_se int not null,
  respondentes_fora_se int not null,
  respondentes_sem_municipio int not null,
  iteracoes int not null,
  desvio_max double precision not null,
  convergiu boolean not null,
  n_peso_positivo int not null,
  soma_w double precision not null,
  soma_w2 double precision not null,
  n_eff double precision not null,
  deff double precision not null,
  peso_min double precision not null,
  peso_mediana double precision not null,
  peso_p95 double precision not null,
  peso_p99 double precision not null,
  peso_max double precision not null,
  margem_nominal double precision not null,
  margem_efetiva double precision not null,
  alvos jsonb not null,
  amostra jsonb not null,
  parametros jsonb not null
);
comment on table public.ponderacao_execucao is
  'Uma linha por execução do raking: diagnósticos de Kish (n efetivo, deff, margem efetiva), alvos por marginal, marginais da amostra e parâmetros. A edição aponta pra execução vigente.';
create index if not exists ponderacao_execucao_edicao_idx on public.ponderacao_execucao (edicao_id, executado_em desc);

create table if not exists public.pesos_celula (
  execucao_id uuid not null references public.ponderacao_execucao(id) on delete cascade,
  municipio_ibge int not null,
  faixa_etaria text not null,
  escolaridade text not null,
  sexo text not null check (sexo in ('M', 'F', 'NI')),
  respondentes int not null,
  peso double precision not null,
  primary key (execucao_id, municipio_ibge, faixa_etaria, escolaridade, sexo)
);
comment on table public.pesos_celula is
  'Peso final de cada célula município × faixa × instrução × sexo (NI = sexo não informado) numa execução. Todo respondente da célula recebe o mesmo peso.';

alter table public.ponderacao_execucao enable row level security;
alter table public.pesos_celula enable row level security;

-- ------------------------------------------------------- edição (gate)
alter table public.edicao
  add column if not exists ponderacao_metodo text not null default 'municipio'
    check (ponderacao_metodo in ('municipio', 'estratos_raking')),
  add column if not exists ponderacao_execucao_id uuid references public.ponderacao_execucao(id),
  add column if not exists ponderacao_aprovada_em timestamptz,
  add column if not exists ponderacao_aprovada_por text,
  add column if not exists complementacao_pesqele_em timestamptz,
  add column if not exists ficha_tecnica_ressalvas text;

comment on column public.edicao.ponderacao_metodo is
  'municipio = só pós-estratificação por município (views *_pond); estratos_raking = raking nas quatro marginais registradas (views *_pond_estratos, execução em ponderacao_execucao_id).';
comment on column public.edicao.ponderacao_aprovada_em is
  'Quando o estatístico CONRE aprovou a execução vigente (ponderacao_execucao_id). A divulgação exige aprovação.';
comment on column public.edicao.complementacao_pesqele_em is
  'Quando a complementação do art. 2º §7º III/IV (pesquisados por município + composição da amostra final) foi lançada no PesqEle.';
comment on column public.edicao.ficha_tecnica_ressalvas is
  'Ressalvas metodológicas publicadas com a ficha técnica (ex.: sexo não informado, faixas sem respondente, peso máximo).';

-- --------------------------------------------------------------- raking
-- Replica scripts/ponderacao-estratos.mjs (variante C) no banco:
--  • respondente = token_hash; município/sexo/faixa/instrução = último valor
--    não nulo entre os votos do token (ordem de id);
--  • N = respondentes com município em municipios_se; fora de SE = peso 0;
--  • P = eleitorado mapeado (linhas do TSE com sexo, faixa e instrução);
--  • alvos: município N·P_m/P; faixa N·P_f/P (16-17 somado a 18-24 quando a
--    amostra não tem 16-17); instrução N·P_e/P; sexo NI = seu próprio n,
--    M/F = (N−n_NI)·P_s/P;
--  • ordem das dimensões: município → faixa → instrução → sexo; fator 0
--    quando a categoria não tem respondente ou não tem eleitorado;
--  • para até p_max_iter iterações ou desvio relativo máximo ≤ p_tol;
--  • Kish: n_eff = (Σw)²/Σw², deff = N/n_eff, margem = 1,96·√(0,25/n).
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
      delete from tmp_fac;
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

comment on function public.ponderar_estratos_raking is
  'Raking (IPF) nas marginais município, faixa etária, instrução e sexo do eleitorado TSE importado. Grava execução + pesos por célula; devolve o id da execução. Só service_role.';
revoke all on function public.ponderar_estratos_raking(uuid, uuid, text, int, double precision) from public, anon, authenticated;
grant execute on function public.ponderar_estratos_raking(uuid, uuid, text, int, double precision) to service_role;

-- ------------------------------------------------ views ponderadas (estratos)
-- Peso do voto = peso da célula do respondente na execução vigente da edição.
create or replace view public.v_peso_estratos
with (security_invoker = true) as
  select e.id as edicao_id, p.execucao_id, p.municipio_ibge, p.faixa_etaria, p.escolaridade, p.sexo, p.respondentes, p.peso
  from public.edicao e
  join public.pesos_celula p on p.execucao_id = e.ponderacao_execucao_id;
comment on view public.v_peso_estratos is 'Pesos por célula da execução de raking vigente em cada edição.';

-- Demografia do respondente = último valor não nulo entre os votos do token
-- (mesma regra da função). Como os votos de um token são gravados numa
-- sessão só, na prática todos carregam os mesmos valores.
create or replace view public.v_respondente_celula
with (security_invoker = true) as
  select edicao_id, token_hash,
    (array_remove(array_agg(municipio_ibge order by id), null))[cardinality(array_remove(array_agg(municipio_ibge order by id), null))] as municipio_ibge,
    coalesce((array_remove(array_agg(sexo order by id), null))[cardinality(array_remove(array_agg(sexo order by id), null))], 'NI') as sexo,
    (array_remove(array_agg(faixa_etaria order by id), null))[cardinality(array_remove(array_agg(faixa_etaria order by id), null))] as faixa_etaria,
    (array_remove(array_agg(escolaridade order by id), null))[cardinality(array_remove(array_agg(escolaridade order by id), null))] as escolaridade
  from public.votos_pesquisa group by edicao_id, token_hash;
comment on view public.v_respondente_celula is 'Célula demográfica de cada respondente (token_hash) — chave de junção com pesos_celula.';

create or replace view public.v_resultados_candidato_pond_estratos
with (security_invoker = true) as
  select v.edicao_id, v.cargo, v.candidato_id,
         count(*)::int as votos,
         sum(coalesce(p.peso, 0))::numeric(14,4) as votos_pond
  from public.votos_pesquisa v
  join public.v_respondente_celula r on r.edicao_id = v.edicao_id and r.token_hash = v.token_hash
  left join public.v_peso_estratos p on p.edicao_id = v.edicao_id and p.municipio_ibge = r.municipio_ibge
       and p.faixa_etaria = r.faixa_etaria and p.escolaridade = r.escolaridade and p.sexo = r.sexo
  where v.metodo = 'numero' and v.candidato_id is not null
  group by v.edicao_id, v.cargo, v.candidato_id;

create or replace view public.v_resultados_legenda_pond_estratos
with (security_invoker = true) as
  select v.edicao_id, v.cargo, v.partido_id,
         count(*)::int as votos,
         sum(coalesce(p.peso, 0))::numeric(14,4) as votos_pond
  from public.votos_pesquisa v
  join public.v_respondente_celula r on r.edicao_id = v.edicao_id and r.token_hash = v.token_hash
  left join public.v_peso_estratos p on p.edicao_id = v.edicao_id and p.municipio_ibge = r.municipio_ibge
       and p.faixa_etaria = r.faixa_etaria and p.escolaridade = r.escolaridade and p.sexo = r.sexo
  where v.metodo = 'numero' and v.partido_id is not null
  group by v.edicao_id, v.cargo, v.partido_id;

create or replace view public.v_votos_branco_nao_sabe_pond_estratos
with (security_invoker = true) as
  select v.edicao_id, v.cargo, v.metodo,
         count(*)::int as votos,
         sum(coalesce(p.peso, 0))::numeric(14,4) as votos_pond
  from public.votos_pesquisa v
  join public.v_respondente_celula r on r.edicao_id = v.edicao_id and r.token_hash = v.token_hash
  left join public.v_peso_estratos p on p.edicao_id = v.edicao_id and p.municipio_ibge = r.municipio_ibge
       and p.faixa_etaria = r.faixa_etaria and p.escolaridade = r.escolaridade and p.sexo = r.sexo
  where v.metodo in ('branco', 'nao_sabe')
  group by v.edicao_id, v.cargo, v.metodo;

-- ------------------------------------------- monitoramento da amostra
-- Marginais da amostra (cadastros com OTP validado) por edição, lado a lado
-- com o eleitorado TSE importado — pra acompanhar a cobertura dos estratos
-- DURANTE a coleta (não depois, como na 1ª edição).
create or replace view public.v_amostra_marginais
with (security_invoker = true) as
  select edicao_id, 'sexo'::text as dimensao, coalesce(sexo, 'NI') as categoria, count(*)::int as respondentes
  from public.eleitores_pesquisa where wa_validado group by edicao_id, coalesce(sexo, 'NI')
  union all
  select edicao_id, 'faixa', coalesce(faixa_etaria, 'NI'), count(*)::int
  from public.eleitores_pesquisa where wa_validado group by edicao_id, coalesce(faixa_etaria, 'NI')
  union all
  select edicao_id, 'escolaridade', coalesce(escolaridade, 'NI'), count(*)::int
  from public.eleitores_pesquisa where wa_validado group by edicao_id, coalesce(escolaridade, 'NI')
  union all
  select edicao_id, 'municipio', municipio_ibge::text, count(*)::int
  from public.eleitores_pesquisa where wa_validado group by edicao_id, municipio_ibge;
comment on view public.v_amostra_marginais is 'Cadastros validados por sexo / faixa / instrução / município — acompanhamento da cobertura dos estratos durante a coleta.';

create or replace view public.v_eleitorado_marginais
with (security_invoker = true) as
  select importacao_id, 'sexo'::text as dimensao, sexo as categoria, sum(eleitores)::bigint as eleitores
  from public.eleitorado_tse_estratos group by importacao_id, sexo
  union all
  select importacao_id, 'faixa', faixa_etaria, sum(eleitores)::bigint from public.eleitorado_tse_estratos group by importacao_id, faixa_etaria
  union all
  select importacao_id, 'escolaridade', escolaridade, sum(eleitores)::bigint from public.eleitorado_tse_estratos group by importacao_id, escolaridade
  union all
  select importacao_id, 'municipio', municipio_ibge::text, sum(eleitores)::bigint from public.eleitorado_tse_estratos group by importacao_id, municipio_ibge;
comment on view public.v_eleitorado_marginais is 'Eleitorado TSE importado por sexo / faixa / instrução / município.';

revoke all on public.eleitorado_tse_importacao, public.eleitorado_tse_estratos, public.ponderacao_execucao, public.pesos_celula,
  public.v_peso_estratos, public.v_respondente_celula, public.v_resultados_candidato_pond_estratos, public.v_resultados_legenda_pond_estratos,
  public.v_votos_branco_nao_sabe_pond_estratos, public.v_amostra_marginais, public.v_eleitorado_marginais
  from anon, authenticated;
grant select on public.v_peso_estratos, public.v_respondente_celula, public.v_resultados_candidato_pond_estratos,
  public.v_resultados_legenda_pond_estratos, public.v_votos_branco_nao_sabe_pond_estratos, public.v_amostra_marginais, public.v_eleitorado_marginais
  to service_role;
grant all on public.eleitorado_tse_importacao, public.eleitorado_tse_estratos, public.ponderacao_execucao, public.pesos_celula to service_role;
