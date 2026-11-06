# Issue #122: persistencia multifuente e idempotencia

Prueba en src/app/produccion/integracion.test.ts. Se ejecutan conectores ORCID y OpenAlex, deduplicador, motor, repositorio y acciones de validación reales. HTTP, sesión y Prisma están simulados; no hay escrituras en Supabase ni consultas a APIs externas.

## Resultados

- Dos entradas de fuentes distintas con el mismo DOI: una obra guardada y una autoría nueva.
- Repetición para el mismo profesor: una obra, una autoría y cero autorías nuevas.
- Segundo profesor: una obra y dos autorías.
- Confirmación de la primera autoría y rechazo de la segunda, seguidos de nuevos escaneos: estados VALIDADA y RECHAZADA y fechas de revisión conservados.
- En toda la secuencia se invoca una sola creación de publicación y dos creaciones de autoría.

npm test: 519 pruebas correctas. npm run lint y npm run typecheck: correctos. npm run build: correcto.

La cantidad corresponde a esta rama desde main; no incluye cambios todavía pendientes en los PR #119 y #121. No se modificó la interfaz y no se realizó revisión visual. No sustituye una prueba de persistencia real ni constituye aprobación independiente.
