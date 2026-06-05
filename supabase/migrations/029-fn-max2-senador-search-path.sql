-- Migration 029 — fixar search_path em fn_max2_senador
-- (mesma SQL aplicada via mcp__supabase__apply_migration em 2026-06-01)
CREATE OR REPLACE FUNCTION public.fn_max2_senador()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
DECLARE
  qtd INT;
BEGIN
  IF NEW.cargo = 'senador' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.token_hash, 0));
    SELECT count(*) INTO qtd
    FROM votos_pesquisa
    WHERE token_hash = NEW.token_hash AND cargo = 'senador';
    IF qtd >= 2 THEN
      RAISE EXCEPTION
        'Limite de 2 votos para senador por token foi atingido (token=%, cargo=%)',
        NEW.token_hash, NEW.cargo
        USING ERRCODE = '23505';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
