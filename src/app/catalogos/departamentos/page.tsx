import Link from "next/link";
import { Marco } from "@/components/marco";
import { claseTabla, EstadoVacio, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { FormularioDepartamento } from "./formulario";

export default async function DepartamentosPage() {
  const perfil = await requireModulo("catalogos");
  const [divisiones, departamentos] = await Promise.all([
    prisma.division.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, clave: true } }),
    prisma.departamento.findMany({
      orderBy: [{ division: { nombre: "asc" } }, { nombre: "asc" }],
      include: { division: { select: { nombre: true, clave: true } } },
    }),
  ]);

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="catalogos" titulo="Departamentos"
      volver={{ href: "/catalogos", texto: "Catálogos" }}>
      <Panel titulo="Registrar departamento">
        {divisiones.length === 0 ? (
          <EstadoVacio>
            Todo departamento pertenece a una división.{" "}
            <Link href="/catalogos/divisiones" className="font-medium text-marca">Registra primero una división</Link>.
          </EstadoVacio>
        ) : (
          <FormularioDepartamento divisiones={divisiones} />
        )}
      </Panel>

      <Panel titulo={`En el catálogo (${departamentos.length})`}>
        {departamentos.length === 0 ? (
          <EstadoVacio>Aún no hay departamentos registrados.</EstadoVacio>
        ) : (
          <div className="overflow-x-auto">
            <table className={claseTabla.tabla}>
              <thead className={claseTabla.encabezado}>
                <tr>
                  <th className={claseTabla.celdaEncabezado}>Nombre</th>
                  <th className={claseTabla.celdaEncabezado}>Nomenclatura</th>
                  <th className={claseTabla.celdaEncabezado}>División</th>
                </tr>
              </thead>
              <tbody>
                {departamentos.map((d) => (
                  <tr key={d.id} className={claseTabla.fila}>
                    <td className={claseTabla.celda}>{d.nombre}</td>
                    <td className={`${claseTabla.celda} font-mono`}>{d.nomenclatura}</td>
                    <td className={claseTabla.celda}>
                      {d.division.nombre} <span className="font-mono text-texto-3">({d.division.clave})</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </Marco>
  );
}
