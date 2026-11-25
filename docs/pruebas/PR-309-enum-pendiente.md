# Revisión del PR #309: valor PENDIENTE en Genero y TipoContratacion (D-261)

Revisión del [PR #309](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/309) de `edelpinovs` (I1). No tiene issue asociado. Es la segunda entrega del flujo de datos reales (D-259 a D-262, [`IMPORTACION_DATOS_REALES.md`](../IMPORTACION_DATOS_REALES.md)), después del PR #308 ya integrado.

| Campo | Valor |
|---|---|
| PR | #309 (sin issue) |
| Autor | @edelpinovs (I1) |
| Rama | `feat/datos-reales-enum-pendiente` → `main` |
| Commit revisado | `c62851d` |
| Fecha de la revisión | 2026-11-24 |
| Revisó | Claude Code, a petición de @edelpinovs (I1) |
| Entorno | Local (Windows 10, Node 24): el PR mezclado con `main` en `eaeaf43`, en una carpeta aparte (`git worktree`), con el cliente de Prisma generado con una URL ficticia. Sin `next dev` y sin navegador |
| Resultado | **Aprobable con comentarios.** El cambio es aditivo y está bien acotado: nadie puede elegir `PENDIENTE` ni forzarlo con un envío manipulado, y cada valor tiene etiqueta. El comentario importante es de **orden de operaciones**, no de código (hallazgo 1) |

**Límite de esta revisión:** el mismo agente escribió el PR y lo revisa, a petición de la misma persona que lo firma en GitHub. No es una revisión independiente y no cumple D-006: el PR sigue necesitando la aprobación de otra persona del equipo.

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `prisma/schema.prisma` | `PENDIENTE` en los enums `Genero` y `TipoContratacion`, con un comentario que lo explica |
| `prisma/migrations/20261125000949_enums_pendiente/migration.sql` | Dos `ALTER TYPE … ADD VALUE 'PENDIENTE'`. Sin `DROP` ni cambios a datos |
| `src/modules/profesores/profesores.ts` | `ETIQUETA_CONTRATACION` incluye `PENDIENTE` (para mostrar); `TIPOS_CONTRATACION` sigue con dos valores (para elegir); `opcionesGenero(actual)` y `opcionesContratacion(actual)` |
| `src/app/profesores/campos-profesor.tsx` | El menú del alta se arma con `TIPOS_CONTRATACION`, no con las etiquetas |
| `src/app/profesores/page.tsx` | Las opciones de edición de cada fila salen de las funciones nuevas |
| `src/modules/reportes/convocatoria.ts` y `src/app/reportes/convocatoria/page.tsx` | `ETIQUETA_GENERO` con `PENDIENTE`; el filtro de género lo acepta y la pantalla lo ofrece |
| `src/modules/reconocimientos/prodep.ts` y `formulario-campos.tsx` | Mensaje propio cuando la contratación está pendiente; tipo ampliado |
| `src/modules/cuerpos-academicos/integrantes.ts` | Mensaje propio para el mismo caso; tipo ampliado |
| Pruebas | `profesores.test.ts`, `prodep.test.ts`, `integrantes.test.ts`, `convocatoria.test.ts` (7 pruebas nuevas) |
| Documentos | `DECISIONES.md` (estado de D-261) e `IMPORTACION_DATOS_REALES.md` |

La migración **ya está aplicada** en la base compartida (el autor la aplicó con `npm run db:migrar`; antes `prisma migrate status` mostraba solo esa como pendiente).

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` (PR mezclado con `main`) | Correcto: 119 archivos, 1394 pruebas |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto |
| CI de GitHub (`verificar`, que además corre `npm run build`) y vista previa de Vercel | Correctos (`verificar` en 2 min 24 s) |
| Mezcla con `main` | Sin conflictos. `schema.prisma` no cambió en `main` desde que salió la rama. GitHub la marca `MERGEABLE`; `BLOCKED` es la aprobación pendiente |
| SQL de la migración | Revisado a mano: solo agrega dos valores |
| `npm run build` local | **No lo corrí** (lo cubre el CI) |

## 3. Lo que se leyó y está bien

- **La migración es aditiva.** Dos `ADD VALUE`, sin borrados ni cambios a los datos que ya hay.
- **El servidor es la protección, no el formulario.** El alta (`crearProfesor`) y la edición (`editarProfesor`) validan con el mismo `registrarProfesor.safeParse` (`actions.ts`, líneas 145 y 197). Con `PENDIENTE` manipulado devuelven «Selecciona un género.» o «Selecciona el tipo de contratación.», con su campo marcado, y no escriben (R2 y R3).
- **«Elegir» y «mostrar» están separados.** `TIPOS_CONTRATACION` (2 valores) alimenta el menú del alta y a Zod; `ETIQUETA_CONTRATACION` (3) solo sirve para mostrar. El HTML real del alta no contiene `PENDIENTE` (R1).
- **El select de edición no miente.** Solo quien ya tiene `PENDIENTE` ve esa opción. Sin eso, un `<select>` cuyo valor guardado no está entre sus opciones muestra la primera y, al guardar otro campo, escribiría un valor falso sin que nadie lo note (R6).
- **Ningún valor queda sin etiqueta.** Cada valor de los enums generados por Prisma tiene texto en ambos mapas, así que ninguna pantalla muestra «undefined» (R4).
- **Reportes.** En el reporte de convocatoria, `PENDIENTE` es un grupo aparte y filtrable; no se suma a Masculino ni Femenino y no falsea los totales por género.
- **Búsqueda libre.** Escribir «pendiente» en el listado de Profesores encuentra la contratación pendiente (R5).
- **PRODEP y Cuerpos Académicos** siguen exigiendo tiempo completo; solo cambia el mensaje, que ahora dice que falta registrar la contratación.
- **El compilador guió el cambio.** Al ampliar los enums, `tsc` obligó a revisar cada consumidor. Además, `src/lib` y `src/components` no usan estos campos.
- **Permisos:** no se tocó ningún `requireModulo`.
- **Mensajes en español** en todo lo nuevo, con su prueba.

## 4. Pruebas de revisión

Archivo temporal `src/app/profesores/revision-309.test.tsx`, que se borró después (el código está al final). Las 8 pasan.

| # | Qué comprueba | Resultado |
|---|---|---|
| R1 | El HTML del formulario de alta no contiene `PENDIENTE`/`Pendiente`; ofrece `TIEMPO_COMPLETO` y `ASIGNATURA` y solo dos radios de género | Pasa |
| R2 | `editarProfesor` con género `PENDIENTE` o contratación `PENDIENTE` devuelve el mensaje en español con su campo y **no llama** a `prisma.profesor.update` | Pasa (2 pruebas) |
| R3 | `crearProfesor` con `PENDIENTE` en cualquiera de los dos campos devuelve el mensaje y **no llama** a `create` | Pasa |
| R4 | Cada valor de `Genero` y de `TipoContratacion` (los enums generados) tiene etiqueta | Pasa (2 pruebas) |
| R5 | La búsqueda «pendiente» genera la condición `tipoContratacion in ["PENDIENTE"]` | Pasa |
| R6 | Con las opciones de la página, quien tiene `PENDIENTE` lo ve seleccionado; quien tiene un valor real no ve `PENDIENTE` | Pasa. Replica la estructura del `<select>` de `FilaEditable`, no monta el componente |

## 5. Hallazgos

| # | Tipo | Hallazgo | Qué hacer |
|---|---|---|---|
| 1 | Importante (orden) | La migración **ya está en la base compartida** y el cargador (#310) creará filas con `PENDIENTE`. Un valor de enum que el cliente de Prisma no conoce hace fallar la lectura de esa fila (comportamiento conocido de Prisma; **no lo reproduje**). Quien siga con código anterior a este PR, o sin haber corrido `npx prisma generate`, vería errores en Profesores, Reportes y Cuerpos Académicos, y lo mismo las vistas previas de Vercel de otros PR | Integrar este PR en `main` y avisar al equipo (`git pull` y `npx prisma generate`) **antes** de ejecutar `npm run importar:aplicar`. Nada se rompe mientras no exista una fila con `PENDIENTE` |
| 2 | Menor | Quien guarda una edición sin cambiar un campo pendiente ve «Selecciona un género.» mientras el select muestra «Pendiente». Es correcto, pero la persona puede no entender qué se le pide | Opcional: un mensaje más específico («Elige un género: Pendiente no es un valor válido.») |
| 3 | Observación | Quien tiene la contratación pendiente no cuenta como tiempo completo en PRODEP, Cuerpos Académicos ni en las cifras de tiempo completo de los reportes. Es el efecto buscado (D-261), pero esas cifras **subestiman** hasta que se complete cada registro | Avisar al cliente al entregar cifras mientras queden pendientes |
| 4 | Observación | Editar a alguien con un valor pendiente obliga a elegir un valor real de lo que esté pendiente, aunque solo se quiera cambiar otro campo (se revalida todo el formulario). Está documentado y es intencional | Sin acción |

## 6. Lo que no se probó

- **Las pantallas en el navegador** (claro, oscuro y celular): el listado de Profesores con una fila `PENDIENTE`, el select de edición abierto y el filtro de género del reporte. Solo hay pruebas de reglas y del HTML del alta.
- **Una inserción real con `PENDIENTE`:** la migración está aplicada y la simulación del #310 lo confirma, pero nadie ha creado todavía una fila con ese valor.
- **Leer una fila `PENDIENTE` con un cliente de Prisma anterior** (el riesgo del hallazgo 1).
- `npm run build` en local (el CI sí lo corrió).

## 7. Dictamen

**Aprobable con comentarios.** Puede integrarse. Antes de ejecutar el cargador hay que cumplir el hallazgo 1. Los hallazgos 2 a 4 no bloquean. Falta la aprobación de otra persona (D-006).

<details>
<summary>Código de las pruebas de revisión (temporal, no se sube)</summary>

```tsx
// Pruebas de revisión del PR #309 (temporal; no se sube).
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Genero, TipoContratacion } from "@/generated/prisma/enums";
import { analizarListado } from "@/lib/listados/consulta";
import { ETIQUETA_CONTRATACION, opcionesContratacion, opcionesGenero } from "@/modules/profesores/profesores";
import { filtroProfesores, listadoProfesores } from "@/modules/profesores/profesores-listado";
import { ETIQUETA_GENERO } from "@/modules/reportes/convocatoria";
import { crearProfesor, editarProfesor } from "./actions";
import { CamposProfesor } from "./campos-profesor";

