# Prueba del PR #267: panel de administración, fase 2: auditoría y calidad de datos (#242)

Fecha: 2026-11-23. Rama: `feat/M1-administracion-auditoria-calidad`, base `feat/M1-administracion-usuarios-reglas` (PR #263). Lo preparó I1 (`@edelpinovs`) con ayuda de un agente de IA. Sigue en borrador. Refs #242; no lo cierra.

## 1. Qué cambia

| Archivo | Cambio |
|---|---|
| `prisma/schema.prisma` y `prisma/migrations/20261123230018_auditoria/` | Tabla nueva `Auditoria` (fecha, correo y uuid de quien actuó, módulo, acción, entidad, resumen), dos índices y RLS. Sin relación con `Perfil`, a propósito: lo registrado no cambia si el perfil cambia |
| `src/modules/administracion/auditoria.ts` (+ prueba) | Acciones auditables, armado del evento (recorta y no lanza error) y resúmenes. El profesor se identifica por su código, nunca por su nombre |
| `src/modules/administracion/auditoria-listado.ts` (+ prueba) | Columnas, filtros (módulo, acción), búsqueda y orden |
| `src/app/administracion/usuarios/actions.ts` (+ prueba) | Editar, desactivar y reactivar guardan el cambio y su registro **en la misma transacción**. Una edición que no cambia nada no escribe |
| `src/app/administracion/auditoria/page.tsx` | Bitácora de solo lectura, paginada de 10 |
| `src/modules/administracion/calidad.ts` (+ prueba) y `src/app/administracion/calidad/page.tsx` | Cinco reglas: cuerpo académico sin líder; líder que no es integrante; integrante de baja o trasladado; profesor activo sin ORCID ni Scopus; profesor activo sin perfil. Cada hallazgo enlaza a donde se corrige |

La migración `auditoria` **se aplicó a la base compartida antes del acuerdo del equipo** (2026-11-23, con `npm run db:migrar`); el esquema quedó al día. Cambia el esquema: hay que confirmarlo en el chat (D-241).

## 2. Comprobaciones (copia aislada)

| Control | Resultado |
|---|---|
| Pruebas propias (módulo, acciones y sesión) | 84 pasan en 6 archivos |
| `npm test` completo | 1179 de 1180 pasan (106 archivos). Falla `src/modules/produccion/conectores/http.test.ts`, de otro módulo; no se comprobó si falla en el CI |
| `npm run lint` | sin errores |
| `npm run typecheck` | sin errores |
| `npm run build` | **no se pudo ejecutar** en la copia aislada (Next rechaza el enlace a `node_modules`); queda para el CI |

Vitest solo corre aquí con `--pool=vmThreads`.

Pruebas que cubren lo nuevo: el evento se arma con el módulo de la acción y el correo limpio, y un resumen demasiado largo se recorta en lugar de fallar; el resumen nombra solo lo que cambió y no lleva nombres de profesores; la búsqueda cubre persona, resumen, módulo y acción por su texto y escapa los comodines; una columna fuera de la lista no llega al `orderBy`; **si la bitácora falla, el cambio no se guarda** (la transacción rechaza y no hay redirección); sin cambios no se escribe nada; cada regla de calidad con datos sanos y con datos rotos, la licencia no cuenta como baja, quien no está activo no se señala, y la clave de cada hallazgo es única.

## 3. Lectura real de la base (solo lectura, solo conteos)

Con el código de calidad ya integrado en la rama siguiente (#269; las reglas son las mismas), un script temporal las ejecutó contra los datos de demostración, sin escribir ni mostrar nombres:

| Dato | Resultado |
|---|---|
| Tabla `Auditoria` | existe; 0 filas (aún no se ha usado desde la aplicación) |
| Profesores activos / cuerpos académicos | 50 / 8 |
| Hallazgos de calidad | **54**: `CA_SIN_LIDER` 3, `SIN_IDENTIFICADORES` 1, `SIN_PERFIL` 50. Las claves son únicas |

**Observación sobre `SIN_PERFIL`:** los 50 profesores activos de demostración no tienen perfil, así que esa regla domina el listado (50 de 54). Con datos reales pasará lo mismo hasta que cada profesor tenga acceso. Conviene decidir si esa regla va en la lista general, con su propio filtro por omisión, o solo como cifra en el inicio.

## 4. Límites: lo que NO se probó

- **Las pantallas no se vieron en el navegador** (claro, oscuro, celular).
- **Nunca se escribió una fila real en `Auditoria`** desde la aplicación: la transacción se probó con dobles, no contra la base. La tabla existe y se puede leer, pero que `editarUsuario` guarde bien su registro no se probó de extremo a extremo.
- **No se probó con una sesión real por rol.**
- La bitácora solo registra acciones de usuarios; no audita otros módulos (dictámenes, cargas, borrados). Eso exige una función compartida y acordarlo con sus dueños.
- No hay filtro por rango de fechas en la bitácora.
- Vigencias vencidas y homónimos quedan fuera de calidad: son de Reportes (D-227 y D-229 abiertas) y de Validación.
- No se probó con lector de pantalla ni en otros navegadores.

## 5. Excepciones y decisiones de diseño

- **La bitácora no se edita ni se elimina** (excepción a #59: es un registro histórico).
- **Calidad se filtra, ordena y pagina en memoria** (excepción a «`skip`/`take` con `count`» de D-009): los hallazgos se calculan, no se guardan, y hay uno por registro afectado. Falta confirmarla.
- **«Licencia» no cuenta como baja**: D-246 sobre los estatus sigue pendiente.

## 6. Pendiente para integrar

- Confirmar el cambio de esquema en el chat (D-241) y las dos excepciones anteriores.
- Integrar primero el #263 y cambiar la base de este PR a `main`.
- Revisión visual y de otra persona; decidir qué hacer con `SIN_PERFIL`.
