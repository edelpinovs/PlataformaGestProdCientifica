import { FilaEditable } from "@/components/fila-editable";
import { Marco } from "@/components/marco";
import { Aviso, claseTabla, EstadoVacio, EtiquetaEstado, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ETIQUETAS_TIPO, TIPOS_PUBLICACION } from "@/modules/validacion/manual";
import { editarPublicacionManual, eliminarPublicacionManual } from "./actions";
import { FormularioManual } from "./formulario-manual";

export default async function ValidacionPage({
  searchParams,
}: {
  searchParams: Promise<{ editado?: string; eliminado?: string }>;
}) {
  const perfil = await requireModulo("validacion");

  const [parametros, profesores, publicacionesManuales] = await Promise.all([
    searchParams,
    prisma.profesor.findMany({
      orderBy: { apellidos: "asc" },
      select: { id: true, nombres: true, apellidos: true, codigo: true },
    }),
    prisma.publicacion.findMany({
      where: {
        fuente: "MANUAL",
        ...(perfil.rol === "DOCENTE" && perfil.profesorId
          ? { autorias: { some: { profesorId: perfil.profesorId } } }
          : {}),
      },
      orderBy: { id: "desc" },
      include: {
        autorias: {
          include: {
            profesor: {
              select: { id: true, nombres: true, apellidos: true, codigo: true },
            },
          },
        },
      },
    }),
  ]);

  const { editado, eliminado } = parametros;
  const resultado =
    typeof editado === "string" ? `Se guardaron los cambios de «${editado}».`
    : typeof eliminado === "string" ? `Se eliminó «${eliminado}».`
    : null;

  return (
    <Marco
      correo={perfil.correo}
      rol={perfil.rol}
      activo="validacion"
      titulo="Validación de producción científica"
      subtitulo="Registro manual de obras no detectadas y bandeja de validación del profesorado."
    >
      {/* RF-023: Captura manual de publicaciones */}
      <Panel titulo="Registrar publicación manual" descripcion="RF-023 · CU-012: Captura manual de obras con sus datos bibliográficos.">
        <FormularioManual
          profesores={profesores}
          profesorPreseleccionadoId={perfil.profesorId ?? undefined}
          esDocente={perfil.rol === "DOCENTE"}
        />
      </Panel>

      {/* Listado de publicaciones manuales con Editar y Eliminar (#59) */}
      <Panel
        titulo={`Publicaciones manuales registradas (${publicacionesManuales.length})`}
        descripcion="Obras dadas de alta directamente en el sistema."
      >
        {resultado && (
          <div className="mb-4">
            <Aviso tipo="exito">{resultado}</Aviso>
          </div>
        )}

        {publicacionesManuales.length === 0 ? (
          <EstadoVacio>Aún no hay publicaciones manuales registradas.</EstadoVacio>
        ) : (
          <div className="overflow-x-auto sm:overflow-visible">
            <table className={claseTabla.tabla}>
              <thead className={claseTabla.encabezado}>
                <tr>
                  <th className={claseTabla.celdaEncabezado}>Tipo</th>
                  <th className={claseTabla.celdaEncabezado}>Título y Autores</th>
                  <th className={claseTabla.celdaEncabezado}>Revista / Editorial</th>
                  <th className={claseTabla.celdaEncabezado}>Profesor</th>
                  <th className={claseTabla.celdaEncabezado}>Identificador</th>
                  <th className={`${claseTabla.celdaEncabezado} pr-0 text-right`}>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {publicacionesManuales.map((pub) => {
                  const autorPrincipal = pub.autorias[0]?.profesor;
                  const nombreAutor = autorPrincipal
                    ? `${autorPrincipal.apellidos}, ${autorPrincipal.nombres}`
                    : "Sin asignar";

                  return (
                    <FilaEditable
                      key={`${pub.id}-${pub.titulo}-${pub.tipo}`}
                      id={pub.id}
                      nombre={pub.titulo}
                      detalle={ETIQUETAS_TIPO[pub.tipo] ?? pub.tipo}
                      editar={editarPublicacionManual}
                      eliminar={eliminarPublicacionManual}
                      celdas={[
                        {
                          contenido: (
                            <EtiquetaEstado tipo="exito">
                              {ETIQUETAS_TIPO[pub.tipo] ?? pub.tipo}
                            </EtiquetaEstado>
                          ),
                        },
                        {
                          contenido: (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium text-texto">{pub.titulo}</span>
                              <span className="text-xs text-texto-3">{pub.autoresTexto}</span>
                            </div>
                          ),
                        },
                        { contenido: pub.revistaEditorial || "—" },
                        { contenido: <span className="text-xs">{nombreAutor}</span> },
                        {
                          contenido: pub.doi ? (
                            <span className="font-mono text-xs">{pub.doi}</span>
                          ) : pub.isbnIssn ? (
                            <span className="font-mono text-xs">{pub.isbnIssn}</span>
                          ) : (
                            "—"
                          ),
                        },
                      ]}
                      campos={[
                        {
                          nombre: "tipo",
                          etiqueta: "Tipo",
                          valor: pub.tipo,
                          opciones: TIPOS_PUBLICACION.map((t) => ({
                            valor: t,
                            texto: ETIQUETAS_TIPO[t],
                          })),
                        },
                        {
                          nombre: "titulo",
                          etiqueta: "Título",
                          valor: pub.titulo,
                          maxLength: 500,
                          ancho: "amplio",
                        },
                        {
                          nombre: "autoresTexto",
                          etiqueta: "Autores",
                          valor: pub.autoresTexto,
                          maxLength: 500,
                          ancho: "amplio",
                        },
                        {
                          nombre: "revistaEditorial",
                          etiqueta: "Revista o Editorial",
                          valor: pub.revistaEditorial ?? "",
                          maxLength: 250,
                          ancho: "medio",
                        },
                        {
                          nombre: "isbnIssn",
                          etiqueta: "ISBN o ISSN",
                          valor: pub.isbnIssn ?? "",
                          maxLength: 50,
                          ancho: "corto",
                        },
                        {
                          nombre: "doi",
                          etiqueta: "DOI",
                          valor: pub.doi ?? "",
                          maxLength: 100,
                          ancho: "medio",
                        },
                      ]}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Bandeja de pendientes · Base para RF-024 y RF-025 */}
      <Panel
        titulo="Bandeja de publicaciones detectadas"
        descripcion="RF-024 · RF-025 · CU-013: Obras detectadas automáticamente pendientes de validación."
      >
        <EstadoVacio>
          No hay publicaciones pendientes de validar en este momento.
        </EstadoVacio>
      </Panel>
    </Marco>
  );
}
