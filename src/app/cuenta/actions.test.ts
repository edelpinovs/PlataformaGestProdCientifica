import { beforeEach, describe, expect, it, vi } from "vitest";
import { cambiarContrasena } from "./actions";

const dobles = vi.hoisted(() => ({
  requireRol: vi.fn(),
  signInWithPassword: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ requireRol: dobles.requireRol }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { signInWithPassword: dobles.signInWithPassword, updateUser: dobles.updateUser },
  }),
}));

function formulario(extra: Record<string, string> = {}) {
  const datos = new FormData();
  const base: Record<string, string> = {
    actual: "ClaveVieja1",
    nueva: "ClaveNueva2",
    confirmacion: "ClaveNueva2",
    ...extra,
  };
  for (const [clave, valor] of Object.entries(base)) datos.set(clave, valor);
  return datos;
}

describe("cambiarContrasena", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dobles.requireRol.mockResolvedValue({ correo: "ana.demo@demo.invalid", rol: "DOCENTE" });
    dobles.signInWithPassword.mockResolvedValue({ error: null });
    dobles.updateUser.mockResolvedValue({ error: null });
  });

  it("permite a los tres roles (RNF-005) y comprueba el permiso antes de tocar Supabase", async () => {
    await cambiarContrasena({}, formulario());
    expect(dobles.requireRol).toHaveBeenCalledWith(["ADMINISTRADOR", "COORDINADOR", "DOCENTE"]);
    expect(dobles.requireRol.mock.invocationCallOrder[0]).toBeLessThan(
      dobles.signInWithPassword.mock.invocationCallOrder[0],
    );
  });

  it("sin permiso no llega a Supabase", async () => {
    dobles.requireRol.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(cambiarContrasena({}, formulario())).rejects.toThrow("NEXT_REDIRECT");
    expect(dobles.signInWithPassword).not.toHaveBeenCalled();
    expect(dobles.updateUser).not.toHaveBeenCalled();
  });

  it("con datos inválidos devuelve el mensaje y el campo, sin consultar Supabase", async () => {
    const estado = await cambiarContrasena({}, formulario({ confirmacion: "OtraClave3" }));
    expect(estado.error).toBe("Las contraseñas no coinciden.");
    expect(estado.campo).toBe("confirmacion");
    expect(dobles.signInWithPassword).not.toHaveBeenCalled();
  });

  it("verifica la contraseña actual con el correo de la sesión, no con uno enviado por el navegador", async () => {
    await cambiarContrasena({}, formulario({ correo: "otra.persona@demo.invalid" }));
    expect(dobles.signInWithPassword).toHaveBeenCalledWith({
      email: "ana.demo@demo.invalid",
      password: "ClaveVieja1",
    });
  });

  it("con la contraseña actual equivocada no guarda nada", async () => {
    dobles.signInWithPassword.mockResolvedValue({ error: { code: "invalid_credentials", message: "Invalid login credentials" } });
    const estado = await cambiarContrasena({}, formulario());
    expect(estado).toMatchObject({ campo: "actual", error: "La contraseña actual no es correcta." });
    expect(dobles.updateUser).not.toHaveBeenCalled();
  });

  it("si falla la comprobación por otra causa no culpa a la persona ni muestra texto de la librería", async () => {
    dobles.signInWithPassword.mockResolvedValue({ error: { code: "over_request_rate_limit", message: "Rate limit exceeded" } });
    const estado = await cambiarContrasena({}, formulario());
    expect(estado.campo).toBeUndefined();
    expect(estado.error).toBe("No se pudo comprobar tu contraseña actual. Inténtalo de nuevo en unos minutos.");
    expect(estado.error).not.toMatch(/rate limit/i);
    expect(dobles.updateUser).not.toHaveBeenCalled();
  });

  it("guarda la contraseña nueva y avisa del éxito", async () => {
    const estado = await cambiarContrasena({}, formulario());
    expect(dobles.updateUser).toHaveBeenCalledWith({ password: "ClaveNueva2" });
    expect(estado.exito).toBe("Tu contraseña se actualizó.");
    expect(estado.error).toBeUndefined();
  });

  it("traduce el rechazo de Supabase al guardar", async () => {
    dobles.updateUser.mockResolvedValue({ error: { code: "weak_password", message: "Password is too weak" } });
    const estado = await cambiarContrasena({}, formulario());
    expect(estado).toMatchObject({
      campo: "nueva",
      error: "La contraseña es demasiado débil. Usa una más larga o variada.",
    });
    expect(estado.exito).toBeUndefined();
  });
});
