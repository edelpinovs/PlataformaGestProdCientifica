import Link from "next/link";
import { Marco } from "@/components/marco";
import { Aviso, claseBoton, claseBotonSecundario, claseCampo, claseEtiqueta, claseTabla, EstadoVacio, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { siguienteOrden, type ParametrosListado } from "@/lib/listados/consulta";
import { cargarConvocatoria } from "@/modules/reportes/cargar-convocatoria";
import { enlaceDescarga } from "@/modules/reportes/exportar";
import {
  analizarConvocatoria,
  aniosConvocatoria,
  COLUMNAS_CONVOCATORIA,
  consultarConvocatoria,
  enlaceConvocatoria,
  ETIQUETA_COLUMNA_CONVOCATORIA,
  ETIQUETA_GENERO,
  textoConvocatoria,
  type ColumnaConvocatoria,
  type EstadoConvocatoria,
} from "@/modules/reportes/convocatoria";
import { Descargas } from "../descargas";
import { EnlacesReportes } from "../enlaces";

const BASE = "/reportes/convocatoria";

export default async function ConvocatoriaPage({ searchParams }: { searchParams: Promise<ParametrosListado> }) {
  const perfil = await requireModulo("reportes");
  const estado = analizarConvocatoria(await searchParams);
  const carga = await cargarConvocatoria();
  const { filas, paginacion } = consultarConvocatoria(carga.dictamenes, carga.participaciones, carga.historialSnii, estado);
  const vista: EstadoConvocatoria = { ...estado, consulta: { ...estado.consulta, pagina: paginacion.pagina } };
  const mensajes = Object.values(vista.errores);
  const acotado = Boolean(vista.consulta.q) || Boolean(vista.consulta.filtros.programa) || Boolean(vista.consulta.filtros.genero) || vista.anio !== null;
  const columnas = COLUMNAS_CONVOCATORIA.filter((columna) => vista.columnas.includes(columna));
  const hayDatos = carga.dictamenes.length > 0 || carga.participaciones.length > 0;

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="reportes" titulo="Convocatoria anual"
      volver={{ href: "/reportes", texto: "Reportes" }}>
      <Panel titulo="Armar reporte" descripcion="Elige el programa, el año y las columnas. Una renovación SNII que sube de nivel cuenta como promoción; si no sube, sigue vigente. PRODEP no tiene promoción. Un dictamen en reconsideración no entra.">
        <EnlacesReportes actual="convocatoria" />
        <Constructor estado={vista} anios={aniosConvocatoria(carga.dictamenes, carga.participaciones, vista.anio)} />
      </Panel>
      <Panel titulo="Resultado" descripcion="Cada dictamen ligado a una convocatoria cuenta una vez. El desglose es por departamento y género.">
        <div className="flex flex-col gap-4">
          {mensajes.length > 0 && (
            <Aviso tipo="error"><ul>{mensajes.map((mensaje) => <li key={mensaje}>{mensaje}</li>)}</ul></Aviso>
          )}
          {vista.columnas.length > 0 && (
            <Descargas
              excel={enlaceDescarga("convocatoria", "xlsx", enlaceConvocatoria(BASE, vista))}
              pdf={enlaceDescarga("convocatoria", "pdf", enlaceConvocatoria(BASE, vista))}
            />
          )}
          {vista.columnas.length === 0 || filas.length === 0 ? (
            <EstadoVacio>
              {vista.columnas.length === 0
                ? "Elige al menos una columna para ver el reporte."
                : acotado || hayDatos
                  ? "No hay dictámenes con este reporte. Prueba con otro año, otro programa o limpia la búsqueda."
                  : "Aún no hay convocatorias con dictámenes."}
            </EstadoVacio>
          ) : (
            <table className={claseTabla.tabla}>
              <thead className={`${claseTabla.encabezado} hidden sm:table-header-group`}>
                <tr>
                  {columnas.map((columna) => <Encabezado key={columna} estado={vista} columna={columna} />)}
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => (
                  <tr key={fila.id} className={`${claseTabla.fila} flex flex-col py-3 sm:table-row sm:py-0`}>
                    {columnas.map((columna) => (
                      <td key={columna} className={`${claseTabla.celda} break-words`}>
                        <span className="mr-1 text-xs text-texto-3 sm:hidden">{ETIQUETA_COLUMNA_CONVOCATORIA[columna]}: </span>
                        {textoConvocatoria(fila, columna)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Paginacion estado={vista} paginacion={paginacion} />
        </div>
      </Panel>
    </Marco>
  );
}

function Constructor({ estado, anios }: { estado: EstadoConvocatoria; anios: number[] }) {
  const clave = [estado.columnas.join(","), estado.anio ?? "", estado.consulta.filtros.programa, estado.consulta.filtros.genero, estado.consulta.q, estado.consulta.orden, estado.consulta.dir].join("|");
  const ordenVisible = estado.columnas.includes(estado.consulta.orden as ColumnaConvocatoria)
    ? estado.consulta.orden
    : estado.columnas[0] ?? estado.consulta.orden;

  return (
    <form key={clave} action={BASE} method="get" className="flex flex-col gap-4">
      <input type="hidden" name="armado" value="1" />
      <fieldset className="flex flex-col gap-4">
        <legend className="text-sm font-medium text-texto-2">Columnas</legend>
        <div className="flex flex-wrap gap-4">
          {COLUMNAS_CONVOCATORIA.map((columna) => (
            <label key={columna} className="flex items-center gap-2 text-sm text-texto">
              <input type="checkbox" name="columnas" value={columna} defaultChecked={estado.columnas.includes(columna)} />
              {ETIQUETA_COLUMNA_CONVOCATORIA[columna]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={claseEtiqueta}>
          Programa
          <select name="programa" defaultValue={estado.consulta.filtros.programa ?? ""}
            aria-invalid={Boolean(estado.errores.programa)} className={claseCampo(Boolean(estado.errores.programa))}>
            <option value="">Todos</option>
            <option value="SNII">SNII</option>
            <option value="PRODEP">PRODEP</option>
          </select>
        </label>
        <label className={claseEtiqueta}>
          Año de la convocatoria
          <select name="anio" defaultValue={estado.anio ?? ""}
            aria-invalid={Boolean(estado.errores.anio)} className={claseCampo(Boolean(estado.errores.anio))}>
            <option value="">Todos</option>
            {anios.map((anio) => <option key={anio} value={anio}>{anio}</option>)}
          </select>
        </label>
        <label className={claseEtiqueta}>
          Género
          <select name="genero" defaultValue={estado.consulta.filtros.genero ?? ""}
            aria-invalid={Boolean(estado.errores.genero)} className={claseCampo(Boolean(estado.errores.genero))}>
            <option value="">Todos</option>
            <option value="F">{ETIQUETA_GENERO.F}</option>
            <option value="M">{ETIQUETA_GENERO.M}</option>
            <option value="PENDIENTE">{ETIQUETA_GENERO.PENDIENTE}</option>
          </select>
        </label>
        <label className={claseEtiqueta}>
          Buscar
          <input name="q" type="search" defaultValue={estado.consulta.q} maxLength={200}
            placeholder="Departamento, género o cantidad" aria-invalid={Boolean(estado.errores.q)}
            className={claseCampo(Boolean(estado.errores.q))} />
        </label>
        {estado.columnas.length > 0 && <div className="grid grid-cols-2 gap-4 sm:hidden">
          <label className={claseEtiqueta}>
            Ordenar por
            <select name="orden" defaultValue={ordenVisible} className={claseCampo(Boolean(estado.errores.orden))}>
              {estado.columnas.map((columna) => <option key={columna} value={columna}>{ETIQUETA_COLUMNA_CONVOCATORIA[columna]}</option>)}
            </select>
          </label>
          <label className={claseEtiqueta}>
            Sentido
            <select name="dir" defaultValue={estado.consulta.dir} className={claseCampo(Boolean(estado.errores.dir))}>
              <option value="asc">A–Z, menor a mayor</option>
              <option value="desc">Z–A, mayor a menor</option>
            </select>
          </label>
        </div>}
      </div>
      <div className="flex flex-wrap gap-4">
        <button type="submit" className={claseBoton}>Ver reporte</button>
        <Link href={BASE} className={claseBotonSecundario}>Restablecer</Link>
      </div>
    </form>
  );
}

function Encabezado({ estado, columna }: { estado: EstadoConvocatoria; columna: ColumnaConvocatoria }) {
  const activa = estado.consulta.orden === columna;
  return (
    <th scope="col" aria-sort={activa ? (estado.consulta.dir === "asc" ? "ascending" : "descending") : undefined}
      className={claseTabla.celdaEncabezado}>
      <Link href={enlaceConvocatoria(BASE, estado, siguienteOrden(estado.consulta, columna))}
        className="inline-flex items-center gap-1 rounded-lg hover:text-texto">
        {ETIQUETA_COLUMNA_CONVOCATORIA[columna]}
        <span aria-hidden="true" className={activa ? "text-marca" : "text-texto-3"}>
          {activa ? (estado.consulta.dir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </Link>
    </th>
  );
}

function Paginacion({ estado, paginacion }: {
  estado: EstadoConvocatoria;
  paginacion: { pagina: number; totalPaginas: number; total: number; desde: number; hasta: number };
}) {
  const enlace = (destino: number) => enlaceConvocatoria(BASE, estado, { pagina: destino });
  return (
    <div className="flex flex-col gap-4">
      <p role="status" className="text-sm text-texto-3">
        Mostrando {paginacion.desde}–{paginacion.hasta} de {new Intl.NumberFormat("es-MX").format(paginacion.total)} grupos.
      </p>
      {paginacion.totalPaginas > 1 && (
        <nav aria-label="Paginación" className="flex flex-wrap items-center justify-between gap-4">
          {paginacion.pagina > 1
            ? <Link className={claseBotonSecundario} href={enlace(paginacion.pagina - 1)}>Anterior</Link>
            : <span aria-disabled="true" className="text-sm text-texto-3">Anterior</span>}
          <span className="text-sm text-texto-3">Página {paginacion.pagina} de {paginacion.totalPaginas}</span>
          {paginacion.pagina < paginacion.totalPaginas
            ? <Link className={claseBotonSecundario} href={enlace(paginacion.pagina + 1)}>Siguiente</Link>
            : <span aria-disabled="true" className="text-sm text-texto-3">Siguiente</span>}
        </nav>
      )}
    </div>
  );
}