const dobles = vi.hoisted(() => ({
  requireModulo: vi.fn(),
  revalidatePath: vi.fn(),
  profesor: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
}));
vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("@/lib/prisma", () => ({ prisma: dobles }));
vi.mock("next/cache", () => ({ revalidatePath: dobles.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), RedirectType: { replace: "replace" } }));

function formulario(extra: Record<string, string> = {}) {
  const datos = new FormData();
  const base: Record<string, string> = {
    id: "5", codigo: "PEND0001", nombres: "Persona", apellidos: "Ficticia", correo: "pend-0001@pendiente.invalid",
    genero: "F", tipoContratacion: "TIEMPO_COMPLETO", estatusLaboral: "ACTIVO", ...extra,
  };
  for (const [clave, valor] of Object.entries(base)) datos.set(clave, valor);
  return datos;
}

beforeEach(() => {
  vi.resetAllMocks();
  dobles.requireModulo.mockResolvedValue({ rol: "ADMINISTRADOR" });
  dobles.profesor.findMany.mockResolvedValue([]);
  dobles.profesor.findUnique.mockResolvedValue({ id: 5 });
  dobles.profesor.create.mockResolvedValue({ id: 1 });
  dobles.profesor.update.mockResolvedValue({ id: 5 });
});

describe("R1 · el formulario de alta no ofrece PENDIENTE", () => {
  const html = renderToStaticMarkup(<CamposProfesor grados={[]} departamentos={[]} valor={() => ""} />);
  it("ni en género ni en tipo de contratación", () => {
    expect(html).not.toMatch(/PENDIENTE|Pendiente/);
    expect(html).toContain('value="TIEMPO_COMPLETO"');
    expect(html).toContain('value="ASIGNATURA"');
    expect(html.match(/name="genero"/g)).toHaveLength(2);
  });
});

