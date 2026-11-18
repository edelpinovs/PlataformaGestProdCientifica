import { beforeEach, describe, expect, it, vi } from "vitest";
import { cambiarContrasena, registrarAcceso } from "./actions";

const dobles = vi.hoisted(() => ({
  requireRol: vi.fn(),
  signInWithPassword: vi.fn(),
  updateUser: vi.fn(),
  accesoModulo: { findUnique: vi.fn(), upsert: vi.fn() },
}));

vi.mock("@/lib/auth/session", () => ({ requireRol: dobles.requireRol }));
vi.mock("@/lib/prisma", () => ({ prisma: dobles }));
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

describe("registrarAcceso", () => {
  const PERFIL = "6f1c2f6e-0000-4000-8000-000000000001";

  beforeEach(() => {
    vi.resetAllMocks();
    dobles.requireRol.mockResolvedValue({ id: PERFIL, correo: "ana.demo@demo.invalid", rol: "COORDINADOR" });
    dobles.accesoModulo.findUnique.mockResolvedValue(null);
    dobles.accesoModulo.upsert.mockResolvedValue({});
  });

  it("exige sesión de cualquiera de los tres roles antes de leer o escribir (RNF-005)", async () => {
    await registrarAcceso("profesores");
    expect(dobles.requireRol).toHaveBeenCalledWith(["ADMINISTRADOR", "COORDINADOR", "DOCENTE"]);
    expect(dobles.requireRol.mock.invocationCallOrder[0]).toBeLessThan(
      dobles.accesoModulo.findUnique.mock.invocationCallOrder[0],
    );
  });

  it("sin permiso no toca la base", async () => {
    dobles.requireRol.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(registrarAcceso("profesores")).rejects.toThrow("NEXT_REDIRECT");
    expect(dobles.accesoModulo.findUnique).not.toHaveBeenCalled();
    expect(dobles.accesoModulo.upsert).not.toHaveBeenCalled();
  });

  it("la primera visita crea la fila con el perfil de la sesión", async () => {
    await registrarAcceso("profesores");
    expect(dobles.accesoModulo.upsert).toHaveBeenCalledTimes(1);
    const llamada = dobles.accesoModulo.upsert.mock.calls[0][0];
    expect(llamada.where).toEqual({ perfilId_modulo: { perfilId: PERFIL, modulo: "profesores" } });
    expect(llamada.create).toEqual({ perfilId: PERFIL, modulo: "profesores" });
    expect(llamada.update.conteo).toEqual({ increment: 1 });
    expect(llamada.update.ultimoAcceso).toBeInstanceOf(Date);
  });

  it("no escribe si el slug no es un módulo, o el rol no tiene acceso a él", async () => {
    for (const slug of ["inicio", "cuenta", "", "catalogos", null, undefined, 3, { slug: "profesores" }]) {
      await registrarAcceso(slug);
    }
    expect(dobles.accesoModulo.upsert).not.toHaveBeenCalled();
  });

  it("no suma otra visita dentro de la ventana de 30 minutos", async () => {
    dobles.accesoModulo.findUnique.mockResolvedValue({ ultimoAcceso: new Date(Date.now() - 5 * 60 * 1000) });
    await registrarAcceso("profesores");
    expect(dobles.accesoModulo.upsert).not.toHaveBeenCalled();
  });

  it("suma otra visita cuando la anterior ya pasó de la ventana", async () => {
    dobles.accesoModulo.findUnique.mockResolvedValue({ ultimoAcceso: new Date(Date.now() - 45 * 60 * 1000) });
    await registrarAcceso("profesores");
    expect(dobles.accesoModulo.upsert).toHaveBeenCalledTimes(1);
  });

  it("una falla de la base no rompe la navegación", async () => {
    dobles.accesoModulo.findUnique.mockRejectedValue(new Error("connection refused"));
    await expect(registrarAcceso("profesores")).resolves.toBeUndefined();
    dobles.accesoModulo.findUnique.mockResolvedValue(null);
    dobles.accesoModulo.upsert.mockRejectedValue(new Error("P2002"));
    await expect(registrarAcceso("profesores")).resolves.toBeUndefined();
  });
});
