import { beforeEach, describe, expect, it, vi } from "vitest";

// RNF-005: cada página del panel de administración empieza con `requireModulo("administracion")` y, si la
// persona no tiene permiso, no consulta nada. El permiso real (solo ADMINISTRADOR) lo define `registry.ts`.
const dobles = vi.hoisted(() => ({ requireModulo: vi.fn(), consulta: vi.fn(), estadoScopus: vi.fn() }));

vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
// Cualquier consulta a cualquier modelo de Prisma cae en `dobles.consulta`, que no debe llamarse sin permiso.
vi.mock("@/lib/prisma", () => ({
  prisma: new Proxy({}, { get: () => new Proxy({}, { get: () => dobles.consulta }), }),
  default: undefined,
}));
vi.mock("@/app/produccion/configuracion-scopus", () => ({ estadoConfiguracionScopus: dobles.estadoScopus }));
vi.mock("@/app/produccion/trabajos", () => ({ TIPOS_ESCANEO: ["escaneo-manual", "escaneo-diario"] }));
vi.mock("./usuarios/fila-usuario", () => ({ FilaUsuario: () => null }));

import AdministracionPage from "./page";
import AuditoriaPage from "./auditoria/page";
import CalidadPage from "./calidad/page";
import EscaneoPage from "./escaneo/page";
import SistemaPage from "./sistema/page";
import UsuariosPage from "./usuarios/page";

const PAGINAS: [string, (props: unknown) => Promise<unknown>][] = [
  ["/administracion", AdministracionPage as (props: unknown) => Promise<unknown>],
  ["/administracion/usuarios", UsuariosPage as (props: unknown) => Promise<unknown>],
  ["/administracion/auditoria", AuditoriaPage as (props: unknown) => Promise<unknown>],
  ["/administracion/calidad", CalidadPage as (props: unknown) => Promise<unknown>],
  ["/administracion/escaneo", EscaneoPage as (props: unknown) => Promise<unknown>],
  ["/administracion/sistema", SistemaPage as (props: unknown) => Promise<unknown>],
];

describe("permisos de las páginas del panel de administración", () => {
  beforeEach(() => vi.resetAllMocks());

  it.each(PAGINAS)("%s exige el permiso del módulo antes de consultar nada", async (_ruta, pagina) => {
    dobles.requireModulo.mockRejectedValue(new Error("Sin permiso"));
    await expect(pagina({ searchParams: Promise.resolve({}) })).rejects.toThrow("Sin permiso");
    expect(dobles.requireModulo).toHaveBeenCalledWith("administracion");
    expect(dobles.consulta).not.toHaveBeenCalled();
    expect(dobles.estadoScopus).not.toHaveBeenCalled();
  });
});
