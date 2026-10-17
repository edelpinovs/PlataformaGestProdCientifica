import { Marco } from "@/components/marco";
import { claseTabla, EstadoVacio, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { FormularioDivision } from "./formulario";

export default async function DivisionesPage() {
  const perfil = await requireModulo("catalogos");
  const divisiones = await prisma.division.findMany({
    orderBy: { nombre: "asc" },
    include: { _count: { select: { departamentos: true } } },
  });

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="catalogos" titulo="Divisiones académicas"
      volver={{ href: "/catalogos", texto: "Catálogos" }}>
      <Panel titulo="Registrar división">
        <FormularioDivision />
      </Panel>

      <Panel titulo={`En el catálogo (${divisiones.length})`}>
        {divisiones.length === 0 ? (
          <EstadoVacio>Aún no hay divisiones registradas.</EstadoVacio>
        ) : (
          <table className={claseTabla.tabla}>
            <thead className={claseTabla.encabezado}>
              <tr>
                <th className={claseTabla.celdaEncabezado}>Nombre</th>
                <th className={claseTabla.celdaEncabezado}>Clave</th>
                <th className={`${claseTabla.celdaEncabezado} text-right`}>Departamentos</th>
              </tr>
            </thead>
            <tbody>
              {divisiones.map((d) => (
                <tr key={d.id} className={claseTabla.fila}>
                  <td className={claseTabla.celda}>{d.nombre}</td>
                  <td className={`${claseTabla.celda} font-mono`}>{d.clave}</td>
                  <td className={`${claseTabla.celda} text-right`}>{d._count.departamentos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </Marco>
  );
}
