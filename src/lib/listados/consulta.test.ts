import { describe, expect, it } from "vitest";
import {
  analizarListado,
  condicionTexto,
  enlaceListado,
  escaparBusqueda,
  hayFiltrosActivos,
  ordenarPor,
  paginar,
  siguienteOrden,
  TAMANIO_PAGINA,
  type DefinicionListado,
} from "./consulta";

const definicion: DefinicionListado = {
  columnas: ["nombre", "division", "total"],
  ordenInicial: { columna: "nombre", dir: "asc" },
  filtros: { estatus: ["ACTIVO", "BAJA"], nivel: ["1", "2"] },
};
const inicial = analizarListado(definicion, {}).consulta;

describe("analizarListado", () => {
  it("sin parámetros usa los valores iniciales y no marca errores", () => {
    const { consulta, errores } = analizarListado(definicion, {});
    expect(consulta).toEqual({ pagina: 1, q: "", orden: "nombre", dir: "asc", filtros: { estatus: "", nivel: "" } });
    expect(errores).toEqual({});
  });

  it("lee texto, página, orden y filtros válidos", () => {
    const { consulta, errores } = analizarListado(definicion, {
      q: "  ñandú  ", pagina: "3", orden: "division", dir: "desc", estatus: "ACTIVO",
    });
    expect(consulta).toMatchObject({ q: "ñandú", pagina: 3, orden: "division", dir: "desc" });
    expect(consulta.filtros).toEqual({ estatus: "ACTIVO", nivel: "" });
    expect(errores).toEqual({});
  });

  it("una columna que no está en la lista permitida se ignora y se avisa", () => {
    const { consulta, errores } = analizarListado(definicion, { orden: "password; DROP TABLE" });
    expect(consulta.orden).toBe("nombre");
    expect(errores.orden).toBe("Ordena por una columna válida.");
  });

  it("valores inválidos vuelven al valor inicial con un mensaje en español por parámetro", () => {
    const { consulta, errores } = analizarListado(definicion, {
      pagina: "0", dir: "arriba", estatus: "OTRO", q: "x".repeat(201),
    });
    expect(consulta).toMatchObject({ pagina: 1, dir: "asc", q: "" });
    expect(consulta.filtros.estatus).toBe("");
    expect(errores).toEqual({
      pagina: "La página debe ser un número entero entre 1 y 999999.",
      dir: "El sentido del orden debe ser ascendente o descendente.",
      estatus: "Uno de los filtros tiene un valor que no existe.",
      q: "La búsqueda admite hasta 200 caracteres.",
    });
  });

  it("rechaza páginas decimales, negativas, con letras o enormes", () => {
    for (const pagina of ["1.5", "-1", "abc", "", "1000000", "99999999999"]) {
      expect(analizarListado(definicion, { pagina }).errores.pagina, pagina).toBeDefined();
    }
    expect(analizarListado(definicion, { pagina: "999999" }).consulta.pagina).toBe(999999);
  });

  it("un parámetro repetido en la URL no rompe la página", () => {
    const { consulta, errores } = analizarListado(definicion, { q: ["a", "b"], pagina: ["1", "2"], estatus: ["ACTIVO", "BAJA"] });
    expect(consulta).toMatchObject({ q: "", pagina: 1 });
    expect(errores.q).toBe("Escribe un solo texto de búsqueda.");
    expect(errores.pagina).toBe("Indica una sola página.");
    expect(errores.estatus).toBe("Selecciona un solo valor en cada filtro.");
  });

  it("una definición mal hecha falla al instante", () => {
    expect(() => analizarListado({ columnas: ["a"], ordenInicial: { columna: "b", dir: "asc" } }, {})).toThrow();
    expect(() => analizarListado({ ...definicion, filtros: { pagina: ["1"] } }, {})).toThrow();
  });
});

describe("condicionTexto", () => {
  const campos = (contiene: object) => [{ nombre: contiene }, { division: { nombre: contiene } }];

  it("sin texto no agrega condición", () => {
    expect(condicionTexto("", campos)).toEqual({});
    expect(condicionTexto("   ", campos)).toEqual({});
  });

  it("busca en todos los campos indicados, sin distinguir mayúsculas", () => {
    expect(condicionTexto("Dr", campos)).toEqual({
      OR: [
        { nombre: { contains: "Dr", mode: "insensitive" } },
        { division: { nombre: { contains: "Dr", mode: "insensitive" } } },
      ],
    });
  });

  it("escapa los comodines para buscarlos literalmente", () => {
    expect(escaparBusqueda("a_b%c\\d")).toBe("a\\_b\\%c\\\\d");
    const donde = condicionTexto("100%", campos) as { OR: { nombre: { contains: string } }[] };
    expect(donde.OR[0].nombre.contains).toBe("100\\%");
  });
});

