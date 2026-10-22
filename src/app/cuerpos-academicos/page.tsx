import { Marco } from "@/components/marco";
import { Aviso, claseTabla, EstadoVacio, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getModulo } from "@/modules/registry";
import { FilaCuerpo } from "./fila";
import { FormularioCuerpo } from "./formulario";

export default async function CuerposAcademicosPage({
  searchParams,
}: {
  searchParams: Promise<{ editado?: string; eliminado?: string }>;
}) {
  const perfil = await requireModulo("cuerpos-academicos");
  const modulo = getModulo("cuerpos-academicos");
  const [{ editado, eliminado }, departamentos, cuerpos] = await Promise.all([
    searchParams,
    prisma.departamento.findMany({
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, nomenclatura: true },
    }),
    prisma.cuerpoAcademico.findMany({
      orderBy: { nombre: "asc" },
      include: { departamento: { select: { nombre: true, nomenclatura: true } } },
    }),
  ]);

  const resultado =
    typeof editado === "string" ? `Se guardaron los cambios de «${editado}».`
    : typeof eliminado === "string" ? `Se eliminó «${eliminado}».`
    : null;

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="cuerpos-academicos" titulo={modulo.nombre}
      subtitulo="Registro de CA: clave, nivel, área PRODEP, disciplina y departamento.">
      <Panel titulo="Registrar cuerpo académico" descripcion="RF-012 · CU-007">
        {departamentos.length === 0 ? (
          <EstadoVacio>
            Todo cuerpo académico pertenece a un departamento. Pide a un administrador que registre departamentos en Catálogos.
          </EstadoVacio>
        ) : (
          <FormularioCuerpo departamentos={departamentos} />
        )}
      </Panel>

      <Panel titulo={`Registrados (${cuerpos.length})`}>
        {resultado && <div className="mb-4"><Aviso tipo="exito">{resultado}</Aviso></div>}
        {cuerpos.length === 0 ? (
          <EstadoVacio>Aún no hay cuerpos académicos registrados.</EstadoVacio>
        ) : (
          <div className="overflow-x-auto sm:overflow-visible">
            <table className={claseTabla.tabla}>
              <thead className={claseTabla.encabezado}>
                <tr>
                  <th className={claseTabla.celdaEncabezado}>Clave</th>
                  <th className={claseTabla.celdaEncabezado}>Nombre</th>
                  <th className={claseTabla.celdaEncabezado}>Nivel</th>
                  <th className={claseTabla.celdaEncabezado}>Departamento</th>
                  <th className={claseTabla.celdaEncabezado}>Vigencia</th>
                  <th className={`${claseTabla.celdaEncabezado} pr-0 text-right`}>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {cuerpos.map((c) => (
                  <FilaCuerpo
                    key={`${c.id}-${c.clave}-${c.nombre}-${c.nivel}-${c.departamentoId}-${c.anioRegistro}-${c.anioVencimiento}`}
                    cuerpo={c}
                    departamentos={departamentos}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </Marco>
  );
}
