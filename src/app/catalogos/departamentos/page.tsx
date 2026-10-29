import Link from "next/link";
import { FilaEditable } from "@/components/fila-editable";
import { Marco } from "@/components/marco";
import { Aviso, claseTabla, EstadoVacio, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { editarDepartamento, eliminarDepartamento } from "./actions";
import { FormularioDepartamento } from "./formulario";

export default async function DepartamentosPage({ searchParams }: PageProps<"/catalogos/departamentos">) {
  const perfil = await requireModulo("catalogos");
  const [divisiones, departamentos] = await Promise.all([
    prisma.division.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, clave: true } }),
    prisma.departamento.findMany({
      orderBy: [{ division: { nombre: "asc" } }, { nombre: "asc" }],
      include: { division: { select: { nombre: true, clave: true } } },
    }),
  ]);
  const opcionesDivision = divisiones.map((d) => ({ valor: String(d.id), texto: `${d.nombre} (${d.clave})` }));

  // Editar y eliminar redirigen aquí con el resultado (#59).
  const { editado, eliminado } = await searchParams;
  const resultado =
    typeof editado === "string" ? `Se guardaron los cambios de «${editado}».`
    : typeof eliminado === "string" ? `Se eliminó «${eliminado}».`
    : null;

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
        {resultado && <div className="mb-4"><Aviso tipo="exito">{resultado}</Aviso></div>}
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
                  <th className={`${claseTabla.celdaEncabezado} pr-0 text-right`}>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {departamentos.map((d) => (
                  // La key incluye los datos: tras guardar, la fila vuelve a mostrarse cerrada.
                  <FilaEditable key={`${d.id}-${d.nombre}-${d.nomenclatura}-${d.divisionId}`} id={d.id}
                    nombre={d.nombre} detalle={d.nomenclatura}
                    editar={editarDepartamento} eliminar={eliminarDepartamento}
                    celdas={[
                      { contenido: d.nombre },
                      { contenido: d.nomenclatura, className: "font-mono" },
                      {
                        contenido: (
                          <>{d.division.nombre} <span className="font-mono text-texto-3">({d.division.clave})</span></>
                        ),
                      },
                    ]}
                    campos={[
                      { nombre: "divisionId", etiqueta: "División académica", valor: String(d.divisionId),
                        opciones: opcionesDivision, ancho: "medio" },
                      { nombre: "nombre", etiqueta: "Nombre", valor: d.nombre, maxLength: 150 },
                      { nombre: "nomenclatura", etiqueta: "Nomenclatura", valor: d.nomenclatura, maxLength: 20,
                        ancho: "corto" },
                    ]} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </Marco>
  );
}
