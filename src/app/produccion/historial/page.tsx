import Link from "next/link";
import { analizarListado, enlaceListado, paginar, type ParametrosListado } from "@/lib/listados/consulta";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Marco } from "@/components/marco";
import { BarraListado, EncabezadoOrdenable, PaginacionListado } from "@/components/listado";
import { Aviso, claseAccionIcono, claseBotonContorno, claseBotonSecundario, claseCampo, claseEtiqueta, claseTabla, EstadoVacio, EtiquetaEstado, Icono, Panel } from "@/components/ui";
import { COLUMNAS_HISTORIAL, ESTADOS_HISTORIAL, FilaHistorial, idRegistroHistorial, LISTADO_HISTORIAL, nombreProfesor, sqlHistorial, textoAvance, TIPO_ESTADO_HISTORIAL } from "@/modules/produccion/historial";
import { datosLoteEsquema, seleccionReintento } from "@/modules/produccion/lotes";
import { rangoEfectivo, textoRango } from "@/modules/produccion/rango-escaneo";
import { presentarResultadoEscaneo } from "@/modules/produccion/resultado-escaneo";
import { fechaEscaneo } from "@/modules/produccion/fechas-escaneo";
import { NOMBRES_FUENTE } from "@/modules/produccion/fuentes";
import { ResultadoEscaneo } from "../resultado-escaneo";
import { ControlBusqueda } from "../control-busqueda";
import { DialogoDetalle, ICONO_VER } from "../dialogo-detalle";
import { analizarBusqueda, LIMITE_DETALLE, textoDuracion } from "@/modules/produccion/detalle-busqueda";
import { ETIQUETAS_TIPO, RUTA_PUBLICACIONES } from "@/modules/produccion/consulta";
import { NavegacionProduccion } from "../navegacion-produccion";
import { puedeEscanear } from "@/modules/produccion/permisos";
import { SIN_DEPARTAMENTO, textoDepartamento } from "@/modules/produccion/departamento";

function EstadoBusqueda({ estado, texto }: { estado: keyof typeof ESTADOS_HISTORIAL; texto: string }) {
  const tipo = TIPO_ESTADO_HISTORIAL[estado];
  // whitespace-nowrap: la etiqueta no se parte en dos líneas dentro de la tabla.
  return <span className="whitespace-nowrap">{tipo ? <EtiquetaEstado tipo={tipo}>{texto}</EtiquetaEstado>
    : <span className="rounded-full bg-superficie-alt px-2.5 py-1 text-xs font-medium text-texto-2">{texto}</span>}</span>;
}

