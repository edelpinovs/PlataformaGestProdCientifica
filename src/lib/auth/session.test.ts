import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPerfil, requireRol } from "./session";

const dobles = vi.hoisted(() => ({
  getUser: vi.fn(),
  findUnique: vi.fn(),
  redirect: vi.fn((ruta: string) => {
    throw new Error(`redirige a ${ruta}`);
  }),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: dobles.getUser } }) }));
vi.mock("@/lib/prisma", () => ({ prisma: { perfil: { findUnique: dobles.findUnique } } }));
vi.mock("next/navigation", () => ({ redirect: dobles.redirect }));

const perfil = { id: "u1", correo: "a@ejemplo.mx", rol: "ADMINISTRADOR", activo: true };

beforeEach(() => {
  vi.clearAllMocks();
  dobles.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
  dobles.findUnique.mockResolvedValue(perfil);
});

describe("sesión y perfil desactivado", () => {
  it("devuelve el perfil activo", async () => {
    expect(await getPerfil()).toEqual(perfil);
  });

  it("un perfil desactivado se trata como sin acceso", async () => {
    dobles.findUnique.mockResolvedValue({ ...perfil, activo: false });
    expect(await getPerfil()).toBeNull();
  });

  it("sin usuario de sesión o sin perfil tampoco hay acceso", async () => {
    dobles.getUser.mockResolvedValue({ data: { user: null } });
    expect(await getPerfil()).toBeNull();
    dobles.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    dobles.findUnique.mockResolvedValue(null);
    expect(await getPerfil()).toBeNull();
  });

  it("requireRol manda a iniciar sesión a un perfil desactivado, aunque su rol sea el permitido", async () => {
    dobles.findUnique.mockResolvedValue({ ...perfil, activo: false });
    await expect(requireRol(["ADMINISTRADOR"])).rejects.toThrow("redirige a /login");
  });

  it("requireRol deja pasar a un perfil activo con el rol permitido y rechaza otro rol", async () => {
    expect(await requireRol(["ADMINISTRADOR"])).toEqual(perfil);
    await expect(requireRol(["COORDINADOR"])).rejects.toThrow("redirige a /?error=sin-permiso");
  });
});
