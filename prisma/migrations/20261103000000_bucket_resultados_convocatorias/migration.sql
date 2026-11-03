-- RF-016 (CU-010): bucket privado para los archivos oficiales de resultados SNII y PRODEP.
-- El navegador sube el archivo directo a Storage con una URL firmada que crea la Server Action,
-- porque Vercel no acepta cuerpos de más de 4.5 MB en una función y los PDF oficiales pesan más.
-- No cambia schema.prisma: solo crea el bucket, una función y las políticas de storage.objects.

-- 50 MB y solo PDF o Excel (.xlsx), igual que src/modules/convocatorias/carga.ts.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resultados-convocatorias',
  'resultados-convocatorias',
  false,
  52428800,
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO NOTHING;

-- ¿La persona con sesión puede usar el módulo de convocatorias? Mismos roles que
-- src/modules/registry.ts (slug "convocatorias"). SECURITY DEFINER porque "Perfil" tiene RLS
-- sin políticas (migración habilitar_rls) y la Data API sigue cerrada.
CREATE OR REPLACE FUNCTION public.puede_gestionar_convocatorias()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."Perfil"
    WHERE id = auth.uid() AND rol IN ('ADMINISTRADOR', 'COORDINADOR')
  );
$$;

REVOKE ALL ON FUNCTION public.puede_gestionar_convocatorias() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.puede_gestionar_convocatorias() TO authenticated;

-- Leer (para consultar el archivo y para borrarlo), subir y eliminar. Sin UPDATE: un archivo
-- oficial no se reemplaza; se elimina la carga y se vuelve a subir.
CREATE POLICY "resultados_convocatorias_leer" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'resultados-convocatorias' AND public.puede_gestionar_convocatorias());

CREATE POLICY "resultados_convocatorias_subir" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resultados-convocatorias' AND public.puede_gestionar_convocatorias());

CREATE POLICY "resultados_convocatorias_eliminar" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'resultados-convocatorias' AND public.puede_gestionar_convocatorias());
