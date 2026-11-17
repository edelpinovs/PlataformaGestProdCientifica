import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// La acción real consulta la sesión y Supabase; aquí solo se prueba lo que dibuja el formulario.
vi.mock("./actions", () => ({ cambiarContrasena: vi.fn() }));

import { Apariencia } from "./apariencia";
import { FormularioContrasena } from "./formulario-contrasena";

describe("Mi cuenta", () => {
  beforeEach(() => vi.stubGlobal("React", React));

  it("el formulario pide los tres campos con su contraseña autocompletable correcta", () => {
    const html = renderToStaticMarkup(<FormularioContrasena />);
    expect(html).toContain('name="actual"');
    expect(html).toContain('autoComplete="current-password"');
    expect(html).toContain('name="nueva"');
    expect(html).toContain('name="confirmacion"');
    expect(html.match(/autoComplete="new-password"/g)).toHaveLength(2);
    expect(html.match(/type="password"/g)).toHaveLength(3);
  });

  it("cada campo va dentro de su label y ninguno nace marcado con error", () => {
    const html = renderToStaticMarkup(<FormularioContrasena />);
    expect(html.match(/<label/g)).toHaveLength(3);
    expect(html).not.toContain('aria-invalid="true"');
    expect(html).not.toContain('role="alert"');
  });

  it("el texto de ayuda y el botón están en español", () => {
    const html = renderToStaticMarkup(<FormularioContrasena />);
    expect(html).toContain("Contraseña actual");
    expect(html).toContain("Nueva contraseña");
    expect(html).toContain("Repite la nueva contraseña");
    expect(html).toContain("Cambiar contraseña");
    expect(html).toContain("Mínimo 8 caracteres");
  });

  it("el selector de tema ofrece Claro y Oscuro y, en el servidor, marca Claro", () => {
    const html = renderToStaticMarkup(<Apariencia />);
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Tema de la interfaz"');
    expect(html).toMatch(/aria-pressed="true"[^>]*>Claro</);
    expect(html).toMatch(/aria-pressed="false"[^>]*>Oscuro</);
  });
});
