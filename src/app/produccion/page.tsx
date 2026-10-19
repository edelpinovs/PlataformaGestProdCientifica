import { Marco } from "@/components/marco";
import {
  claseTabla,
  EstadoVacio,
  EtiquetaEstado,
  Panel,
} from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { FormularioEscaneo } from "./formulario-escaneo";

export default async function ProduccionPage() {
  const perfil = await requireModulo("produccion");

  const [profesores, totalPublicaciones, totalPendientes, ultimoJob, publicaciones] =
    await Promise.all([
      prisma.profesor.findMany({
        where: { estatusLaboral: "ACTIVO" },
        select: { id: true, nombres: true, apellidos: true },
        orderBy: { apellidos: "asc" },
      }),
      prisma.publicacion.count(),
      prisma.autoria.count({ where: { estado: "PENDIENTE" } }),
      prisma.job.findFirst({
        where: { tipo: { in: ["escaneo-manual", "escaneo-diario"] } },
        orderBy: { creadoEn: "desc" },
      }),
      prisma.publicacion.findMany({
        take: 50,
        orderBy: { creadaEn: "desc" },
        include: {
          autorias: {
            include: {
              profesor: {
                select: { id: true, nombres: true, apellidos: true },
              },
            },
          },
        },
      }),
    ]);

  return (
    <Marco
      correo={perfil.correo}
      rol={perfil.rol}
      activo="produccion"
      titulo="Motor de escaneo"
      subtitulo="Extracción desde ORCID, Scopus y OpenAlex con deduplicación y vinculación de coautorías."
    >
      {/* Tarjetas de métricas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-marca-tenue p-4">
          <p className="text-xs text-texto-3">Total de publicaciones</p>
          <p className="text-2xl font-semibold tracking-tight text-texto">
            {new Intl.NumberFormat("es-MX").format(totalPublicaciones)}
          </p>
        </div>
        <div className="rounded-2xl bg-marca-tenue p-4">
          <p className="text-xs text-texto-3">Autorías pendientes de validar</p>
          <p className="text-2xl font-semibold tracking-tight text-texto">
            {new Intl.NumberFormat("es-MX").format(totalPendientes)}
          </p>
        </div>
        <div className="rounded-2xl bg-marca-tenue p-4">
          <p className="text-xs text-texto-3">Último escaneo registrado</p>
          <p className="text-sm font-medium text-texto">
            {ultimoJob
              ? `${ultimoJob.estado} (${ultimoJob.avance}/${ultimoJob.total})`
              : "Sin escaneos previos"}
          </p>
        </div>
      </div>

      {/* Panel de control de escaneo */}
      <Panel
        titulo="Escanear producción científica (RF-020)"
        descripcion="Consulta APIs externas por identificadores de profesor, deduplica por DOI/título y asocia autorías institucionales."
      >
        <FormularioEscaneo profesores={profesores} />
      </Panel>

      {/* Listado de publicaciones */}
      <Panel
        titulo={`Publicaciones escaneadas y unificadas (${totalPublicaciones})`}
        descripcion="Resultados consolidados en la base de datos tras el proceso de deduplicación (RF-021, RF-022)."
      >
        {publicaciones.length === 0 ? (
          <EstadoVacio>
            Aún no hay publicaciones escaneadas. Selecciona un profesor o lote arriba y haz clic en «Escanear ahora».
          </EstadoVacio>
        ) : (
          <div className="overflow-x-auto">
            <table className={claseTabla.tabla}>
              <thead className={claseTabla.encabezado}>
                <tr>
                  <th className={claseTabla.celdaEncabezado}>Título</th>
                  <th className={claseTabla.celdaEncabezado}>Tipo</th>
                  <th className={claseTabla.celdaEncabezado}>Revista / DOI</th>
                  <th className={claseTabla.celdaEncabezado}>Profesores vinculados</th>
                  <th className={claseTabla.celdaEncabezado}>Fuente</th>
                </tr>
              </thead>
              <tbody>
                {publicaciones.map((pub) => {
                  const tieneCoautoria = pub.autorias.length > 1;
                  return (
                    <tr key={pub.id} className={claseTabla.fila}>
                      <td className={`${claseTabla.celda} max-w-md font-medium text-texto`}>
                        <p className="line-clamp-2">{pub.titulo}</p>
                        <p className="mt-1 text-xs text-texto-3">{pub.autoresTexto}</p>
                      </td>
                      <td className={claseTabla.celda}>
                        <span className="font-mono text-xs">{pub.tipo}</span>
                      </td>
                      <td className={claseTabla.celda}>
                        <p className="text-xs text-texto-2">{pub.revistaEditorial || "Sin revista"}</p>
                        {pub.doi && (
                          <p className="font-mono text-xs text-texto-3">
                            DOI: {pub.doi}
                          </p>
                        )}
                      </td>
                      <td className={claseTabla.celda}>
                        <div className="flex flex-col gap-1">
                          {tieneCoautoria && (
                            <span className="w-fit">
                              <EtiquetaEstado tipo="aviso">
                                Coautoría ({pub.autorias.length})
                              </EtiquetaEstado>
                            </span>
                          )}
                          <ul className="text-xs text-texto-2">
                            {pub.autorias.map((a) => (
                              <li key={a.profesorId}>
                                • {a.profesor.apellidos}, {a.profesor.nombres}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </td>
                      <td className={claseTabla.celda}>
                        <EtiquetaEstado tipo="exito">{pub.fuente}</EtiquetaEstado>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </Marco>
  );
}
