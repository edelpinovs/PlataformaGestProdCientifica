-- RF-016 (hallazgo 1 de la revisión del PR #77): Storage no deja borrar el archivo oficial
-- de una carga confirmada. Antes el bloqueo estaba solo en la Server Action eliminarCarga, y
-- un Administrador o Coordinador podía llamar a Storage directamente y borrar el PDF.
-- No cambia schema.prisma: solo agrega una función y reemplaza una política de storage.objects.

-- ¿La ruta pertenece a una carga confirmada? SECURITY DEFINER porque "CargaResultados" tiene
-- RLS sin políticas (migración habilitar_rls) y la consulta desde la política no vería filas.
CREATE OR REPLACE FUNCTION public.es_archivo_confirmado(ruta text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."CargaResultados"
    WHERE "archivoRuta" = ruta AND estado = 'CONFIRMADA'
  );
$$;

REVOKE ALL ON FUNCTION public.es_archivo_confirmado(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.es_archivo_confirmado(text) TO authenticated;

-- eliminarCarga borra primero la fila y después el archivo, así que el borrado normal
-- de una carga no confirmada sigue funcionando.
DROP POLICY IF EXISTS "resultados_convocatorias_eliminar" ON storage.objects;
CREATE POLICY "resultados_convocatorias_eliminar" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'resultados-convocatorias'
    AND public.puede_gestionar_convocatorias()
    AND NOT public.es_archivo_confirmado(name)
  );
