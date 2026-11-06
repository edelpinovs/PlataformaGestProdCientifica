import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ejecutarEscaneo } from "@/modules/produccion/escaneo";
import { repositorioPrisma } from "./repositorio";
import { confirmarAutoria, rechazarHomonimo } from "@/app/validacion/actions";
import { calcularConteoOficial } from "@/modules/validacion/bandeja";
import type { PublicacionConsolidada } from "@/modules/produccion/tipos";

// Se usa el conector ORCID, el motor, el repositorio y las acciones reales.
// Solo HTTP, Prisma y la sesión se sustituyen: no escribe en Supabase.
const dobles = vi.hoisted(() => ({
  prisma: {
    profesor: { findMany: vi.fn() },
    publicacion: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    autoria: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    corteEscaneo: { findUnique: vi.fn(), upsert: vi.fn() },
    $queryRaw: vi.fn(),
  },
  requireModulo: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: dobles.prisma }));
vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  RedirectType: { replace: "replace" },
  redirect: (url: string) => { throw new Error(`Redirección de prueba: ${url}`); },
}));

type FilaPublicacion = Partial<PublicacionConsolidada> & { id: number; titulo: string; doi: string | null };
type FilaAutoria = { publicacionId: number; profesorId: number; estado: "PENDIENTE" | "VALIDADA" | "RECHAZADA"; revisadaEn?: Date };
let publicaciones: FilaPublicacion[];
let autorias: FilaAutoria[];

function formulario(profesorId: number) {
  const datos = new FormData();
  datos.set("publicacionId", String(publicaciones[0].id));
  datos.set("profesorId", String(profesorId));
  return datos;
}

async function escanear(profesorId: number) {
  return ejecutarEscaneo({ profesorId, fuentes: ["ORCID"], anio: 2026, enriquecerAutores: false }, repositorioPrisma);
}

describe("RF-021 y RF-022: integración simulada con Validación", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    publicaciones = [];
    autorias = [];
    dobles.requireModulo.mockResolvedValue({ rol: "ADMINISTRADOR" });
    dobles.prisma.profesor.findMany.mockImplementation(async ({ where }) => [{
      id: where.id, nombres: "Persona", apellidos: "Ficticia", orcid: "0000-0000-0000-0001",
    }]);
    dobles.prisma.publicacion.findUnique.mockImplementation(async ({ where }) =>
      publicaciones.find((obra) => where.doi ? obra.doi === where.doi : obra.id === where.id) ?? null);
    dobles.prisma.publicacion.create.mockImplementation(async ({ data }) => {
      if (data.doi && publicaciones.some((obra) => obra.doi === data.doi)) throw { code: "P2002" };
      const obra = { ...data, id: publicaciones.length + 1 };
      publicaciones.push(obra);
      return obra;
    });
    dobles.prisma.publicacion.update.mockImplementation(async ({ where, data }) => {
      const obra = publicaciones.find((publicacion) => publicacion.id === where.id)!;
      Object.assign(obra, data);
      return obra;
    });
    dobles.prisma.$queryRaw.mockResolvedValue([]);
    dobles.prisma.autoria.findUnique.mockImplementation(async ({ where }) => {
      const clave = where.publicacionId_profesorId;
      return autorias.find((autoria) => autoria.publicacionId === clave.publicacionId && autoria.profesorId === clave.profesorId) ?? null;
    });
    dobles.prisma.autoria.create.mockImplementation(async ({ data }) => {
      if (autorias.some((autoria) => autoria.profesorId === data.profesorId && autoria.publicacionId === data.publicacionId)) throw { code: "P2002" };
      autorias.push({ ...data });
      return data;
    });
    dobles.prisma.autoria.update.mockImplementation(async ({ where, data }) => {
      const clave = where.publicacionId_profesorId;
      const autoria = autorias.find((fila) => fila.publicacionId === clave.publicacionId && fila.profesorId === clave.profesorId)!;
      Object.assign(autoria, data);
      return autoria;
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ group: [{
      "external-ids": { "external-id": [{ "external-id-type": "doi", "external-id-value": "https://doi.org/10.1000/integracion-ficticia" }] },
      "work-summary": [{ title: { title: { value: "Obra ficticia para prueba de integración" } },
        type: "journal-article", "publication-date": { year: { value: "2026" } } }],
    }] }), { status: 200, headers: { "content-type": "application/json" } })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("dos lotes de profesores distintos reutilizan la misma obra y crean dos autorías pendientes", async () => {
    const primero = await escanear(1);
    const segundo = await escanear(2);
    expect(primero.errores).toEqual([]);
    expect(segundo.errores).toEqual([]);
    expect(publicaciones).toHaveLength(1);
    expect(autorias).toEqual([
      { publicacionId: 1, profesorId: 1, estado: "PENDIENTE" },
      { publicacionId: 1, profesorId: 2, estado: "PENDIENTE" },
    ]);
  });

  it("confirmar una autoría cambia solo su conteo y un nuevo escaneo conserva la validación", async () => {
    await escanear(1);
    await escanear(2);
    expect(calcularConteoOficial(autorias).totalValidadas).toBe(0);
    await expect(confirmarAutoria(formulario(1))).rejects.toThrow("/validacion?accion=confirmada");
    expect(autorias[0].estado).toBe("VALIDADA");
    expect(autorias[0].revisadaEn).toBeInstanceOf(Date);
    expect(autorias[1].estado).toBe("PENDIENTE");
    const repetido = await escanear(1);
    expect(repetido.autoriasCreadas).toBe(0);
    expect(calcularConteoOficial(autorias).porProfesor).toEqual({ 1: 1 });
    expect(publicaciones).toHaveLength(1);
  });

  it("el rechazo por homónimo permanece excluido después de volver a escanear", async () => {
    await escanear(1);
    await expect(rechazarHomonimo(formulario(1))).rejects.toThrow("/validacion?accion=rechazada");
    const repetido = await escanear(1);
    expect(repetido.autoriasCreadas).toBe(0);
    expect(autorias[0].estado).toBe("RECHAZADA");
    expect(calcularConteoOficial(autorias).totalValidadas).toBe(0);
    expect(publicaciones).toHaveLength(1);
  });

  it("un docente no puede confirmar la autoría de otro profesor", async () => {
    await escanear(2);
    dobles.requireModulo.mockResolvedValue({ rol: "DOCENTE", profesorId: 1 });
    await expect(confirmarAutoria(formulario(2))).rejects.toThrow("/validacion?error=sin-permiso");
    expect(autorias[0].estado).toBe("PENDIENTE");
    expect(dobles.prisma.autoria.update).not.toHaveBeenCalled();
  });

  it("escaneos simultáneos de la misma persona no duplican la obra ni su autoría", async () => {
    const resultados = await Promise.all([escanear(1), escanear(1)]);
    expect(resultados.flatMap((resultado) => resultado.errores)).toEqual([]);
    expect(publicaciones).toHaveLength(1);
    expect(autorias).toHaveLength(1);
    expect(resultados.reduce((total, resultado) => total + resultado.autoriasCreadas, 0)).toBe(1);
  });

  it("si falla guardar la autoría no anuncia la publicación como completamente guardada", async () => {
    dobles.prisma.autoria.create.mockRejectedValue(new Error("Fallo de prueba"));
    const resultado = await escanear(1);
    expect(resultado.publicacionesGuardadas).toBe(0);
    expect(resultado.errores).toHaveLength(1);
    expect(autorias).toHaveLength(0);
  });
});
