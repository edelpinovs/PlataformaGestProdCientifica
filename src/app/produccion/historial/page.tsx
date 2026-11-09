import Link from "next/link";
import { analizarListado, enlaceListado, paginar, type ParametrosListado } from "@/lib/listados/consulta";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Marco } from "@/components/marco";
import { BarraListado, EncabezadoOrdenable, PaginacionListado } from "@/components/listado";
import { Aviso, claseBotonSecundario, claseCampo, claseEtiqueta, claseTabla, EstadoVacio, Panel } from "@/components/ui";
import { COLUMNAS_HISTORIAL, ESTADOS_HISTORIAL, FilaHistorial, idRegistroHistorial, LISTADO_HISTORIAL, sqlHistorial } from "@/modules/produccion/historial";
import { datosLoteEsquema } from "@/modules/produccion/lotes";
import { presentarResultadoEscaneo } from "@/modules/produccion/resultado-escaneo";
import { ResultadoEscaneo } from "../resultado-escaneo";
import { NavegacionProduccion } from "../navegacion-produccion";

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
  const enlaceRegistro = (id: number) => `${enlaceListado(contexto.base, LISTADO_HISTORIAL, consulta)}${enlaceListado(contexto.base, LISTADO_HISTORIAL, consulta).includes("?") ? "&" : "?"}registro=${id}`;
  return <Marco correo={perfil.correo} rol={perfil.rol} activo="produccion" titulo="Historial de búsquedas" subtitulo="Fechas mostradas en America/Mexico_City. El historial conserva la trazabilidad y no se edita ni elimina." volver={{ href: "/produccion/escaneo", texto: "Escaneo de producción" }}>
    <NavegacionProduccion actual="historial" />
    <Link href="/produccion/continuidad" className={claseBotonSecundario}>Ver hasta dónde llegó cada profesor y fuente</Link>
    {parametros.registro !== undefined && (!detalle.success || !registro) && <Aviso tipo="error">No se encontró una búsqueda válida para consultar.</Aviso>}
    {registro && <Panel titulo={`Búsqueda #${registro.id}`} descripcion="Se muestra el avance confirmado; una fuente fallida conserva su último corte válido.">
      <p className="text-sm text-texto-2">{registro.avance} de {registro.total} profesores revisados. {datos.success && datos.data.profesoresIds[datos.data.indice] !== undefined ? `Siguiente profesor pendiente: #${datos.data.profesoresIds[datos.data.indice]}.` : ""}</p>
      <ResultadoEscaneo resultado={presentarResultadoEscaneo(registro.estado, registro.datos)} />
      {datos.success && <p className="text-sm text-texto-3">{datos.data.anio ? `Año solicitado: ${datos.data.anio}. Esta consulta histórica no adelanta los cortes incrementales.` : "Consulta incremental: conserva el solapamiento para recuperar indexaciones tardías."}</p>}
      <p className="text-sm text-texto-3">Fecha de finalización: {datos.success && datos.data.finalizadoEn ? new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", hourCycle: "h23", timeZone: "America/Mexico_City" }).format(new Date(datos.data.finalizadoEn)) : "No registrada"}. La actualización del avance no equivale a una finalización.</p>
      {perfil.rol === "COORDINADOR" && ["PENDIENTE", "EN_PROCESO"].includes(registro.estado) && <Link href="/produccion/escaneo" className={claseBotonSecundario}>Ir al escaneo para continuar la búsqueda pendiente</Link>}
    </Panel>}
    <Panel titulo="Búsquedas registradas">
      <BarraListado base={contexto.base} consulta={consulta} columnas={COLUMNAS_HISTORIAL} errores={errores} filtros={[
        { clave: "estado", etiqueta: "Estado", opciones: Object.entries(ESTADOS_HISTORIAL).map(([valor,texto]) => ({ valor,texto })) },
        { clave: "tipo", etiqueta: "Tipo", opciones: [{ valor: "escaneo-manual", texto: "Manual" }, { valor: "escaneo-diario", texto: "Programado (histórico)" }] },
      ]} />
      <form action={contexto.base} method="get" className="hidden gap-4 py-4 sm:flex xl:hidden">
        <input type="hidden" name="q" value={consulta.q} />{Object.entries(consulta.filtros).map(([k,v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <label className={claseEtiqueta}>Ordenar por<select name="orden" defaultValue={consulta.orden} className={claseCampo()}>{COLUMNAS_HISTORIAL.map(c => <option key={c.clave} value={c.clave}>{c.texto}</option>)}</select></label>
        <label className={claseEtiqueta}>Sentido<select name="dir" defaultValue={consulta.dir} className={claseCampo()}><option value="asc">Ascendente</option><option value="desc">Descendente</option></select></label><button className={claseBotonSecundario}>Ordenar</button>
      </form>
      {filas.length ? <table className={`${claseTabla.tabla} my-4`}><thead className={`${claseTabla.encabezado} hidden xl:table-header-group`}><tr>{COLUMNAS_HISTORIAL.map(c => <EncabezadoOrdenable key={c.clave} {...contexto} columna={c.clave} className={claseTabla.celdaEncabezado}>{c.texto}</EncabezadoOrdenable>)}<th className={claseTabla.celdaEncabezado}>Detalle</th></tr></thead>
        <tbody>{filas.map(f => <tr key={f.id} className={`${claseTabla.fila} flex flex-col xl:table-row`}>{[f.inicio,f.estadoTexto,f.tipoTexto,f.alcance,f.fuentes,`${f.avance} de ${f.total}`,f.actualizacion].map((valor,i) => <td key={i} className={`${claseTabla.celda} break-words`}><span className="text-xs text-texto-3 xl:hidden">{COLUMNAS_HISTORIAL[i].texto}: </span>{valor}</td>)}<td className={claseTabla.celda}><Link href={enlaceRegistro(f.id)} className="text-marca" aria-label={`Ver detalle de la búsqueda ${f.id}`}>Ver detalle</Link></td></tr>)}</tbody></table> : <EstadoVacio>No hay búsquedas que coincidan con estos criterios.</EstadoVacio>}
      <PaginacionListado {...contexto} paginacion={paginacion} nombre="búsquedas" />
    </Panel>
  </Marco>;
}
