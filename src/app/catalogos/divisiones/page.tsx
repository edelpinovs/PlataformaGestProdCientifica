import { FilaEditable } from "@/components/fila-editable";
import { Marco } from "@/components/marco";
import { Aviso, claseTabla, EstadoVacio, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { editarDivision, eliminarDivision } from "./actions";
import { FormularioDivision } from "./formulario";

export default async function DivisionesPage({ searchParams }: PageProps<"/catalogos/divisiones">) {
  const perfil = await requireModulo("catalogos");
  const divisiones = await prisma.division.findMany({
    orderBy: { nombre: "asc" },
    include: { _count: { select: { departamentos: true } } },
  });

  // Editar y eliminar redirigen aquí con el resultado (#59).
  const { editada, eliminada } = await searchParams;
  const resultado =
    typeof editada === "string" ? `Se guardaron los cambios de «${editada}».`
    : typeof eliminada === "string" ? `Se eliminó «${eliminada}».`
    : null;

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="catalogos" titulo="Divisiones académicas"
      volver={{ href: "/catalogos", texto: "Catálogos" }}>
      <Panel titulo="Registrar división">
        <FormularioDivision />
      </Panel>

      <Panel titulo={`En el catálogo (${divisiones.length})`}>
        {resultado && <div className="mb-4"><Aviso tipo="exito">{resultado}</Aviso></div>}
        {divisiones.length === 0 ? (
          <EstadoVacio>Aún no hay divisiones registradas.</EstadoVacio>
        ) : (
          <table className={claseTabla.tabla}>
            <thead className={claseTabla.encabezado}>
              <tr>
                <th className={claseTabla.celdaEncabezado}>Nombre</th>
                <th className={claseTabla.celdaEncabezado}>Clave</th>
                <th className={`${claseTabla.celdaEncabezado} text-right`}>Departamentos</th>
                <th className={`${claseTabla.celdaEncabezado} pr-0 text-right`}>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {divisiones.map((d) => (
                // La key incluye los datos: tras guardar, la fila vuelve a mostrarse cerrada.
                <FilaEditable key={`${d.id}-${d.nombre}-${d.clave}`} id={d.id} nombre={d.nombre}
                  detalle={d.clave} editar={editarDivision} eliminar={eliminarDivision}
                  celdas={[
                    { contenido: d.nombre },
                    { contenido: d.clave, className: "font-mono" },
                    { contenido: d._count.departamentos, className: "text-right" },
                  ]}
                  campos={[
                    { nombre: "nombre", etiqueta: "Nombre", valor: d.nombre, maxLength: 150 },
                    { nombre: "clave", etiqueta: "Clave institucional", valor: d.clave, maxLength: 20, ancho: "corto" },
                  ]} />
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </Marco>
  );
}
