# Revisión del PR #322: no busca publicaciones de profesores inactivos (#259)

Revisión del [PR #322](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/322) de `irybyron` (I6, responsable del módulo Producción), rama `feat/M6-RF-020-profesor-inactivo-259` → `main`. Lleva `Closes #259` («Producción: opción “inactivo” al registrar o modificar») y agrega la decisión D-272.

| Campo | Valor |
|---|---|
| PR | #322 · issue #259 · decisión D-272 |
| Autor | @irybyron |
| Commit revisado | `c7ab825` (sobre `main` con el #319 ya integrado) |
| Fecha de la revisión | 2026-11-25 |
| Revisó | Claude Code, a petición de @edelpinovs (I1) |
| Entorno | Local (Windows 10, Node 24): el PR en una carpeta aparte (`git worktree`) con el cliente de Prisma generado. Sin base de datos, sin `next dev` y sin navegador (la interfaz no cambia) |
| Resultado | **Aprobable con comentarios.** El cambio de código es pequeño, correcto y probado. El punto a resolver es de proceso: D-272 cierra como «vigente» una duda que el issue mandaba aclarar antes de empezar |

Esta revisión la hace un agente que trabaja para I1 sobre código de otra persona; aun así no sustituye la aprobación de otra persona del equipo (D-006).

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `src/app/produccion/repositorio.ts` | `obtenerProfesores` exige `estatusLaboral: "ACTIVO"` también cuando se pide un profesor por su id (antes, con id, no filtraba el estatus) |
| `src/app/produccion/repositorio.test.ts` | Dos pruebas: a «todos» solo se piden los activos, y por id se piden activos con ese id |
| `docs/DECISIONES.md` | D-272 (nueva) y D-251 pasa a «resuelta en D-272» |

Tres archivos, +23 / −4 líneas. Sin cambios de esquema, migración, dependencias ni `src/components/`, `src/lib/` o `prisma/`.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 123 archivos, **1456 pruebas** (coincide con la descripción del PR) |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto |
| CI de GitHub (`verificar`) y vista previa de Vercel | Correctos |
| Mezcla con `main` | Sin conflictos (`MERGEABLE`); `main` ya está contenido en la rama |
| `npm run build` local | **No lo corrí** (lo cubre el CI) |

## 3. Lo que se leyó y está bien

- **El hueco era real y el arreglo es mínimo.** Hasta ahora solo `crearTrabajoEscaneo` filtraba por estatus al crear el lote. Un profesor dado de baja **después** de crear el lote seguía escaneándose, porque con `profesorId` el filtro era solo `{ id }`. Ahora el filtro es `{ estatusLaboral: "ACTIVO", id }`.
- **La defensa queda en dos capas:** al crear el trabajo (el servidor rechaza el id de un inactivo con «El profesor no está disponible para escanear.») y al procesar cada profesor del lote.
- **Lo que ya se cumplía** se verificó en el código: el selector de Escanear lista solo activos y `crearTrabajoEscaneo` rechaza al inactivo.
- **Las publicaciones ya guardadas se conservan** y la pantalla de Publicaciones no depende del estatus: el cambio solo toca qué profesores se consultan.
- **Sin esquema:** reutiliza `estatusLaboral`, que ya se elige al registrar y modificar (`ESTATUS_LABORALES`, con «Selecciona el estatus laboral.» en español).
- **La decisión sigue la regla de la bitácora:** D-251 no se edita salvo su estado, y la nueva D-272 enlaza al issue.

## 4. Pruebas de revisión

Prueba temporal en la carpeta aparte (se borró después, no se sube): un lote con el profesor 7 que ya no está activo, es decir, `obtenerProfesores` devuelve una lista vacía.

| Qué comprueba | Resultado |
|---|---|
| `ejecutarEscaneo` con un profesor que ya no es activo | No falla: devuelve el resumen vacío, sin errores y con 0 profesores procesados |
| `avanzarLote` con ese resultado | El índice avanza de 0 a 1; sin errores; el lote sigue con el siguiente profesor y termina normalmente |
| Las dos pruebas nuevas del PR junto con las del repositorio | Correctas (15 pruebas) |

Es decir, quien causó baja se **omite sin detener ni marcar como fallido** el lote, como dice la descripción del PR.

## 5. Hallazgos

| # | Tipo | Hallazgo | Qué hacer |
|---|---|---|---|
| 1 | Importante (proceso) | El issue dice «no empezar hasta resolver la duda» y «avisar a I1» (¿«inactivo» es estado de la publicación o del profesor?). D-272 lo resuelve como **«vigente»** con origen «aclarado por @irybyron (I6) en sesión». Es la misma situación que D-271 en el #319: una interpretación de la autora que se registra como acuerdo. La regla de la bitácora dice que lo que solo se propuso va como `pendiente` | Confirmar con I1 (y el cliente si hace falta) y dejar D-272 como `pendiente` hasta entonces; después pasarla a `vigente`. El `Closes #259` puede quedar tal cual |
| 2 | Importante (alcance) | D-272 define «inactivo» como **todo estatus distinto de `ACTIVO`**, lo que incluye **Licencia** y baja temporal. Una persona con licencia sigue publicando, y a partir de este PR deja de consultarse para todas las fuentes. D-246 (pendiente) aún discute qué valores tendrá el estatus (Activo, Licencia y Estancia posdoctoral) y D-233 depende del filtro Activos/Inactivos | Decidir si Licencia y Estancia posdoctoral cuentan como inactivos para el escaneo. Anotarlo en D-272 o relacionarla con D-246 |
| 3 | Menor | El profesor omitido en un lote **no deja rastro**: el resumen no lo cuenta ni avisa, y el avance del historial sube igual («N de M revisados»). Quien lea el resultado verá menos profesores procesados que el total sin saber por qué | Opcional: sumar una nota al resumen («1 profesor omitido porque ya no está activo») |
| 4 | Menor | Las pruebas del PR comprueban el filtro (`where`), no el comportamiento del lote al omitir a alguien. Lo verifiqué con una prueba temporal que pasa | Conservar un caso así en `escaneo.test.ts` o `lotes.test.ts` |
| 5 | Observación | La descripción pide quitar la etiqueta `pendiente` del #259 a una persona, y esa etiqueta pide resolver la duda, que depende del hallazgo 1 | Quitarla solo cuando D-272 quede confirmada |
| 6 | Observación | La descripción no menciona `npm run build` (el CI sí lo corre y pasa) | Anotarlo |

## 6. Lo que no se probó

- El caso en el navegador o con la base: dar de baja a un profesor a mitad de un lote real (lo dice también la descripción). La interfaz no cambia.
- Una búsqueda real contra las fuentes con un lote en curso.
- `npm run build` en local.

## 7. Dictamen

**Aprobable con comentarios.** El código es correcto y está probado. Antes de integrar: confirmar D-272 con I1 (hallazgo 1) y decidir qué pasa con Licencia (hallazgo 2). Falta la aprobación de otra persona del equipo (D-006).