describe("R2 · una edición manipulada con PENDIENTE no se guarda", () => {
  it("género PENDIENTE", async () => {
    const r = await editarProfesor({}, formulario({ genero: "PENDIENTE" }));
    expect(r).toMatchObject({ error: "Selecciona un género.", campo: "genero" });
    expect(dobles.profesor.update).not.toHaveBeenCalled();
  });
  it("contratación PENDIENTE", async () => {
    const r = await editarProfesor({}, formulario({ tipoContratacion: "PENDIENTE" }));
    expect(r).toMatchObject({ error: "Selecciona el tipo de contratación.", campo: "tipoContratacion" });
    expect(dobles.profesor.update).not.toHaveBeenCalled();
  });
});

describe("R3 · un alta manipulada con PENDIENTE no crea", () => {
  it("rechaza ambos campos", async () => {
    expect((await crearProfesor({}, formulario({ genero: "PENDIENTE" }))).error).toBe("Selecciona un género.");
    expect((await crearProfesor({}, formulario({ tipoContratacion: "PENDIENTE" }))).error).toBe("Selecciona el tipo de contratación.");
    expect(dobles.profesor.create).not.toHaveBeenCalled();
  });
});

describe("R4 · cada valor del enum de Prisma tiene etiqueta (si no, la pantalla mostraría «undefined»)", () => {
  it("contratación", () => {
    for (const valor of Object.values(TipoContratacion)) expect(ETIQUETA_CONTRATACION[valor]).toBeTruthy();
  });
  it("género", () => {
    for (const valor of Object.values(Genero)) expect(ETIQUETA_GENERO[valor]).toBeTruthy();
  });
});

