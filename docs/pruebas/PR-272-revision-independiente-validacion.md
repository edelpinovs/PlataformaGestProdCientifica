# Revisión del PR #272: Validación, alta manual de publicaciones en modal con selector de profesor (RF-023, D-214, D-215)

Revisión independiente del [PR #272](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/272) de `yanetzijimeno8297` (I7, dueña del módulo Validación), que cierra el issue [#187](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/187). El PR trae su propio registro (`PR-187-modal-alta-validacion.md`), que es la prueba de quien lo preparó; este documento es la revisión aparte.

| Campo | Valor |
|---|---|
| PR | #272 (`Closes #187`) |
| Autor | @yanetzijimeno8297 (I7) |
| Rama | `feat/M7-RF-023-modal-alta-validacion` → `main` |
| Commit revisado | `3baf961` |
| Fecha de la revisión | 2026-11-23 |
| Revisó | Edel Pino (con Claude Code) |
| Entorno | Local (Windows 10, Node 24), copia aislada de la rama (`git worktree`) con `npm ci`, `prisma generate` y las variables de relleno del CI. Sin base de datos y sin `next dev` |
| Resultado | **Aprobable con comentarios.** Hay un conflicto con `main` en `src/app/validacion/page.tsx` y seis puntos menores; ninguno es de código roto |

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `src/app/validacion/registrar-publicacion-modal.tsx` | Nuevo componente cliente: `ModalAlta` con `SelectorProfesor` y todos los campos de la publicación manual |
| `src/app/validacion/actions.ts` | `registrarPublicacionManual` adopta el contrato de `ModalAlta` (`EstadoAlta`: `exito` o `error` con `campo` y `valores`); usa `revalidarProfesorSeleccionado` para administrador y coordinador |
| `src/app/validacion/page.tsx` | Quita el panel fijo del formulario y pone el disparador del modal junto a las pestañas de vista |
| `src/app/validacion/formulario-manual.tsx` | Eliminado (226 líneas) |
| `src/app/validacion/actions.test.ts` | Pruebas de la acción |
| `docs/pruebas/PR-187-modal-alta-validacion.md`, `docs/SEGUIMIENTO.md` | Registro del autor y actualización de la fila pendiente «Rediseño de vistas» |

No hay cambios de esquema, migración ni dependencias. Solo toca el módulo de Validación y documentación.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `prisma validate` | Correcto |
| `npm test` | Correcto: 104 archivos, 1155 pruebas |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto |
| `npm run build` | Correcto |
| CI de GitHub (`verificar`) y vista previa de Vercel | Correctos |

### Conflicto con `main` y mezcla de prueba

Mientras se revisaba, el #271 se integró en `main` y el #272 pasó de mezclable a en conflicto (`DIRTY`), **solo en `src/app/validacion/page.tsx`**: los dos cambian la barra de pestañas de vista. Los demás archivos se mezclan sin conflicto.

Mezcla local de prueba con `main` (23 commits adelante), resolviendo el conflicto así: la barra de pestañas nueva de `main` (con `enlaceCambioVista`) va dentro del contenedor que ya lleva el botón del modal. Sobre ese resultado, con mis pruebas de revisión incluidas: 111 archivos y 1249 pruebas, lint, typecheck y build correctos. Esa mezcla no se subió.

## 3. Lo que se leyó y está bien

- **Permisos:** `requireModulo("validacion")` sigue siendo lo primero que hace la acción. La acción no se puede usar sin el permiso del módulo (Q13).
- **Alcance del docente:** un docente solo registra a su propio nombre; si manda otro profesor, se rechaza antes de consultar publicaciones (Q7), y con el campo vacío usa el suyo (Q6).
- **Revalidación en el servidor (D-215):** administrador y coordinador eligen en un selector, pero el servidor vuelve a comprobar con Prisma que el profesor existe; un id manipulado (`abc`, `-1`, `1.5`, `0`, `99999999999`) da un mensaje en español sin llegar a crear nada (Q1 a Q4).
- **Contrato de `ModalAlta`:** la acción devuelve solo `exito` en el éxito (Q8) y `error`, `campo` y `valores` en un fallo, sin redirigir. `ModalAlta` completa los `valores` con el formulario enviado, así que un error del servidor conserva lo escrito aunque la acción no los devuelva (por ejemplo, al no elegir profesor).
- **Mensajes en español:** fecha futura, URL inválida y tipo inexistente se rechazan sin mensajes de Zod en inglés (Q11).
- **Reglas de RF-023:** `VALIDADA` si registra el docente, `PENDIENTE` si registra la coordinación o la administración; duplicado por DOI o por título del mismo profesor; `P2002` del DOI se traduce al campo `doi`.
- **Revalida el listado:** `revalidatePath("/validacion")` tras el alta (Q9), y `ModalAlta` hace `router.refresh()`, que conserva la URL con búsqueda, filtros, orden y página.
- **Limpieza:** se eliminó `formulario-manual.tsx` sin dejar referencias, y el texto de las filas pendientes de `SEGUIMIENTO.md` se actualizó para reflejar la migración.

## 4. Pruebas de revisión

Archivo `src/app/validacion/revision-pr272.test.ts` (código en la sección 7). Veinte pruebas (trece casos, algunos con `it.each`), todas correctas contra la rama; no forman parte del PR.

| # | Prueba | Resultado |
|---|---|---|
| Q1 | Un administrador sin elegir profesor recibe «Selecciona un profesor.» y no se consulta nada más | ✓ |
| Q2 | Un identificador manipulado (`abc`, `-1`, `1.5`, `0`, `99999999999`, `␣7`) se rechaza en español (6 casos) | ✓ |
| Q3 | Un profesor que ya no existe pide elegir otro | ✓ |
| Q4 | Si la consulta del profesor falla, el mensaje es propio y no filtra el error de la base | ✓ |
| Q5 | Un administrador con perfil vinculado ya no hereda su profesor si no elige ninguno | ✓ (hallazgo 1) |
| Q6 | Un docente con el campo vacío registra a su propio nombre | ✓ |
| Q7 | Un docente que manda otro profesor, aunque exista, no llega a consultar publicaciones | ✓ |
| Q8 | El éxito solo lleva `exito` | ✓ |
| Q9 | Tras un alta correcta se revalida `/validacion` | ✓ |
| Q10 | Un error de validación devuelve los valores escritos, incluido el profesor elegido | ✓ |
| Q11 | Fecha futura, URL inválida y tipo inexistente se rechazan sin textos en inglés (3 casos) | ✓ |
| Q12 | `P2003` (el profesor se borró entre la consulta y el alta) no se traduce: la acción lanza | ✓ (hallazgo 2) |
| Q13 | Sin permiso del módulo, la acción lanza antes de leer el formulario o la base | ✓ |

Con estas pruebas la suite de la rama queda en 105 archivos y 1175 pruebas, todas correctas.

## 5. Hallazgos

1. **Cambia un comportamiento, aunque el issue dice «no cambia reglas de negocio».** Antes, un administrador o coordinador cuyo perfil está vinculado a un profesor y que no elegía a nadie registraba a su propio nombre (`rawId ? Number(rawId) : perfil.profesorId`). Ahora recibe «Selecciona un profesor.» (Q5). Es más claro y evita altas por descuido, pero conviene decirlo en la descripción del PR. Además, el error del DOI duplicado ahora lleva `campo: "doi"`.
2. **`P2003` no se traduce.** Si el profesor se borra entre la comprobación y el alta, la acción lanza (Q12) y el modal muestra su mensaje genérico «No se pudo guardar…». `AGENTS.md` pide capturar `P2003` en relaciones obligatorias; basta con un mensaje propio («El profesor ya no está disponible…»). Es un caso muy poco probable, pero la regla es explícita.
3. **El registro del PR cuenta mal las pruebas.** Dice «17 pruebas específicas en `actions.test.ts`». El 17 es el archivo entero (incluye las pruebas de confirmar y rechazar autorías); las de `registrarPublicacionManual` son 8.
4. **Falta declarar la revisión visual.** El issue #187 pide revisar claro, oscuro y celular «o declarar qué no se pudo ver», y el registro del PR no dice nada. Tampoco se comprobó que el modal se complete y se cancele solo con teclado, aunque el issue ya lo marca como cumplido.
5. **Los números del PR son los de la rama sola** (104 archivos, 1155 pruebas); con `main` mezclado son 110 archivos y 1229 pruebas, sin contar las de revisión. Conviene actualizarlos al resolver el conflicto.
6. **La página pasa a la ventana más datos de los que usa.** `profesores` incluye el departamento anidado (`departamentoId`, `departamento`), que `SelectorProfesor` no necesita; viaja al cliente en cada visita. Es menor, y la lista ya incluye profesores de baja (la acción tampoco los excluye, así que es coherente).

## 6. Lo que no se probó

- **El modal en el navegador** (tema claro, oscuro y celular): apertura desde el botón junto a las pestañas, el foco al abrir y al cerrar, el desbordamiento con varios campos en celular, y el aviso de éxito.
- **El uso solo con teclado** (abrir, completar, enviar y cancelar con «Escape» y la confirmación de descartar cambios).
- **Que el alta conserve búsqueda, filtros, orden y página** tras `router.refresh()`: se deduce del componente, no se vio funcionar.
- **La acción contra la base real:** el `findMany` de duplicados, la creación de la publicación con su autoría y la unicidad del DOI. Las pruebas usan un `prisma` simulado.
- **Administrador con la lista completa de profesores:** rendimiento y búsqueda del selector con cientos de opciones.
- **Editar y Eliminar de las publicaciones manuales y la paginación:** el código no cambió, pero tampoco se ejercitaron.

## 7. Código de la prueba de revisión

<details>
<summary><code>src/app/validacion/revision-pr272.test.ts</code></summary>

```ts
// Revisión del PR #272: casos que las pruebas del PR no cubren.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";

const dobles = vi.hoisted(() => ({
  requireModulo: vi.fn(),
  profesorFindUnique: vi.fn(),
  publicacionFindMany: vi.fn(),
  publicacionCreate: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    autoria: { findUnique: vi.fn(), update: vi.fn() },
    profesor: { findUnique: dobles.profesorFindUnique },
    publicacion: { findMany: dobles.publicacionFindMany, create: dobles.publicacionCreate },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: dobles.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(url); }, RedirectType: { replace: "replace" } }));

import { registrarPublicacionManual } from "./actions";

const ADMIN = { rol: "ADMINISTRADOR", profesorId: null };
const DOCENTE = { rol: "DOCENTE", profesorId: 7 };

function formulario(campos: Record<string, string | null> = {}) {
  const datos = new FormData();
  const base: Record<string, string> = {
    profesorId: "7",
    tipo: "ARTICULO",
    titulo: "Algoritmos cuánticos distribuidos",
    autoresTexto: "García, A.; Pérez, B.",
    fechaPublicacion: "2025-06-15",
    revistaEditorial: "Revista Mexicana de Computación",
    isbnIssn: "1234-5678",
    doi: "10.1016/j.artint.2025.01.001",
    volumen: "",
    paginas: "",
    evidenciaUrl: "",
  };
  for (const [clave, valor] of Object.entries({ ...base, ...campos })) if (valor !== null) datos.set(clave, valor);
  return datos;
}

beforeEach(() => {
  vi.clearAllMocks();
  dobles.requireModulo.mockResolvedValue(ADMIN);
  dobles.profesorFindUnique.mockImplementation(async ({ where }: { where: { id: number } }) =>
    where.id === 7 ? { id: 7, nombres: "Ana", apellidos: "García", codigo: "123456" } : null,
  );
  dobles.publicacionFindMany.mockResolvedValue([]);
  dobles.publicacionCreate.mockResolvedValue({ id: 99 });
});

describe("registrarPublicacionManual: profesor elegido", () => {
  it("Q1: un administrador sin elegir profesor recibe un mensaje en español y no se consulta nada más", async () => {
    const r = await registrarPublicacionManual({}, formulario({ profesorId: null }));
    expect(r).toEqual({ error: "Selecciona un profesor.", campo: "profesorId" });
    expect(dobles.publicacionCreate).not.toHaveBeenCalled();
    expect(dobles.publicacionFindMany).not.toHaveBeenCalled();
  });

  it.each(["abc", "-1", "1.5", "0", "99999999999", " 7"])("Q2: un identificador manipulado (%s) se rechaza en español", async (valor) => {
    const r = await registrarPublicacionManual({}, formulario({ profesorId: valor }));
    expect(r.exito).toBeUndefined();
    expect(r.campo).toBe("profesorId");
    expect(r.error).toMatch(/^(Selecciona|El profesor)/);
    expect(dobles.publicacionCreate).not.toHaveBeenCalled();
  });

  it("Q3: un profesor que ya no existe se rechaza con un mensaje que pide elegir otro", async () => {
    const r = await registrarPublicacionManual({}, formulario({ profesorId: "8" }));
    expect(r).toEqual({ error: "El profesor ya no está disponible para esta operación. Selecciona otro.", campo: "profesorId" });
  });

  it("Q4: si la consulta del profesor falla, el mensaje es propio y no filtra el error de la base", async () => {
    dobles.profesorFindUnique.mockRejectedValue(new Error("connection terminated"));
    const r = await registrarPublicacionManual({}, formulario());
    expect(r.error).toBe("No se pudo verificar el profesor. Inténtalo de nuevo.");
    expect(JSON.stringify(r)).not.toContain("connection");
  });

  it("Q5: un administrador con perfil vinculado a un profesor ya no hereda ese profesor si no elige ninguno", async () => {
    dobles.requireModulo.mockResolvedValue({ rol: "ADMINISTRADOR", profesorId: 7 });
    const r = await registrarPublicacionManual({}, formulario({ profesorId: null }));
    expect(r.error).toBe("Selecciona un profesor.");
  });

  it("Q6: un docente con el campo vacío registra a su propio nombre", async () => {
    dobles.requireModulo.mockResolvedValue(DOCENTE);
    const r = await registrarPublicacionManual({}, formulario({ profesorId: "" }));
    expect(r.exito).toContain("incorporó al conteo oficial");
    expect(dobles.publicacionCreate.mock.calls[0][0].data.autorias.create.profesorId).toBe(7);
  });

  it("Q7: un docente que manda otro profesor, aunque exista, no llega a consultar publicaciones", async () => {
    dobles.requireModulo.mockResolvedValue(DOCENTE);
    const r = await registrarPublicacionManual({}, formulario({ profesorId: "8" }));
    expect(r.error).toBe("Como docente solo puedes registrar publicaciones a tu propio nombre.");
    expect(dobles.publicacionFindMany).not.toHaveBeenCalled();
  });
});

describe("registrarPublicacionManual: resultado", () => {
  it("Q8: el éxito solo lleva `exito`: ni error, ni campo, ni valores", async () => {
    const r = await registrarPublicacionManual({}, formulario());
    expect(Object.keys(r)).toEqual(["exito"]);
    expect(r.exito).toContain("se envió a la bandeja del profesor");
  });

  it("Q9: tras un alta correcta se revalida /validacion", async () => {
    await registrarPublicacionManual({}, formulario());
    expect(dobles.revalidatePath).toHaveBeenCalledWith("/validacion");
  });

  it("Q10: un error de validación devuelve los valores escritos, incluido el profesor elegido", async () => {
    const r = await registrarPublicacionManual({}, formulario({ titulo: "  " }));
    expect(r.campo).toBe("titulo");
    expect(r.valores).toMatchObject({ profesorId: "7", doi: "10.1016/j.artint.2025.01.001", tipo: "ARTICULO" });
  });

  it.each([
    ["fechaPublicacion", "2999-01-01"],
    ["evidenciaUrl", "no es una url"],
    ["tipo", "PODCAST"],
  ])("Q11: un valor atípico en %s se rechaza con un mensaje en español", async (campo, valor) => {
    const r = await registrarPublicacionManual({}, formulario({ [campo]: valor }));
    expect(r.exito).toBeUndefined();
    expect(r.error).toBeTruthy();
    expect(r.error).not.toMatch(/Invalid|expected|received|required/i);
  });
});

describe("registrarPublicacionManual: errores de la base y permisos", () => {
  it("Q12: P2003 (el profesor se borró entre la consulta y el alta) no se traduce: la acción lanza", async () => {
    dobles.publicacionCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("falla simulada", { code: "P2003", clientVersion: "7.10.0" }),
    );
    await expect(registrarPublicacionManual({}, formulario())).rejects.toThrow();
  });

  it("Q13: sin permiso del módulo, la acción lanza antes de leer el formulario o la base", async () => {
    dobles.requireModulo.mockRejectedValue(new Error("sin permiso"));
    await expect(registrarPublicacionManual({}, formulario())).rejects.toThrow("sin permiso");
    expect(dobles.profesorFindUnique).not.toHaveBeenCalled();
    expect(dobles.publicacionCreate).not.toHaveBeenCalled();
  });
});
```

</details>

## 8. Dictamen

**Aprobable con comentarios.** Pasa todas las verificaciones, también mezclado con `main`, y la acción respeta permisos, alcance del docente, revalidación del profesor y mensajes en español. Antes de integrar: resolver el conflicto de `page.tsx` (sección 2), declarar la revisión visual y del teclado que pide el issue (4) y decir en la descripción el cambio de comportamiento del administrador (1); el resto puede ir en un ajuste posterior. Queda pendiente ver el modal en los tres modos y que otra persona lo apruebe.
