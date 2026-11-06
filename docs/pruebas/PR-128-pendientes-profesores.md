# Prueba del PR #128: Pendientes de la revisión del #69 en Profesores (RF-005)

Registro de la revisión del [PR #128](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/128) de `dpfuentes92` (rama `fix/M2-RF-005-pendientes-pr69`, commit `40045a2`). Atiende los pendientes de la revisión del [PR #69](PR-069-unicidad-identificadores.md). Sin `Closes`: los issues #9 y #10 los cerró el #69. El comentario está publicado en el PR.

## 1. Alcance revisado

| Archivo | Qué cambia |
|---|---|
| `src/modules/profesores/profesores.ts` | `mensajeUnicidadPrisma` no marca Código si el índice no es de un campo conocido |
| `src/app/profesores/actions.ts` | `errorPrisma` devuelve el aviso genérico sin `campo` en ese caso |
| `src/app/profesores/nuevo/formulario.tsx`, `page.tsx` | `gap-5` y `gap-4` según la pauta; placeholders de Scholar ID y Scopus ID con el formato |
| `src/modules/profesores/profesores.test.ts` | Pruebas de `editarProfesor` y `eliminarProfesor` y del P2002 desconocido |

## 2. Chequeos automáticos (copia aislada, con `main` integrado)

| Chequeo | Resultado |
|---|---|
| `npm test` | 571 pruebas pasan (44 archivos): 562 del PR y 9 de esta revisión |
| `npm run lint` | sin errores |
| `npm run typecheck` | `next typegen` y `tsc --noEmit` sin errores |
| `npm run build` | no se ejecutó en la copia; el CI del PR pasó |

## 3. Pruebas de revisión: 9 de 9 pasan

Código en la sección 6.

| Id | Qué comprueba | Resultado |
|---|---|---|
| S1 | Un Scholar ID corto (`ab`) da el mensaje de caracteres permitidos, no el de longitud | Pasa (**confirma el defecto**) |
| S2 | Límites del Scholar ID (4, 5, 50, 51) y caracteres no permitidos | Pasa |
| S3 | Scopus ID de 4 a 20 dígitos y su mensaje | Pasa |
| S4 | `mensajeUnicidadPrisma` con `meta` raro (undefined, null, vacío, texto, número) no marca Código | Pasa |
| S5 | Editar con un P2002 desconocido no marca Código | Pasa |
| S6 | Editar con un P2002 de un campo conocido marca ese campo | Pasa |
| S7 | El permiso se exige antes de leer la base, también con un id inválido (editar y eliminar) | Pasa |
| S8 | Eliminar con ids inválidos no consulta la base | Pasa |
| S9 | Si el borrado falla con P2003 por una relación no contada, el aviso dice «ya no existe» aunque el profesor sigue | Pasa (**confirma el defecto**) |

## 4. Hallazgos (publicados en el PR)

| # | Tipo | Hallazgo |
|---|---|---|
| 1 | A corregir | Mensaje engañoso del Scholar ID corto (S1); separar la regla de longitud (5 a 50) de la de caracteres y ajustar la prueba |
| 2 | Menor | P2003 de una relación no contada en eliminar muestra «ya no existe» (S9); no lo introduce el PR |
| 3 | Menor | La decisión «el coordinador registra, edita y elimina profesores» no estaba en `DECISIONES.md`: se agrega D-117 |
| 4 | Menor | Descripción en inglés y sin `Closes`/`Refs`; usar la plantilla en español y `Refs #10` |
| 5 | Menor | La revisión visual declarada cubre solo el alta, no la fila de edición del listado |

## 5. Dictamen y lo que no se probó

**Aprobable con comentarios.** No se probó: la pantalla en el navegador (claro, oscuro, celular), un P2002 real contra la base y `npm run build` en la copia.

## 6. Código de las pruebas de revisión

<details>
<summary><code>src/modules/profesores/revision-pr128.test.ts</code></summary>

```ts
// Pruebas de revisión del PR #128 (no forman parte del PR).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "../../generated/prisma/client";
import { mensajeUnicidadPrisma, registrarProfesor } from "./profesores";

const prismaFalso = vi.hoisted(() => ({
  profesor: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
}));
const sesionFalsa = vi.hoisted(() => ({ requireModulo: vi.fn(async () => ({ rol: "ADMINISTRADOR" })) }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaFalso }));
vi.mock("@/lib/auth/session", () => sesionFalsa);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), RedirectType: { replace: "replace" } }));

const alta = {
  codigo: "ABC123", nombres: "Juan", apellidos: "García López", correo: "juan@cuvalles.udg.mx",
  genero: "M", tipoContratacion: "TIEMPO_COMPLETO", estatusLaboral: "ACTIVO",
};
const formulario = (datos: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(datos)) f.set(k, v);
  return f;
};
const errorPrisma = (code: string, meta?: unknown) =>
  new Prisma.PrismaClientKnownRequestError("falla", { code, clientVersion: "7", meta: meta as never });

describe("revisión PR #128", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaFalso.profesor.findMany.mockResolvedValue([]);
    prismaFalso.profesor.findUnique.mockResolvedValue({ id: 7 });
  });

  it("S1: un Scholar ID demasiado corto da el mensaje de caracteres permitidos, no el de longitud (confirma el defecto)", () => {
    const r = registrarProfesor.safeParse({ ...alta, scholarId: "ab" });
    expect(r.success).toBe(false);
    if (!r.success) {
      // El defecto: el problema es la longitud (5 a 50) pero el aviso habla de qué caracteres se admiten.
      expect(r.error.issues[0].message).toBe("El Scholar ID solo admite letras, números, puntos, guiones y guiones bajos.");
    }
  });

  it("S2: límites del Scholar ID (4, 5, 50 y 51) y caracteres no permitidos", () => {
    const ok = (scholarId: string) => registrarProfesor.safeParse({ ...alta, scholarId }).success;
    expect(ok("abcd")).toBe(false);
    expect(ok("abcde")).toBe(true);
    expect(ok("a".repeat(50))).toBe(true);
    expect(ok("a".repeat(51))).toBe(false);
    expect(ok("abc de")).toBe(false);
    expect(ok("abc$de")).toBe(false);
    expect(ok("Ñandú_01")).toBe(true);
  });

  it("S3: Scopus ID acepta de 4 a 20 dígitos y rechaza el resto con su mensaje", () => {
    const r = (scopusId: string) => registrarProfesor.safeParse({ ...alta, scopusId });
    expect(r("123").success).toBe(false);
    expect(r("1234").success).toBe(true);
    expect(r("1".repeat(20)).success).toBe(true);
    expect(r("1".repeat(21)).success).toBe(false);
    const mala = r("12a45");
    if (!mala.success) expect(mala.error.issues[0].message).toBe("El Scopus ID debe tener de 4 a 20 dígitos.");
  });

  it("S4: mensajeUnicidadPrisma con formas raras del meta no marca Código ni falla", () => {
    for (const meta of [undefined, null, {}, [], "x", 5, { target: null }, { target: ["otro"] }, { modelName: "Profesor" }]) {
      const r = mensajeUnicidadPrisma(meta);
      expect(r.campo, JSON.stringify(meta)).toBeUndefined();
      expect(r.mensaje).toBe("Algunos de los identificadores ingresados ya están registrados.");
    }
  });

  it("S5: editar con un P2002 desconocido tampoco marca Código", async () => {
    prismaFalso.profesor.update.mockRejectedValue(errorPrisma("P2002", { target: ["otro"] }));
    const { editarProfesor } = await import("../../app/profesores/actions");
    const r = await editarProfesor({}, formulario({ ...alta, id: "7" }));
    expect(r.error).toBe("Algunos de los identificadores ingresados ya están registrados.");
    expect(r).not.toHaveProperty("campo");
  });

  it("S6: editar con un P2002 de un campo conocido sí marca ese campo", async () => {
    prismaFalso.profesor.update.mockRejectedValue(errorPrisma("P2002", { target: ["correo"] }));
    const { editarProfesor } = await import("../../app/profesores/actions");
    const r = await editarProfesor({}, formulario({ ...alta, id: "7" }));
    expect(r.campo).toBe("correo");
  });

  it("S7: el permiso se exige antes de leer la base, también con un id inválido", async () => {
    sesionFalsa.requireModulo.mockRejectedValueOnce(new Error("Sin permiso"));
    const { editarProfesor } = await import("../../app/profesores/actions");
    await expect(editarProfesor({}, formulario({ ...alta, id: "x" }))).rejects.toThrow("Sin permiso");
    expect(prismaFalso.profesor.findUnique).not.toHaveBeenCalled();
    sesionFalsa.requireModulo.mockRejectedValueOnce(new Error("Sin permiso"));
    const { eliminarProfesor } = await import("../../app/profesores/actions");
    await expect(eliminarProfesor({}, formulario({ id: "7" }))).rejects.toThrow("Sin permiso");
    expect(prismaFalso.profesor.deleteMany).not.toHaveBeenCalled();
  });

  it("S8: eliminar con un id inválido no consulta la base", async () => {
    const { eliminarProfesor } = await import("../../app/profesores/actions");
    for (const id of ["", "0", "-1", "1.5", "abc"]) {
      const r = await eliminarProfesor({}, formulario({ id }));
      expect(r.error, id).toBe("Ese profesor ya no existe en el directorio. Recarga la página.");
    }
    expect(prismaFalso.profesor.findUnique).not.toHaveBeenCalled();
  });

  it("S9: si el borrado falla con P2003 por una relación no contada, el aviso dice «ya no existe» aunque el profesor sigue ahí (confirma el defecto)", async () => {
    const libre = { nombres: "Ana", apellidos: "Pérez", perfil: null, _count: {
      reconocimientosSnii: 0, reconocimientosProdep: 0, cuerposAcademicos: 0, cuerposLiderados: 0, lgacs: 0,
      participaciones: 0, autorias: 0, cortesEscaneo: 0, programas: 0 } };
    prismaFalso.profesor.findUnique.mockResolvedValue(libre);
    prismaFalso.profesor.deleteMany.mockRejectedValue(errorPrisma("P2003"));
    const { eliminarProfesor } = await import("../../app/profesores/actions");
    const r = await eliminarProfesor({}, formulario({ id: "7" }));
    // El profesor existe (findUnique lo devuelve) pero el mensaje dice que ya no existe.
    expect(r.error).toBe("Ese profesor ya no existe en el directorio. Recarga la página.");
  });
});
```

</details>
