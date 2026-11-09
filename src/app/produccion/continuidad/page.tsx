import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { analizarListado, paginar, type ParametrosListado } from "@/lib/listados/consulta";
import { Marco } from "@/components/marco";
import { BarraListado, EncabezadoOrdenable, PaginacionListado } from "@/components/listado";
import { claseTabla, EstadoVacio, Panel } from "@/components/ui";
import { COLUMNAS_CONTINUIDAD, FUENTES_CONTINUIDAD, LISTADO_CONTINUIDAD, periodoProximaConsulta, sqlContinuidad, type FilaContinuidad } from "@/modules/produccion/historial";
import { NavegacionProduccion } from "../navegacion-produccion";

export default async function ContinuidadPage({ searchParams }: { searchParams: Promise<ParametrosListado> }) {
  const perfil = await requireModulo("produccion");
  const { consulta, errores } = analizarListado(LISTADO_CONTINUIDAD, await searchParams);
  const sql = sqlContinuidad(consulta);
  const [{ total }] = await prisma.$queryRaw<{ total: number }[]>(sql.contar);
  const paginacion = paginar(total, consulta);
  consulta.pagina = paginacion.pagina;
  const filas = await prisma.$queryRaw<(FilaContinuidad & { fuenteTexto: string; corteTexto: string })[]>(sql.pagina(paginacion.salto, paginacion.tamanio));
  const contexto = { base: "/produccion/continuidad", definicion: LISTADO_CONTINUIDAD, consulta };
  return <Marco correo={perfil.correo} rol={perfil.rol} activo="produccion" titulo="Puntos de continuación" subtitulo="Cortes vigentes por profesor activo y fuente. Fechas en America/Mexico_City." volver={{ href: "/produccion/escaneo", texto: "Escaneo de producción" }}>
    <NavegacionProduccion actual="historial" />
    <Panel titulo="Hasta dónde se consultó" descripcion="El corte corresponde a una consulta completada y guardada; una fuente fallida conserva su corte anterior. No es la fecha de la última publicación. Sin corte válido puede no haber una búsqueda previa completada.">
      <p className="mb-4 text-sm text-texto-3">La próxima búsqueda de novedades incluye solapamiento para recuperar indexaciones tardías. Elegir un año histórico conserva estos cortes. Los trabajos pendientes continúan por su índice guardado, no desde el comienzo.</p>
      <BarraListado base={contexto.base} consulta={consulta} columnas={COLUMNAS_CONTINUIDAD} errores={errores} etiquetaBusqueda="Buscar profesor, código, fuente o periodo" filtros={[{ clave: "fuente", etiqueta: "Fuente", opciones: FUENTES_CONTINUIDAD.map(valor => ({ valor, texto: valor === "SCOPUS" ? "Scopus" : valor === "OPENALEX" ? "OpenAlex" : valor })) }]} />
      {filas.length ? <table className={`${claseTabla.tabla} my-4 table-fixed`}><thead className={`${claseTabla.encabezado} hidden sm:table-header-group`}><tr>{COLUMNAS_CONTINUIDAD.map(c => <EncabezadoOrdenable key={c.clave} {...contexto} columna={c.clave} className={`${claseTabla.celdaEncabezado} break-words`}>{c.texto}</EncabezadoOrdenable>)}</tr></thead><tbody>{filas.map(f => <tr key={`${f.profesorId}-${f.fuente}`} className={`${claseTabla.fila} flex flex-col sm:table-row`}>{[f.profesor, f.fuenteTexto, f.corteTexto, periodoProximaConsulta(f.fuente,f.corte)].map((valor,i) => <td key={i} className={`${claseTabla.celda} break-words`}><span className="text-xs text-texto-3 sm:hidden">{COLUMNAS_CONTINUIDAD[i].texto}: </span>{valor}</td>)}</tr>)}</tbody></table> : <EstadoVacio>No hay profesores o fuentes que coincidan con la búsqueda.</EstadoVacio>}
      <PaginacionListado {...contexto} paginacion={paginacion} nombre="puntos de continuación" />
    </Panel>
  </Marco>;
}
