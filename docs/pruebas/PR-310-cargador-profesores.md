# Revisión del PR #310: cargador de profesores reales con simulación, conteo y limpieza

Revisión del [PR #310](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/310) de `edelpinovs` (I1). No tiene issue asociado. Es la tercera entrega del flujo de datos reales (D-259 a D-262, [`IMPORTACION_DATOS_REALES.md`](../IMPORTACION_DATOS_REALES.md)) y va **apilado sobre el PR #309**: su base es la rama de ese PR y pasa a `main` cuando el #309 se integre.

| Campo | Valor |
|---|---|
| PR | #310 (sin issue) |
| Autor | @edelpinovs (I1) |
| Rama | `feat/datos-reales-cargador` → `feat/datos-reales-enum-pendiente` (luego `main`) |
| Commit revisado | `f28cda0`; el commit posterior `8cbc0f3` solo cambia fechas en documentos |
| Fecha de la revisión | 2026-11-24 |
| Revisó | Claude Code, a petición de @edelpinovs (I1) |
| Entorno | Local (Windows 10, Node 24): el PR mezclado con `main` en `eaeaf43` (incluye el #309), en una carpeta aparte (`git worktree`), con el cliente de Prisma generado con una URL ficticia. Las pruebas con datos reales corrieron en el directorio de trabajo, con los CSV de `datos-reales/` (ignorada por git) y la base compartida solo en lectura. Sin `next dev` y sin navegador |
| Resultado | **Aprobable con comentarios.** La parte pura del cargador está bien probada y, con los datos reales, los 125 registros pasan las reglas del formulario con identificadores únicos. Aún **no debe ejecutarse `importar:aplicar`**: faltan los seis departamentos y el orden de operaciones del hallazgo 1 |

**Límite de esta revisión:** el mismo agente escribió el PR y lo revisa, a petición de la misma persona que lo firma en GitHub. No es una revisión independiente y no cumple D-006: el PR sigue necesitando la aprobación de otra persona del equipo.

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `scripts/importar-profesores.ts` | Comandos `simular`, `aplicar`, `contar` y `limpiar` |
| `scripts/lib/cargar-profesores.ts` | Plan de carga puro: nombres propios, códigos `PEND0001…`, correos `pend-0001@pendiente.invalid`, cruce con departamentos, omisión de quien ya existe y choques de identificadores con la base |
| `scripts/lib/datos-reales.ts` | Localiza los CSV y se niega a leer de una carpeta que git no ignore |
| `scripts/validar-profesores.ts` | Ahora usa la pieza compartida (mismo comportamiento) |
| `scripts/lib/cargar-profesores.test.ts` | 11 pruebas nuevas, con datos ficticios |
| `package.json` | `importar:simular`, `importar:aplicar`, `importar:contar`, `importar:limpiar` |
| Documentos | `IMPORTACION_DATOS_REALES.md` (sección «El cargador», seis departamentos, marcador `PEND0001`), `DECISIONES.md` (D-262, que reemplaza a D-260 solo en el marcador) y `DATOS_DEMO.md` |

Sin cambios de esquema, migración ni dependencias.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` (PR mezclado con `main`, con el #309 incluido) | Correcto: 120 archivos, 1405 pruebas (1394 del #309 más las 11 del cargador) |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto. Cubre `scripts/`, así que valida los nombres de campos y relaciones de las consultas de `aplicar` y `limpiar` |
| CI de GitHub (`verificar`, que además corre `npm run build`) y vista previa de Vercel | Correctos (`verificar` en 2 min 19 s) |
| Mezcla | Sin conflictos. GitHub la marca `MERGEABLE` y `CLEAN` contra la rama del #309 |
| `npm run importar:simular` contra la base real | Funciona y **no escribe**; ver el apartado 4 |
| `npm run build` local | **No lo corrí** (lo cubre el CI) |

## 3. Lo que se leyó y está bien

- **`aplicar` tiene tres guardas antes de escribir:** que la migración de `PENDIENTE` esté en la base, que existan los departamentos (salvo `--sin-departamento`) y la bandera `--confirmo`. Todo va en una transacción.
- **`simular` no escribe.** Solo hace `findMany`, `count` y un `SELECT` sobre los enums. Imprime únicamente conteos; el detalle con nombres va a `datos-reales/plan-carga.md`, que git ignora. Los nombres que sí aparecen en la terminal son de departamentos, no de personas.
- **`limpiar` es conservador.** Borra solo a quien conserva **las dos marcas** (código `PEND` y correo `@pendiente.invalid`) y tiene las once relaciones en `none` (perfil, programas, reconocimientos SNII y PRODEP, cuerpos, liderazgos, LGAC, participaciones, resultados, autorías y cortes). No hay `TRUNCATE` ni borrado sin `WHERE`. Quien ya fue corregido o usado no se toca.
- **El marcador `PEND0001` pasa el formulario.** El código y el correo pendientes cumplen las reglas de Profesores, así que editar a una persona importada no obliga a reemplazarlos (D-262). Hay una prueba en el PR (y se repitió con datos reales, R2).
- **Se puede repetir sin duplicar:** quien ya existe por nombre (sin acentos ni mayúsculas) se omite y la numeración continúa después del `PEND` más alto.
- **Un identificador ya ocupado en la base no se pisa:** la persona se crea con ese campo vacío y queda anotado.
- **Los CSV no salen de la carpeta ignorada:** `leerCsvReales` comprueba con `git check-ignore` antes de leer.
- **Mensajes en español** y en tono sereno; los errores de `aplicar` dicen qué falta y cómo seguir.
- **La validación del #308 no cambió** al pasar a la pieza compartida: sus pruebas siguen pasando.

## 4. Pruebas de revisión

Script temporal `scripts/_revision-310.ts`, que corre el flujo completo sobre los **CSV reales** y se borró después (el código está al final). **Imprime solo conteos y booleanos; ningún nombre ni identificador.**

| # | Qué comprueba | Resultado |
|---|---|---|
| R1 | Con la base vacía, el plan crea 125 registros y **códigos, correos, ORCID, Scholar ID (sin distinguir mayúsculas), Scopus ID y nombres normalizados son únicos** | Correcto: todos únicos |
| R2 | Cada uno de los 125 pasa `registrarProfesor` (las reglas reales del formulario, con género y contratación válidos para aislar los demás campos) | Correcto: **0 fallos** por campo |
| R3 | El formulario no modifica los nombres ya capitalizados | Correcto: 0 cambian |
| R4 | La numeración sigue siendo válida en el límite: `PEND9999` y `PEND10000` y su correo | Correcto |
| R5 | **Idempotencia:** con la base ya cargada, repetir da 0 a crear, 125 omitidas y 0 choques | Correcto |
| R6 | `npm run importar:simular` contra la **base real**: 122 a crear, 3 omitidas (ya existen), 0 choques de identificadores, migración aplicada «sí» y seis departamentos del CSV que no existen en la base | Correcto, y confirma el hallazgo 2 |
| R7 | Muestra manual de la capitalización: «de la», «del», «Ma.» y compuestos salen bien; no queda ninguna palabra en mayúsculas | Correcto |

La diferencia 125 contra 122 es esperada: R1 y R5 usan una base vacía; R6, la real, donde 3 personas ya existían.

## 5. Hallazgos

| # | Tipo | Hallazgo | Qué hacer |
|---|---|---|---|
| 1 | Importante (orden) | Es el hallazgo 1 de la [revisión del #309](PR-309-enum-pendiente.md): el cargador creará filas con `PENDIENTE` en una base que todos usan, y quien tenga código anterior al #309 o no haya corrido `npx prisma generate` vería errores al leer esas filas | Integrar el #309, avisar al equipo y esperar a que actualicen **antes** de `importar:aplicar` |
| 2 | Importante | **Los seis departamentos del CSV no existen en la base** (solo están los de ejemplo). `aplicar` se niega, y con `--sin-departamento` crearía los 122 sin departamento, lo que obligaría a asignarlos uno por uno | Dar de alta los seis departamentos con su división (la define el cliente) y repetir `simular`. No usar `--sin-departamento` |
| 3 | Menor | `aplicar` y `limpiar` **no tienen prueba automática** (escriben en la base compartida) y nunca se han ejecutado. Sus consultas solo están validadas por el compilador | Tras `aplicar`: `npm run importar:contar` (esperado 122) y `npm run importar:simular` (esperado 0 a crear y 125 omitidas). Si algo no cuadra, `npm run importar:limpiar` revierte lo que nadie ha tocado |
| 4 | Observación | Las 3 personas que ya existen en la base **no reciben los identificadores del CSV** (ORCID, Scholar, Scopus): el cargador solo crea | Capturarlos al editar, o ampliar el cargador a completar vacíos en otro PR |
| 5 | Observación | Algunos apellidos vienen sin acento en el CSV original y se conservan tal cual | Revisarlo con el cliente junto con las incidencias de la validación |
| 6 | Observación | El PR está apilado: no integrarlo antes que el #309 | Integrar primero el #309; GitHub reorienta este a `main` |
| 7 | Menor (corregido) | El texto del PR decía 10 pruebas nuevas y son 11 (se agregó una con el cambio de marcador) | Corregido en la descripción del PR |

## 6. Lo que no se probó

- **`aplicar` y `limpiar` contra la base real.** Se valida la forma de las consultas con el compilador y el plan con `simular`, pero ninguna escritura se ha ejecutado.
- **Crear una fila con `PENDIENTE` en la base** y leerla desde la aplicación (listado, edición, reportes).
- **El flujo completo en el navegador** después de cargar: editar a una persona importada para completar género y contratación.
- `npm run build` en local (el CI sí lo corrió).

## 7. Dictamen

**Aprobable con comentarios.** El código puede integrarse después del #309. **No ejecutar `importar:aplicar` todavía:** primero el hallazgo 1 (integrar el #309 y avisar) y el hallazgo 2 (dar de alta los seis departamentos). Falta la aprobación de otra persona (D-006).

<details>
<summary>Código del script de revisión (temporal, no se sube)</summary>

```ts
// Temporal de revisión del PR #310 (no se sube). Solo imprime conteos, nunca nombres.
import { leerCsvReales } from "./lib/datos-reales";
import { validarProfesores } from "./lib/importar-profesores";
import { prepararCarga, codigoPendiente, correoPendiente } from "./lib/cargar-profesores";
import { registrarProfesor } from "../src/modules/profesores/profesores";

const csv = leerCsvReales();
const v = validarProfesores({ completo: csv.completo, scopus: csv.scopus });
const plan = prepararCarga(v.importables, { departamentos: [], profesores: [] });

const unicos = (valores: (string | null)[]) => {
  const reales = valores.filter((x): x is string => Boolean(x));
  return reales.length === new Set(reales.map((x) => x.toLowerCase())).size;
};
console.log("a crear:", plan.cargar.length);
console.log("códigos únicos:", unicos(plan.cargar.map((p) => p.codigo)));
console.log("correos únicos:", unicos(plan.cargar.map((p) => p.correo)));
console.log("orcid únicos:", unicos(plan.cargar.map((p) => p.orcid)));
console.log("scholar únicos (sin distinguir mayúsculas):", unicos(plan.cargar.map((p) => p.scholarId)));
console.log("scopus únicos:", unicos(plan.cargar.map((p) => p.scopusId)));
console.log("nombres normalizados únicos:", unicos(plan.cargar.map((p) => p.nombreNormalizado)));

// Cada registro, pasado por las reglas del formulario de Profesores (con valores reales de género y contratación,
// para aislar los demás campos). Si alguno falla, editar a esa persona quedaría bloqueado.
const fallos: Record<string, number> = {};
for (const p of plan.cargar) {
  const r = registrarProfesor.safeParse({
    codigo: p.codigo, correo: p.correo, nombres: p.nombres, apellidos: p.apellidos,
    genero: "F", tipoContratacion: "TIEMPO_COMPLETO", estatusLaboral: "ACTIVO",
    orcid: p.orcid ?? "", scholarId: p.scholarId ?? "", scopusId: p.scopusId ?? "",
  });
  if (!r.success) for (const i of r.error.issues) fallos[String(i.path[0])] = (fallos[String(i.path[0])] ?? 0) + 1;
}
console.log("registros que NO pasan el formulario, por campo:", JSON.stringify(fallos));

// Los nombres ya capitalizados no deben cambiar al pasar por el formulario (que solo pone mayúscula inicial).
const cambian = plan.cargar.filter((p) => {
  const r = registrarProfesor.safeParse({ codigo: p.codigo, correo: p.correo, nombres: p.nombres, apellidos: p.apellidos, genero: "F", tipoContratacion: "TIEMPO_COMPLETO", estatusLaboral: "ACTIVO" });
  return r.success && (r.data.nombres !== p.nombres || r.data.apellidos !== p.apellidos);
}).length;
console.log("nombres que el formulario modificaría:", cambian);

// Límites de numeración.
console.log("PEND0001/PEND9999/PEND10000:", codigoPendiente(1), codigoPendiente(9999), codigoPendiente(10000), correoPendiente(10000));

// Idempotencia: si la base ya tuviera lo creado, repetir no crea nada y no repite numeración.
const base = { departamentos: [], profesores: plan.cargar.map((p) => ({ codigo: p.codigo, nombreNormalizado: p.nombreNormalizado, orcid: p.orcid, scholarId: p.scholarId, scopusId: p.scopusId })) };
const otra = prepararCarga(v.importables, base);
console.log("segunda corrida → a crear:", otra.cargar.length, "omitidas:", otra.omitidos.length, "choques:", otra.ajustes.length);
```

Salida: `a crear: 125`, todos los «únicos» en `true`, `{}` fallos del formulario, `0` nombres modificados, `PEND0001 PEND9999 PEND10000 pend-10000@pendiente.invalid` y `segunda corrida → a crear: 0 omitidas: 125 choques: 0`.

</details>
