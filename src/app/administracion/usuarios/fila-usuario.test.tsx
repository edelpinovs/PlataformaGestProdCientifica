import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Issue 425: en celular la fila de Usuarios no se desplaza en horizontal; las columnas secundarias se
// ocultan y sus datos se apilan bajo el correo. Datos inventados; las acciones son dobles.
vi.mock("./actions", () => ({ editarUsuario: vi.fn(), cambiarEstadoUsuario: vi.fn() }));

const { FilaUsuario } = await import("./fila-usuario");

const fila = (profesor: { id: number; nombres: string; apellidos: string; codigo: string } | null, activo = true) =>
  renderToStaticMarkup(
    <table><tbody>
      <FilaUsuario id="u1" correo="ana@ejemplo.mx" rol="COORDINADOR" activo={activo} profesor={profesor}
        alta="24 nov 2026" esPropio={false} opcionesProfesor={[]} editar={vi.fn()} cambiarEstado={vi.fn()} />
    </tbody></table>,
  );

describe("fila de Usuarios en celular (issue 425)", () => {
  beforeEach(() => vi.stubGlobal("React", React));

  it("la primera celda apila rol, profesor, estado y alta bajo el correo, y solo en celular", () => {
    const html = fila({ id: 1, nombres: "Ana", apellidos: "Prueba", codigo: "DEMO001" });
    const apilado = html.match(/<span class="mt-1 flex[^"]*md:hidden">([\s\S]*?)<\/span><\/span><\/td>/)?.[1] ?? "";
    expect(apilado).toContain("Coordinación de Investigación");
    expect(apilado).toContain("Ana Prueba");
    expect(apilado).toContain("Activo");
    expect(apilado).toContain("Alta 24 nov 2026");
  });

  it("las demás celdas de datos se ocultan en celular y se muestran desde md", () => {
    const html = fila(null);
    expect(html.match(/hidden md:table-cell|hidden whitespace-nowrap md:table-cell|whitespace-nowrap hidden md:table-cell/g)?.length).toBeGreaterThanOrEqual(4);
    expect(html).toContain("Sin vincular");
  });

  it("un usuario desactivado lo dice también en la vista apilada", () => {
    expect(fila(null, false)).toContain("Desactivado");
  });
});
