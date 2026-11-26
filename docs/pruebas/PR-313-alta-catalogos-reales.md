# Revisión del PR #313: alta de las divisiones y departamentos reales (D-263 a D-268)

Revisión del [PR #313](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/313) de `edelpinovs` (I1). No tiene issue asociado. Es la cuarta entrega del flujo de datos reales (D-259 a D-262, [`IMPORTACION_DATOS_REALES.md`](../IMPORTACION_DATOS_REALES.md)): un comando que da de alta las divisiones y los departamentos que el cargador de profesores necesita. Va **apilado sobre el [#312](PR-312-tabla-departamentos.md)**: su base es `docs/divisiones-datos-reales` y pasa a `main` cuando el #312 se integre.

| Campo | Valor |
|---|---|
| PR | #313 (sin issue) |
| Autor | @edelpinovs (I1) |
| Rama | `feat/datos-reales-catalogos` → `docs/divisiones-datos-reales` (luego `main`) |
| Commit revisado | `2ac0919` (el PR trae tres commits: `3ba86f8`, `454abcc` y `2ac0919`; durante la revisión se subió el tercero y se repitió todo sobre él) |
| Fecha de la revisión | 2026-11-24 |
| Revisó | Claude Code, a petición de @edelpinovs (I1) |
| Entorno | Local (Windows 10, Node 24): el commit `2ac0919` en una carpeta aparte (`git worktree`) con el cliente de Prisma ya generado. `importar:catalogos:simular` contra la base compartida, solo en lectura. Sin `next dev` y sin navegador |
| Resultado | **Aprobable con comentarios.** El plan de alta es puro, está probado y reutiliza las reglas de las pantallas. **No ejecutar la segunda alta** hasta confirmar el nombre y la clave de CUCEA y las tres nomenclaturas propuestas (D-268). La descripción del PR quedó desactualizada |

**Límite de esta revisión:** el mismo agente escribió el PR y lo revisa, a petición de la misma persona que lo firma en GitHub. No es una revisión independiente y no cumple D-006: el PR sigue necesitando la aprobación de otra persona del equipo.

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `scripts/alta-catalogos-reales.ts` | Comandos `simular` y `aplicar` (con `--confirmo`); lee la base, arma el plan y escribe en una transacción |
| `scripts/lib/catalogos-reales.ts` | Definiciones reales (4 divisiones y 6 departamentos) y `planearCatalogos`, función pura |
| `scripts/lib/catalogos-reales.test.ts` | Pruebas del plan y de la compatibilidad con el cargador de profesores |
| `package.json` | `importar:catalogos:simular` y `importar:catalogos:aplicar` |
| Documentos | `IMPORTACION_DATOS_REALES.md` (tablas de divisiones y departamentos, sección «Alta de lo confirmado»), `DECISIONES.md` (D-263 a D-268) y `SEGUIMIENTO.md` |

Sin cambios de esquema, migración ni dependencias. No toca `src/`.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` en `2ac0919` | Correcto: 121 archivos, **1416 pruebas** (en `454abcc` fueron 1414) |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto. Cubre `scripts/`, así que valida los campos de `division.create` y `departamento.create` |
| CI de GitHub (`verificar`) y vista previa de Vercel | Correctos (el CI corrió sobre `454abcc`; el commit `2ac0919` es posterior) |
| Mezcla | Sin conflictos con su base (`MERGEABLE`) |
| `npm run importar:catalogos:simular` contra la base real | Funciona y **no escribe**; ver el apartado 4 |
| `npm run build` local | **No lo corrí** (lo cubre el CI) |

## 3. Lo que se leyó y está bien

- **Solo crea.** Nunca edita ni borra; no hay `DELETE`, `TRUNCATE` ni `UPDATE`. Lo que se cree se corrige o se elimina desde las pantallas del catálogo.
- **Tres guardas antes de escribir:** sin conflictos, algo por crear y la bandera `--confirmo`. Todo va en una transacción: si falla una fila no queda nada a medias.
- **Reutiliza las reglas de las pantallas.** Valida con `division` y `departamento`, y detecta duplicados con `buscarDuplicada` y `revisarDepartamento` del catálogo. Una clave, un nombre o una nomenclatura en uso es un conflicto y **no se escribe nada**.
- **Se puede repetir sin duplicar,** aunque cambien mayúsculas y acentos (hay prueba).
- **Un departamento con el mismo nombre en otra división es un conflicto:** el cargador de profesores cruza por nombre y quedaría ambiguo.
- **Los nombres coinciden con el CSV:** una prueba pasa los seis nombres por `prepararCarga` y comprueba que ninguno queda «faltante». Una segunda prueba fija que el listado queda cubierto con nombres exactos.
- **Pruebas con datos ficticios.** Los nombres de departamento y las claves son del catálogo, no de personas. Nada de datos personales en el PR.
- **Mensajes en español** y los errores dicen cómo seguir. Usa `DIRECT_URL` del `.env` sin imprimirla.
- **La bitácora respeta la regla de «una decisión no se edita»:** D-264 y D-266 pasan a «reemplazada» con las nuevas (D-265, D-267, D-268) y D-268 queda como `pendiente`.

## 4. Pruebas de revisión

`npm run importar:catalogos:simular` contra la base compartida (solo lectura), con el commit `2ac0919`:

| Qué comprueba | Resultado |
|---|---|
| Las tres divisiones de la primera alta (D-265) existen | Sí: «3 divisiones que ya existen» |
| Los tres departamentos de la primera alta existen | Sí: «3 departamentos que ya existen» |
| Lo que crearía una segunda alta | **1 división (CUCEA, `EA`) y 3 departamentos** (`DCNE`, `DCEA`, `DCSH`), sin conflictos |
| Escritura | Ninguna («Simulación: no se escribió nada en la base») |

Con `454abcc` (el commit anterior) la misma simulación daba 0 por crear, lo que concuerda con D-265 («una segunda simulación no encontró nada por crear»).

## 5. Hallazgos

| # | Tipo | Hallazgo | Qué hacer |
|---|---|---|---|
| 1 | Importante | **La descripción del PR está desactualizada.** Dice «No escribe nada en la base», que `aplicar` «no se ha ejecutado nunca», 3 divisiones y 3 departamentos, 9 pruebas y 1414 pasan, y cita D-263 y D-264. Pero el commit `454abcc` ya aplicó la primera alta en la base compartida (D-265) y `2ac0919` define 4 divisiones, 6 departamentos y D-267 y D-268; ahora son 1416 pruebas | Reescribir la descripción: la primera alta ya se aplicó (con fecha), lo que queda por aplicar es CUCEA y tres departamentos, y la prueba de simulación de arriba |
| 2 | Importante (antes de aplicar) | La **segunda alta no debe ejecutarse todavía**: el nombre y la clave de CUCEA (`EA`) y las nomenclaturas `DCNE`, `DCEA` y `DCSH` son propuestas nuestras, no del cliente (D-268, pendiente). Una vez creadas, un error de clave o nombre se corrige con Editar, pero cambiaría lo que ve el equipo | Confirmar con el cliente o el equipo y marcar D-268 como vigente; luego `simular` y `aplicar -- --confirmo` |
| 3 | Observación (proceso) | La primera alta se aplicó a la base compartida **antes** de que otra persona revisara el PR, desde una rama sin integrar. Está documentado (D-265) y es de solo creación, pero la regla del equipo es que un PR lo aprueba otra persona antes de integrarse | Dejarlo anotado. Para la segunda alta, esperar al menos la aprobación del #313 o avisar al equipo en el chat |
| 4 | Menor | `aplicar` **no tiene prueba automática** (escribe en la base compartida). Las consultas solo están validadas por el compilador y por la primera alta, que salió bien | Tras la segunda alta: `npm run importar:catalogos:simular` (esperado: 0 por crear, 4 divisiones y 6 departamentos existentes) |
| 5 | Observación | El PR está apilado: el #313 reescribe la tabla que añade el #312 | Integrar primero el #312; GitHub reorienta este a `main` |
| 6 | Observación | El CI corrió sobre `454abcc`, no sobre `2ac0919` (se subió después) | Esperar a que el CI termine sobre el último commit antes de integrar |
| 7 | Observación | Otra persona del equipo que use la base verá divisiones y departamentos nuevos en los catálogos; los ejemplos `DEP-A1…` y `DIV-A…` siguen ahí | Avisar al equipo cuando se haga la segunda alta; decidir después si se limpian los de ejemplo |

## 6. Lo que no se probó

- **`aplicar` de la segunda alta.** Solo se simuló. La primera se ejecutó y la simulación posterior concuerda.
- **Los catálogos en el navegador** (Divisiones y Departamentos) con las filas nuevas, en claro, oscuro y celular.
- **Concurrencia:** dos personas ejecutando `aplicar` a la vez. La clave única de la base haría fallar y revertir la transacción de la segunda, pero no se probó.
- `npm run build` en local (el CI sí lo corrió sobre el commit anterior).

## 7. Dictamen

**Aprobable con comentarios.** El código puede integrarse después del #312. Antes: actualizar la descripción (hallazgo 1). **No ejecutar la segunda alta** hasta cerrar D-268 (hallazgo 2). Falta la aprobación de otra persona (D-006).
