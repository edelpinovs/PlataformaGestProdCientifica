import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Inicio del panel (issue 276): las cifras salen de `count`, sin cargar tablas completas, y
// «Vigencias por vencer» usa el mismo rango que el amarillo del semáforo de Reportes.
const dobles = vi.hoisted(() => {
  const modelo = () => ({ count: vi.fn(), findMany: vi.fn() });
  return {
    requireModulo: vi.fn(),
    prisma: {
      profesor: modelo(), cuerpoAcademico: modelo(), reconocimientoSnii: modelo(), reconocimientoProdep: modelo(),
      autoria: modelo(), perfil: modelo(), auditoria: modelo(),
    },
  };
});

vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("@/lib/prisma", () => ({ prisma: dobles.prisma }));

import AdministracionPage from "./page";

type Nodo = { props?: Record<string, unknown> };
// Junta los textos y los enlaces de un árbol de elementos de React recorriendo solo `props`.
function recorrer(nodo: unknown, textos: string[] = [], enlaces: string[] = []) {
  if (typeof nodo === "string" || typeof nodo === "number") textos.push(String(nodo));
  else if (Array.isArray(nodo)) nodo.forEach((hijo) => recorrer(hijo, textos, enlaces));
  else if (nodo && typeof nodo === "object" && "props" in nodo) {
    const props = (nodo as Nodo).props ?? {};
    if (typeof props.href === "string") enlaces.push(props.href);
    for (const valor of Object.values(props)) {
      if (typeof valor === "object" || typeof valor === "string" || typeof valor === "number") recorrer(valor, textos, enlaces);
    }
  }
  return { texto: textos.join(" "), enlaces };
}

const p = dobles.prisma;

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-24T15:00:00Z"));
  dobles.requireModulo.mockResolvedValue({ correo: "admin@ejemplo.mx", rol: "ADMINISTRADOR" });
  for (const modelo of Object.values(p)) modelo.count.mockResolvedValue(0);
  p.auditoria.findMany.mockResolvedValue([]);
});
afterEach(() => vi.useRealTimers());

describe("inicio del panel de administración (issue 276)", () => {
  it("cuenta en la base y no carga tablas completas", async () => {
    await AdministracionPage();
    for (const [nombre, modelo] of Object.entries(p)) {
      if (nombre !== "auditoria") expect(modelo.findMany, nombre).not.toHaveBeenCalled();
    }
    expect(p.auditoria.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
  });

  it("las vigencias por vencer usan el rango y los resultados del semáforo, y los cuerpos su año de vencimiento", async () => {
    await AdministracionPage();
    const esperado = {
      where: {
        resultado: { in: ["APROBADO", "EN_RECONSIDERACION"] },
        fin: { gte: new Date("2026-11-24T00:00:00Z"), lte: expect.any(Date) },
      },
    };
    expect(p.reconocimientoSnii.count).toHaveBeenCalledWith(esperado);
    expect(p.reconocimientoProdep.count).toHaveBeenCalledWith(esperado);
    const { fin } = p.reconocimientoSnii.count.mock.calls[0][0].where;
    expect(fin.lte.getUTCFullYear()).toBe(2027);
    expect(p.cuerpoAcademico.count).toHaveBeenCalledWith({ where: { anioVencimiento: { in: [2026] } } });
  });

  it("muestra las cinco tarjetas con sus cifras y enlaces", async () => {
    p.profesor.count.mockImplementation(async (args?: { where?: object }) => (args?.where ? 40 : 55));
    p.reconocimientoSnii.count.mockResolvedValue(2);
    p.reconocimientoProdep.count.mockResolvedValue(3);
    p.autoria.count.mockResolvedValue(1250);
    const { texto, enlaces } = recorrer(await AdministracionPage());
    for (const titulo of ["Profesores activos", "Cuerpos académicos", "Vigencias por vencer", "Pendientes de validación", "Usuarios con acceso"]) {
      expect(texto).toContain(titulo);
    }
    expect(texto).toContain("De 55 en el directorio");
    expect(texto).toContain("1,250");
    expect(enlaces).toEqual(expect.arrayContaining([
      "/profesores?situacion=activos", "/cuerpos-academicos", "/reportes?semaforo=AMARILLO", "/validacion", "/administracion/usuarios",
    ]));
  });

  it("«Requiere atención» suma SNII, PRODEP y CA y enlaza a donde se corrige", async () => {
    p.reconocimientoSnii.count.mockResolvedValue(2);
    p.reconocimientoProdep.count.mockResolvedValue(3);
    p.cuerpoAcademico.count.mockImplementation(async (args?: { where?: Record<string, unknown> }) =>
      args?.where && "anioVencimiento" in args.where ? 1 : 0);
    const { texto, enlaces } = recorrer(await AdministracionPage());
    expect(texto).toContain("6 vigencias vencen en los próximos 12 meses");
    expect(enlaces).toContain("/reportes?semaforo=AMARILLO");
  });

  it("sin pendientes ni actividad muestra estados vacíos", async () => {
    const { texto } = recorrer(await AdministracionPage());
    expect(texto).toContain("No hay nada pendiente por ahora.");
    expect(texto).toContain("Aún no hay actividad registrada.");
    expect(texto).toContain("Todos tienen líder");
  });

  it("la actividad reciente muestra la acción en español, la hora de México y el resumen", async () => {
    p.auditoria.findMany.mockResolvedValue([
      { id: 9, creadoEn: new Date("2026-11-25T05:30:00Z"), actorCorreo: "admin@ejemplo.mx", accion: "usuario.editado", resumen: "Cambió el rol de prueba@ejemplo.mx." },
    ]);
    const { texto, enlaces } = recorrer(await AdministracionPage());
    expect(texto).toContain("Cambió el rol de prueba@ejemplo.mx.");
    expect(texto).not.toContain("usuario.editado");
    expect(texto).toContain("24 nov 2026");
    expect(enlaces).toContain("/administracion/auditoria");
  });
});
