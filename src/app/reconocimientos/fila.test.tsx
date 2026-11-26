import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Issue 389: las acciones de fila de SNII y PRODEP usan icono (lápiz y papelera) con aria-label y title,
// como pide la pauta (D-233). Datos inventados; las acciones y formularios son dobles.
vi.mock("./snii/actions", () => ({ eliminarReconocimientoSnii: vi.fn() }));
vi.mock("./snii/formulario-edicion", () => ({ FormularioEdicionSnii: () => null }));
vi.mock("./prodep/actions", () => ({ eliminarReconocimientoProdep: vi.fn() }));
vi.mock("./prodep/formulario-edicion", () => ({ FormularioEdicionProdep: () => null }));

const { FilaSnii } = await import("./snii/fila");
const { FilaProdep } = await import("./prodep/fila");

const profesor = { id: 1, codigo: "DEMO001", nombres: "Ana", apellidos: "Prueba Uno", cvu: "900001" };
const fechas = { inicio: new Date("2025-01-01T00:00:00Z"), fin: new Date("2028-12-31T00:00:00Z") };
const snii = (convocatoriaId: number | null) => renderToStaticMarkup(
  <ul><FilaSnii profesores={[profesor]} reconocimiento={{
    id: 1, nivel: "NIVEL_1", tipoParticipacion: "NUEVO_INGRESO", resultado: "APROBADO", ...fechas, convocatoriaId, profesor,
  }} /></ul>,
);
const prodep = (convocatoriaId: number | null) => renderToStaticMarkup(
  <table><tbody><FilaProdep profesores={[]} reconocimiento={{
    id: 1, tipoSolicitud: "PRIMER_RECONOCIMIENTO", resultado: "APROBADO", ...fechas, convocatoriaId, profesor,
  } as unknown as Parameters<typeof FilaProdep>[0]["reconocimiento"]} /></tbody></table>,
);

describe("acciones de fila de Reconocimientos con icono (issue 389)", () => {
  beforeEach(() => vi.stubGlobal("React", React));

  it.each([
    ["SNII", snii, "Editar reconocimiento de Ana Prueba Uno", "Eliminar reconocimiento de Ana Prueba Uno"],
    ["PRODEP", prodep, "Editar reconocimiento PRODEP de Ana Prueba Uno", "Eliminar reconocimiento PRODEP de Ana Prueba Uno"],
  ])("%s: lápiz y papelera con aria-label y title, sin el texto", (_, fila, editar, eliminar) => {
    const html = fila(null);
    expect(html).toContain(`aria-label="${editar}" title="Editar"`);
    expect(html).toContain(`aria-label="${eliminar}" title="Eliminar"`);
    expect(html.match(/<svg/g)).toHaveLength(2);
    expect(html).not.toMatch(/>Editar<|>Eliminar</);
  });

  it.each([["SNII", snii], ["PRODEP", prodep]])("%s: Editar sigue oculto en un registro que viene de una convocatoria", (_, fila) => {
    const html = fila(5);
    expect(html).not.toContain('title="Editar"');
    expect(html).toContain('title="Eliminar"');
  });
});
