-- 039 — Revalidação de segurança (25/08/2026)
-- Fecha o vazamento das views de projeção pela anon key + trava de token único por CPF.

-- 1) Views de projeção rodavam como SECURITY DEFINER (owner=postgres) e furavam o RLS.
--    Passam a rodar como o papel que consulta — anon cai no deny-anon (023).
alter view public.v_proj_candidato_mun  set (security_invoker = true);
alter view public.v_proj_partido_mun    set (security_invoker = true);
alter view public.v_respostas_municipio set (security_invoker = true);

-- 2) Cinto + suspensório: anon/authenticated não precisam ler essas views
--    (só /admin/projecao lê, via service_role, que ignora RLS e mantém acesso).
revoke select on public.v_proj_candidato_mun  from anon, authenticated;
revoke select on public.v_proj_partido_mun    from anon, authenticated;
revoke select on public.v_respostas_municipio from anon, authenticated;

-- 3) Trava de emissão de token: 1 token por CPF por edição (fecha vote-stuffing
--    via reenviarOtp -> validarOtp). O código minta token só quando o UPDATE
--    condicional (token_emitido=false -> true) afeta 1 linha.
alter table public.eleitores_pesquisa
  add column if not exists token_emitido boolean not null default false;

update public.eleitores_pesquisa set token_emitido = true where wa_validado = true;
