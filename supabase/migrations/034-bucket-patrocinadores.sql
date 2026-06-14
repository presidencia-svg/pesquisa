-- Migration 034 — bucket público pra logos de patrocinadores
-- (aplicada via mcp__supabase__execute_sql em 2026-06-06)

INSERT INTO storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
) VALUES (
  'patrocinadores',
  'patrocinadores',
  true,
  2097152, -- 2 MB
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$ BEGIN
  CREATE POLICY "patrocinadores_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'patrocinadores');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
