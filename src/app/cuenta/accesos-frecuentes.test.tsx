import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { accesosFrecuentes, modulosDelRol } from "@/modules/cuenta/accesos";
import { AccesosFrecuentes } from "./accesos-frecuentes";

const sugeridos = (rol: "ADMINISTRADOR" | "DOCENTE") =>
  modulosDelRol(rol).map((m) => ({ slug: m.slug, nombre: m.nombre, descripcion: m.descripcion, href: `/${m.slug}` }));

describe("panel Accesos frecuentes", () => {
  beforeEach(() => vi.stubGlobal("React", React));

  it("muestra los módulos más usados, en orden, con enlace y número de visitas", () => {
    const accesos = accesosFrecuentes(
      [
        { modulo: "profesores", conteo: 1, ultimoAcceso: new Date("2026-11-16T10:00:00Z") },
        { modulo: "reportes", conteo: 8, ultimoAcceso: new Date("2026-11-15T10:00:00Z") },
      ],
      "ADMINISTRADOR",
    );
    const html = renderToStaticMarkup(<AccesosFrecuentes accesos={accesos} sugeridos={sugeridos("ADMINISTRADOR")} />);

    expect(html).toContain('aria-label="Accesos frecuentes"');
    expect(html.indexOf('href="/reportes"')).toBeLessThan(html.indexOf('href="/profesores"'));
    expect(html).toContain("8 visitas");
    expect(html).toContain("1 visita<");
    expect(html).not.toContain("Aún no tienes accesos frecuentes");
  });

  it("sin historial explica que aparecerán al usar los módulos y ofrece los del rol", () => {
    const html = renderToStaticMarkup(<AccesosFrecuentes accesos={[]} sugeridos={sugeridos("DOCENTE")} />);

    expect(html).toContain("Aún no tienes accesos frecuentes. Entra a un módulo y aparecerá aquí.");
    expect(html).toContain('aria-label="Módulos disponibles"');
    expect(html).toContain('href="/validacion"');
    expect(html).not.toContain("visita");
  });

  it("sin historial ni módulos solo muestra el estado vacío", () => {
    const html = renderToStaticMarkup(<AccesosFrecuentes accesos={[]} sugeridos={[]} />);
    expect(html).toContain("Aún no tienes accesos frecuentes");
    expect(html).not.toContain("<ul");
  });
});
