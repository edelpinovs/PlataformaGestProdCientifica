import { Marco } from "@/components/marco";
import { claseTabla, EstadoVacio, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { FormularioGrado } from "./formulario";

export default async function GradosPage() {
  const perfil = await requireModulo("catalogos");
  const grados = await prisma.gradoCientifico.findMany({ orderBy: { nombre: "asc" } });

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="catalogos" titulo="Grados científicos"
      volver={{ href: "/catalogos", texto: "Catálogos" }}>
      <Panel titulo="Registrar grado">
        <FormularioGrado />
      </Panel>

      <Panel titulo={`En el catálogo (${grados.length})`}>
        {grados.length === 0 ? (
          <EstadoVacio>Aún no hay grados registrados.</EstadoVacio>
        ) : (
          <table className={claseTabla.tabla}>
            <thead className={claseTabla.encabezado}>
              <tr>
                <th className={claseTabla.celdaEncabezado}>Nombre</th>
                <th className={claseTabla.celdaEncabezado}>Nomenclatura</th>
              </tr>
            </thead>
            <tbody>
              {grados.map((g) => (
                <tr key={g.id} className={claseTabla.fila}>
                  <td className={claseTabla.celda}>{g.nombre}</td>
                  <td className={`${claseTabla.celda} font-mono`}>{g.nomenclatura}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </Marco>
  );
}
