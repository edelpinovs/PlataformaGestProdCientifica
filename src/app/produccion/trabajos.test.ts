import { beforeEach, describe, expect, it, vi } from "vitest";
import { cancelarTrabajoEscaneo, crearTrabajoEscaneo, procesarSiguienteProfesor } from "./trabajos";
import { resumenVacio, type DatosLote } from "@/modules/produccion/lotes";

const dobles = vi.hoisted(() => ({
  prisma: { $transaction: vi.fn(), $executeRaw: vi.fn(), $queryRaw: vi.fn(), job: { findFirst: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn(), create: vi.fn() }, profesor: { findMany: vi.fn() } },
  ejecutarEscaneo: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: dobles.prisma }));
vi.mock("@/modules/produccion/escaneo", () => ({ ejecutarEscaneo: dobles.ejecutarEscaneo }));
vi.mock("./repositorio", () => ({ repositorioPrisma: {} }));

type Trabajo = { id: number; estado: string; avance: number; actualizadoEn: Date; datos: DatosLote; error?: string | null };
let trabajo: Trabajo;

describe("RF-020: cola persistida de escaneo", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dobles.prisma.$transaction.mockImplementation(accion => accion(dobles.prisma));
    trabajo = { id: 7, estado: "PENDIENTE", avance: 0, actualizadoEn: new Date(), datos: {
      version: 1, profesoresIds: Array.from({ length: 27 }, (_, indice) => indice + 1),
      indice: 0, resumen: resumenVacio(),
    } };
    dobles.prisma.job.findUniqueOrThrow.mockImplementation(async () => ({ ...trabajo }));
    dobles.prisma.job.updateMany.mockImplementation(async ({ where, data }) => {
      const fecha = where.actualizadoEn;
      if (typeof where.estado === "string" && where.estado !== trabajo.estado) return { count: 0 };
      if (where.estado?.in && !where.estado.in.includes(trabajo.estado)) return { count: 0 };
      if (fecha instanceof Date && fecha.getTime() !== trabajo.actualizadoEn.getTime()) return { count: 0 };
      if (where.OR && trabajo.estado !== "PENDIENTE" && !(trabajo.estado === "EN_PROCESO" &&
        trabajo.actualizadoEn < where.OR[1].actualizadoEn.lt)) return { count: 0 };
      trabajo = { ...trabajo, ...data, actualizadoEn: data.actualizadoEn ?? new Date() };
      return { count: 1 };
    });
    dobles.ejecutarEscaneo.mockResolvedValue({ ...resumenVacio(), profesoresProcesados: 1, publicacionesGuardadas: 2 });
  });

  it("continúa después del profesor 25 y solo completa al recorrer toda la lista", async () => {
    for (let indice = 0; indice < 26; indice++) await procesarSiguienteProfesor(7);
    expect(trabajo.estado).toBe("PENDIENTE");
    expect(trabajo.avance).toBe(26);
    expect(trabajo.datos.finalizadoEn).toBeUndefined();
    await procesarSiguienteProfesor(7);
    expect(trabajo.estado).toBe("COMPLETADO");
    expect(Number.isFinite(new Date(trabajo.datos.finalizadoEn!).getTime())).toBe(true);
    expect(trabajo.datos.resumen.publicacionesGuardadas).toBe(54);
    expect(dobles.ejecutarEscaneo.mock.calls.map(([opciones]) => opciones.profesorId)).toEqual(trabajo.datos.profesoresIds);
    expect(dobles.ejecutarEscaneo).toHaveBeenLastCalledWith({
      profesorId: 27, anio: undefined, fuentes: ["SCOPUS","OPENALEX","ORCID"], limiteProfesores: 1, enriquecerAutores: false,
      informarFuente: expect.any(Function),
    }, {});
  });

  it("persiste la fuente consultada sin renovar la reserva ni adelantar el avance", async () => {
    dobles.ejecutarEscaneo.mockImplementationOnce(async ({ informarFuente }) => {
      const reserva = trabajo.actualizadoEn;
      await informarFuente("OPENALEX");
      expect(trabajo.datos.fuenteEnCurso).toBe("OPENALEX");
      expect(trabajo.actualizadoEn).toEqual(reserva);
      expect(trabajo.avance).toBe(0);
      return resumenVacio();
    });
    await procesarSiguienteProfesor(7);
    expect(trabajo.datos.fuenteEnCurso).toBeNull();
    expect(trabajo.avance).toBe(1);
  });

  it("dos peticiones simultáneas no procesan el mismo profesor dos veces", async () => {
    await Promise.all([procesarSiguienteProfesor(7), procesarSiguienteProfesor(7)]);
    expect(dobles.ejecutarEscaneo).toHaveBeenCalledOnce();
    expect(trabajo.avance).toBe(1);
  });

  it("recupera una reserva expirada conservando el índice anterior", async () => {
    trabajo.estado = "EN_PROCESO";
    trabajo.actualizadoEn = new Date(Date.now() - 11 * 60_000);
    trabajo.datos.indice = 25;
    await procesarSiguienteProfesor(7);
    expect(dobles.ejecutarEscaneo).toHaveBeenCalledWith(expect.objectContaining({ profesorId: 26 }), {});
    expect(trabajo.avance).toBe(26);
  });

  it("no toma una reserva que todavía está activa", async () => {
    trabajo.estado = "EN_PROCESO";
    await procesarSiguienteProfesor(7);
    expect(dobles.ejecutarEscaneo).not.toHaveBeenCalled();
    expect(trabajo.avance).toBe(0);
  });

  it("una excepción marca FALLIDO sin guardar detalles técnicos ni adelantar el índice", async () => {
    dobles.ejecutarEscaneo.mockRejectedValue(new Error("Connection terminated unexpectedly"));
    await procesarSiguienteProfesor(7);
    expect(trabajo.estado).toBe("FALLIDO");
    expect(trabajo.avance).toBe(0);
    expect(trabajo.error).not.toContain("Connection terminated");
  });

  it("los errores de fuentes no impiden revisar los siguientes profesores y no se anuncian como éxito", async () => {
    trabajo.datos.profesoresIds = [1, 2];
    dobles.ejecutarEscaneo.mockResolvedValueOnce({ ...resumenVacio(), errores: ["HTTP_503"] });
    await procesarSiguienteProfesor(7);
    expect(trabajo.estado).toBe("PENDIENTE");
    await procesarSiguienteProfesor(7);
    expect(trabajo.estado).toBe("FALLIDO");
    expect(trabajo.avance).toBe(2);
  });

  it("una reserva vencida no permite al trabajador anterior sobrescribir el nuevo avance", async () => {
    dobles.ejecutarEscaneo.mockImplementation(async () => {
      trabajo.actualizadoEn = new Date(Date.now() + 60_000);
      return resumenVacio();
    });
    await procesarSiguienteProfesor(7);
    expect(trabajo.avance).toBe(0);
    expect(trabajo.estado).toBe("EN_PROCESO");
  });

  it("crea una instantánea ordenada de profesores activos para evitar saltos por altas o bajas", async () => {
    dobles.prisma.profesor.findMany.mockResolvedValue([{ id: 5 }, { id: 8 }]);
    await crearTrabajoEscaneo("escaneo-manual", undefined, { desde: "2025-03-01", hasta: "2025-06-30" });
    expect(dobles.prisma.profesor.findMany).toHaveBeenCalledWith({ where: { estatusLaboral: "ACTIVO" }, select: { id: true }, orderBy: { id: "asc" } });
    expect(dobles.prisma.job.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      estado: "PENDIENTE", total: 2, datos: expect.objectContaining({ profesoresIds: [5, 8], indice: 0, desde: "2025-03-01", hasta: "2025-06-30" }),
    }) });
  });

  it("con un departamento toma solo sus activos y guarda el filtro; «sin» busca a quienes no tienen uno", async () => {
    dobles.prisma.profesor.findMany.mockResolvedValue([{ id: 5 }]);
    await crearTrabajoEscaneo("escaneo-manual", undefined, undefined, ["ORCID"], false, "3");
    expect(dobles.prisma.profesor.findMany).toHaveBeenLastCalledWith({ where: { estatusLaboral: "ACTIVO", departamentoId: 3 }, select: { id: true }, orderBy: { id: "asc" } });
    expect(dobles.prisma.job.create).toHaveBeenLastCalledWith({ data: expect.objectContaining({ datos: expect.objectContaining({ profesoresIds: [5], departamento: "3" }) }) });
    await crearTrabajoEscaneo("escaneo-manual", undefined, undefined, ["ORCID"], false, "sin");
    expect(dobles.prisma.profesor.findMany).toHaveBeenLastCalledWith({ where: { estatusLaboral: "ACTIVO", departamentoId: null }, select: { id: true }, orderBy: { id: "asc" } });
  });

  it("un departamento sin profesores activos no crea un trabajo vacío; con un profesor elegido se ignora", async () => {
    dobles.prisma.profesor.findMany.mockResolvedValue([]);
    await expect(crearTrabajoEscaneo("escaneo-manual", undefined, undefined, ["ORCID"], false, "3")).rejects.toThrow("No hay profesores activos en ese departamento.");
    expect(dobles.prisma.job.create).not.toHaveBeenCalled();
    dobles.prisma.profesor.findMany.mockResolvedValue([{ id: 5 }]);
    await crearTrabajoEscaneo("escaneo-manual", 5, undefined, ["ORCID"], false, "3");
    expect(dobles.prisma.profesor.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { estatusLaboral: "ACTIVO", id: 5 } }));
    expect(dobles.prisma.job.create.mock.lastCall?.[0].data.datos.departamento).toBeUndefined();
  });

  it("si no hay profesores crea un trabajo completado con total cero", async () => {
    dobles.prisma.profesor.findMany.mockResolvedValue([]);
    await crearTrabajoEscaneo("escaneo-diario");
    expect(dobles.prisma.job.create).toHaveBeenCalledWith({ data: expect.objectContaining({ estado: "COMPLETADO", total: 0 }) });
  });

  it("rechaza la selección si el profesor dejó de estar activo antes del envío", async () => {
    dobles.prisma.profesor.findMany.mockResolvedValue([]);
    await expect(crearTrabajoEscaneo("escaneo-manual", 5)).rejects.toThrow("El profesor no está disponible para escanear.");
    expect(dobles.prisma.profesor.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 5, estatusLaboral: "ACTIVO" } }));
    expect(dobles.prisma.job.create).not.toHaveBeenCalled();
  });

  it("una reanudación consulta solo las fuentes guardadas en el trabajo", async () => {
    trabajo.datos.fuentes = ["ORCID"];
    await procesarSiguienteProfesor(7);
    expect(dobles.ejecutarEscaneo).toHaveBeenCalledWith(expect.objectContaining({ fuentes: ["ORCID"] }), {});
    expect(trabajo.datos.fuentes).toEqual(["ORCID"]);
  });

  it("no crea otra búsqueda si hay un trabajo pendiente y conserva su fecha", async () => {
    const creadoEn = new Date("2026-11-09T12:00:00Z");
    dobles.prisma.job.findFirst.mockResolvedValue({ id: 8, creadoEn, estado: "PENDIENTE" });
    await expect(crearTrabajoEscaneo("escaneo-manual")).rejects.toMatchObject({ trabajoId: 8 });
    expect(dobles.prisma.job.create).not.toHaveBeenCalled();
    expect(dobles.prisma.profesor.findMany).not.toHaveBeenCalled();
    // El bloqueo va por $executeRaw: con $queryRaw la base real falla («void» sin lector).
    expect(dobles.prisma.$executeRaw).toHaveBeenCalledOnce();
    expect(dobles.prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("las actualizaciones de avance no sobrescriben la fecha original de inicio", async () => {
    await procesarSiguienteProfesor(7);
    for (const [llamada] of dobles.prisma.job.updateMany.mock.calls) expect(llamada.data).not.toHaveProperty("creadoEn");
  });

  it("#279: crea un reintento solo con los profesores de la lista que siguen activos", async () => {
    dobles.prisma.profesor.findMany.mockResolvedValue([{ id: 3 }]);
    await crearTrabajoEscaneo("escaneo-manual", [3, 8], undefined, ["OPENALEX"]);
    expect(dobles.prisma.profesor.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { estatusLaboral: "ACTIVO", id: { in: [3, 8] } } }));
    expect(dobles.prisma.job.create).toHaveBeenCalledWith({ data: expect.objectContaining({ total: 1, datos: expect.objectContaining({ profesoresIds: [3], fuentes: ["OPENALEX"] }) }) });
  });

  it("#279: no crea un reintento si ningún profesor sigue activo", async () => {
    dobles.prisma.profesor.findMany.mockResolvedValue([]);
    await expect(crearTrabajoEscaneo("escaneo-manual", [3, 8])).rejects.toThrow("Ninguno de los profesores sigue activo para reintentar.");
    expect(dobles.prisma.job.create).not.toHaveBeenCalled();
  });

  it("#279: cancela una búsqueda pendiente y no toca una ya terminada", async () => {
    expect(await cancelarTrabajoEscaneo(7)).toBe(true);
    expect(trabajo.estado).toBe("CANCELADO");
    expect(await cancelarTrabajoEscaneo(7)).toBe(false);
  });

  it("#279: el profesor en curso no sobrescribe la cancelación ni sigue con el siguiente", async () => {
    dobles.ejecutarEscaneo.mockImplementation(async () => {
      await cancelarTrabajoEscaneo(7);
      return { ...resumenVacio(), profesoresProcesados: 1 };
    });
    await procesarSiguienteProfesor(7);
    expect(trabajo.estado).toBe("CANCELADO");
    dobles.ejecutarEscaneo.mockClear();
    await procesarSiguienteProfesor(7);
    expect(dobles.ejecutarEscaneo).not.toHaveBeenCalled();
  });
});
