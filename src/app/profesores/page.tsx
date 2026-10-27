import Link from "next/link";
import { Marco } from "@/components/marco";
import { claseBoton, claseTabla, EstadoVacio, EtiquetaEstado, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Directorio de profesores — PGPC",
  description: "Consulta y gestiona el directorio de profesores investigadores de CUValles.",
};

const ETIQUETA_CONTRATACION: Record<string, string> = {
  TIEMPO_COMPLETO: "T. Completo",
  ASIGNATURA: "Asignatura",
};

const ESTATUS_TIPO: Record<string, "exito" | "aviso" | "error"> = {
  ACTIVO: "exito",
  LICENCIA: "aviso",
  BAJA_TEMPORAL: "aviso",
  BAJA_POSDOCTORAL: "aviso",
  TRASLADADO: "error",
};

const ETIQUETA_ESTATUS: Record<string, string> = {
  ACTIVO: "Activo",
  LICENCIA: "Licencia",
  BAJA_TEMPORAL: "Baja temporal",
  BAJA_POSDOCTORAL: "Baja posdoctoral",
  TRASLADADO: "Trasladado",
};

export default async function ProfesoresPage() {
  const perfil = await requireModulo("profesores");

  const profesores = await prisma.profesor.findMany({
    orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    include: {
      grado: { select: { nomenclatura: true } },
      departamento: { select: { nombre: true } },
    },
  });

  return (
    <Marco
      correo={perfil.correo}
      rol={perfil.rol}
      activo="profesores"
      titulo="Directorio de profesores"
    >
      <Panel
        titulo={`Profesores registrados (${profesores.length})`}
        accion={{ href: "/profesores/nuevo", texto: "+ Nuevo profesor" }}
      >
        {profesores.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <EstadoVacio>Aún no hay profesores registrados en el directorio.</EstadoVacio>
            <Link href="/profesores/nuevo" className={claseBoton}>
              Registrar el primer profesor
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={claseTabla.tabla}>
              <thead className={claseTabla.encabezado}>
                <tr>
                  <th className={claseTabla.celdaEncabezado}>Código</th>
                  <th className={claseTabla.celdaEncabezado}>Nombre</th>
                  <th className={claseTabla.celdaEncabezado}>Correo</th>
                  <th className={claseTabla.celdaEncabezado}>Grado</th>
                  <th className={claseTabla.celdaEncabezado}>Departamento</th>
                  <th className={claseTabla.celdaEncabezado}>Contratación</th>
                  <th className={claseTabla.celdaEncabezado}>Estatus</th>
                </tr>
              </thead>
              <tbody>
                {profesores.map((p) => (
                  <tr key={p.id} className={claseTabla.fila}>
                    <td className={`${claseTabla.celda} font-mono text-xs`}>{p.codigo}</td>
                    <td className={claseTabla.celda}>
                      <span className="font-medium">
                        {p.grado ? `${p.grado.nomenclatura}. ` : ""}
                        {p.apellidos}, {p.nombres}
                      </span>
                    </td>
                    <td className={`${claseTabla.celda} text-texto-3`}>{p.correo}</td>
                    <td className={`${claseTabla.celda} text-xs`}>
                      {p.grado?.nomenclatura ?? <span className="text-texto-3">—</span>}
                    </td>
                    <td className={`${claseTabla.celda} text-xs`}>
                      {p.departamento?.nombre ?? <span className="text-texto-3">—</span>}
                    </td>
                    <td className={`${claseTabla.celda} text-xs`}>
                      {ETIQUETA_CONTRATACION[p.tipoContratacion] ?? p.tipoContratacion}
                    </td>
                    <td className={claseTabla.celda}>
                      <EtiquetaEstado tipo={ESTATUS_TIPO[p.estatusLaboral] ?? "aviso"}>
                        {ETIQUETA_ESTATUS[p.estatusLaboral] ?? p.estatusLaboral}
                      </EtiquetaEstado>
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
