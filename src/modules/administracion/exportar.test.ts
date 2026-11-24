import { describe, expect, it } from "vitest";
import { analizarListado } from "@/lib/listados/consulta";
import { LISTADO_AUDITORIA } from "./auditoria-listado";
import { LISTADO_CALIDAD } from "./calidad";
import {
  descripcionFiltros,
  enlaceExportacion,
  LIMITE_FILAS,
  LIMITE_FILAS_PDF,
  leerPedido,
  limiteFilas,
  motivoDemasiadasFilas,
  nombreArchivo,
  resumenExportacion,
  tablaAuditoria,
  tablaCalidad,
  tablaUsuarios,
} from "./exportar";
import { formatoFechaAlta } from "./fechas";
import { LISTADO_USUARIOS } from "./usuarios-listado";

const consulta = (def: typeof LISTADO_USUARIOS, p: Record<string, string>) => analizarListado(def, p).consulta;

describe("pedido de exportación", () => {
  it("acepta un listado y un formato válidos", () => {
    expect(leerPedido({ listado: "usuarios", formato: "xlsx" })).toEqual({ listado: "usuarios", formato: "xlsx" });
    expect(leerPedido({ listado: "calidad", formato: "pdf" })).toEqual({ listado: "calidad", formato: "pdf" });
  });

  it("explica en español un listado o formato inválido, ausente o repetido", () => {
    expect(leerPedido({ formato: "xlsx" })).toEqual({ error: "Elige qué listado exportar." });
    expect(leerPedido({ listado: "perfiles", formato: "xlsx" })).toEqual({ error: "Elige qué listado exportar." });
    expect(leerPedido({ listado: "usuarios", formato: "csv" })).toEqual({ error: "Elige Excel o PDF." });
    expect(leerPedido({ listado: ["usuarios", "auditoria"], formato: "xlsx" })).toEqual({ error: "Elige qué listado exportar." });
  });

  it("el nombre del archivo lleva la extensión del formato", () => {
    expect(nombreArchivo("usuarios", "xlsx")).toBe("usuarios-y-roles.xlsx");
    expect(nombreArchivo("auditoria", "pdf")).toBe("auditoria.pdf");
  });
});

describe("enlace de exportación", () => {
  it("conserva búsqueda, filtros y orden y quita la página", () => {
    const c = consulta(LISTADO_USUARIOS, { q: "ana", rol: "DOCENTE", orden: "rol", dir: "desc", pagina: "3" });
    const url = new URL(enlaceExportacion("usuarios", "pdf", LISTADO_USUARIOS, c), "http://x");
    expect(url.pathname).toBe("/administracion/exportar");
    expect(Object.fromEntries(url.searchParams)).toEqual({ q: "ana", rol: "DOCENTE", orden: "rol", dir: "desc", listado: "usuarios", formato: "pdf" });
  });

  it("sin búsqueda ni filtros solo lleva listado y formato", () => {
    const url = new URL(enlaceExportacion("auditoria", "xlsx", LISTADO_AUDITORIA, consulta(LISTADO_AUDITORIA, {})), "http://x");
    expect(Object.fromEntries(url.searchParams)).toEqual({ listado: "auditoria", formato: "xlsx" });
  });
});

describe("tope de filas", () => {
  it("permite hasta el límite y rechaza más con un mensaje en español", () => {
    expect(motivoDemasiadasFilas(LIMITE_FILAS)).toBeNull();
    expect(motivoDemasiadasFilas(0)).toBeNull();
    expect(motivoDemasiadasFilas(LIMITE_FILAS + 1)).toBe(
      "Hay 10,001 registros y el máximo por descarga es 10,000. Acota la búsqueda con filtros e inténtalo de nuevo.",
    );
  });

  it("el PDF admite menos filas que el Excel", () => {
    expect(LIMITE_FILAS_PDF).toBeLessThan(LIMITE_FILAS);
    expect(limiteFilas("pdf")).toBe(2_000);
    expect(limiteFilas("xlsx")).toBe(10_000);
  });

  it("en PDF, hasta 2 000 filas pasa y entre 2 001 y 10 000 se manda al Excel", () => {
    expect(motivoDemasiadasFilas(LIMITE_FILAS_PDF, "pdf")).toBeNull();
    expect(motivoDemasiadasFilas(LIMITE_FILAS_PDF + 1, "pdf")).toBe(
      "Hay 2,001 registros y un PDF admite como máximo 2,000. Descárgalo en Excel (hasta 10,000) o acota la búsqueda con filtros.",
    );
    expect(motivoDemasiadasFilas(LIMITE_FILAS, "xlsx")).toBeNull();
  });

  it("en PDF, por encima del tope del Excel solo se pide acotar con filtros", () => {
    expect(motivoDemasiadasFilas(LIMITE_FILAS + 1, "pdf")).toBe(
      "Hay 10,001 registros y el máximo por descarga es 2,000. Acota la búsqueda con filtros e inténtalo de nuevo.",
    );
  });
});

