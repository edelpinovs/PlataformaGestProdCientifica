import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DESCRIPCION_MARCA, MarcaSigec, NOMBRE_MARCA } from "./marca";
import { PantallaAcceso } from "./pantalla-acceso";

describe("identidad SIGeC (D-217)", () => {
  const html = renderToStaticMarkup(<MarcaSigec />);

  it("muestra el nombre y la descripción completa, y ya no el nombre anterior", () => {
    expect(html).toContain(NOMBRE_MARCA);
    expect(html).toContain(DESCRIPCION_MARCA);
    expect(html).not.toMatch(/PGPC/);
  });

  it("los iconos son decorativos: sin texto alternativo, para que el enlace tenga un solo nombre", () => {
    const imagenes = html.match(/<img[^>]*>/g) ?? [];
    expect(imagenes).toHaveLength(2);
    for (const imagen of imagenes) expect(imagen).toContain('alt=""');
    // El único texto del enlace es el nombre y su descripción, sin repetirlos.
    const texto = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    expect(texto).toBe(`${NOMBRE_MARCA} ${DESCRIPCION_MARCA}`);
  });

  it("hay una variante por tema y ambas apuntan a archivos que existen", () => {
    const fuentes = [...html.matchAll(/<img[^>]*src="([^"]+)"/g)].map((m) => m[1]);
    expect(fuentes).toEqual(["/marca/sigec-icono.svg", "/marca/sigec-icono-blanco.svg"]);
    for (const fuente of fuentes) expect(existsSync(`public${fuente}`), fuente).toBe(true);
    expect(html.match(/marca-claro/g)).toHaveLength(1);
    expect(html.match(/marca-oscuro/g)).toHaveLength(1);
  });

  it("los activos servidos no cargan fuentes ni recursos externos", () => {
    for (const archivo of ["public/marca/sigec-icono.svg", "public/marca/sigec-icono-blanco.svg", "src/app/icon.svg"]) {
      const svg = readFileSync(archivo, "utf8");
      expect(svg, archivo).not.toMatch(/@import|<link|url\(\s*['"]?https?:/i);
      // La única dirección admitida es el espacio de nombres del propio SVG.
      expect((svg.match(/https?:\/\/[^"'\s)]+/g) ?? []).filter((d) => d !== "http://www.w3.org/2000/svg"), archivo).toEqual([]);
    }
  });

  it("el tamaño grande de la pantalla de acceso conserva el mismo texto", () => {
    const acceso = renderToStaticMarkup(<PantallaAcceso titulo="Iniciar sesión">contenido</PantallaAcceso>);
    expect(acceso).toContain(NOMBRE_MARCA);
    expect(acceso).toContain(DESCRIPCION_MARCA);
    expect(acceso).not.toMatch(/PGPC/);
  });
});
