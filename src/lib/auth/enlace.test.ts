import { describe, expect, it } from "vitest";
import { enlaceConfirmacion, esTipoEnlace } from "./enlace";

describe("enlaceConfirmacion", () => {
  it("apunta a /auth/confirmar del sitio, sin importar la ruta de origen", () => {
    expect(enlaceConfirmacion("https://sitio.test/login", "abc123", "recovery")).toBe(
      "https://sitio.test/auth/confirmar?token_hash=abc123&type=recovery",
    );
  });

  it("codifica el token", () => {
    expect(enlaceConfirmacion("https://sitio.test", "a&b=c", "invite")).toContain("token_hash=a%26b%3Dc");
  });
});

describe("esTipoEnlace", () => {
  it("solo acepta invitación y recuperación", () => {
    expect(esTipoEnlace("invite")).toBe(true);
    expect(esTipoEnlace("recovery")).toBe(true);
    expect(esTipoEnlace("email_change")).toBe(false);
    expect(esTipoEnlace(null)).toBe(false);
  });
});
