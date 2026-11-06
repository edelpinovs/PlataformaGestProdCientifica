import { describe, expect, it } from "vitest";
import { cifrarClaveScopus, descifrarClaveScopus, resolverClaveScopus, claveScopusEsquema, mensajeConexionScopus } from "./configuracion-scopus";

const maestra = "ab".repeat(32);
describe("Configuración cifrada de Scopus", () => {
  it("cifra con nonces distintos y recupera el valor", () => {
    const uno = cifrarClaveScopus("clave-ficticia", maestra);
    const dos = cifrarClaveScopus("clave-ficticia", maestra);
    expect(uno).not.toBe(dos);
    expect(uno).not.toContain("clave-ficticia");
    expect(descifrarClaveScopus(uno, maestra)).toBe("clave-ficticia");
  });
  it("rechaza manipulación, clave incorrecta y formatos inválidos con error seguro", () => {
    const cifrada = cifrarClaveScopus("clave-ficticia", maestra);
    for (const valor of [cifrada.slice(0, -2) + (cifrada.endsWith("00") ? "ff" : "00"), "v1:mal", ""]) {
      expect(() => descifrarClaveScopus(valor, maestra)).toThrow("No se pudo abrir la configuración");
    }
    expect(() => descifrarClaveScopus(cifrada, "cd".repeat(32))).toThrow("No se pudo abrir");
    expect(() => cifrarClaveScopus("clave-ficticia", undefined)).toThrow("protección de claves");
  });
  it("prioriza la app y no usa el respaldo ante un fallo de descifrado", () => {
    expect(resolverClaveScopus(undefined, undefined, "respaldo")).toBe("respaldo");
    expect(resolverClaveScopus(cifrarClaveScopus("app", maestra), maestra, "respaldo")).toBe("app");
    expect(() => resolverClaveScopus("roto", maestra, "respaldo")).toThrow();
  });
  it("valida entradas y traduce fallos de conexión", () => {
    for (const valor of [null, "", "a b", "x".repeat(257)]) expect(claveScopusEsquema.safeParse(valor).success).toBe(false);
    expect(mensajeConexionScopus(200, true)).toBeNull();
    expect(mensajeConexionScopus(200, false)).toContain("No se pudo");
    expect(mensajeConexionScopus(403, false)).toContain("rechazó");
    expect(mensajeConexionScopus(429, false)).toContain("cuota");
  });
});
