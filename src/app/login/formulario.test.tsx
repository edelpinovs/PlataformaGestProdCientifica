import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FormularioLogin } from "./formulario";

vi.mock("./actions", () => ({ iniciarSesion: vi.fn() }));
vi.mock("./sesion-desde-enlace", () => ({ SesionDesdeEnlace: () => null }));

describe("formulario de acceso", () => {
  const html = renderToStaticMarkup(<FormularioLogin />);

  it("desactiva la validación nativa del navegador, que muestra sus avisos en el idioma de Chrome", () => {
    // React escribe `noValidate`; el HTML no distingue mayúsculas en los nombres de atributos.
    expect(html).toMatch(/<form[^>]*\snovalidate/i);
  });

  it("conserva los campos obligatorios y de tipo correo para teclados y gestores de contraseñas", () => {
    expect(html).toMatch(/<input[^>]*name="correo"[^>]*type="email"[^>]*required|<input[^>]*type="email"[^>]*required[^>]*name="correo"/);
    expect(html).toMatch(/type="password"/);
  });

  it("no marca los campos como inválidos antes de intentar entrar", () => {
    expect(html).toContain('aria-invalid="false"');
    expect(html).not.toContain('aria-invalid="true"');
  });
});
