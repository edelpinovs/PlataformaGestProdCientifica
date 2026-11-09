import Link from "next/link";
import { BarraListado, EncabezadoOrdenable, PaginacionListado } from "@/components/listado";
import { enlaceListado, paginar, type ParametrosListado } from "@/lib/listados/consulta";
import { COLUMNAS, consultarVista, filtroAutorias, type FilaResumen } from "@/modules/validacion/listados";
import { consultarAutorias } from "@/modules/validacion/consultar-autorias";
import { consultaResumen } from "@/modules/validacion/resumen-listado";
import { ETIQUETA_ESTADO_AUTORIA, ETIQUETA_FUENTE, ESTADOS_AUTORIA, FUENTES_PUBLICACION } from "@/modules/validacion/bandeja";
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
  searchParams: Promise<ParametrosListado>;
}) {
  const perfil = await requireModulo("validacion");

  const parametros = await searchParams;
  const departamentos = await prisma.departamento.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, nomenclatura: true } });
  const { vista, definicion, consulta, errores } = consultarVista(parametros, [...departamentos.map(d => d.nomenclatura), "—"]);
  const profesorPermitido = perfil.rol === "DOCENTE" ? (perfil.profesorId ?? -1) : undefined;
  const filtro = filtroAutorias(consulta, profesorPermitido);
  if (vista === "manuales") filtro.publicacion = { ...filtro.publicacion as object, fuente: "MANUAL" };
  const total = vista === "bandeja" || vista === "manuales" ? await prisma.autoria.count({ where: filtro }) : 0;
  let paginacion = paginar(total, consulta);
  const [profesores, todasLasAutorias, filas] = await Promise.all([
    prisma.profesor.findMany({
      where: profesorPermitido !== undefined ? { id: profesorPermitido } : {},
      orderBy: { apellidos: "asc" },
      select: { id: true, nombres: true, apellidos: true, codigo: true, departamentoId: true, departamento: { select: { id: true, nombre: true, nomenclatura: true } } },
    }),
    prisma.autoria.findMany({ where: profesorPermitido !== undefined ? { profesorId: profesorPermitido } : {}, select: { estado: true, profesorId: true, profesor: { select: { departamentoId: true } } } }),
    vista === "bandeja" || vista === "manuales" ? consultarAutorias(filtro, consulta, paginacion) : Promise.resolve([]),
  ]);
  const autoriasPendientes = filas;
  const publicacionesManuales = filas.map(a => ({ ...a.publicacion, autorias: [a] }));

  // Traducción segura de mensajes desde códigos fijos en la URL
  const { accion, error, editado, eliminado, confirmada, rechazada } = parametros;
  const codigoAccion = (typeof accion === "string" ? accion : undefined) ?? (confirmada ? "confirmada" : rechazada ? "rechazada" : editado ? "editado" : eliminado ? "eliminado" : undefined);
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

  let filasResumen: FilaResumen[] = [];
  if (vista === "profesores" || vista === "departamentos") {
    const sql = consultaResumen(vista, consulta, profesorPermitido);
    const [conteoResumen] = await prisma.$queryRaw<{ total: number }[]>(sql.contar);
    paginacion = paginar(conteoResumen.total, consulta);
    filasResumen = await prisma.$queryRaw<FilaResumen[]>(sql.pagina(paginacion.salto, paginacion.tamanio));
  }
  consulta.pagina = paginacion.pagina;
  const retorno = enlaceListado("/validacion", definicion, consulta).split("?")[1] ?? "";
  const contexto = { base: "/validacion", definicion, consulta };
  const encabezado = (columna: string, texto: string, className = claseTabla.celdaEncabezado) => (
    <EncabezadoOrdenable {...contexto} columna={columna} className={className}>{texto}</EncabezadoOrdenable>
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
          <p className="text-2xl font-semibold tracking-tight text-texto">{conteo.totalPendientes}</p>
          <p className="text-xs text-texto-3 mt-1">En espera de confirmación o descarte</p>
        </div>

        <div className="rounded-2xl bg-superficie p-4">
          <p className="text-xs font-medium text-texto-3">Exclusiones por homónimo</p>
          <p className="text-2xl font-semibold tracking-tight text-texto-2">{conteo.totalRechazadas}</p>
          <p className="text-xs text-texto-3 mt-1">Obras no pertenecientes al profesor</p>
        </div>
      </section>

      <nav aria-label="Listados de validación" className="flex flex-wrap gap-4">
        {Object.entries({ bandeja: "Bandeja", manuales: "Publicaciones manuales", profesores: "Conteo por profesor", departamentos: "Conteo por departamento" }).map(([valor, texto]) => (
          <Link key={valor} href={"/validacion?vista=" + valor} aria-current={vista === valor ? "page" : undefined} className="rounded-xl px-3 py-2 text-sm text-marca hover:bg-hover">{texto}</Link>
        ))}
      </nav>
      <BarraListado base="/validacion" consulta={consulta} columnas={COLUMNAS[vista]} errores={errores}
        filtros={[
          { clave: "vista", etiqueta: "Listado", opciones: Object.entries({ bandeja: "Bandeja", manuales: "Publicaciones manuales", profesores: "Conteo por profesor", departamentos: "Conteo por departamento" }).map(([valor, texto]) => ({ valor, texto })) },
          ...(vista === "bandeja" ? [
            { clave: "estado", etiqueta: "Estado", opciones: [{ valor: "TODOS", texto: "Todos los estados" }, ...ESTADOS_AUTORIA.map(valor => ({ valor, texto: ETIQUETA_ESTADO_AUTORIA[valor] }))] },
            { clave: "fuente", etiqueta: "Fuente", opciones: FUENTES_PUBLICACION.map(valor => ({ valor, texto: ETIQUETA_FUENTE[valor] })) },
          ] : []),
          ...(vista === "bandeja" || vista === "manuales" ? [{ clave: "tipo", etiqueta: "Tipo", opciones: TIPOS_PUBLICACION.map(valor => ({ valor, texto: ETIQUETAS_TIPO[valor] })) }] : []),
          ...(vista === "profesores" ? [{ clave: "departamento", etiqueta: "Departamento", opciones: [...departamentos.map(d => ({ valor: d.nomenclatura, texto: d.nombre })), { valor: "—", texto: "Sin departamento" }] }] : []),
        ]} />

      {/* RF-024 & RF-025 · CU-013: Bandeja de validación interactiva */}
      {vista === "bandeja" && <Panel
        titulo={`Bandeja de validación (${total} resultados)`}
        descripcion="Revisa cada obra detectada: confirma tu autoría, edita sus datos si hay inconsistencias o descártala por homónimo."
      >
        {autoriasPendientes.length === 0 ? (
          <EstadoVacio>
            No hay autorías que coincidan con la búsqueda y los filtros seleccionados.
          </EstadoVacio>
        ) : (
          <table className={claseTabla.tabla}>
            <thead className={claseTabla.encabezado}>
              <tr>
                {encabezado("fuente", "Fuente", `${claseTabla.celdaEncabezado} hidden sm:table-cell`)}
                {encabezado("tipo", "Tipo", `${claseTabla.celdaEncabezado} hidden sm:table-cell`)}
                {encabezado("titulo", "Título y Autores")}
                {encabezado("profesor", "Profesor asignado", `${claseTabla.celdaEncabezado} hidden sm:table-cell`)}
                {encabezado("estado", "Estado", `${claseTabla.celdaEncabezado} hidden sm:table-cell`)}
                <th className={`${claseTabla.celdaEncabezado} pr-0 text-right`}>
                  Acciones de revisión
                </th>
              </tr>
            </thead>
            <tbody>
              {autoriasPendientes.map((a) => (
                <FilaBandeja
                  key={`${a.publicacionId}-${a.profesorId}`}
                  retorno={retorno}
                  estadoAutoria={a.estado}
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
      </Panel>}

      {/* RF-025: Conteo oficial desglosado por profesor y por departamento */}
      {(vista === "profesores" || vista === "departamentos") && <Panel titulo={vista === "profesores" ? "Conteo oficial por profesor" : "Conteo oficial por departamento"} descripcion="Resumen de autorías validadas. Estos resultados calculados no se editan ni eliminan.">
        {filasResumen.length === 0 ? <EstadoVacio>No hay resultados para esta búsqueda.</EstadoVacio> : (
          <table className={claseTabla.tabla}>
            <thead className={`${claseTabla.encabezado} hidden sm:table-header-group`}><tr>{COLUMNAS[vista].map(c => <EncabezadoOrdenable key={c.clave} {...contexto} columna={c.clave} className={claseTabla.celdaEncabezado}>{c.texto}</EncabezadoOrdenable>)}</tr></thead>
            <tbody>{filasResumen.map(f => <tr key={f.id} className={`${claseTabla.fila} flex flex-col sm:table-row`}>
              <td className={`${claseTabla.celda} break-words`}>{f.nombre}</td>
              {vista === "profesores" ? <><td className={claseTabla.celda}><span className="sm:hidden">Código: </span>{f.codigo}</td><td className={claseTabla.celda}><span className="sm:hidden">Departamento: </span>{f.departamento}</td></> : <td className={claseTabla.celda}><span className="sm:hidden">Nomenclatura: </span>{f.nomenclatura}</td>}
              <td className={claseTabla.celda}><span className="sm:hidden">Validadas: </span>{f.validadas}</td>
            </tr>)}</tbody>
          </table>
        )}
      </Panel>}

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
      {vista === "manuales" && <Panel
        titulo={`Publicaciones manuales registradas (${total} autorías)`}
        descripcion="Obras dadas de alta directamente en el sistema."
      >
        {publicacionesManuales.length === 0 ? (
          <EstadoVacio>Aún no hay publicaciones manuales registradas.</EstadoVacio>
        ) : (
          <table className={claseTabla.tabla}>
            <thead className={claseTabla.encabezado}>
              <tr>
                {encabezado("tipo", "Tipo", `${claseTabla.celdaEncabezado} hidden sm:table-cell`)}
                {encabezado("titulo", "Título y Autores")}
                {encabezado("revista", "Revista / Editorial", `${claseTabla.celdaEncabezado} hidden md:table-cell`)}
                {encabezado("profesor", "Profesor", `${claseTabla.celdaEncabezado} hidden sm:table-cell`)}
                {encabezado("doi", "DOI", `${claseTabla.celdaEncabezado} hidden lg:table-cell`)}
                {encabezado("isbn", "ISBN / ISSN", `${claseTabla.celdaEncabezado} hidden lg:table-cell`)}
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
                    key={`${pub.id}-${autorPrincipal?.id}-${pub.titulo}-${pub.tipo}`}
                    id={pub.id}
                    nombre={pub.titulo}
                    detalle={ETIQUETAS_TIPO[pub.tipo] ?? pub.tipo}
                    editar={editarPublicacionManual.bind(null, retorno)}
                    eliminar={eliminarPublicacionManual.bind(null, retorno)}
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
                        ) : (
                          "—"
                        ),
                      },
                      { className: "hidden lg:table-cell", contenido: pub.isbnIssn ?? "—" },
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
      </Panel>}
      <PaginacionListado {...contexto} paginacion={paginacion} />
    </Marco>
  );
}
