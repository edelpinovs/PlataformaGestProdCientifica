# Prueba del PR #61: editar y eliminar en divisiones y departamentos; formato de departamentos

| Campo | Valor |
|---|---|
| PR | [#61](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/61) (cierra #8 y #59) |
| Autor | @edelpinovs (con Claude Code) |
| Rama | `feat/M1-RF-003-validar-departamento` → `main` |
| Commit probado | `4dd821b` |
| Fechas de la prueba | 2026-10-17 y 2026-10-18 |
| Probó | Edel Pino |
| Entorno | Local (Windows 11, Node 24.15.0), `next dev` en el puerto 3001, base de datos de desarrollo (Supabase) |
| Resultado | **Prueba incompleta.** Departamentos está probado; **faltan Divisiones y la edición de departamentos** (sección 4). Falta además la aprobación en GitHub de otra persona del equipo. |

## 1. Alcance del cambio

| Archivo | Cambio |
|---|---|
| `src/components/fila-editable.tsx` | Nuevo: fila reutilizable con *Editar* y *Eliminar* |
| `src/modules/catalogos/comun.ts` | `claveCatalogo()`, `idDeFormulario()`, `cantidad()`, `enumerar()`; los nombres admiten comas y guiones; se quita `texto()` |
| `src/modules/catalogos/divisiones.ts` | `buscarDuplicada` con `idPropio`; `motivoDivisionNoEliminable` |
| `src/modules/catalogos/departamentos.ts` | Formato con `nombreCatalogo` y `claveCatalogo`; `revisarDepartamento` con `idPropio`; `motivoDepartamentoNoEliminable` |
| `src/app/catalogos/{grados,divisiones,departamentos}/` | Acciones de editar y eliminar; páginas con `FilaEditable`; se elimina `grados/fila.tsx` |
| `AGENTS.md`, `docs/diseno/PAUTA_VISUAL.md` | La regla de listados apunta a `FilaEditable` |

No toca el esquema de Prisma.

## 2. Borrados seguros

| Al eliminar… | Lo usan | Relación | Sin protección, la base… |
|---|---|---|---|
| División | Departamento | Obligatoria | Rechaza (`P2003`) |
| Departamento | Profesor | Opcional, sin `onDelete` | Deja al profesor sin departamento (`SetNull`) |
| Departamento | Programa educativo | Opcional, sin `onDelete` | Deja al programa sin departamento (`SetNull`) |
| Departamento | Cuerpo académico | Obligatoria | Rechaza (`P2003`) |

En los dos casos el servicio revisa antes y la condición va dentro del mismo `DELETE`. El log de Prisma, con `id = -1` para no borrar nada, mostró una sola sentencia por borrado:

```sql
DELETE FROM "Departamento" WHERE ("Departamento"."id" = $1
  AND NOT EXISTS(SELECT … FROM "Profesor" …)
  AND NOT EXISTS(SELECT … FROM "ProgramaEducativo" …)
  AND NOT EXISTS(SELECT … FROM "CuerpoAcademico" …))

DELETE FROM "Division" WHERE ("Division"."id" = $1
  AND NOT EXISTS(SELECT … FROM "Departamento" …))
```

## 3. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 7 archivos, 72 pruebas (15 nuevas), incluida la pauta visual |
| `npm run lint` y `npm run typecheck` | Correcto |
| Los datos existentes cumplen el formato nuevo | Correcto: nomenclaturas `DEP-A1`…`DEP-C2` y claves `DIV-A`…`DIV-C` |
| El PR enlaza los issues | Correcto: GitHub reconoce `Closes #8` y `Closes #59` |

## 4. Pruebas manuales

Como `ADMINISTRADOR`. La columna *Evidencia* indica cómo se comprobó cada caso según el registro del servidor.

| # | Caso | Resultado | Evidencia |
|---|---|---|---|
| 1 | Divisiones: editar conservando o corrigiendo el propio nombre | **Pendiente** | No hubo visitas a `/catalogos/divisiones` |
| 2 | Divisiones: editar con la clave de otra división → error | **Pendiente** | Ídem |
| 3 | Divisiones: eliminar `DIV-A` (con departamentos) → se rechaza | **Pendiente** | Ídem |
| 4 | Departamentos: registrar uno nuevo | Correcto | Alta de `NombreOK` en el servidor |
| 5 | Departamentos: editar y cambiar de división | **Pendiente** | No hubo redirección `?editado=` |
| 6 | Departamentos: nomenclatura duplicada o nombre con números → error | Correcto | Envíos con respuesta de error en el servidor; confirmado por el revisor |
| 7 | Departamentos: eliminar uno sin uso, con confirmación → aviso de éxito | Correcto | Redirección `?eliminado=NombreOK` en el servidor |
| 8 | Vista de celular y tema oscuro con la fila abierta | Correcto | Confirmado por el revisor |
| 9 | Departamentos: eliminar `DEP-A1` con un profesor → se rechaza y explica por qué | Correcto | Envío con respuesta de error en el servidor; `DEP-A1` siguió en la base con su profesor |

**Datos de prueba.** Para el caso 9 se creó, con autorización del responsable, el profesor ficticio *Profesor Prueba* (`PRUEBA-59`, `prueba-59@ejemplo.invalid`) en `Departamento DEP-A1`. Se borró al terminar. El departamento `NombreOK` se creó y se eliminó en la prueba. La base quedó con 0 profesores, las 3 divisiones y los 6 departamentos de la semilla.

## 5. Dictamen

**Aún no se aprueba.** Antes de integrar hay que probar los casos 1, 2, 3 y 5 (Divisiones completa y la edición de departamentos), que son código nuevo de este PR, y actualizar este registro.