describe("tablas", () => {
  it("usuarios: traduce el rol y el estado, deja vacío al profesor sin vincular y da la fecha de alta en hora de México", () => {
    const t = tablaUsuarios([
      { correo: "a@ejemplo.mx", rol: "COORDINADOR", activo: true, profesor: { codigo: "100", nombres: "Ana", apellidos: "Pérez" }, creadoEn: new Date("2026-11-20T18:00:00Z") },
      // 23:30 del 24 de noviembre en México: en UTC ya es el 25.
      { correo: "b@ejemplo.mx", rol: "DOCENTE", activo: false, profesor: null, creadoEn: new Date("2026-11-25T05:30:00Z") },
    ]);
    expect(t.columnas).toEqual(["Correo", "Rol", "Profesor vinculado", "Código del profesor", "Estado", "Alta"]);
    expect(t.filas).toEqual([
      ["a@ejemplo.mx", "Coordinación de Investigación", "Pérez Ana", "100", "Activo", formatoFechaAlta.format(new Date("2026-11-20T18:00:00Z"))],
      ["b@ejemplo.mx", "Docente", "", "", "Desactivado", formatoFechaAlta.format(new Date("2026-11-24T18:00:00Z"))],
    ]);
    expect(t.filas[1][5]).toContain("24");
  });

  it("toda fila tiene tantas celdas como columnas", () => {
    const u = tablaUsuarios([{ correo: "a@b.mx", rol: "DOCENTE", activo: true, profesor: null, creadoEn: new Date("2026-11-20T18:00:00Z") }]);
    expect(u.filas.every((f) => f.length === u.columnas.length)).toBe(true);
    const a = tablaAuditoria([{ creadoEn: new Date("2026-11-23T18:00:00Z"), actorCorreo: "a@b.mx", modulo: "administracion", accion: "usuario.editado", resumen: "x" }]);
    expect(a.filas.every((f) => f.length === a.columnas.length)).toBe(true);
  });

  it("auditoría: fecha en hora de México y textos de módulo y acción", () => {
    const t = tablaAuditoria([
      { creadoEn: new Date("2026-11-23T18:30:00Z"), actorCorreo: "a@b.mx", modulo: "administracion", accion: "usuario.desactivado", resumen: "Desactivó el acceso de x@y.mx." },
    ]);
    expect(t.filas[0].slice(1)).toEqual(["a@b.mx", "Administración", "Desactivó el acceso de un usuario", "Desactivó el acceso de x@y.mx."]);
    expect(t.filas[0][0]).toContain("12:30");
  });

  it("auditoría: una acción o módulo desconocidos se muestran tal cual en lugar de fallar", () => {
    const t = tablaAuditoria([{ creadoEn: new Date(), actorCorreo: "a@b.mx", modulo: "otro", accion: "otra.accion", resumen: "" }]);
    expect(t.filas[0].slice(2, 4)).toEqual(["otro", "otra.accion"]);
  });

  it("calidad: usa el texto de la regla", () => {
    const t = tablaCalidad([{ clave: "k", regla: "CA_SIN_LIDER", severidad: "aviso", registro: "CA-1 · Química", detalle: "No tiene un líder asignado.", enlace: "/x" }]);
    expect(t.filas).toEqual([["CA-1 · Química", "Cuerpo académico sin líder", "No tiene un líder asignado."]]);
  });

  it("una lista vacía produce una tabla sin filas pero con columnas", () => {
    expect(tablaUsuarios([]).filas).toEqual([]);
    expect(tablaCalidad([]).columnas.length).toBeGreaterThan(0);
  });
});

describe("resumen para la bitácora", () => {
  it("dice qué se exportó, en qué formato y cuántas filas", () => {
    expect(resumenExportacion("usuarios", "xlsx", 23)).toBe("Exportó el listado de usuarios y roles a Excel (23 filas).");
    expect(resumenExportacion("calidad", "pdf", 1)).toBe("Exportó el listado de calidad de datos a PDF (1 fila).");
  });

  it("agrega los filtros cuando los hay", () => {
    expect(resumenExportacion("usuarios", "xlsx", 3, "rol Docente")).toBe(
      "Exportó el listado de usuarios y roles a Excel (3 filas). Filtros: rol Docente.",
    );
  });
});

describe("descripción de los filtros", () => {
  it("sin filtros ni búsqueda queda vacía", () => {
    expect(descripcionFiltros("usuarios", consulta(LISTADO_USUARIOS, {}))).toBe("");
  });

  it("usuarios: rol y estado con su texto, no con la clave interna", () => {
    expect(descripcionFiltros("usuarios", consulta(LISTADO_USUARIOS, { rol: "COORDINADOR", estado: "DESACTIVADO" }))).toBe(
      "rol Coordinación de Investigación, estado Desactivado",
    );
  });

  it("auditoría: módulo y acción con su texto", () => {
    expect(descripcionFiltros("auditoria", consulta(LISTADO_AUDITORIA, { modulo: "administracion", accion: "usuario.desactivado" }))).toBe(
      "módulo Administración, acción «Desactivó el acceso de un usuario»",
    );
  });

  it("calidad: la regla con su texto", () => {
    expect(descripcionFiltros("calidad", consulta(LISTADO_CALIDAD, { regla: "CA_SIN_LIDER" }))).toBe(
      "problema «Cuerpo académico sin líder»",
    );
  });

  it("la búsqueda de texto no se copia: solo se anota que hubo", () => {
    const texto = descripcionFiltros("usuarios", consulta(LISTADO_USUARIOS, { q: "ana@ejemplo.mx", rol: "DOCENTE" }));
    expect(texto).toBe("rol Docente, con búsqueda de texto");
    expect(texto).not.toContain("ana");
  });

  it("un filtro de otro listado no se mezcla", () => {
    expect(descripcionFiltros("calidad", consulta(LISTADO_CALIDAD, { rol: "DOCENTE" }))).toBe("");
  });
});