describe("ordenarPor", () => {
  const mapa = { nombre: (dir: "asc" | "desc") => ({ nombre: dir }), division: (dir: "asc" | "desc") => ({ division: { nombre: dir } }) };

  it("traduce la columna elegida y desempata por id en el mismo sentido", () => {
    expect(ordenarPor({ ...inicial, orden: "division", dir: "desc" }, mapa)).toEqual([{ division: { nombre: "desc" } }, { id: "desc" }]);
    expect(ordenarPor(inicial, mapa)).toEqual([{ nombre: "asc" }, { id: "asc" }]);
  });

  it("una columna sin orden definido falla en vez de ordenar por cualquier cosa", () => {
    expect(() => ordenarPor({ ...inicial, orden: "total" }, mapa)).toThrow();
  });
});

describe("paginar", () => {
  it("usa páginas de 10", () => {
    expect(TAMANIO_PAGINA).toBe(10);
    expect(paginar(25, { pagina: 1 })).toMatchObject({ totalPaginas: 3, salto: 0, desde: 1, hasta: 10, tamanio: 10 });
    expect(paginar(25, { pagina: 3 })).toMatchObject({ pagina: 3, salto: 20, desde: 21, hasta: 25 });
  });

  it("una página fuera de rango muestra la última", () => {
    expect(paginar(25, { pagina: 99 })).toMatchObject({ pagina: 3, salto: 20 });
  });

  it("sin resultados muestra 0–0 en una sola página", () => {
    expect(paginar(0, { pagina: 5 })).toMatchObject({ pagina: 1, totalPaginas: 1, desde: 0, hasta: 0, salto: 0 });
  });

  it("exactamente 10 y 11 elementos", () => {
    expect(paginar(10, { pagina: 1 }).totalPaginas).toBe(1);
    expect(paginar(11, { pagina: 1 }).totalPaginas).toBe(2);
    expect(paginar(11, { pagina: 2 })).toMatchObject({ desde: 11, hasta: 11 });
  });
});

describe("enlaceListado", () => {
  it("sin cambios y con valores iniciales no agrega parámetros", () => {
    expect(enlaceListado("/catalogos/grados", definicion, inicial)).toBe("/catalogos/grados");
  });

  it("cambiar solo la página conserva búsqueda, orden y filtros", () => {
    const consulta = { ...inicial, q: "dr", orden: "division", dir: "desc" as const, filtros: { estatus: "ACTIVO", nivel: "" } };
    const url = enlaceListado("/x", definicion, consulta, { pagina: 3 });
    const parametros = new URLSearchParams(url.split("?")[1]);
    expect(Object.fromEntries(parametros)).toEqual({ q: "dr", orden: "division", dir: "desc", estatus: "ACTIVO", pagina: "3" });
  });

  it("cambiar la búsqueda, el orden o un filtro vuelve a la página 1", () => {
    const enPagina4 = { ...inicial, pagina: 4 };
    expect(enlaceListado("/x", definicion, enPagina4, { q: "a" })).toBe("/x?q=a");
    expect(enlaceListado("/x", definicion, enPagina4, { orden: "division", dir: "asc" })).toBe("/x?orden=division&dir=asc");
    expect(enlaceListado("/x", definicion, enPagina4, { filtros: { estatus: "BAJA" } })).toBe("/x?estatus=BAJA");
  });

  it("codifica el texto de búsqueda y ida y vuelta lo recupera", () => {
    const url = enlaceListado("/x", definicion, inicial, { q: "a&b=c #ñ" });
    const parametros = Object.fromEntries(new URLSearchParams(url.split("?")[1]));
    expect(analizarListado(definicion, parametros).consulta.q).toBe("a&b=c #ñ");
  });

  it("quitar un filtro lo elimina de la URL", () => {
    const consulta = { ...inicial, filtros: { estatus: "ACTIVO", nivel: "" } };
    expect(enlaceListado("/x", definicion, consulta, { filtros: { estatus: "" } })).toBe("/x");
  });
});

describe("siguienteOrden", () => {
  it("la primera vez ordena ascendente y el siguiente clic invierte", () => {
    expect(siguienteOrden(inicial, "division")).toEqual({ orden: "division", dir: "asc" });
    expect(siguienteOrden(inicial, "nombre")).toEqual({ orden: "nombre", dir: "desc" });
    expect(siguienteOrden({ ...inicial, dir: "desc" }, "nombre")).toEqual({ orden: "nombre", dir: "asc" });
  });
});

describe("hayFiltrosActivos", () => {
  it("detecta búsqueda o filtros", () => {
    expect(hayFiltrosActivos(inicial)).toBe(false);
    expect(hayFiltrosActivos({ ...inicial, q: "a" })).toBe(true);
    expect(hayFiltrosActivos({ ...inicial, filtros: { estatus: "BAJA", nivel: "" } })).toBe(true);
  });
});
