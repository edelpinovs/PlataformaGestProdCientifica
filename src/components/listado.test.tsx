import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { analizarListado, paginar, type DefinicionListado } from "@/lib/listados/consulta";
import { BarraListado, EncabezadoOrdenable, PaginacionListado } from "./listado";
import { SelectorFiltro } from "./listado-cliente";

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
    expect(html).toMatch(/noValidate/i);
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

  it("BarraListado deja la lista de errores dentro del aviso, sin anidarla en un párrafo", () => {
    // Un <ul> dentro de un <p> es HTML inválido: el navegador cierra el <p> antes de la lista, el
    // aviso con role="alert" queda vacío para los lectores de pantalla y React marca un error de hidratación.
    const c = contexto({ orden: "otra" });
    const html = renderToStaticMarkup(<BarraListado {...c} columnas={columnas} />);
    expect(html).toMatch(/<div role="alert"[^>]*><ul><li>Ordena por una columna válida\.<\/li><\/ul><\/div>/);
    expect(html).not.toMatch(/<p(?:\s[^>]*)?>(?:(?!<\/p>)[\s\S])*<ul>/);
  });

  it("PaginacionListado muestra el rango y los enlaces que conservan el estado", () => {
    const c = contexto({ q: "ana", pagina: "2" });
    const html = renderToStaticMarkup(<PaginacionListado {...c} paginacion={paginar(25, c.consulta)} nombre="profesores" />);
    expect(html).toContain("Mostrando 11–20 de 25 profesores.");
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("/profesores?q=ana&amp;pagina=3");
    expect(html).toContain("/profesores?q=ana");
  });

  it("PaginacionListado numera las páginas, marca la actual y resume los huecos", () => {
    const c = contexto({ pagina: "10" });
    const html = renderToStaticMarkup(<PaginacionListado {...c} paginacion={paginar(200, c.consulta)} />);
    expect(html).toMatch(/aria-current="page"[^>]*>10</);
    expect(html).toContain('aria-label="Ir a la página 9"');
    expect(html).toContain('aria-label="Ir a la página 20"');
    expect(html).not.toContain('aria-label="Ir a la página 5"');
    expect(html).toContain("…");
  });

  it("BarraListado con grupo segmentado enlaza cada opción, marca la activa y conserva la búsqueda", () => {
    const c = contexto({ q: "ana", estatus: "BAJA", orden: "division", dir: "desc", pagina: "2" });
    const html = renderToStaticMarkup(
      <BarraListado {...c} columnas={columnas}
        segmentado={{ clave: "estatus", etiqueta: "Situación", opciones: [{ valor: "ACTIVO", texto: "Activos" }, { valor: "BAJA", texto: "Inactivos" }] }} />,
    );
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Situación"');
    // «Todos» quita el filtro y vuelve a la página 1; la opción activa se anuncia.
    expect(html).toContain('href="/profesores?q=ana&amp;orden=division&amp;dir=desc"');
    expect(html).toMatch(/aria-current="true"[^>]*>Inactivos</);
    expect(html).toContain('type="hidden" name="estatus" value="BAJA"');
  });

  it("BarraListado solo ofrece Limpiar con búsqueda o filtros y siempre muestra el botón Buscar", () => {
    const sin = renderToStaticMarkup(<BarraListado {...contexto()} columnas={columnas} />);
    expect(sin).not.toContain("Limpiar");
    expect(sin).toMatch(/<button[^>]*type="submit"[^>]*>Buscar<\/button>/);
    expect(sin).not.toContain("<noscript>");
    const con = renderToStaticMarkup(<BarraListado {...contexto({ q: "x" })} columnas={columnas} />);
    expect(con).toContain("Limpiar");
  });

  it("BarraListado sin filtros activos deja cada lista en «Todos» y la búsqueda vacía", () => {
    const html = renderToStaticMarkup(
      <BarraListado {...contexto()} columnas={columnas}
        filtros={[{ clave: "estatus", etiqueta: "Estatus", opciones: [{ valor: "ACTIVO", texto: "Activo" }] }]} />,
    );
    expect(html).toMatch(/<option value=""[^>]*selected=""[^>]*>Todos<\/option>/);
    expect(html).not.toMatch(/<option[^>]*selected=""[^>]*>Activo<\/option>/);
    expect(html).not.toContain('value="ana"');
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

describe("SelectorFiltro: aplica al elegir sin atrapar al teclado", () => {
  // Sin DOM: se llaman los manejadores del <select> con un evento mínimo. La marca de teclado vive
  // en `dataset`, como en el navegador.
  function selector(extra: Record<string, unknown> = {}) {
    const requestSubmit = vi.fn();
    const evento = { currentTarget: { dataset: {} as Record<string, string>, form: { requestSubmit } } };
    const { props } = SelectorFiltro({ name: "estatus", ...extra }) as React.ReactElement<Record<string, (e: unknown) => void>>;
    return { requestSubmit, evento, props };
  }

  it("aplica el cambio al elegir con ratón o toque", () => {
    const { requestSubmit, evento, props } = selector();
    props.onPointerDown(evento);
    props.onChange(evento);
    expect(requestSubmit).toHaveBeenCalledTimes(1);
  });

  it("con teclado no envía en cada cambio: las flechas recorren las opciones", () => {
    const { requestSubmit, evento, props } = selector();
    for (let i = 0; i < 3; i++) {
      props.onKeyDown(evento);
      props.onChange(evento);
    }
    expect(requestSubmit).not.toHaveBeenCalled();
  });

  it("vuelve a aplicar al elegir tras usar el ratón o al salir del campo", () => {
    const { requestSubmit, evento, props } = selector();
    props.onKeyDown(evento);
    props.onPointerDown(evento);
    props.onChange(evento);
    expect(requestSubmit).toHaveBeenCalledTimes(1);

    props.onKeyDown(evento);
    props.onBlur(evento);
    props.onChange(evento);
    expect(requestSubmit).toHaveBeenCalledTimes(2);
  });

  it("sin formulario no falla y conserva los manejadores que reciba", () => {
    const alCambiar = vi.fn();
    const { evento, props } = selector({ onChange: alCambiar });
    evento.currentTarget.form = null as never;
    expect(() => props.onChange(evento)).not.toThrow();
    expect(alCambiar).toHaveBeenCalledOnce();
  });
});
