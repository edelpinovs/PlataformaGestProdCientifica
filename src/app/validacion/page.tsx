import { FilaEditable } from "@/components/fila-editable";
import { Marco } from "@/components/marco";
import { Aviso, claseTabla, EstadoVacio, EtiquetaEstado, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { calcularConteoOficial } from "@/modules/validacion/bandeja";
import { ETIQUETAS_TIPO, TIPOS_PUBLICACION } from "@/modules/validacion/manual";
import { editarPublicacionManual, eliminarPublicacionManual } from "./actions";
import { FilaBandeja } from "./fila-bandeja";
import { FormularioManual } from "./formulario-manual";

export default async function ValidacionPage({
  searchParams,
}: {
  searchParams: Promise<{
    editado?: string;
    eliminado?: string;
    confirmada?: string;
    rechazada?: string;
    error?: string;
  }>;
}) {
  const perfil = await requireModulo("validacion");

  const [parametros, profesores, todasLasAutorias, publicacionesManuales, autoriasPendientes] =
    await Promise.all([
      searchParams,
      prisma.profesor.findMany({
        orderBy: { apellidos: "asc" },
        select: { id: true, nombres: true, apellidos: true, codigo: true },
      }),
      prisma.autoria.findMany({
        where:
          perfil.rol === "DOCENTE" && perfil.profesorId
            ? { profesorId: perfil.profesorId }
            : {},
        select: {
          estado: true,
          profesorId: true,
          profesor: { select: { departamentoId: true } },
        },
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
      prisma.autoria.findMany({
        where: {
          estado: "PENDIENTE",
          ...(perfil.rol === "DOCENTE" && perfil.profesorId
            ? { profesorId: perfil.profesorId }
            : {}),
        },
        orderBy: { publicacion: { creadaEn: "desc" } },
        include: {
          publicacion: true,
          profesor: {
            select: { id: true, nombres: true, apellidos: true, codigo: true },
          },
        },
      }),
    ]);

  const { editado, eliminado, confirmada, rechazada, error } = parametros;

  // RF-025: Calcular métricas oficiales de producción validada
  const conteo = calcularConteoOficial(
    todasLasAutorias.map((a) => ({
      estado: a.estado,
      profesorId: a.profesorId,
      departamentoId: a.profesor?.departamentoId,
    })),
  );

  return (
    <Marco
      correo={perfil.correo}
      rol={perfil.rol}
      activo="validacion"
      titulo="Validación de producción científica"
      subtitulo="Bandeja de revisión de obras detectadas (RF-024, RF-025) y captura manual (RF-023)."
    >
      {/* Mensajes de retroalimentación de acciones */}
      {confirmada && (
        <Aviso tipo="exito">
          Se confirmó la autoría de «{confirmada}». La obra se incorporó al conteo oficial.
        </Aviso>
      )}
      {rechazada && (
        <Aviso tipo="aviso">
          Se rechazó por homónimo «{rechazada}». Queda registrada como exclusión.
        </Aviso>
      )}
      {editado && <Aviso tipo="exito">Se guardaron los cambios de «{editado}».</Aviso>}
      {eliminado && <Aviso tipo="exito">Se eliminó «{eliminado}» correctamente.</Aviso>}
      {error && <Aviso tipo="error">{error}</Aviso>}

      {/* RF-025: Tarjetas de métricas del conteo oficial */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-marca-tenue p-4">
          <p className="text-xs font-medium text-texto-3">Producción validada (oficial)</p>
          <p className="text-2xl font-semibold tracking-tight text-marca">{conteo.totalValidadas}</p>
          <p className="text-xs text-texto-3 mt-1">Obras acreditadas para el profesorado</p>
        </div>

        <div className="rounded-2xl bg-superficie p-4">
          <p className="text-xs font-medium text-texto-3">Pendientes de validación</p>
          <p className="text-2xl font-semibold tracking-tight text-texto">{autoriasPendientes.length}</p>
          <p className="text-xs text-texto-3 mt-1">En espera de confirmación o descarte</p>
        </div>

        <div className="rounded-2xl bg-superficie p-4">
          <p className="text-xs font-medium text-texto-3">Exclusiones por homónimo</p>
          <p className="text-2xl font-semibold tracking-tight text-texto-2">{conteo.totalRechazadas}</p>
          <p className="text-xs text-texto-3 mt-1">Obras no pertenecientes al profesor</p>
        </div>
      </section>

      {/* RF-024 & RF-025 · CU-013: Bandeja de validación interactiva */}
      <Panel
        titulo={`Bandeja de validación (${autoriasPendientes.length} pendientes)`}
        descripcion="Revisa cada obra detectada: confirma tu autoría, edita sus datos si hay inconsistencias o descártala por homónimo."
      >
        {autoriasPendientes.length === 0 ? (
          <EstadoVacio>
            No tienes publicaciones pendientes de validar en este momento. Cuando el motor de escaneo detecte nuevas obras en ORCID o Scopus, aparecerán aquí.
          </EstadoVacio>
        ) : (
          <div className="overflow-x-auto sm:overflow-visible">
            <table className={claseTabla.tabla}>
              <thead className={claseTabla.encabezado}>
                <tr>
                  <th className={claseTabla.celdaEncabezado}>Fuente y Tipo</th>
                  <th className={claseTabla.celdaEncabezado}>Título y Autores</th>
                  <th className={claseTabla.celdaEncabezado}>Profesor asignado</th>
                  <th className={`${claseTabla.celdaEncabezado} pr-0 text-right`}>
                    Acciones de revisión
                  </th>
                </tr>
              </thead>
              <tbody>
                {autoriasPendientes.map((a) => (
                  <FilaBandeja
                    key={`${a.publicacionId}-${a.profesorId}`}
                    publicacion={{
                      id: a.publicacion.id,
                      tipo: a.publicacion.tipo,
                      titulo: a.publicacion.titulo,
                      autoresTexto: a.publicacion.autoresTexto,
                      revistaEditorial: a.publicacion.revistaEditorial,
                      isbnIssn: a.publicacion.isbnIssn,
                      doi: a.publicacion.doi,
                      fechaPublicacion: a.publicacion.fechaPublicacion,
                      fuente: a.publicacion.fuente,
                      profesorId: a.profesorId,
                      profesorNombre: `${a.profesor.apellidos}, ${a.profesor.nombres}`,
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* RF-023 · CU-012: Captura manual de publicaciones */}
      <Panel
        titulo="Registrar publicación manual"
        descripcion="RF-023 · CU-012: Da de alta obras no detectadas por los conectores automáticos."
      >
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
    </Marco>
  );
}
