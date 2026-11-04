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

const AVISOS_URL: Record<string, { tipo: "exito" | "aviso" | "error"; mensaje: string }> = {
  confirmada: {
    tipo: "exito",
    mensaje: "Se confirmó la autoría. La obra se incorporó al conteo oficial.",
  },
  rechazada: {
    tipo: "aviso",
    mensaje: "Se rechazó la obra por homónimo. Quedó registrada como exclusión.",
  },
  editado: {
    tipo: "exito",
    mensaje: "Se guardaron los cambios de la publicación.",
  },
  eliminado: {
    tipo: "exito",
    mensaje: "Se eliminó la publicación del sistema.",
  },
  "sin-permiso": {
    tipo: "error",
    mensaje: "No tienes permiso para realizar esa acción.",
  },
  "datos-invalidos": {
    tipo: "error",
    mensaje: "Los datos de la obra o autoría no son válidos.",
  },
  "no-existe": {
    tipo: "error",
    mensaje: "La publicación o autoría ya no existe en el sistema.",
  },
  "transicion-invalida": {
    tipo: "error",
    mensaje: "El estado actual de la obra no admite esa acción.",
  },
};

export default async function ValidacionPage({
  searchParams,
}: {
  searchParams: Promise<{
    accion?: string;
    error?: string;
    editado?: string;
    eliminado?: string;
    confirmada?: string;
    rechazada?: string;
  }>;
}) {
  const perfil = await requireModulo("validacion");

  const [
    parametros,
    profesores,
    departamentos,
    todasLasAutorias,
    publicacionesManuales,
    autoriasPendientes,
  ] = await Promise.all([
    searchParams,
    prisma.profesor.findMany({
      orderBy: { apellidos: "asc" },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        codigo: true,
        departamentoId: true,
        departamento: { select: { id: true, nombre: true, nomenclatura: true } },
      },
    }),
    prisma.departamento.findMany({
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, nomenclatura: true },
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

  // Traducción segura de mensajes desde códigos fijos en la URL
  const { accion, error, editado, eliminado, confirmada, rechazada } = parametros;
  const codigoAccion = accion ?? (confirmada ? "confirmada" : rechazada ? "rechazada" : editado ? "editado" : eliminado ? "eliminado" : undefined);
  const avisoAccion = codigoAccion ? AVISOS_URL[codigoAccion] : undefined;
  const avisoError = typeof error === "string" ? AVISOS_URL[error] : undefined;

  // RF-025: Calcular métricas oficiales de producción validada
  const conteo = calcularConteoOficial(
    todasLasAutorias.map((a) => ({
      estado: a.estado,
      profesorId: a.profesorId,
      departamentoId: a.profesor?.departamentoId,
    })),
  );

  // RF-025: Filtrar conteos por profesor y por departamento según rol
  const profesoresConteo =
    perfil.rol === "DOCENTE" && perfil.profesorId
      ? profesores.filter((p) => p.id === perfil.profesorId)
      : profesores;

  const departamentosConteo =
    perfil.rol === "DOCENTE" && perfil.profesorId
      ? departamentos.filter((d) => d.id === profesoresConteo[0]?.departamentoId)
      : departamentos;

  const profesoresOrdenados = [...profesoresConteo].sort(
    (a, b) => (conteo.porProfesor[b.id] ?? 0) - (conteo.porProfesor[a.id] ?? 0),
  );

  const departamentosOrdenados = [...departamentosConteo].sort(
    (a, b) => (conteo.porDepartamento[b.id] ?? 0) - (conteo.porDepartamento[a.id] ?? 0),
  );

  return (
    <Marco
      correo={perfil.correo}
      rol={perfil.rol}
      activo="validacion"
      titulo="Validación de producción científica"
      subtitulo="Bandeja de revisión de obras detectadas (RF-024, RF-025) y captura manual (RF-023)."
    >
      {/* Mensajes de retroalimentación de acciones traducidos desde códigos fijos */}
      {avisoAccion && <Aviso tipo={avisoAccion.tipo}>{avisoAccion.mensaje}</Aviso>}
      {avisoError && <Aviso tipo={avisoError.tipo}>{avisoError.mensaje}</Aviso>}

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
          <table className={claseTabla.tabla}>
            <thead className={claseTabla.encabezado}>
              <tr>
                <th className={`${claseTabla.celdaEncabezado} hidden sm:table-cell`}>Fuente y Tipo</th>
                <th className={claseTabla.celdaEncabezado}>Título y Autores</th>
                <th className={`${claseTabla.celdaEncabezado} hidden sm:table-cell`}>Profesor asignado</th>
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
        )}
      </Panel>

      {/* RF-025: Conteo oficial desglosado por profesor y por departamento */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel
          titulo={`Conteo oficial por profesor (${profesoresOrdenados.length})`}
          descripcion="Producción científica validada acumulada por cada docente (RF-025)."
        >
          {profesoresOrdenados.length === 0 ? (
            <EstadoVacio>No hay profesores con adscripción registrada.</EstadoVacio>
          ) : (
            <table className={claseTabla.tabla}>
              <thead className={claseTabla.encabezado}>
                <tr>
                  <th className={claseTabla.celdaEncabezado}>Profesor</th>
                  <th className={`${claseTabla.celdaEncabezado} hidden sm:table-cell`}>Código</th>
                  <th className={`${claseTabla.celdaEncabezado} hidden md:table-cell`}>Departamento</th>
                  <th className={`${claseTabla.celdaEncabezado} text-right pr-0`}>Validadas</th>
                </tr>
              </thead>
              <tbody>
                {profesoresOrdenados.map((prof) => (
                  <tr key={prof.id} className={claseTabla.fila}>
                    <td className={claseTabla.celda}>
                      <div className="flex flex-col">
                        <span className="font-medium text-texto">
                          {prof.apellidos}, {prof.nombres}
                        </span>
                        <span className="text-xs text-texto-3 sm:hidden">
                          {prof.codigo} {prof.departamento ? `· ${prof.departamento.nomenclatura}` : ""}
                        </span>
                      </div>
                    </td>
                    <td className={`${claseTabla.celda} hidden sm:table-cell font-mono text-xs text-texto-3`}>
                      {prof.codigo}
                    </td>
                    <td className={`${claseTabla.celda} hidden md:table-cell text-xs text-texto-2`}>
                      {prof.departamento?.nomenclatura ?? "—"}
                    </td>
                    <td className={`${claseTabla.celda} text-right pr-0 font-semibold text-marca`}>
                      {conteo.porProfesor[prof.id] ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel
          titulo={`Conteo oficial por departamento (${departamentosOrdenados.length})`}
          descripcion="Producción científica validada acumulada por departamento de adscripción (RF-025)."
        >
          {departamentosOrdenados.length === 0 ? (
            <EstadoVacio>No hay departamentos registrados.</EstadoVacio>
          ) : (
            <table className={claseTabla.tabla}>
              <thead className={claseTabla.encabezado}>
                <tr>
                  <th className={claseTabla.celdaEncabezado}>Departamento</th>
                  <th className={claseTabla.celdaEncabezado}>Nomenclatura</th>
                  <th className={`${claseTabla.celdaEncabezado} text-right pr-0`}>Validadas</th>
                </tr>
              </thead>
              <tbody>
                {departamentosOrdenados.map((dep) => (
                  <tr key={dep.id} className={claseTabla.fila}>
                    <td className={claseTabla.celda}>
                      <span className="font-medium text-texto">{dep.nombre}</span>
                    </td>
                    <td className={`${claseTabla.celda} font-mono text-xs text-texto-3`}>
                      {dep.nomenclatura}
                    </td>
                    <td className={`${claseTabla.celda} text-right pr-0 font-semibold text-marca`}>
                      {conteo.porDepartamento[dep.id] ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

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
          <table className={claseTabla.tabla}>
            <thead className={claseTabla.encabezado}>
              <tr>
                <th className={`${claseTabla.celdaEncabezado} hidden sm:table-cell`}>Tipo</th>
                <th className={claseTabla.celdaEncabezado}>Título y Autores</th>
                <th className={`${claseTabla.celdaEncabezado} hidden md:table-cell`}>Revista / Editorial</th>
                <th className={`${claseTabla.celdaEncabezado} hidden sm:table-cell`}>Profesor</th>
                <th className={`${claseTabla.celdaEncabezado} hidden lg:table-cell`}>Identificador</th>
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
                        className: "hidden sm:table-cell",
                        contenido: (
                          <EtiquetaEstado tipo="exito">
                            {ETIQUETAS_TIPO[pub.tipo] ?? pub.tipo}
                          </EtiquetaEstado>
                        ),
                      },
                      {
                        contenido: (
                          <div className="flex flex-col gap-0.5">
                            {/* En celular, muestra tipo arriba */}
                            <div className="sm:hidden mb-1">
                              <EtiquetaEstado tipo="exito">
                                {ETIQUETAS_TIPO[pub.tipo] ?? pub.tipo}
                              </EtiquetaEstado>
                            </div>
                            <span className="font-medium text-texto">{pub.titulo}</span>
                            <span className="text-xs text-texto-3">{pub.autoresTexto}</span>
                            {/* En celular, muestra revista, profesor e identificador */}
                            <div className="flex flex-wrap items-center gap-2 pt-1 sm:hidden text-xs text-texto-3">
                              <span className="font-medium text-texto-2">{nombreAutor}</span>
                              {pub.revistaEditorial && <span>· {pub.revistaEditorial}</span>}
                              {pub.doi ? (
                                <span className="font-mono">{pub.doi}</span>
                              ) : pub.isbnIssn ? (
                                <span className="font-mono">{pub.isbnIssn}</span>
                              ) : null}
                            </div>
                          </div>
                        ),
                      },
                      {
                        className: "hidden md:table-cell",
                        contenido: pub.revistaEditorial || "—",
                      },
                      {
                        className: "hidden sm:table-cell",
                        contenido: <span className="text-xs">{nombreAutor}</span>,
                      },
                      {
                        className: "hidden lg:table-cell",
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
        )}
      </Panel>
    </Marco>
  );
}