describe("R5 · la búsqueda libre encuentra lo pendiente", () => {
  it("«pendiente» busca contratación PENDIENTE", () => {
    const { consulta } = analizarListado(listadoProfesores([], []), { q: "pendiente" });
    expect(JSON.stringify(filtroProfesores(consulta))).toContain('"tipoContratacion":{"in":["PENDIENTE"]}');
  });
});

describe("R6 · el select de edición puede reflejar lo guardado", () => {
  // Misma estructura que `Edicion` en fila-editable.tsx: <select defaultValue> con las opciones de la página.
  const select = (opciones: { valor: string; texto: string }[], valor: string) =>
    renderToStaticMarkup(
      <select defaultValue={valor}>{opciones.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}</select>,
    );
  it("quien tiene PENDIENTE lo ve seleccionado; quien tiene un valor real no ve PENDIENTE", () => {
    expect(select(opcionesGenero("PENDIENTE"), "PENDIENTE")).toMatch(/<option value="PENDIENTE" selected="">Pendiente<\/option>/);
    expect(select(opcionesContratacion("PENDIENTE"), "PENDIENTE")).toMatch(/value="PENDIENTE" selected=""/);
    expect(select(opcionesGenero("F"), "F")).not.toContain("PENDIENTE");
    expect(select(opcionesContratacion("ASIGNATURA"), "ASIGNATURA")).not.toContain("PENDIENTE");
  });
});
```

</details>
