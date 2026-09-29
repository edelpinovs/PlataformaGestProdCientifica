-- Supabase expone el esquema public por su Data API (PostgREST) con la llave publishable,
-- que es pública. La app no usa esa API: accede con Prisma como rol postgres, que ignora RLS.
-- Activar RLS sin políticas bloquea la Data API en todas las tablas (RNF-005).
-- Toda migración que cree tablas nuevas debe repetir esto para ellas.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;
