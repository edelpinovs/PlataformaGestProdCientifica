import { Marco } from "@/components/marco";
import { Aviso, claseTabla, EstadoVacio, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { FilaGrado } from "./fila";
import { FormularioGrado } from "./formulario";

export default async function GradosPage({ searchParams }: PageProps<"/catalogos/grados">) {
  const perfil = await requireModulo("catalogos");
  const grados = await prisma.gradoCientifico.findMany({ orderBy: { nombre: "asc" } });

  // Editar y eliminar redirigen aquí con el resultado (#55).
  const { editado, eliminado } = await searchParams;
  const resultado =
    typeof editado === "string" ? `Se guardaron los cambios de «${editado}».`
    : typeof eliminado === "string" ? `Se eliminó «${eliminado}».`
    : null;

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="catalogos" titulo="Grados científicos"
      volver={{ href: "/catalogos", texto: "Catálogos" }}>
      <Panel titulo="Registrar grado">
        <FormularioGrado />
      </Panel>

      <Panel titulo={`En el catálogo (${grados.length})`}>
        {resultado && <div className="mb-4"><Aviso tipo="exito">{resultado}</Aviso></div>}
        {grados.length === 0 ? (
          <EstadoVacio>Aún no hay grados registrados.</EstadoVacio>
        ) : (
          <table className={claseTabla.tabla}>
            <thead className={claseTabla.encabezado}>
              <tr>
                <th className={claseTabla.celdaEncabezado}>Nombre</th>
                <th className={claseTabla.celdaEncabezado}>Nomenclatura</th>
                <th className={`${claseTabla.celdaEncabezado} pr-0 text-right`}>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {grados.map((g) => (
                // La key incluye los datos: tras guardar, la fila vuelve a mostrarse cerrada.
                <FilaGrado key={`${g.id}-${g.nombre}-${g.nomenclatura}`} grado={g} />
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </Marco>
  );
}
