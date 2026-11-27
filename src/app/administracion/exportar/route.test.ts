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

const pedir = (consulta = "", cabeceras: Record<string, string> = {}) =>
  GET(new Request(`http://localhost/administracion/exportar${consulta}`, { headers: cabeceras }));
const ADMIN = { id: "11111111-1111-4111-8111-111111111111", correo: "admin@ejemplo.mx", rol: "ADMINISTRADOR" };

beforeEach(() => {
  vi.resetAllMocks();
  dobles.requireModulo.mockResolvedValue(ADMIN);
  dobles.perfil.count.mockResolvedValue(1);
  dobles.perfil.findMany.mockResolvedValue([
    { correo: "a@ejemplo.mx", rol: "DOCENTE", activo: true, creadoEn: new Date("2026-11-20T18:00:00Z"), profesor: { codigo: "100", nombres: "Ana", apellidos: "Pérez" } },
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

  it("sin filtro, la calidad de datos incluye «Sin perfil de acceso», que la pantalla oculta (#348)", async () => {
    dobles.cargarHallazgos.mockResolvedValue([
      { clave: "CA_SIN_LIDER:1", regla: "CA_SIN_LIDER", severidad: "aviso", registro: "CA-1 · Química", detalle: "No tiene un líder asignado.", enlace: "/cuerpos-academicos/1" },
      { clave: "SIN_PERFIL:7", regla: "SIN_PERFIL", severidad: "aviso", registro: "900 · Profesor Demo", detalle: "Aún no tiene perfil.", enlace: "/administracion/usuarios" },
    ]);
    await pedir("?listado=calidad&formato=xlsx");
    expect(dobles.auditoria.create.mock.calls[0][0].data.resumen).toBe("Exportó el listado de calidad de datos a Excel (2 filas).");

    await pedir("?listado=calidad&formato=xlsx&regla=CA_SIN_LIDER");
    expect(dobles.auditoria.create.mock.calls[1][0].data.resumen).toContain("(1 fila)");
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

  it("anota en la bitácora los filtros usados y que hubo búsqueda, sin guardar el texto buscado", async () => {
    await pedir("?listado=usuarios&formato=xlsx&rol=COORDINADOR&estado=DESACTIVADO&q=ana%40ejemplo.mx");
    const resumen = dobles.auditoria.create.mock.calls[0][0].data.resumen as string;
    expect(resumen).toBe(
      "Exportó el listado de usuarios y roles a Excel (1 fila). Filtros: rol Coordinación de Investigación, estado Desactivado, con búsqueda de texto.",
    );
    expect(resumen).not.toContain("ana@ejemplo.mx");
  });

  it("si no se puede registrar en la bitácora, no entrega el archivo y responde en español sin repetir el error", async () => {
    dobles.auditoria.create.mockRejectedValue(new Error("connection terminated: password authentication failed"));
    const r = await pedir("?listado=usuarios&formato=xlsx");
    expect(r.status).toBe(500);
    expect(r.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    const texto = await r.text();
    expect(texto).toBe("No se pudo registrar la descarga en la bitácora. Inténtalo de nuevo.");
    expect(texto).not.toContain("password");
  });

  it("rechaza con 403 un pedido que el navegador marca como de otro sitio, sin leer datos ni registrar", async () => {
    const r = await pedir("?listado=usuarios&formato=xlsx", { "Sec-Fetch-Site": "cross-site" });
    expect(r.status).toBe(403);
    expect(await r.text()).toBe("La descarga solo se puede pedir desde el panel de administración.");
    expect(dobles.perfil.findMany).not.toHaveBeenCalled();
    expect(dobles.auditoria.create).not.toHaveBeenCalled();
  });

  it.each(["same-origin", "none", "same-site"])("acepta un pedido con Sec-Fetch-Site «%s»", async (valor) => {
    const r = await pedir("?listado=usuarios&formato=xlsx", { "Sec-Fetch-Site": valor });
    expect(r.status).toBe(200);
  });

  it("el permiso se exige antes de mirar de dónde viene el pedido", async () => {
    dobles.requireModulo.mockRejectedValue(new Error("sin permiso"));
    await expect(pedir("?listado=usuarios&formato=xlsx", { "Sec-Fetch-Site": "cross-site" })).rejects.toThrow("sin permiso");
  });

  it("un PDF con más de 2 000 filas se rechaza y sugiere el Excel, que sí admite hasta 10 000", async () => {
    dobles.auditoria.count.mockResolvedValue(5_000);
    const pdf = await pedir("?listado=auditoria&formato=pdf");
    expect(pdf.status).toBe(400);
    expect(await pdf.text()).toBe(
      "Hay 5,000 registros y un PDF admite como máximo 2,000. Descárgalo en Excel (hasta 10,000) o acota la búsqueda con filtros.",
    );
    expect(dobles.auditoria.findMany).not.toHaveBeenCalled();
    const excel = await pedir("?listado=auditoria&formato=xlsx");
    expect(excel.status).toBe(200);
  });

  it("un PDF con exactamente 2 000 filas todavía se entrega", async () => {
    dobles.auditoria.count.mockResolvedValue(2_000);
    const r = await pedir("?listado=auditoria&formato=pdf");
    expect(r.status).toBe(200);
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