export default async function HistorialPage({ searchParams }: { searchParams: Promise<ParametrosListado> }) {
  const perfil = await requireModulo("produccion");
  const parametros = await searchParams;
  const { consulta, errores } = analizarListado(LISTADO_HISTORIAL, parametros);
  const sql = sqlHistorial(consulta);
  const [{ total }] = await prisma.$queryRaw<{ total: number }[]>(sql.contar);
  const paginacion = paginar(total, consulta);
  consulta.pagina = paginacion.pagina;
  const filas = await prisma.$queryRaw<FilaHistorial[]>(sql.pagina(paginacion.salto, paginacion.tamanio));
  const contexto = { base: "/produccion/historial", definicion: LISTADO_HISTORIAL, consulta };
  const detalle = idRegistroHistorial.safeParse(parametros.registro);
  const registro = detalle.success ? await prisma.job.findFirst({ where: { id: detalle.data, tipo: { in: ["escaneo-manual", "escaneo-diario"] } } }) : null;
  const datos = datosLoteEsquema.safeParse(registro?.datos);
  const profesoresIds = datos.success ? datos.data.profesoresIds : [];
  const siguienteId = datos.success ? datos.data.profesoresIds[datos.data.indice] : undefined;
  const seleccion = { apellidos: true, nombres: true, codigo: true } as const;
  const analisis = datos.success ? analizarBusqueda(datos.data) : null;
  const filasProfesores = profesoresIds.length > 1 && analisis?.consultasRegistradas ? analisis.profesores.slice(0, LIMITE_DETALLE) : [];
  const idsPublicaciones = analisis ? analisis.publicaciones.slice(0, LIMITE_DETALLE).map((p) => p.publicacionId) : [];
  const departamentoBusqueda = datos.success ? datos.data.departamento ?? "" : "";
  const [unico, siguiente, nombres, publicaciones, departamento] = await Promise.all([
    profesoresIds.length === 1 ? prisma.profesor.findUnique({ where: { id: profesoresIds[0] }, select: seleccion }) : null,
    siguienteId === undefined ? null : prisma.profesor.findUnique({ where: { id: siguienteId }, select: seleccion }),
    filasProfesores.length ? prisma.profesor.findMany({ where: { id: { in: filasProfesores.map((f) => f.profesorId) } }, select: { id: true, ...seleccion } }) : [],
    idsPublicaciones.length ? prisma.publicacion.findMany({ where: { id: { in: idsPublicaciones } },
      select: { id: true, titulo: true, tipo: true, fechaPublicacion: true, doi: true, creadaEn: true } }) : [],
    departamentoBusqueda && departamentoBusqueda !== SIN_DEPARTAMENTO
      ? prisma.departamento.findUnique({ where: { id: Number(departamentoBusqueda) }, select: { id: true, nombre: true, nomenclatura: true } }) : null,
  ]);
  const publicacionesOrdenadas = idsPublicaciones.map((id) => publicaciones.find((p) => p.id === id)).filter((p) => p !== undefined);
  const rango = datos.success ? rangoEfectivo(datos.data) : undefined;
  const enlaceRegistro = (id: number) => `${enlaceListado(contexto.base, LISTADO_HISTORIAL, consulta)}${enlaceListado(contexto.base, LISTADO_HISTORIAL, consulta).includes("?") ? "&" : "?"}registro=${id}`;
  // Las búsquedas antiguas no guardaban `finalizadoEn`: si ya terminaron, su última actualización es el cierre.
  const terminada = registro && ["COMPLETADO", "FALLIDO", "CANCELADO"].includes(registro.estado);
  const fin = registro && terminada ? (datos.success && datos.data.finalizadoEn) || registro.actualizadoEn : null;
  const reintento = registro && datos.success && (registro.estado === "FALLIDO" || registro.estado === "CANCELADO") ? seleccionReintento(datos.data) : null;
  const datosDetalle: [string, string][] = registro ? [
    ["Inicio", fechaEscaneo(registro.creadoEn)],
    ["Profesores", !datos.success ? "No registrado" : profesoresIds.length === 1 ? (unico ? nombreProfesor(unico) : `Profesor #${profesoresIds[0]}`) : `${profesoresIds.length} profesores activos${departamentoBusqueda ? ` (${textoDepartamento(departamentoBusqueda, departamento ? [departamento] : [])})` : ""}`],
    ["Fuentes", datos.success && datos.data.fuentes?.length ? datos.data.fuentes.map((fuente) => NOMBRES_FUENTE[fuente]).join(", ") : "No registradas"],
    ["Periodo", !datos.success ? "No registrado" : rango ? textoRango(rango) : "Novedades desde la búsqueda anterior"],
    [registro.estado === "CANCELADO" ? "Cancelada" : "Terminó", fin ? fechaEscaneo(fin) : "Sin terminar"],
    ["Duración", textoDuracion(registro.creadoEn, fin) || (fin ? "Menos de un minuto" : "Sin terminar")],
    ["Obras recibidas de las fuentes", analisis?.consultasRegistradas ? String(analisis.obrasRecibidas) : "No registradas en esta búsqueda"],
  ] : [];
  return <Marco correo={perfil.correo} rol={perfil.rol} activo="produccion" titulo="Historial de búsquedas" subtitulo="Horas del centro de México. Cada búsqueda queda registrada y no se edita ni elimina." volver={{ href: "/produccion/escaneo", texto: "Escaneo de producción" }}>
    <NavegacionProduccion actual="historial" />
    <Link href="/produccion/continuidad" className={`${claseBotonContorno} w-fit`}>Ver hasta dónde llegó cada profesor y fuente</Link>
    {parametros.registro !== undefined && (!detalle.success || !registro) && <Aviso tipo="error">No se encontró una búsqueda válida para consultar.</Aviso>}
    {registro && <DialogoDetalle key={registro.id} titulo={`Búsqueda #${registro.id}`} urlCerrar={enlaceListado(contexto.base, LISTADO_HISTORIAL, consulta)} focoAlCerrar={`ver-busqueda-${registro.id}`}>
      <div className="flex flex-col gap-4">
        <dl className="grid grid-cols-1 gap-x-5 gap-y-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
          {datosDetalle.map(([termino, valor]) => <div key={termino} className="flex min-w-0 flex-col gap-1">
            <dt className="text-xs text-texto-3">{termino}</dt>
            <dd className="break-words text-texto">{valor}</dd>
          </div>)}
          <div className="flex min-w-0 flex-col gap-1">
            <dt className="text-xs text-texto-3">Avance</dt>
            <dd className="flex flex-wrap items-center gap-2 text-texto">
              <EstadoBusqueda estado={registro.estado} texto={ESTADOS_HISTORIAL[registro.estado]} />
              {textoAvance(registro.avance, registro.total)}
            </dd>
          </div>
        </dl>
        {siguienteId !== undefined && <p className="text-sm text-texto-2">Siguiente profesor pendiente: {siguiente ? nombreProfesor(siguiente) : `#${siguienteId}`}.</p>}
        <ResultadoEscaneo resultado={presentarResultadoEscaneo(registro.estado, registro.datos)} />
        {analisis && <section aria-labelledby="publicaciones-busqueda" className="flex flex-col gap-3">
          <h3 id="publicaciones-busqueda" className="text-sm font-semibold text-texto">Publicaciones guardadas en esta búsqueda{analisis.publicacionesRegistradas ? ` (${analisis.publicaciones.length})` : ""}</h3>
          {!analisis.publicacionesRegistradas ? <p className="text-sm text-texto-3">Esta búsqueda es anterior al registro del detalle y no guardó qué publicaciones trajo. Consúltalas en <Link href={RUTA_PUBLICACIONES} className="text-marca">Publicaciones</Link>.</p>
          : publicacionesOrdenadas.length ? <ul className="flex flex-col gap-2">
            {publicacionesOrdenadas.map((publicacion) => {
              const nueva = publicacion.creadaEn.getTime() >= registro.creadoEn.getTime();
              const fuentes = analisis.publicaciones.find((p) => p.publicacionId === publicacion.id)?.fuentes ?? [];
              return <li key={publicacion.id} className="flex flex-col gap-1 rounded-xl bg-superficie-alt p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <EtiquetaEstado tipo={nueva ? "exito" : "aviso"}>{nueva ? "Nueva" : "Ya existía, actualizada"}</EtiquetaEstado>
                  <Link href={`${RUTA_PUBLICACIONES}?q=${encodeURIComponent(publicacion.doi ?? publicacion.titulo.slice(0, 100))}`} className="min-w-0 break-words font-medium text-marca">{publicacion.titulo}</Link>
                </div>
                <p className="text-xs text-texto-3">{[ETIQUETAS_TIPO[publicacion.tipo], publicacion.fechaPublicacion?.getUTCFullYear(), fuentes.length ? `Fuentes: ${fuentes.join(", ")}` : null, publicacion.doi ? `DOI: ${publicacion.doi}` : null].filter(Boolean).join(" · ")}</p>
              </li>;
            })}
          </ul> : <p className="text-sm text-texto-3">Esta búsqueda no guardó publicaciones nuevas ni actualizó existentes.</p>}
          {analisis.publicaciones.length > publicacionesOrdenadas.length && <p className="text-xs text-texto-3">Se muestran {publicacionesOrdenadas.length} de {analisis.publicaciones.length}; consulta el resto en <Link href={RUTA_PUBLICACIONES} className="text-marca">Publicaciones</Link>.</p>}
        </section>}
        {filasProfesores.length > 0 && <section aria-labelledby="profesores-busqueda" className="flex flex-col gap-3">
          <h3 id="profesores-busqueda" className="text-sm font-semibold text-texto">Resultado por profesor</h3>
          <table className={claseTabla.tabla}>
            <thead className={`${claseTabla.encabezado} hidden sm:table-header-group`}><tr>
              <th className={claseTabla.celdaEncabezado}>Profesor</th><th className={claseTabla.celdaEncabezado}>Obras recibidas</th><th className={claseTabla.celdaEncabezado}>Fuentes que fallaron</th>
            </tr></thead>
            <tbody>{filasProfesores.map((fila) => {
              const profesor = nombres.find((p) => p.id === fila.profesorId);
              return <tr key={fila.profesorId} className={`${claseTabla.fila} flex flex-col sm:table-row`}>
                <td className={`${claseTabla.celda} break-words`}>{profesor ? nombreProfesor(profesor) : `Profesor #${fila.profesorId}`}</td>
                <td className={claseTabla.celda}><span className="text-xs text-texto-3 sm:hidden">Obras recibidas: </span>{fila.revisado ? fila.obras : "Sin revisar"}</td>
                <td className={`${claseTabla.celda} break-words`}><span className="text-xs text-texto-3 sm:hidden">Fuentes que fallaron: </span>{fila.fuentesConFallo.length ? fila.fuentesConFallo.join(", ") : fila.revisado ? "Ninguna" : "—"}</td>
              </tr>;
            })}</tbody>
          </table>
          {analisis!.profesores.length > filasProfesores.length && <p className="text-xs text-texto-3">Se muestran {filasProfesores.length} de {analisis!.profesores.length}: primero quienes tuvieron fallos y después quienes recibieron más obras.</p>}
        </section>}
        {datos.success && <p className="text-xs text-texto-3">{rango
          ? "Buscar un periodo no cambia desde dónde sigue la próxima búsqueda de novedades."
          : "Las novedades repasan también el año anterior para recuperar publicaciones que se indexan tarde."}</p>}
        {puedeEscanear(perfil.rol) && ["PENDIENTE", "EN_PROCESO"].includes(registro.estado) && <Link href="/produccion/escaneo" className={`${claseBotonContorno} w-fit`}>Ir al escaneo para continuar la búsqueda pendiente</Link>}
        {puedeEscanear(perfil.rol) && <ControlBusqueda key={`${registro.id}-${registro.estado}`} jobId={registro.id}
          cancelar={registro.estado === "PENDIENTE" || registro.estado === "EN_PROCESO"}
          reintentar={Boolean(reintento?.ok)} />}
        {puedeEscanear(perfil.rol) && reintento && !reintento.ok && <p className="text-xs text-texto-3">{reintento.error}</p>}
      </div>
    </DialogoDetalle>}
    <Panel titulo="Búsquedas registradas">
      <BarraListado base={contexto.base} consulta={consulta} columnas={COLUMNAS_HISTORIAL} errores={errores} placeholder="Profesor, fuente, estado o fecha"
        etiquetaBusqueda="Buscar en el historial" filtros={[
          { clave: "estado", etiqueta: "Estado", opciones: Object.entries(ESTADOS_HISTORIAL).map(([valor,texto]) => ({ valor,texto })) },
          { clave: "tipo", etiqueta: "Tipo", opciones: [{ valor: "escaneo-manual", texto: "Manual" }, { valor: "escaneo-diario", texto: "Programado (histórico)" }] },
        ]} />
      <form action={contexto.base} method="get" className="hidden gap-4 py-4 sm:flex xl:hidden">
        <input type="hidden" name="q" value={consulta.q} />{Object.entries(consulta.filtros).map(([k,v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <label className={claseEtiqueta}>Ordenar por<select name="orden" defaultValue={consulta.orden} className={claseCampo()}>{COLUMNAS_HISTORIAL.map(c => <option key={c.clave} value={c.clave}>{c.texto}</option>)}</select></label>
        <label className={claseEtiqueta}>Sentido<select name="dir" defaultValue={consulta.dir} className={claseCampo()}><option value="asc">Ascendente</option><option value="desc">Descendente</option></select></label><button className={claseBotonSecundario}>Ordenar</button>
      </form>
      {filas.length ? <table className={`${claseTabla.tabla} my-4`}><thead className={`${claseTabla.encabezado} hidden xl:table-header-group`}><tr>{COLUMNAS_HISTORIAL.map(c => <EncabezadoOrdenable key={c.clave} {...contexto} columna={c.clave} className={claseTabla.celdaEncabezado}>{c.texto}</EncabezadoOrdenable>)}<th className={claseTabla.celdaEncabezado}>Detalle</th></tr></thead>
        <tbody>{filas.map(f => {
          const abierta = f.id === registro?.id;
          const celdas: React.ReactNode[] = [f.inicio, <EstadoBusqueda key="estado" estado={f.estado} texto={f.estadoTexto} />, f.tipoTexto, f.alcance, f.fuentes, `${f.avance} de ${f.total}`, f.actualizacion];
          return <tr key={f.id} aria-current={abierta ? "true" : undefined} className={`${claseTabla.fila} flex flex-col xl:table-row ${abierta ? "bg-marca-tenue" : ""}`}>
            {celdas.map((valor, i) => <td key={i} className={`${claseTabla.celda} break-words ${i === 5 ? "xl:whitespace-nowrap" : ""}`}><span className="text-xs text-texto-3 xl:hidden">{COLUMNAS_HISTORIAL[i].texto}: </span>{valor}</td>)}
            <td className={claseTabla.celda}>
              <Link id={`ver-busqueda-${f.id}`} href={enlaceRegistro(f.id)} scroll={false} aria-label={`Ver detalle de la búsqueda ${f.id}`} title="Ver detalle"
                className={claseAccionIcono()}><Icono d={ICONO_VER} /></Link>
            </td>
          </tr>;
        })}</tbody></table> : <EstadoVacio>No hay búsquedas que coincidan con estos criterios.</EstadoVacio>}
      <PaginacionListado {...contexto} paginacion={paginacion} nombre="búsquedas" />
    </Panel>
  </Marco>;
}
