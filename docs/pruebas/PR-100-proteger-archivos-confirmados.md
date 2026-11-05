# Prueba del PR #100: Storage no deja borrar el archivo de una carga confirmada (RF-016)

Registro de la revisión del [PR #100](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/100) de `Grillo-de-Alambre` (rama `fix/M5-RF-016-borrado-storage`, commit `34eec45`). Cierra #99; atiende los hallazgos 1 y 5 de la revisión del PR #77. El comentario está publicado en el PR.

## 1. Alcance revisado

| Archivo | Qué hace |
|---|---|
| `prisma/migrations/20261105000000_proteger_archivos_confirmados/migration.sql` | Función `es_archivo_confirmado(ruta)` y política `resultados_convocatorias_eliminar` con `NOT es_archivo_confirmado(name)` (escrita a mano; no cambia `schema.prisma`) |
| `src/app/convocatorias/carga/FormCarga.tsx` | `space-y-6` pasa a `flex flex-col gap-4` (pauta visual) |

## 2. Chequeos automáticos (copia aislada)

La rama está 23 commits detrás de `main` pero es fusionable (sin archivos en común).

| Chequeo | Resultado |
|---|---|
| `npm test` | 284 pruebas pasan (18 archivos) |
| `npm run lint` | sin errores |
| `npm run typecheck` | `next typegen` y `tsc --noEmit` sin errores |
| `npm run build` | no se ejecutó en la copia; el CI del PR pasó (`verificar`) |

## 3. Comprobaciones sobre la base compartida (solo lectura)

| Qué | Resultado |
|---|---|
| Migración en `_prisma_migrations` | Aplicada y terminada |
| Política `resultados_convocatorias_eliminar` | `DELETE` para `authenticated` con `bucket_id`, `puede_gestionar_convocatorias()` y `NOT es_archivo_confirmado(name)` |
| Otras políticas del bucket | Solo `leer` (SELECT) y `subir` (INSERT); sin `UPDATE`, así que no se puede reemplazar ni mover un archivo |
| Función | `SECURITY DEFINER`, `search_path` vacío, estable; permisos para `authenticated`, `service_role` y `postgres`, no `anon` |
| `es_archivo_confirmado(null)`, `('')`, `('no/existe.pdf')` | `false` en los tres |
| Datos | Sin cargas ni objetos en el bucket |

## 4. Lectura del código que borra archivos

`eliminarCarga` borra la fila antes que el archivo, así que una carga no confirmada se sigue pudiendo eliminar. Los `remove` de `registrarCarga` (archivo vacío o demasiado grande, o error al registrar) ocurren cuando aún no hay una carga confirmada con esa ruta.

## 5. Dictamen

**Aprobable con comentarios.** Sin defectos de código.

| Hallazgo | Tipo |
|---|---|
| Falta el borrado real contra Storage con sesión de Coordinador sobre una carga confirmada (debe fallar); sin datos en la base no se pudo hacer | Antes de aprobar |
| La migración se aplicó a la base compartida antes de la aprobación | Proceso |
| `es_archivo_confirmado` la puede ejecutar cualquier usuario autenticado (revela si una ruta es de una carga confirmada) | Menor |
| Anotar cómo revertir (restaurar la política anterior y borrar la función) | Menor |
| Rama detrás de `main` | Menor |

## 6. Lo que no se probó

- El borrado real contra Storage con una carga confirmada (Supabase no permite borrar directo en SQL, y no hay datos).
- La pantalla en el navegador (la autora declara claro, oscuro y celular).
- `npm run build` en la copia.
