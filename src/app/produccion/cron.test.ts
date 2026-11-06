import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/cron/escaneo/route";

const dobles = vi.hoisted(() => ({
  crearTrabajoEscaneo: vi.fn(), obtenerTrabajoPendiente: vi.fn(), procesarSiguienteProfesor: vi.fn(),
  findUnique: vi.fn(), tareas: [] as (() => Promise<void>)[],
}));
vi.mock("./trabajos", () => dobles);
vi.mock("@/lib/prisma", () => ({ prisma: { job: { findUnique: dobles.findUnique } } }));
vi.mock("next/server", async (importar) => ({
  ...await importar<typeof import("next/server")>(),
  after: (tarea: () => Promise<void>) => { dobles.tareas.push(tarea); },
}));

function peticion(clave = "clave-ficticia") {
  return new Request("http://localhost/api/cron/escaneo", { headers: { authorization: `Bearer ${clave}` } });
}

describe("RF-020: cron reanudable", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("CRON_SECRET", "clave-ficticia");
    dobles.tareas.length = 0;
    dobles.obtenerTrabajoPendiente.mockResolvedValue(null);
    dobles.crearTrabajoEscaneo.mockResolvedValue({ id: 8, estado: "PENDIENTE" });
    dobles.findUnique.mockResolvedValue({ estado: "PENDIENTE" });
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  it("rechaza credenciales incorrectas antes de leer o crear trabajos", async () => {
    expect((await GET(peticion("incorrecta"))).status).toBe(401);
    expect(dobles.obtenerTrabajoPendiente).not.toHaveBeenCalled();
  });
  it("rechaza la llamada si no hay secreto configurado", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(peticion(""))).status).toBe(401);
  });
  it("responde antes de procesar y limita la ejecución a 25 puntos de recuperación", async () => {
    expect((await GET(peticion())).status).toBe(202);
    expect(dobles.procesarSiguienteProfesor).not.toHaveBeenCalled();
    await dobles.tareas[0]();
    expect(dobles.procesarSiguienteProfesor).toHaveBeenCalledTimes(25);
  });
  it("la siguiente llamada retoma el trabajo existente en lugar de reiniciar los primeros profesores", async () => {
    dobles.obtenerTrabajoPendiente.mockResolvedValue({ id: 7, estado: "PENDIENTE", avance: 25 });
    dobles.findUnique.mockResolvedValue({ estado: "COMPLETADO" });
    await GET(peticion());
    await dobles.tareas[0]();
    expect(dobles.crearTrabajoEscaneo).not.toHaveBeenCalled();
    expect(dobles.procesarSiguienteProfesor).toHaveBeenCalledExactlyOnceWith(7);
  });
  it("no compite con un trabajador que conserva la reserva", async () => {
    dobles.findUnique.mockResolvedValue({ estado: "EN_PROCESO" });
    await GET(peticion());
    await dobles.tareas[0]();
    expect(dobles.procesarSiguienteProfesor).toHaveBeenCalledOnce();
  });
  it("deja de iniciar profesores cuando se agota el presupuesto de tiempo", async () => {
    vi.spyOn(Date, "now").mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValue(180_001);
    await GET(peticion());
    await dobles.tareas[0]();
    expect(dobles.procesarSiguienteProfesor).toHaveBeenCalledOnce();
  });
  it("un error de base devuelve un mensaje legible sin detalles técnicos", async () => {
    dobles.obtenerTrabajoPendiente.mockRejectedValue(new Error("Connection terminated unexpectedly"));
    const respuesta = await GET(peticion());
    expect(respuesta.status).toBe(500);
    expect(await respuesta.text()).not.toContain("Connection terminated");
  });
});
