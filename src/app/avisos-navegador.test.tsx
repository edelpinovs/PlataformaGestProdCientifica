import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FilaEditable } from "@/components/fila-editable";
import FormCarga from "./convocatorias/carga/FormCarga";
import { RegistrarParticipante } from "./convocatorias/participantes/registrar-participante";
import { SimuladorEscaneo } from "./produccion/demostracion/simulador";
import { FormularioEscaneo } from "./produccion/formulario-escaneo";
import { FormularioProfesor } from "./profesores/nuevo/formulario";
import { RegistrarProfesor } from "./profesores/registrar-profesor";
import { FormularioProdep } from "./reconocimientos/prodep/formulario";
import { FormularioEdicionProdep } from "./reconocimientos/prodep/formulario-edicion";
import { FormularioSnii } from "./reconocimientos/snii/formulario";
import { FormularioEdicionSnii } from "./reconocimientos/snii/formulario-edicion";
import { RegistrarPublicacionModal } from "./validacion/registrar-publicacion-modal";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
  redirect: vi.fn(),
  RedirectType: { replace: "replace" },
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("./profesores/actions", () => ({ crearProfesor: vi.fn(), crearProfesorEnModal: vi.fn() }));
vi.mock("./convocatorias/carga/actions", () => ({ prepararCarga: vi.fn(), registrarCarga: vi.fn() }));
vi.mock("./convocatorias/participantes/actions", () => ({ registrarParticipante: vi.fn() }));
vi.mock("./produccion/demostracion/actions", () => ({ demostrarEscaneoAction: vi.fn() }));
vi.mock("./produccion/actions", () => ({ iniciarEscaneoAction: vi.fn() }));
vi.mock("./reconocimientos/snii/actions", () => ({ registrarReconocimientoSnii: vi.fn(), editarReconocimientoSnii: vi.fn() }));
vi.mock("./reconocimientos/prodep/actions", () => ({ registrarReconocimientoProdep: vi.fn(), editarReconocimientoProdep: vi.fn() }));
vi.mock("./validacion/actions", () => ({ registrarPublicacionManual: vi.fn() }));

const tieneNoValidate = (html: string) => expect(html).toMatch(/<form[^>]*\snovalidate/i);

const profesor = { id: 1, codigo: "DEMO001", nombres: "Nombre", apellidos: "Apellido", cvu: "1", tipoContratacion: "TIEMPO_COMPLETO" as const };

describe("avisos del navegador (issue 350)", () => {
  it("el alta de profesor deja el correo como email y valida en el servidor", () => {
    const pagina = renderToStaticMarkup(<FormularioProfesor grados={[]} departamentos={[]} />);
    tieneNoValidate(pagina);
    expect(pagina).toContain('type="email"');
    // El modal está cerrado hasta abrirlo: el formulario vive en ModalAlta.
    expect(readFileSync(new URL("../components/modal-alta.tsx", import.meta.url), "utf8")).toMatch(/<form[^>]*noValidate/);
    expect(renderToStaticMarkup(<RegistrarProfesor grados={[]} departamentos={[]} />)).toContain("Registrar profesor");
  });

  it("la carga y el participante no frenan el año en el idioma de Chrome", () => {
    tieneNoValidate(renderToStaticMarkup(<FormCarga />));
    expect(renderToStaticMarkup(<RegistrarParticipante profesores={[]} anioActual={2026} />)).toContain("Registrar participante");
  });

  it("el escaneo, sus filtros de fecha y la demostración tampoco", () => {
    tieneNoValidate(renderToStaticMarkup(<SimuladorEscaneo />));
    const escaneo = renderToStaticMarkup(
      <FormularioEscaneo profesores={[{ id: 1, nombres: "Nombre", apellidos: "Apellido", codigo: "DEMO001" }]} />,
    );
    tieneNoValidate(escaneo);
    expect(escaneo).toContain('type="date"');
  });

  it("SNII, PRODEP y la publicación manual conservan fecha y enlace, sin el aviso nativo", () => {
    const snii = renderToStaticMarkup(<FormularioSnii profesores={[profesor]} />);
    expect(snii).toContain("Registrar reconocimiento");
    expect(readFileSync(new URL("../components/modal-alta.tsx", import.meta.url), "utf8")).toMatch(/<form[^>]*noValidate/);
    tieneNoValidate(renderToStaticMarkup(<FormularioProdep profesores={[profesor]} />));
    tieneNoValidate(renderToStaticMarkup(
      <FormularioEdicionSnii cerrar={() => undefined} profesores={[profesor]} reconocimiento={{
        id: 1, nivel: "NIVEL_1", tipoParticipacion: "NUEVO_INGRESO", resultado: "APROBADO",
        inicio: new Date("2026-01-01T00:00:00Z"), fin: new Date("2029-12-31T00:00:00Z"), profesor,
      }} />,
    ));
    tieneNoValidate(renderToStaticMarkup(
      <FormularioEdicionProdep cerrar={() => undefined} profesores={[profesor]} reconocimiento={{
        id: 1, tipoSolicitud: "PRIMER_RECONOCIMIENTO", resultado: "APROBADO", convocatoriaId: null,
        inicio: new Date("2026-01-01T00:00:00Z"), fin: new Date("2029-01-01T00:00:00Z"), profesor,
      }} />,
    ));
    const publicacion = readFileSync(new URL("./validacion/registrar-publicacion-modal.tsx", import.meta.url), "utf8");
    expect(publicacion).toContain('type="date"');
    expect(publicacion).toContain('type="url"');
    expect(renderToStaticMarkup(<RegistrarPublicacionModal profesores={[profesor]} />)).toContain("Registrar publicación");
  });

  it("la edición de una fila tampoco muestra el aviso nativo de un campo obligatorio", () => {
    const html = renderToStaticMarkup(
      <table><tbody>
        <FilaEditable id={1} nombre="Nombre Apellido" edicionInicial
          editar={vi.fn()} eliminar={vi.fn()} celdas={[]}
          campos={[{ nombre: "correo", etiqueta: "Correo", valor: "", maxLength: 200 }]} />
      </tbody></table>,
    );
    tieneNoValidate(html);
    expect(html).toContain("required");
  });
});
