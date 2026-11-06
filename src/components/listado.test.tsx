import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { analizarListado, paginar, type DefinicionListado } from "@/lib/listados/consulta";
import { BarraListado, EncabezadoOrdenable, PaginacionListado } from "./listado";

const definicion: DefinicionListado = {
  columnas: ["nombre", "division"],
  ordenInicial: { columna: "nombre", dir: "asc" },
  filtros: { estatus: ["ACTIVO", "BAJA"] },
};
const base = "/profesores";
const columnas = [{ clave: "nombre", texto: "Nombre" }, { clave: "division", texto: "División" }];

function contexto(parametros: Record<string, string> = {}) {
  const { consulta, errores } = analizarListado(definicion, parametros);
  return { base, definicion, consulta, errores };
}

describe("componentes de listado", () => {
  beforeEach(() => vi.stubGlobal("React", React));

  it("EncabezadoOrdenable marca aria-sort solo en la columna activa y enlaza al siguiente orden", () => {
    const c = contexto({ orden: "nombre", dir: "asc" });
    const activa = renderToStaticMarkup(<table><thead><tr><EncabezadoOrdenable {...c} columna="nombre">Nombre</EncabezadoOrdenable></tr></thead></table>);
    expect(activa).toContain('aria-sort="ascending"');
    expect(activa).toContain("/profesores?orden=nombre&amp;dir=desc");

    const otra = renderToStaticMarkup(<table><thead><tr><EncabezadoOrdenable {...c} columna="division">División</EncabezadoOrdenable></tr></thead></table>);
    expect(otra).not.toContain("aria-sort");
    expect(otra).toContain("/profesores?orden=division&amp;dir=asc");
  });

  it("EncabezadoOrdenable en orden descendente lo anuncia y vuelve a ascendente", () => {
    const c = contexto({ orden: "division", dir: "desc" });
    const html = renderToStaticMarkup(<table><thead><tr><EncabezadoOrdenable {...c} columna="division">División</EncabezadoOrdenable></tr></thead></table>);
    expect(html).toContain('aria-sort="descending"');
    expect(html).toContain("/profesores?orden=division&amp;dir=asc");
  });

  it("BarraListado ofrece búsqueda, filtros y el selector de celular con los valores actuales", () => {
    const c = contexto({ q: "ana", estatus: "BAJA", orden: "division", dir: "desc" });
    const html = renderToStaticMarkup(
      <BarraListado {...c} columnas={columnas} filtros={[{ clave: "estatus", etiqueta: "Estatus", opciones: [{ valor: "ACTIVO", texto: "Activo" }, { valor: "BAJA", texto: "Baja" }] }]} />,
    );
    expect(html).toContain('action="/profesores"');
    expect(html).toContain('method="get"');
    expect(html).toContain('name="q"');
    expect(html).toContain('value="ana"');
    expect(html).toContain('name="estatus"');
    expect(html).toContain("Ordenar por");
    expect(html).toContain("sm:hidden");
    expect(html).toContain("Limpiar");
    expect(html).not.toContain('role="alert"');
  });

  it("BarraListado muestra los errores de la URL con aviso accesible", () => {
    const c = contexto({ pagina: "x", orden: "otra" });
    const html = renderToStaticMarkup(<BarraListado {...c} columnas={columnas} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain("Ordena por una columna válida.");
    expect(html).toContain("La página debe ser un número entero");
  });

  it("PaginacionListado muestra el rango y los enlaces que conservan el estado", () => {
    const c = contexto({ q: "ana", pagina: "2" });
    const html = renderToStaticMarkup(<PaginacionListado {...c} paginacion={paginar(25, c.consulta)} nombre="profesores" />);
    expect(html).toContain("Mostrando 11–20 de 25 profesores.");
    expect(html).toContain("Página 2 de 3");
    expect(html).toContain("/profesores?q=ana&amp;pagina=3");
    expect(html).toContain("/profesores?q=ana");
  });

  it("PaginacionListado no muestra navegación con una sola página y anuncia 0–0 sin resultados", () => {
    const c = contexto();
    const html = renderToStaticMarkup(<PaginacionListado {...c} paginacion={paginar(0, c.consulta)} nombre="profesores" />);
    expect(html).toContain("Mostrando 0–0 de 0 profesores.");
    expect(html).not.toContain("<nav");
  });

  it("en la primera y la última página Anterior y Siguiente no son enlaces", () => {
    const primera = contexto();
    expect(renderToStaticMarkup(<PaginacionListado {...primera} paginacion={paginar(25, primera.consulta)} />)).toMatch(/<span aria-disabled="true"[^>]*>Anterior<\/span>/);
    const ultima = contexto({ pagina: "3" });
    expect(renderToStaticMarkup(<PaginacionListado {...ultima} paginacion={paginar(25, ultima.consulta)} />)).toMatch(/<span aria-disabled="true"[^>]*>Siguiente<\/span>/);
  });
});
