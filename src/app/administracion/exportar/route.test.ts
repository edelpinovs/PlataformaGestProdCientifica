import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const dobles = vi.hoisted(() => ({
  requireModulo: vi.fn(),
  cargarHallazgos: vi.fn(),
  perfil: { count: vi.fn(), findMany: vi.fn() },
  auditoria: { count: vi.fn(), findMany: vi.fn(), create: vi.fn() },
}));
vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("@/lib/prisma", () => ({ prisma: dobles }));
vi.mock("../calidad/cargar", () => ({ cargarHallazgos: dobles.cargarHallazgos }));

const pedir = (consulta = "") => GET(new Request(`http://localhost/administracion/exportar${consulta}`));
const ADMIN = { id: "11111111-1111-4111-8111-111111111111", correo: "admin@ejemplo.mx", rol: "ADMINISTRADOR" };

beforeEach(() => {
  vi.resetAllMocks();
  dobles.requireModulo.mockResolvedValue(ADMIN);
  dobles.perfil.count.mockResolvedValue(1);
  dobles.perfil.findMany.mockResolvedValue([
    { correo: "a@ejemplo.mx", rol: "DOCENTE", activo: true, profesor: { codigo: "100", nombres: "Ana", apellidos: "Pérez" } },
  ]);
  dobles.auditoria.count.mockResolvedValue(1);
  dobles.auditoria.findMany.mockResolvedValue([
    { creadoEn: new Date("2026-11-23T18:00:00Z"), actorCorreo: "admin@ejemplo.mx", modulo: "administracion", accion: "usuario.editado", resumen: "Cambió algo." },
  ]);
  dobles.auditoria.create.mockResolvedValue({});
  dobles.cargarHallazgos.mockResolvedValue([
    { clave: "CA_SIN_LIDER:1", regla: "CA_SIN_LIDER", severidad: "aviso", registro: "CA-1 · Química", detalle: "No tiene un líder asignado.", enlace: "/cuerpos-academicos/1" },
  ]);
});

describe("exportar listados del panel (issue 244)", () => {
  it("exige el permiso del módulo antes de leer datos", async () => {
    dobles.requireModulo.mockRejectedValue(new Error("sin permiso"));
    await expect(pedir("?listado=usuarios&formato=xlsx")).rejects.toThrow("sin permiso");
    expect(dobles.requireModulo).toHaveBeenCalledWith("administracion");
    expect(dobles.perfil.findMany).not.toHaveBeenCalled();
    expect(dobles.auditoria.create).not.toHaveBeenCalled();
  });

  it("entrega un Excel de usuarios con el tipo y el nombre de archivo correctos", async () => {
    const r = await pedir("?listado=usuarios&formato=xlsx");
    expect(r.status).toBe(200);
    expect(r.headers.get("Content-Type")).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(r.headers.get("Content-Disposition")).toBe('attachment; filename="usuarios-y-roles.xlsx"');
    expect(r.headers.get("Cache-Control")).toBe("no-store");
    const bytes = new Uint8Array(await r.arrayBuffer());
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe("PK");
  });

  it("entrega un PDF de la bitácora", async () => {
    const r = await pedir("?listado=auditoria&formato=pdf");
    expect(r.headers.get("Content-Type")).toBe("application/pdf");
    expect(r.headers.get("Content-Disposition")).toBe('attachment; filename="auditoria.pdf"');
    expect(new TextDecoder().decode(new Uint8Array(await r.arrayBuffer()).slice(0, 4))).toBe("%PDF");
  });

  it("exporta la calidad de datos con los filtros de la URL", async () => {
    const r = await pedir("?listado=calidad&formato=xlsx&regla=CA_SIN_LIDER&q=quimica");
    expect(r.status).toBe(200);
    expect(dobles.cargarHallazgos).toHaveBeenCalledTimes(1);
  });

  it("aplica la búsqueda y los filtros al consultar, sin paginar", async () => {
    await pedir("?listado=usuarios&formato=xlsx&q=ana&rol=DOCENTE&estado=ACTIVO");
    const consulta = dobles.perfil.findMany.mock.calls[0][0];
    expect(consulta.where).toMatchObject({ rol: "DOCENTE", activo: true });
    expect(consulta.where.OR).toBeDefined();
    expect(consulta).not.toHaveProperty("skip");
    expect(consulta).not.toHaveProperty("take");
  });

  it("deja constancia en la bitácora de quién exportó qué y cuántas filas", async () => {
    await pedir("?listado=usuarios&formato=pdf");
    expect(dobles.auditoria.create).toHaveBeenCalledWith({
      data: {
        actorId: ADMIN.id,
        actorCorreo: "admin@ejemplo.mx",
        modulo: "administracion",
        accion: "listado.exportado",
        entidad: "Listado",
        entidadId: "usuarios",
        resumen: "Exportó el listado de usuarios y roles a PDF (1 fila).",
      },
    });
  });

  it("si no se puede registrar en la bitácora, no entrega el archivo", async () => {
    dobles.auditoria.create.mockRejectedValue(new Error("falla de la bitácora"));
    await expect(pedir("?listado=usuarios&formato=xlsx")).rejects.toThrow("falla de la bitácora");
  });

  it("rechaza con mensajes en español un listado o formato inválidos, sin leer datos", async () => {
    const sinListado = await pedir("?formato=xlsx");
    expect(sinListado.status).toBe(400);
    expect(await sinListado.text()).toBe("Elige qué listado exportar.");
    const formato = await pedir("?listado=usuarios&formato=csv");
    expect(await formato.text()).toBe("Elige Excel o PDF.");
    expect(dobles.perfil.findMany).not.toHaveBeenCalled();
    expect(dobles.auditoria.create).not.toHaveBeenCalled();
  });

  it("rechaza un filtro inválido en lugar de exportar todo", async () => {
    const r = await pedir("?listado=usuarios&formato=xlsx&rol=SUPERUSUARIO");
    expect(r.status).toBe(400);
    expect((await r.text()).startsWith("No se pudo exportar:")).toBe(true);
    expect(dobles.perfil.findMany).not.toHaveBeenCalled();
  });

  it("pide acotar la búsqueda cuando hay demasiadas filas y no arma el archivo", async () => {
    dobles.auditoria.count.mockResolvedValue(10_001);
    const r = await pedir("?listado=auditoria&formato=xlsx");
    expect(r.status).toBe(400);
    expect(await r.text()).toContain("Acota la búsqueda con filtros");
    expect(dobles.auditoria.findMany).not.toHaveBeenCalled();
    expect(dobles.auditoria.create).not.toHaveBeenCalled();
  });
});
