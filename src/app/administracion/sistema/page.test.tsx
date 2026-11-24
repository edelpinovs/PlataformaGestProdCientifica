import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// La página de estado del sistema responde siempre dentro del tiempo límite, aunque la base no conteste
// (issue 279): el ping y la lectura de la clave de Scopus, que usa la misma base, tienen el mismo límite.
const dobles = vi.hoisted(() => ({
  requireModulo: vi.fn(),
  estadoScopus: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: dobles.queryRaw } }));
vi.mock("@/app/produccion/configuracion-scopus", () => ({ estadoConfiguracionScopus: dobles.estadoScopus }));

import { LIMITE_COMPROBACION_MS } from "@/modules/administracion/sistema";
import SistemaPage from "./page";

// Junta los textos de un árbol de elementos de React recorriendo solo `props` (el `type` puede ser circular).
function texto(nodo: unknown, salida: string[] = []): string {
  if (typeof nodo === "string" || typeof nodo === "number") salida.push(String(nodo));
  else if (Array.isArray(nodo)) nodo.forEach((hijo) => texto(hijo, salida));
  else if (nodo && typeof nodo === "object" && "props" in nodo) {
    const props = (nodo as { props: Record<string, unknown> }).props;
    for (const valor of Object.values(props)) {
      if (typeof valor === "object" || typeof valor === "string") texto(valor, salida);
    }
  }
  return salida.join(" ");
}

const colgada = () => new Promise<never>(() => {});

beforeEach(() => {
  vi.resetAllMocks();
  dobles.requireModulo.mockResolvedValue({ correo: "admin@ejemplo.mx", rol: "ADMINISTRADOR" });
  dobles.queryRaw.mockResolvedValue([{ "?column?": 1 }]);
  dobles.estadoScopus.mockResolvedValue({ configurada: true, origen: "Aplicación", protegida: true });
});
afterEach(() => vi.useRealTimers());

describe("página de estado del sistema", () => {
  it("con todo sano muestra los servicios como funcionando", async () => {
    const html = texto(await SistemaPage());
    expect(html).toContain("Responde");
    expect(html).toContain("Configurada");
    expect(html).toContain("Activa");
    expect(html).not.toContain("No se pudo comprobar");
  });

  it("si la base no contesta, responde al pasar el límite y lo dice", async () => {
    vi.useFakeTimers();
    dobles.queryRaw.mockReturnValue(colgada());
    const pendiente = SistemaPage();
    await vi.advanceTimersByTimeAsync(LIMITE_COMPROBACION_MS);
    const html = texto(await pendiente);
    expect(html).toContain("No responde");
    expect(html).toContain("No respondió en 3 segundos");
  });

  it("si la base y la lectura de la clave de Scopus no contestan, la página igual responde al pasar el límite", async () => {
    vi.useFakeTimers();
    dobles.queryRaw.mockReturnValue(colgada());
    dobles.estadoScopus.mockReturnValue(colgada());
    let terminada = false;
    const pendiente = SistemaPage().then((p) => {
      terminada = true;
      return p;
    });
    await vi.advanceTimersByTimeAsync(LIMITE_COMPROBACION_MS - 1);
    expect(terminada).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const html = texto(await pendiente);
    expect(html).toContain("No respondió en 3 segundos");
    expect(html).toContain("No se pudo comprobar");
  });

  it("si falla la lectura de la clave de Scopus no la da por «sin configurar» ni muestra el error", async () => {
    dobles.estadoScopus.mockRejectedValue(new Error("clave ilegible: secreto-123"));
    const html = texto(await SistemaPage());
    expect(html).toContain("No se pudo comprobar");
    expect(html).not.toContain("Sin configurar");
    expect(html).not.toContain("secreto-123");
  });

  it("exige el permiso del módulo antes de consultar nada", async () => {
    dobles.requireModulo.mockRejectedValue(new Error("Sin permiso"));
    await expect(SistemaPage()).rejects.toThrow("Sin permiso");
    expect(dobles.queryRaw).not.toHaveBeenCalled();
    expect(dobles.estadoScopus).not.toHaveBeenCalled();
  });
});
