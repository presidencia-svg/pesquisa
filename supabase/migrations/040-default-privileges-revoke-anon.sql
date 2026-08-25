-- 040 — Causa-raiz do vazamento: toda relação nova criada por postgres nascia
-- com SELECT pra anon (pg_default_acl). Revoga o SELECT padrão futuro — o app
-- nunca lê via anon; todo acesso é service_role.
alter default privileges for role postgres in schema public
  revoke select on tables from anon, authenticated;
