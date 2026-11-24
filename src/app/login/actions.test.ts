import { beforeEach, describe, expect, it, vi } from "vitest";
import { iniciarSesion } from "./actions";

const dobles = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  findUnique: vi.fn(),
  poner: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: { perfil: { findUnique: dobles.findUnique } } }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signInWithPassword: dobles.signInWithPassword } }),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: dobles.poner }) }));
vi.mock("next/navigation", () => ({ redirect: dobles.redirect }));

function formulario() {
  const datos = new FormData();
  datos.set("correo", "ana.demo@demo.invalid");
  datos.set("contrasena", "ClaveDemo1");
  return datos;
}

describe("iniciarSesion y el tema guardado (issue 283)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dobles.signInWithPassword.mockResolvedValue({ data: { user: { id: "perfil-1" } }, error: null });
    dobles.redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  it("con tema guardado escribe la cookie que lee layout.tsx y entra", async () => {
    dobles.findUnique.mockResolvedValue({ tema: "oscuro" });
    await expect(iniciarSesion({}, formulario())).rejects.toThrow("NEXT_REDIRECT");
    expect(dobles.findUnique).toHaveBeenCalledWith({ where: { id: "perfil-1" }, select: { tema: true } });
    expect(dobles.poner).toHaveBeenCalledWith(
      "tema",
      "oscuro",
      expect.objectContaining({ path: "/", maxAge: 31536000, sameSite: "lax", httpOnly: false }),
    );
    expect(dobles.redirect).toHaveBeenCalledWith("/");
  });

  it("sin tema guardado no toca la cookie: queda el del navegador", async () => {
    dobles.findUnique.mockResolvedValue({ tema: null });
    await expect(iniciarSesion({}, formulario())).rejects.toThrow("NEXT_REDIRECT");
    expect(dobles.poner).not.toHaveBeenCalled();
  });

  it("un valor no reconocido en el perfil se ignora", async () => {
    dobles.findUnique.mockResolvedValue({ tema: "sistema" });
    await expect(iniciarSesion({}, formulario())).rejects.toThrow("NEXT_REDIRECT");
    expect(dobles.poner).not.toHaveBeenCalled();
  });

  it("si la base falla al leer el tema, igual inicia sesión", async () => {
    dobles.findUnique.mockRejectedValue(new Error("Can't reach database server"));
    await expect(iniciarSesion({}, formulario())).rejects.toThrow("NEXT_REDIRECT");
    expect(dobles.redirect).toHaveBeenCalledWith("/");
  });

  it("con contraseña incorrecta no lee el perfil ni escribe la cookie", async () => {
    dobles.signInWithPassword.mockResolvedValue({ data: { user: null }, error: { message: "Invalid login credentials" } });
    const estado = await iniciarSesion({}, formulario());
    expect(estado.error).toBe("El correo o la contraseña no coinciden.");
    expect(dobles.findUnique).not.toHaveBeenCalled();
    expect(dobles.poner).not.toHaveBeenCalled();
  });
});
