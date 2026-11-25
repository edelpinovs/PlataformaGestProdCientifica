# Revisión del PR #303: vigencias vencidas y orden natural en Calidad de datos (#278, parcial)

Revisión del [PR #303](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/303) de `edelpinovs` (I1), que avanza el issue [#278](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/278) sin cerrarlo (usa `Refs`). El PR trae su propio registro (`ISSUE-278-calidad-vigencias-y-orden.md`); este documento es la revisión aparte.

| Campo | Valor |
|---|---|
| PR | #303 (`Refs #278`) |
| Autor | @edelpinovs (I1) |
| Rama | `feat/M1-278-calidad-datos` → `main` |
| Commit revisado | `04f519d` |
| Fecha de la revisión | 2026-11-24 |
| Revisó | @edelpinovs (I1), con Claude Code |
| Entorno | Local (Windows 10, Node 24): el PR mezclado con `main` en `3ee62fe` (trae #302), en una carpeta aparte (`git worktree`). Sin base de datos y sin `next dev` |
| Resultado | **Aprobable con comentarios.** No hay código roto y el orden natural está bien; la regla nueva marcaba como vencido cada periodo anterior de quien ya renovó (hallazgo 1). **Los hallazgos 1 y 2 quedaron corregidos en `ff4f389` y `d97e5ab`** (apartados 8 y 9) |

**Límite de esta revisión:** el autor y quien la hace son la misma persona (I1), así que no cumple D-006: el PR sigue necesitando la aprobación de otra persona del equipo.

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `src/modules/administracion/calidad.ts` | Regla `VIGENCIA_VENCIDA` y `hallazgosVigenciasVencidas(filas)`: toma las filas del semáforo de Reportes y reporta las rojas, con enlace a `/reportes?semaforo=ROJO&q=<nombre>`. `ordenarHallazgos` compara con `localeCompare(..., { numeric: true })` |
| `src/app/administracion/calidad/cargar.ts` | Carga `cargarVigencias(["SNII", "PRODEP", "CA"])` junto con profesores y cuerpos, y agrega sus hallazgos |
| `src/modules/administracion/calidad.test.ts` | Pruebas de la regla nueva y del orden natural |
| `docs/pruebas/ISSUE-278-calidad-vigencias-y-orden.md` | Registro del autor |

Sin cambios de esquema, migración ni dependencias. De Reportes solo se importan funciones existentes (`cargarVigencias`, `ETIQUETA_TIPO`, `formatoFecha`); no se editan.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` (PR mezclado con `main`) | Correcto: 117 archivos, 1343 pruebas, las mismas que declara el autor |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto |
| `npm run build` | Correcto |
| CI de GitHub (`verificar`) y vista previa de Vercel | Correctos |
| Mezcla con `main` | La rama no trae #302 (solo documentación); sin conflictos. GitHub la marca `MERGEABLE`; `BLOCKED` es la aprobación pendiente |

## 3. Lo que se leyó y está bien

- **Una sola regla de vencimiento:** el hallazgo usa el `semaforo` que ya calculó Reportes, así que «vencida» significa lo mismo en los dos lugares (R5: lo que vence hoy no es vencida; ayer sí).
- **Claves únicas:** el `id` de la fila lleva el tipo (`snii-…`, `prodep-…`, `ca-…`), así que un SNII, un PRODEP y un cuerpo con el mismo número no chocan como `key` (R3).
- **El enlace funciona:** sin `armado`, `/reportes` incluye todas las distinciones y columnas, y la búsqueda revisa el nombre; la fila vencida aparece con `semaforo=ROJO&q=<nombre>` (R4).
- **Filtro y exportación:** el filtro «Problema» y la descripción de la exportación salen de `REGLAS_CALIDAD`, así que toman la regla nueva sin más cambios.
- **Orden natural:** `UDG-CA-2` antes que `UDG-CA-10` en los dos sentidos, y el desempate por clave sigue estable (R6).
- **Permiso y mensajes:** la página no cambió su `requireModulo("administracion")`; el detalle está en español («SNII (Nivel I) venció el …»).

## 4. Pruebas de revisión

Archivo temporal `src/modules/administracion/revision-303.test.ts`, que se borró después (el código está al final). Las 6 pasan; R1 y R2 **demuestran el hallazgo 1**: pasan porque el comportamiento es el del hallazgo, no porque esté bien.

| # | Qué comprueba | Resultado |
|---|---|---|
| R1 | Una persona con SNII 2019–2022 y SNII vigente 2023–2027 aparece con el periodo anterior como «Vigencia vencida» | Pasa (demuestra el hallazgo 1) |
| R2 | Tres renovaciones PRODEP anteriores y una vigente dan tres hallazgos de la misma persona | Pasa (demuestra el hallazgo 1) |
| R3 | SNII, PRODEP y cuerpo con el mismo id dan tres claves distintas | Pasa |
| R4 | El enlace del hallazgo, aplicado al reporte, devuelve esa fila en rojo | Pasa |
| R5 | Lo que vence hoy no es vencida; lo que venció ayer sí | Pasa |
| R6 | Orden natural con números en el nombre y desempate estable por clave | Pasa |

## 5. Hallazgos

| # | Tipo | Hallazgo | Qué hacer |
|---|---|---|---|
| 1 | Importante | Cada periodo anterior de quien renovó queda para siempre como «Vigencia vencida» (R1, R2). El registro del autor lo menciona como un caso posible de D-227, pero es el caso común: toda renovación SNII o PRODEP deja un hallazgo más, y con los años la lista se llena de historial que no se puede «corregir» (solo borrando el historial, que no se debe). En Reportes un periodo anterior en rojo se puede discutir (eso es D-227); en Calidad, que lista lo que el administrador debe arreglar, no corresponde | Reportar solo si la persona no tiene un periodo posterior del mismo tipo. `FilaVigencia` no trae el `profesorId`, así que hace falta agregarlo en `cargar-vigencias.ts` (módulo de Reportes, de @layon-king: acordarlo) o hacer en Calidad una consulta propia del último periodo por persona y tipo. Si se prefiere esperar a D-227, dejar la regla fuera hasta entonces |
| 2 | Menor | Se reportan vigencias de profesores que ya no están activos (baja, trasladado): `cargarVigencias` no filtra por estatus. Las demás reglas de Calidad ignoran a los no activos («quien está de baja no se escanea ni necesita acceso») | Excluir a los no activos, con el mismo criterio que el resto de las reglas, o explicar en el código por qué aquí sí cuentan |
| 3 | Observación | La página de Calidad y su exportación cargan ahora todas las vigencias en memoria en cada visita. Ya es la excepción a D-009 que el registro del autor justifica | Sin acción; revisarlo si la lista crece |

## 6. Lo que no se probó

- **La pantalla en el navegador** (tema claro, oscuro y celular): el filtro «Problema» con «Vigencia vencida», el detalle y el enlace al reporte. El autor también la dejó pendiente.
- **`cargarVigencias` contra la base real:** las pruebas usan filas armadas con las funciones de Reportes.
- **Cuántos hallazgos da la regla con los datos de demostración** (`npm run db:demo`): sirve para medir el hallazgo 1.

## 7. Dictamen

**Aprobable con comentarios.** El orden natural puede integrarse tal cual. Para la regla de vigencias vencidas se recomienda resolver el hallazgo 1 antes de integrar (o dejarla fuera hasta acordar D-227), porque si no la lista de Calidad crece con cada renovación. El hallazgo 2 es menor. Falta la aprobación de otra persona del equipo (D-006).

## 8. Actualización: hallazgo 1 corregido (`ff4f389`, 2026-11-24)

Se corrigió en la rama del PR, sin tocar el módulo de Reportes:

| Verificación | Resultado |
|---|---|
| Qué cambió | `ultimoPeriodoPorPersona` en `calidad.ts` se queda con el último periodo SNII o PRODEP de cada profesor entre los que entran al semáforo (`cuentaParaSemaforo` de Reportes); un posterior no aprobado no sustituye al anterior. `cargar.ts` lee SNII y PRODEP con `profesorId` y arma las filas con `filaSnii` y `filaProdep` de Reportes; los cuerpos siguen saliendo de `cargarVigencias(["CA"])` |
| Pruebas nuevas | Siete en `calidad.test.ts` y cuatro en `app/administracion/calidad/cargar.test.ts` (Prisma simulado): quien renovó no aparece, quien no renovó o no fue aprobado aparece una vez, SNII y PRODEP se acotan por separado |
| Mis pruebas de revisión sobre `ff4f389` | Las 6 siguen pasando. R1 y R2 llaman directamente a `hallazgosVigenciasVencidas` con todas las filas, y esa función no cambió: la corrección está antes, en la carga, y la cubren las pruebas nuevas de `cargar.test.ts` |
| `npm test` con `main` mezclado | Correcto: 118 archivos, 1354 pruebas |
| `npm run lint`, `npm run typecheck` y `npm run build` | Correctos |

El hallazgo 2 se corrigió después (apartado 9).

## 9. Actualización: hallazgo 2 corregido (`d97e5ab`, 2026-11-24)

| Verificación | Resultado |
|---|---|
| Qué cambió | La carga de SNII y PRODEP filtra `profesor.estatusLaboral = ACTIVO`, con el mismo criterio que las demás reglas de profesores de Calidad. Las vigencias de quien tiene licencia, está de baja o fue trasladado ya no se reportan. Los cuerpos académicos no cambian |
| Prueba nueva | `cargar.test.ts`: las dos consultas llevan el filtro por profesores activos |
| `npm test` con `main` mezclado | Correcto: 118 archivos, 1355 pruebas |
| `npm run lint`, `npm run typecheck` y `npm run build` | Correctos |

Siguen abiertos la revisión de la pantalla en claro, oscuro y celular y la aprobación de otra persona (D-006). Queda por confirmar con el equipo si alguien con **licencia** debe verse aquí (D-246 sigue pendiente sobre los estatus).

<details>
<summary>Código de las pruebas de revisión (apartado 4)</summary>

```ts
import { describe, expect, it } from "vitest";
import { analizarListado } from "@/lib/listados/consulta";
import { filaCuerpo, filaProdep, filaSnii } from "@/modules/reportes/vigencias";
import { analizarReporte, consultarVigencias } from "@/modules/reportes/vigencias";
import { hallazgosVigenciasVencidas, LISTADO_CALIDAD, ordenarHallazgos, type Hallazgo } from "./calidad";

// Pruebas de la revisión del PR #303 (no forman parte del PR).
const hoy = new Date(Date.UTC(2026, 10, 24));
const persona = (id: number, inicio: string, fin: string, extra = {}) => ({
  id, nombres: "Ana", apellidos: "Pérez Ruiz", departamento: "Ciencias", resultado: "APROBADO",
  inicio: new Date(`${inicio}T00:00:00Z`), fin: new Date(`${fin}T00:00:00Z`), ...extra,
});

describe("revisión PR #303", () => {
  it("R1 una persona que renovó su SNII aparece con el periodo anterior como vencido (hallazgo 1)", () => {
    const filas = [
      filaSnii({ ...persona(1, "2019-01-01", "2022-12-31"), nivel: "NIVEL_I" }, hoy),
      filaSnii({ ...persona(2, "2023-01-01", "2027-12-31"), nivel: "NIVEL_I" }, hoy),
    ];
    const h = hallazgosVigenciasVencidas(filas);
    expect(h).toHaveLength(1);
    expect(h[0].registro).toBe("Ana Pérez Ruiz");
  });

  it("R2 cada renovación deja un hallazgo más: tres periodos anteriores dan tres hallazgos de la misma persona", () => {
    const filas = ["2010", "2014", "2018"].map((a, i) =>
      filaProdep({ ...persona(i + 1, `${a}-01-01`, `${Number(a) + 3}-12-31`), tipoSolicitud: "RENOVACION" }, hoy));
    filas.push(filaProdep({ ...persona(9, "2024-01-01", "2029-12-31"), tipoSolicitud: "RENOVACION" }, hoy));
    expect(hallazgosVigenciasVencidas(filas)).toHaveLength(3);
  });

  it("R3 las claves son únicas aunque SNII y PRODEP tengan el mismo id", () => {
    const filas = [
      filaSnii({ ...persona(5, "2019-01-01", "2020-12-31"), nivel: "NIVEL_I" }, hoy),
      filaProdep({ ...persona(5, "2019-01-01", "2020-12-31"), tipoSolicitud: "PRIMERA_VEZ" }, hoy),
      filaCuerpo({ id: 5, clave: "UDG-CA-5", nombre: "Cuerpo", nivel: "EN_FORMACION", anioRegistro: 2018, anioVencimiento: 2021, departamento: "Ciencias" }, hoy),
    ];
    const claves = hallazgosVigenciasVencidas(filas).map((x) => x.clave);
    expect(new Set(claves).size).toBe(3);
  });

  it("R4 el enlace abre el reporte con esa persona en rojo (sin `armado`, el reporte trae todas las distinciones)", () => {
    const fila = filaSnii({ ...persona(1, "2019-01-01", "2022-12-31"), nivel: "NIVEL_I" }, hoy);
    const [h] = hallazgosVigenciasVencidas([fila]);
    const parametros = Object.fromEntries(new URL(h.enlace, "http://x").searchParams);
    const { filas } = consultarVigencias([fila], analizarReporte(parametros));
    expect(filas.map((f) => f.id)).toEqual([fila.id]);
  });

  it("R5 una vigencia que vence hoy no es vencida; ayer sí", () => {
    const vence = (fin: string) => filaSnii({ ...persona(1, "2020-01-01", fin), nivel: "NIVEL_I" }, hoy);
    expect(hallazgosVigenciasVencidas([vence("2026-11-24")])).toEqual([]);
    expect(hallazgosVigenciasVencidas([vence("2026-11-23")])).toHaveLength(1);
  });

  it("R6 el orden natural también se aplica a nombres con números y no rompe el desempate", () => {
    const h = (registro: string, clave: string): Hallazgo =>
      ({ clave, regla: "VIGENCIA_VENCIDA", severidad: "aviso", registro, detalle: "", enlace: "" });
    const lista = [h("Persona 10", "b"), h("Persona 9", "a"), h("Persona 9", "c")];
    const asc = analizarListado(LISTADO_CALIDAD, { orden: "registro", dir: "asc" }).consulta;
    expect(ordenarHallazgos(lista, asc).map((x) => `${x.registro}/${x.clave}`)).toEqual(["Persona 9/a", "Persona 9/c", "Persona 10/b"]);
  });
});
```

</details>
