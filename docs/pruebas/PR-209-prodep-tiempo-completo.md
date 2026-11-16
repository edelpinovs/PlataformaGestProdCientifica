# Revisión del PR #209: Perfil Deseable PRODEP solo para Tiempo Completo (RF-009)

Registro de la revisión del [PR #209](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/209) de `Ared11` (rama `feat/M3-RF-009-prodep-tiempo-completo`, cierra #14). El comentario está publicado en el PR.

## 1. Alcance revisado

La regla de contratación (`validarContratacionProdep`), la función `tieneProdepActivo`, el esquema Zod del reconocimiento y el módulo PRODEP completo: pantalla `/reconocimientos/prodep` con listado paginado, formulario, y las acciones de alta, edición y eliminación. Diez archivos, 988 líneas añadidas. Es la base común de PRODEP: el #210 (RF-010) ya se rehízo sobre esta rama y el #211 (RF-011) falta rehacerlo.

## 2. Chequeos

En copia local de la rama: `npm test` (786 pruebas), `npm run lint` y `npm run typecheck` pasan. Si se quita la regla de Tiempo Completo fallan 3 pruebas. El CI (`verificar`) y Vercel pasaron y la fusión con `main` no tiene conflicto.

No se ejecutó `npm run build` y la pantalla no se vio en el navegador.

## 3. Hallazgos

| # | Hallazgo | Gravedad |
|---|---|---|
| 1 | `tieneProdepActivo` ya existe en `src/modules/cuerpos-academicos/integrantes.ts` (con consumidores) y su lógica está también en `src/lib/inicio.ts`; el PR añade una tercera copia, la llama «canónica» y no migra a nadie. Unificarlas toca otro módulo y se acuerda con su dueño (pendiente del grupo) | A corregir (descripción y seguimiento) |
| 2 | `create` y `updateMany` capturan `P2025` y una llave foránea rota responde `P2003` (`AGENTS.md`); en una carrera acabaría en error 500 | Menor |
| 3 | Un profesor que pasa a Asignatura ya no puede editar sus reconocimientos antiguos, aunque sí eliminarlos; confirmar con la Coordinación | Seguimiento |
| 4 | La descripción marca la pantalla revisada en claro, oscuro y celular; no se pudo comprobar | Menor |

## 4. Dictamen

**Aprobable con comentarios.** La regla de RF-009 se aplica en el servidor en el alta y en la edición, los permisos están en las tres acciones y el listado sigue la pauta. Ningún hallazgo bloquea. Se integra primero, y después el #210 y el #211 rehecho. La aprobación en GitHub la da otra persona del equipo.
