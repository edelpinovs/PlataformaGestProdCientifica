import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Observación 2 de la revisión del PR 392: la acción Eliminar de Participantes usa la papelera con
// aria-label y title, como pide la pauta (D-233). Datos inventados; la acción es un doble.
vi.mock("./actions", () => ({ eliminarParticipante: vi.fn() }));
const { FilaParticipante } = await import("./fila-participante");

describe("fila de participante", () => {
  beforeEach(() => vi.stubGlobal("React", React));

  it("muestra la papelera con aria-label y title, sin el texto «Eliminar»", () => {
    const html = renderToStaticMarkup(<table><tbody><FilaParticipante p={{
      id: 1, convocatoria: "SNII 2026", profesor: "Prueba Uno, Ana", codigo: "DEMO001",
      resultado: { tipo: "exito", texto: "Aprobado" }, origen: "Registrado",
    }} /></tbody></table>);
    expect(html).toContain('aria-label="Eliminar a Prueba Uno, Ana de SNII 2026" title="Eliminar"');
    expect(html).toContain("<svg");
    expect(html).not.toMatch(/>Eliminar</);
  });
});
