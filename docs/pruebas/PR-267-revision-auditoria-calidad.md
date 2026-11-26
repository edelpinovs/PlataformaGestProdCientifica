# Revisión del PR #267: panel de administración, fase 2, auditoría y calidad de datos (#242)

Revisión detallada del [PR #267](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/267) de `edelpinovs`. Amplía lo dicho sobre este PR en [PR-263-269-panel-administracion.md](PR-263-269-panel-administracion.md). El registro que dejó quien lo preparó está en su rama (`PR-267-admin-fase2-auditoria-calidad.md`).

| Campo | Valor |
|---|---|
| PR | #267 (refs #242; no lo cierra) |
| Autor | @edelpinovs |
| Rama | `feat/M1-administracion-auditoria-calidad` → `main` (el #263 ya se integró y GitHub reapuntó la base) |
| Commit revisado | `6a69036` |
| Fecha de la revisión | 2026-11-23 |
| Revisó | Edel Pino (con Claude Code). Es el mismo dueño que preparó el PR: **otra persona debe aprobarlo** |
| Entorno | Local (Windows 10, Node 24), copia aislada de la rama (`git worktree`) con `npm ci`, `prisma generate` y las variables de relleno del CI. Sin base de datos y sin `next dev` |
| Resultado | **Aprobable con comentarios.** Cuatro puntos menores y uno de documentación; ninguno bloquea |

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `prisma/schema.prisma` y `migrations/20261123230018_auditoria` | Tabla `Auditoria` (id, fecha, actor, módulo, acción, entidad, resumen), dos índices y RLS |
| `src/modules/administracion/auditoria.ts` | Acciones registradas, `eventoAuditoria` y los textos de resumen |
| `src/modules/administracion/auditoria-listado.ts` | Búsqueda, filtros y orden de la bitácora |
| `src/modules/administracion/calidad.ts` | Cinco reglas de calidad de datos, filtro y orden en memoria |
| `src/app/administracion/auditoria/page.tsx`, `calidad/page.tsx` | Pantallas de solo lectura |
| `src/app/administracion/usuarios/actions.ts` | El cambio y su registro en la bitácora van en una sola transacción |
| `src/app/administracion/page.tsx` | Tarjetas de inicio |
| Tres archivos `.test.ts` | 33 pruebas nuevas |

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `prisma validate` | Correcto |
| `npm test` | Correcto: 106 archivos, 1180 pruebas |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto |
| `npm run build` | Correcto; compila `/administracion/auditoria` y `/administracion/calidad` |
| Vista previa de Vercel | Comentario publicado |

Con mi prueba de revisión (sección 4) la suite queda en 107 archivos y 1190 pruebas, todas correctas; esa prueba **no** forma parte del PR.

## 3. Lo que se leyó y está bien

- **Permisos:** las dos páginas nuevas y las dos acciones empiezan con `requireModulo("administracion")`, que es solo `ADMINISTRADOR`.
- **Atomicidad:** `prisma.$transaction([update, auditoria.create])`; si la bitácora falla, el cambio no se guarda. Una edición sin cambios (`resumen === null`) no escribe nada.
- **Sin relación con `Perfil`:** desactivar o cambiar un perfil no altera lo ya registrado, y el correo del actor se copia al momento del hecho.
- **Migración:** solo crea la tabla, dos índices y la RLS; sin `DROP`. El PR dice que ya está aplicada a la base compartida.
- **Bitácora de solo lectura:** sin Editar ni Eliminar (excepción a #59 justificada: es un registro histórico).
- **Listado de auditoría (D-009):** `skip`/`take` con `count`, orden con lista permitida, desempate por `id`, búsqueda con `condicionTexto` (escapa `%` y `_`) y, además, por el texto de módulo y acción.
- **Reglas de calidad:** son funciones puras con 16 pruebas; «Licencia» no cuenta como baja (D-246 pendiente), solo se señala a profesores activos por identificadores y perfil, y no falla si un líder o integrante ya no existe.
- **Enlaces de corrección:** `/cuerpos-academicos/[id]` y `/profesores` (con `q`) existen en la rama.

## 4. Pruebas de revisión

Archivo `src/modules/administracion/revision-pr267.test.ts` (código en la sección 7). Diez pruebas, todas correctas contra la rama: cada una **fija** un comportamiento que explica un hallazgo.

| # | Prueba | Resultado |
|---|---|---|
| A1 | La fecha se muestra en la tabla, pero la búsqueda solo cubre persona y resumen (más texto de módulo y acción) | ✓ (hallazgo 1) |
| A2 | El resumen junta espacios y saltos de línea y se recorta a 500 caracteres | ✓ |
| A3 | El correo del actor se guarda tal cual lo trae la sesión | ✓ |
| A4 | El resumen lleva el correo de la persona afectada | ✓ (hallazgo 2) |
| A5 | Resumen de edición con rol y profesor a la vez; sin código, el texto llama «código» al identificador interno | ✓ (hallazgo 5) |
| C1 | Un líder de baja que no es integrante da solo `LIDER_NO_INTEGRANTE` | ✓ |
| C2 | Un líder integrante que está de baja da `INTEGRANTE_DE_BAJA` | ✓ |
| C3 | Ordenar por registro es alfabético: `UDG-CA-10` antes que `UDG-CA-2` | ✓ (hallazgo 4) |
| C4 | El profesor sin perfil enlaza a `/administracion/usuarios` | ✓ (hallazgo 3) |
| C5 | Sin datos no hay hallazgos | ✓ |

## 5. Hallazgos

1. **La búsqueda de la bitácora no cubre la fecha, que sí se muestra (D-009).** `AGENTS.md` pide que el cuadro de texto busque en cualquier campo que muestre la interfaz. En el #263 se evitó el problema quitando la columna de fecha de alta; aquí la columna «Fecha» existe y no se busca. Corrección: aceptar un texto de fecha (por ejemplo `2026-11` o `23/11/2026`) y traducirlo a un rango de `creadoEn`, o justificar la excepción en el issue #242.
2. **El comentario del esquema es inexacto.** `prisma/schema.prisma` dice que `resumen` «nunca lleva datos de contacto», y los resúmenes de usuarios llevan el correo de la persona afectada (A4). Es útil y el acceso es solo de administradores, pero el comentario debe decir lo que hace: «lleva el correo, sin teléfono ni datos personales». Conviene decidirlo ahora, antes de auditar más módulos.
3. **«Sin perfil de acceso» enlaza a un lugar donde todavía no se puede corregir.** La descripción dice que cada hallazgo enlaza a donde se corrige, pero crear el perfil de un profesor depende de la invitación de usuarios (D-242, pendiente). Hoy `/administracion/usuarios` solo permite vincular a un perfil que ya existe. Anotar la limitación en el texto del hallazgo o esperar a D-242.
4. **Orden alfabético de la clave del cuerpo académico.** Ordenar por «Registro» pone `UDG-CA-10` antes que `UDG-CA-2`. No es grave con pocos cuerpos; con `localeCompare(..., { numeric: true })` queda natural.
5. **El resumen de edición confunde código con identificador si falta el código.** `resumenEdicionUsuario` escribe «con código 12» usando el `id` interno cuando `codigoProfesor` no llega. La acción siempre lo envía, así que hoy no ocurre; es una trampa para quien llame la función desde otro lugar. Mejor omitir «con código» si no hay código.
6. **La descripción del PR cuenta mal las pruebas.** Dice «59 pruebas nuevas en el módulo y 4 en las acciones». El diff trae 14 + 16 en el módulo y 3 en las acciones: **33**, que es justo lo que subió la suite (1147 → 1180). Corregir la cifra.
7. **El filtro «Módulo» de la bitácora solo tiene una opción** (Administración). No estorba, pero ocupa espacio en celular hasta que otros módulos registren acciones.

## 6. Lo que no se probó

- **Las pantallas en el navegador** (claro, oscuro y celular): `/administracion/auditoria` y `/administracion/calidad`.
- **Contra la base real:** la transacción (que un fallo de la bitácora deshaga el cambio), la lectura de la tabla `Auditoria` y las consultas de `calidad/page.tsx`. Las pruebas de las acciones usan un `prisma` simulado.
- **Rendimiento de calidad de datos** con muchos profesores: se leen todos los profesores y cuerpos en cada visita y se filtra en memoria. Es razonable con cientos de registros; no se midió.

## 7. Código de la prueba de revisión

<details>
<summary><code>src/modules/administracion/revision-pr267.test.ts</code></summary>

```ts
// Revisión del PR #267: casos que las pruebas del PR no cubren.
import { describe, expect, it } from "vitest";
import { analizarListado } from "@/lib/listados/consulta";
import { eventoAuditoria, resumenCambioEstado, resumenEdicionUsuario } from "./auditoria";
import { filtroAuditoria, LISTADO_AUDITORIA } from "./auditoria-listado";
import {
  analizarCalidad,
  LISTADO_CALIDAD,
  ordenarHallazgos,
  type CuerpoCalidad,
  type ProfesorCalidad,
} from "./calidad";

const profesor = (id: number, extra: Partial<ProfesorCalidad> = {}): ProfesorCalidad => ({
  id, codigo: `C${id}`, nombres: `N${id}`, apellidos: `A${id}`, estatusLaboral: "ACTIVO",
  orcid: "0000-0001-0000-0001", scopusId: null, tienePerfil: true, ...extra,
});
const cuerpo = (id: number, extra: Partial<CuerpoCalidad> = {}): CuerpoCalidad => ({
  id, clave: `UDG-CA-${id}`, nombre: `Cuerpo ${id}`, liderId: 1, integrantes: [1], ...extra,
});
const consultaCalidad = (p: Record<string, string> = {}) => analizarListado(LISTADO_CALIDAD, p).consulta;
const consultaAuditoria = (p: Record<string, string> = {}) => analizarListado(LISTADO_AUDITORIA, p).consulta;

describe("auditoría", () => {
  const actor = { id: "7b0f6c5e-2f3a-4c1e-9d0a-111111111111", correo: " Admin@Ejemplo.MX " };

  it("A1: la fecha se muestra en la tabla pero la búsqueda no la cubre (D-009)", () => {
    const where = filtroAuditoria(consultaAuditoria({ q: "2026" }));
    const campos = (where.OR ?? []).flatMap((c) => Object.keys(c));
    expect(campos).toEqual(["actorCorreo", "resumen"]);
    expect(campos).not.toContain("creadoEn");
  });

  it("A2: el resumen junta espacios y saltos de línea y se recorta a 500", () => {
    const e = eventoAuditoria("usuario.editado", actor, { tipo: "Perfil", id: "x" }, `uno\n\n  dos ${"a".repeat(600)}`);
    expect(e.resumen.startsWith("uno dos ")).toBe(true);
    expect(e.resumen).toHaveLength(500);
    expect(e.resumen.endsWith("…")).toBe(true);
  });

  it("A3: el correo del actor se guarda tal cual lo trae la sesión, sin pasar a minúsculas", () => {
    expect(eventoAuditoria("usuario.editado", actor, { tipo: "Perfil", id: "x" }, "r").actorCorreo).toBe("Admin@Ejemplo.MX");
  });

  it("A4: el resumen sí lleva el correo de la persona afectada (el esquema dice que no lleva datos de contacto)", () => {
    expect(resumenCambioEstado("ana@ejemplo.mx", false)).toContain("ana@ejemplo.mx");
    expect(
      resumenEdicionUsuario("ana@ejemplo.mx", { rol: "DOCENTE", profesorId: null }, { rol: "COORDINADOR", profesorId: null }),
    ).toContain("ana@ejemplo.mx");
  });

  it("A5: edición de rol y profesor a la vez, y sin código de profesor", () => {
    expect(
      resumenEdicionUsuario("a@b.mx", { rol: "DOCENTE", profesorId: null }, { rol: "COORDINADOR", profesorId: 12, codigoProfesor: "ABC1" }),
    ).toBe("Cambió el rol de Docente a Coordinación de Investigación y vinculó al profesor con código ABC1 de a@b.mx.");
    // Si faltara el código, el texto llama «código» al identificador interno.
    expect(
      resumenEdicionUsuario("a@b.mx", { rol: "DOCENTE", profesorId: null }, { rol: "DOCENTE", profesorId: 12 }),
    ).toBe("Vinculó al profesor con código 12 de a@b.mx.");
  });
});

describe("calidad de datos", () => {
  it("C1: un líder de baja que además no es integrante da dos hallazgos distintos", () => {
    const h = analizarCalidad({
      profesores: [profesor(1), profesor(2, { estatusLaboral: "TRASLADADO" })],
      cuerpos: [cuerpo(1, { liderId: 2, integrantes: [1] })],
    });
    expect(h.map((x) => x.regla)).toEqual(["LIDER_NO_INTEGRANTE"]);
  });

  it("C2: un líder integrante que está de baja se señala como integrante de baja", () => {
    const h = analizarCalidad({
      profesores: [profesor(1, { estatusLaboral: "BAJA_TEMPORAL" })],
      cuerpos: [cuerpo(1, { liderId: 1, integrantes: [1] })],
    });
    expect(h.map((x) => x.regla)).toEqual(["INTEGRANTE_DE_BAJA"]);
  });

  it("C3: ordenar por registro es alfabético, no numérico (UDG-CA-10 antes que UDG-CA-2)", () => {
    const h = analizarCalidad({
      profesores: [profesor(1)],
      cuerpos: [cuerpo(2, { liderId: null }), cuerpo(10, { liderId: null })],
    });
    const orden = ordenarHallazgos(h, consultaCalidad({ orden: "registro" })).map((x) => x.registro);
    expect(orden).toEqual(["UDG-CA-10 · Cuerpo 10", "UDG-CA-2 · Cuerpo 2"]);
  });

  it("C4: el profesor sin perfil enlaza a usuarios, donde todavía no se puede crear un perfil (D-242)", () => {
    const h = analizarCalidad({ profesores: [profesor(1, { tienePerfil: false })], cuerpos: [] });
    expect(h[0].enlace).toBe("/administracion/usuarios");
  });

  it("C5: sin datos no hay hallazgos", () => {
    expect(analizarCalidad({ profesores: [], cuerpos: [] })).toEqual([]);
  });
});
```

</details>

## 8. Dictamen

**Aprobable con comentarios.** Pasa todas las verificaciones y las reglas del equipo en permisos, transacción, migración y listados. Antes de integrar: corregir la cifra de pruebas de la descripción (6), el comentario del esquema (2) y decidir la búsqueda por fecha (1); el resto puede ir en un ajuste posterior. Queda pendiente ver las pantallas en los tres modos y que otra persona lo apruebe.
