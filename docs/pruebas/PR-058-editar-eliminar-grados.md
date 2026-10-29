# Prueba del PR #58: RF-001, editar y eliminar grados científicos

| Campo | Valor |
|---|---|
| PR | [#58](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/58) (cierra #55, subtarea de #6) |
| Autor | @edelpinovs (con Claude Code) |
| Rama | `feat/M1-RF-001-editar-grados` → `main` |
| Commit probado | `0f7e4d8` |
| Fecha de la prueba | 2026-10-16 |
| Probó | Edel Pino |
| Entorno | Local (Windows 11, Node 24.15.0), `next dev` en el puerto 3001, base de datos de desarrollo (Supabase) |
| Resultado | **Aprobado.** Falta la aprobación en GitHub de otra persona del equipo. |

## 1. Alcance del cambio

| Archivo | Cambio |
|---|---|
| `src/modules/catalogos/grados.ts` | `buscarDuplicado` acepta el `id` propio; nueva `motivoNoEliminable` |
| `src/modules/catalogos/grados.test.ts` | 7 pruebas nuevas |
| `src/app/catalogos/grados/actions.ts` | Nuevas Server Actions `editarGrado` y `eliminarGrado`, con `requireModulo("catalogos")` |
| `src/app/catalogos/grados/fila.tsx` | Nuevo: fila con *Editar* y *Eliminar*, edición y confirmación dentro de la fila |
| `src/app/catalogos/grados/page.tsx` | Usa `FilaGrado` y muestra el aviso de éxito |
| `src/components/ui.tsx` | Nuevas piezas `claseBotonPeligro` y `claseAccionFila` |

No toca el esquema de Prisma.

## 2. Riesgo encontrado y cómo se cubrió

`Profesor.grado` es una relación opcional sin `onDelete`, así que Prisma aplica `SetNull`: la base no rechaza borrar un grado en uso, sino que deja a sus profesores sin grado. La revisión de profesores asignados se hace en el servicio, y además la condición va dentro del borrado. El log de Prisma confirmó que se genera una sola sentencia:

```sql
DELETE FROM "public"."GradoCientifico"
WHERE ("public"."GradoCientifico"."id" = $1 AND NOT EXISTS(
  SELECT "t0"."gradoId" FROM "public"."Profesor" AS "t0"
  WHERE (1=1 AND ("public"."GradoCientifico"."id") = ("t0"."gradoId") AND "t0"."gradoId" IS NOT NULL)))
```

La consulta se ejecutó con `id = -1` para no borrar nada.

## 3. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 7 archivos, 55 pruebas (7 nuevas), incluida la pauta visual |
| `npm run lint` y `npm run typecheck` | Correcto |
| Contraste de las piezas nuevas | Correcto: entre 5.93 y 9.59 en claro y oscuro |
| El PR enlaza el issue | Correcto: GitHub reconoce `Closes #55` |

## 4. Pruebas manuales

Todas como `ADMINISTRADOR`. La columna *Evidencia* indica cómo se comprobó cada caso.

| # | Caso | Resultado | Evidencia |
|---|---|---|---|
| 1 | Editar un grado conservando su propio nombre y nomenclatura no choca consigo mismo | Correcto | Redirección `?editado=Maestría` en el servidor |
| 2 | Editar con el nombre de otro grado → error de nombre duplicado en la fila | Correcto | Envío con respuesta de error en el servidor; confirmado por el revisor |
| 3 | Cancelar la edición cierra la fila sin cambios | Correcto | Confirmado por el revisor |
| 4 | Eliminar un grado sin profesores, con confirmación → aviso de éxito | Correcto | Confirmado por el revisor. No quedó una redirección `?eliminado=` en el registro del servidor |
| 5 | Cancelar la eliminación no cambia nada | Correcto | Confirmado por el revisor |
| 6 | Vista de celular: acciones visibles; al editar, campos apilados | Correcto | Confirmado por el revisor |
| 7 | Tema oscuro: la confirmación se lee bien | Correcto | Confirmado por el revisor |
| 8 | Eliminar `Doctorado` asignado a un profesor → no se borra y explica por qué | Correcto | Envío con respuesta de error en el servidor; `Doctorado` siguió en la base con su profesor |

**Datos de prueba.** Para el caso 8 se creó, con autorización del responsable, el profesor ficticio *Profesor Prueba* (`PRUEBA-55`, `prueba-55@ejemplo.invalid`) con grado `Doctorado`. Se borró al terminar. La base quedó con 0 profesores y los grados `Licenciatura / LIC`, `Maestría / MTRO` y `Doctorado / DR`.

## 5. Dictamen

Se aprueba la integración del PR #58 a `main`, una vez que otra persona del equipo lo apruebe en GitHub. Al integrarse, GitHub cerrará #55.
