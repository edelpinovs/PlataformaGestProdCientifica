import Link from "next/link";
import { BarraListado, EncabezadoOrdenable, PaginacionListado } from "@/components/listado";
import { Marco } from "@/components/marco";
import { claseTabla, EstadoVacio, EtiquetaEstado, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { analizarListado, hayFiltrosActivos, paginar } from "@/lib/listados/consulta";
import {
  CLAVES_REGLA,
  COLUMNAS_CALIDAD,
  filtrarHallazgos,
  LISTADO_CALIDAD,
  ordenarHallazgos,
  REGLAS_CALIDAD,
} from "@/modules/administracion/calidad";
import { Descargas } from "../descargas";
import { cargarHallazgos } from "./cargar";

const BASE = "/administracion/calidad";
const numero = new Intl.NumberFormat("es-MX");

export default async function CalidadPage({ searchParams }: PageProps<"/administracion/calidad">) {
  const perfil = await requireModulo("administracion");

  const todos = await cargarHallazgos();

  // La lista se calcula en memoria (un hallazgo por registro afectado), así que se filtra, ordena y
  // pagina aquí. Búsqueda, filtro, orden y página vienen de la URL y se validan igual que en los demás listados.
  const { consulta, errores } = analizarListado(LISTADO_CALIDAD, await searchParams);
  const filtrados = ordenarHallazgos(filtrarHallazgos(todos, consulta), consulta);
  const paginacion = paginar(filtrados.length, consulta);
  const pagina = filtrados.slice(paginacion.salto, paginacion.salto + paginacion.tamanio);
  const contexto = { base: BASE, definicion: LISTADO_CALIDAD, consulta: { ...consulta, pagina: paginacion.pagina } };

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="administracion" titulo="Calidad de datos"
      subtitulo="Inconsistencias que conviene corregir en los registros."
      volver={{ href: "/administracion", texto: "Administración" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-marca-suave px-3 py-1 text-xs font-medium text-marca">
          {numero.format(filtrados.length)} {hayFiltrosActivos(consulta) ? "coinciden" : todos.length === 1 ? "hallazgo" : "hallazgos"}
        </span>
        <Descargas listado="calidad" definicion={LISTADO_CALIDAD} consulta={consulta} />
      </div>

      <Panel titulo="Hallazgos" descripcion="Se calculan al abrir la página con los datos actuales. Cada uno enlaza a donde se corrige.">
        <div className="flex flex-col gap-4">
          <BarraListado {...contexto} columnas={COLUMNAS_CALIDAD} errores={errores}
            etiquetaBusqueda="Buscar hallazgos" placeholder="Registro, problema o detalle"
            filtros={[{ clave: "regla", etiqueta: "Problema", opciones: CLAVES_REGLA.map((r) => ({ valor: r, texto: REGLAS_CALIDAD[r].texto })) }]} />
          {pagina.length === 0 ? (
            <EstadoVacio>
              {hayFiltrosActivos(consulta)
                ? "Ningún hallazgo coincide con la búsqueda. Prueba con otro texto o quita los filtros."
                : "No se encontraron inconsistencias. Los datos revisados están en orden."}
            </EstadoVacio>
          ) : (
            <table className={claseTabla.tabla}>
              <thead className={claseTabla.encabezado}>
                <tr>
                  <EncabezadoOrdenable {...contexto} columna="registro" className={claseTabla.celdaEncabezado}>Registro</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="regla" className={claseTabla.celdaEncabezado}>Problema</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="detalle" className={claseTabla.celdaEncabezado}>Detalle</EncabezadoOrdenable>
                  <th className={`${claseTabla.celdaEncabezado} pr-0 text-right`}><span className="sr-only">Corregir</span></th>
                </tr>
              </thead>
              <tbody>
                {pagina.map((h) => (
                  <tr key={h.clave} className={claseTabla.fila}>
                    <td className={`${claseTabla.celda} text-texto`}>{h.registro}</td>
                    <td className={`${claseTabla.celda} whitespace-nowrap`}>
                      <EtiquetaEstado tipo={h.severidad}>{REGLAS_CALIDAD[h.regla].texto}</EtiquetaEstado>
                    </td>
                    <td className={claseTabla.celda}>{h.detalle}</td>
                    <td className={`${claseTabla.celda} pr-0 text-right whitespace-nowrap`}>
                      <Link href={h.enlace} className="text-sm font-medium text-marca hover:underline"
                        aria-label={`Corregir ${h.registro}`}>
                        Corregir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <PaginacionListado {...contexto} paginacion={paginacion} nombre="hallazgos" />
        </div>
      </Panel>
    </Marco>
  );
}
