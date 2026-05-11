-- ==========================================================================
-- Migration 007 — FK CASCADE em votos_pesquisa.candidato_id / partido_id
--
-- Sem FK, deletar um candidato (ex.: ao re-rodar o seed 03 corrigindo
-- partidos) deixava votos orfaos: o dashboard contava em `votos_validos`
-- mas as views de resultado faziam INNER JOIN e excluiam os orfaos,
-- gerando inconsistencia tipo "10 votos validos / 2 candidatos somam 2".
--
-- Solucao: adicionar FK com ON DELETE CASCADE em candidato_id e
-- partido_id. Re-rodar seed 03 agora limpa os votos de teste junto com
-- os candidatos, sem deixar inconsistencia.
--
-- Idempotente — se a constraint ja' existir, ALTER nao roda; se nao,
-- adiciona.
-- ==========================================================================

-- Antes de criar FK, limpa orfaos que podem ter ficado de testes anteriores.
-- Sem isso, o ALTER falha porque o Postgres valida a constraint contra os
-- dados existentes.
delete from votos_pesquisa
 where candidato_id is not null
   and not exists (
     select 1 from candidatos_pesquisa c where c.id = votos_pesquisa.candidato_id
   );

delete from votos_pesquisa
 where partido_id is not null
   and not exists (
     select 1 from partidos p where p.id = votos_pesquisa.partido_id
   );

-- FK candidato_id → candidatos_pesquisa(id) ON DELETE CASCADE
alter table votos_pesquisa
  drop constraint if exists votos_pesquisa_candidato_id_fkey;

alter table votos_pesquisa
  add constraint votos_pesquisa_candidato_id_fkey
  foreign key (candidato_id) references candidatos_pesquisa(id)
  on delete cascade;

-- FK partido_id → partidos(id) ON DELETE CASCADE
alter table votos_pesquisa
  drop constraint if exists votos_pesquisa_partido_id_fkey;

alter table votos_pesquisa
  add constraint votos_pesquisa_partido_id_fkey
  foreign key (partido_id) references partidos(id)
  on delete cascade;
