import { notFound } from "next/navigation";
import { Marco } from "@/components/marco";
import { Aviso, claseTabla, EstadoVacio, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ETIQUETA_NIVEL } from "@/modules/cuerpos-academicos/cuerpo";
import { nombreProfesor, tieneProdepActivo } from "@/modules/cuerpos-academicos/integrantes";
import { FilaIntegrante } from "./fila";
import { FormularioIntegrante } from "./formulario";

export default async function DetalleCuerpoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ editado?: string; eliminado?: string }>;
}) {
  const perfil = await requireModulo("cuerpos-academicos");
  const { id: bruto } = await params;
  const id = Number(bruto);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const hoy = new Date();
  const [{ editado, eliminado }, cuerpo, profesoresTc] = await Promise.all([
    searchParams,
    prisma.cuerpoAcademico.findUnique({
      where: { id },
      include: {
        departamento: { select: { nombre: true, nomenclatura: true } },
        integrantes: {
          include: {
            profesor: {
              select: {
                id: true,
                nombres: true,
                apellidos: true,
                codigo: true,
                reconocimientosProdep: { select: { resultado: true, inicio: true, fin: true } },
              },
            },
          },
          orderBy: { profesor: { apellidos: "asc" } },
        },
      },
    }),
    prisma.profesor.findMany({
      where: { tipoContratacion: "TIEMPO_COMPLETO", estatusLaboral: "ACTIVO" },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        codigo: true,
        reconocimientosProdep: { select: { resultado: true, inicio: true, fin: true } },
      },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    }),
  ]);
  if (!cuerpo) notFound();

  const idsIntegrantes = new Set(cuerpo.integrantes.map((i) => i.profesorId));
  const candidatos = profesoresTc
    .filter((p) => !idsIntegrantes.has(p.id))
    .map((p) => ({
      id: p.id,
      etiqueta: nombreProfesor(p),
      prodepActivo: tieneProdepActivo(p.reconocimientosProdep, hoy),
    }));
  const integrantes = cuerpo.integrantes.map((i) => ({
    profesorId: i.profesorId,
    nombre: nombreProfesor(i.profesor),
    codigo: i.profesor.codigo,
    prodepActivo: tieneProdepActivo(i.profesor.reconocimientosProdep, hoy),
  }));

  const resultado =
    typeof editado === "string" ? `Se guardaron los cambios de ${editado}.`
    : typeof eliminado === "string" ? `Se quitó a ${eliminado}.`
    : null;

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="cuerpos-academicos"
      titulo={cuerpo.nombre}
      subtitulo={`${cuerpo.clave} · ${ETIQUETA_NIVEL[cuerpo.nivel]} · ${cuerpo.departamento.nombre}`}
      volver={{ href: "/cuerpos-academicos", texto: "Cuerpos académicos" }}>
      <Panel titulo="Asignar integrante" descripcion="RF-013 · CU-008. Solo profesores de tiempo completo. El primero debe tener PRODEP vigente; después no se quita el último PRODEP que aún esté vigente.">
        {profesoresTc.length === 0 ? (
          <EstadoVacio>
            Aún no hay profesores de tiempo completo en el directorio. Cuando el módulo de Profesores esté en marcha, aparecerán aquí.
          </EstadoVacio>
        ) : candidatos.length === 0 ? (
          <EstadoVacio>Todos los profesores de tiempo completo ya son integrantes de este cuerpo académico.</EstadoVacio>
        ) : (
          <FormularioIntegrante
            cuerpoId={cuerpo.id}
            candidatos={candidatos}
            avisoInicial={
              integrantes.length === 0 && !candidatos.some((c) => c.prodepActivo)
                ? "Nadie en el directorio tiene Perfil Deseable PRODEP vigente. El primer integrante no se podrá guardar hasta que exista uno."
                : undefined
            }
          />
        )}
      </Panel>

      <Panel titulo={`Integrantes (${integrantes.length})`}>
        {resultado && <div className="mb-4"><Aviso tipo="exito">{resultado}</Aviso></div>}
        {integrantes.length === 0 ? (
          <EstadoVacio>Aún no hay integrantes. El primero debe tener Perfil Deseable PRODEP activo.</EstadoVacio>
        ) : (
          <div className="overflow-x-auto sm:overflow-visible">
            <table className={claseTabla.tabla}>
              <thead className={claseTabla.encabezado}>
                <tr>
                  <th className={claseTabla.celdaEncabezado}>Profesor</th>
                  <th className={claseTabla.celdaEncabezado}>Código</th>
                  <th className={claseTabla.celdaEncabezado}>PRODEP</th>
                  <th className={`${claseTabla.celdaEncabezado} pr-0 text-right`}>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {integrantes.map((i) => (
                  <FilaIntegrante
                    key={`${i.profesorId}-${i.nombre}`}
                    cuerpoId={cuerpo.id}
                    integrante={i}
                    candidatos={candidatos}
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
