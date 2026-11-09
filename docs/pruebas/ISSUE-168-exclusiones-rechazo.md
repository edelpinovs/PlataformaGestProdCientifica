# Issue #168: exclusiones por rechazo previo

Fecha: 2026-11-09. Rama: `fix/M6-RF-021-excluir-autorias-rechazadas`.

El repositorio distingue una autoría existente de una rechazada, incluida la recuperación de P2002. El motor omite las rechazadas en los conteos de autorías nuevas, publicaciones guardadas y coautorías; muestra su contador separado. No modifica estados ni borra historial. La deduplicación previa sigue resolviendo DOI y título/año; la exclusión siempre es por profesor y obra.

Pruebas nuevas: rechazo recuperado desde otra fuente con DOI normalizado; coincidencia sin DOI; misma obra disponible para otro profesor; rechazo concurrente; acumulación del contador al continuar lotes y compatibilidad de trabajos antiguos. Las pruebas existentes de obras con DOI distintos y de Validación siguen activas.

| Comprobación | Resultado |
| --- | --- |
| `npm test` | 618 pruebas, 53 archivos; pasan |
| `npm run lint` | Pasa |
| `npm run typecheck` | Pasa |
| `npm run build` | Pasa |

Las pruebas usan HTTP, sesión y Prisma simulados. No hay cambios de esquema ni escrituras en Supabase. El listado histórico de publicaciones conserva los registros para consulta: el rechazo no borra la publicación institucional ni impide autorías de otras personas.

Limitaciones: revisión independiente pendiente; falta comprobar el aviso final con una sesión real en claro, oscuro y celular. La integración de fuentes nuevas de #167 debe conservar este contrato del repositorio.
