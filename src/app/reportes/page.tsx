import Link from "next/link";
import { Marco } from "@/components/marco";
import { Aviso, claseBoton, claseBotonSecundario, claseCampo, claseEtiqueta, claseTabla, EstadoVacio, EtiquetaEstado, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { siguienteOrden, type ParametrosListado } from "@/lib/listados/consulta";
import { cargarVigencias } from "@/modules/reportes/cargar-vigencias";
import {
  COLUMNAS_VIGENCIA,
  consultarVigencias,
  enlaceReporte,
  ETIQUETA_COLUMNA,
  ETIQUETA_SEMAFORO,
  ETIQUETA_TIPO,
  textoColumna,
  TIPOS_DISTINCION,
  analizarReporte,
  opcionesAnio,
  type ColumnaVigencia,
  type EstadoReporte,
  type FilaVigencia,
} from "@/modules/reportes/vigencias";

const BASE = "/reportes";

const TIPO_ETIQUETA = {
  VERDE: "exito",
  AMARILLO: "aviso",
  ROJO: "error",
} as const;

export default async function ReportesPage({ searchParams }: { searchParams: Promise<ParametrosListado> }) {
  const perfil = await requireModulo("reportes");
  const estado = analizarReporte(await searchParams);
  const cargadas = await cargarVigencias(estado.tipos);
  const { filas, paginacion } = consultarVigencias(cargadas, estado);
  const vista: EstadoReporte = { ...estado, consulta: { ...estado.consulta, pagina: paginacion.pagina } };
  const mensajes = Object.values(vista.errores);
  const acotado = Boolean(vista.consulta.q) || Boolean(vista.consulta.filtros.semaforo) || vista.anio !== null || vista.tipos.length !== TIPOS_DISTINCION.length;
  const columnas = COLUMNAS_VIGENCIA.filter((columna) => vista.columnas.includes(columna));

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="reportes" titulo="Vigencias y reportes">
      <Panel titulo="Armar reporte" descripcion="Elige las distinciones, las columnas y el año de vencimiento. El semáforo se calcula al abrir el reporte: vigente, por vencer en 12 meses o menos, o vencido.">
        <Constructor estado={vista} anios={opcionesAnio(cargadas, vista.anio)} />
      </Panel>

      <Panel titulo="Resultado" descripcion="Reconocimientos aprobados o en reconsideración, y cuerpos académicos. El vencimiento de un cuerpo es el 31 de diciembre de su año de vencimiento.">
        <div className="flex flex-col gap-4">
          {mensajes.length > 0 && (
            <Aviso tipo="error">
              <ul>{mensajes.map((mensaje) => <li key={mensaje}>{mensaje}</li>)}</ul>
            </Aviso>
          )}
          {vista.columnas.length === 0 || filas.length === 0 ? (
            <EstadoVacio>
              {vista.columnas.length === 0
                ? "Elige al menos una columna para ver el reporte."
                : acotado
                  ? "No hay distinciones con este reporte. Prueba con otro año, otra búsqueda o incluye más distinciones."
                  : "Aún no hay distinciones SNII, PRODEP ni cuerpos académicos."}
            </EstadoVacio>
          ) : (
            <table className={claseTabla.tabla}>
              <thead className={`${claseTabla.encabezado} hidden sm:table-header-group`}>
                <tr>
                  {columnas.map((columna) => (
                    <Encabezado key={columna} estado={vista} columna={columna} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => (
                  <tr key={fila.id} className={`${claseTabla.fila} flex flex-col py-3 sm:table-row sm:py-0`}>
                    {columnas.map((columna) => (
                      <td key={columna} className={`${claseTabla.celda} break-words`}>
                        <span className="mr-1 text-xs text-texto-3 sm:hidden">{ETIQUETA_COLUMNA[columna]}: </span>
                        <Celda fila={fila} columna={columna} />
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

function Constructor({ estado, anios }: { estado: EstadoReporte; anios: number[] }) {
  const clave = [
    estado.tipos.join(","),
    estado.columnas.join(","),
    estado.anio ?? "",
    estado.consulta.q,
    estado.consulta.filtros.semaforo,
    estado.consulta.orden,
    estado.consulta.dir,
  ].join("|");
  const ordenVisible = estado.columnas.includes(estado.consulta.orden as ColumnaVigencia)
    ? estado.consulta.orden
    : estado.columnas[0] ?? estado.consulta.orden;

  return (
    <form key={clave} action={BASE} method="get" className="flex flex-col gap-4">
      <input type="hidden" name="armado" value="1" />
      <fieldset className="flex flex-col gap-4">
        <legend className="text-sm font-medium text-texto-2">Distinciones</legend>
        <div className="flex flex-wrap gap-4">
          {TIPOS_DISTINCION.map((tipo) => (
            <label key={tipo} className="flex items-center gap-2 text-sm text-texto">
              <input type="checkbox" name="tipos" value={tipo} defaultChecked={estado.tipos.includes(tipo)} />
              {ETIQUETA_TIPO[tipo]}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-4">
        <legend className="text-sm font-medium text-texto-2">Columnas</legend>
        <div className="flex flex-wrap gap-4">
          {COLUMNAS_VIGENCIA.map((columna) => (
            <label key={columna} className="flex items-center gap-2 text-sm text-texto">
              <input type="checkbox" name="columnas" value={columna} defaultChecked={estado.columnas.includes(columna)} />
              {ETIQUETA_COLUMNA[columna]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={claseEtiqueta}>
          Buscar
          <input name="q" type="search" defaultValue={estado.consulta.q} maxLength={200}
            placeholder="Nombre, departamento o estado" aria-invalid={Boolean(estado.errores.q)}
            className={claseCampo(Boolean(estado.errores.q))} />
        </label>
        <label className={claseEtiqueta}>
          Año de vencimiento
          <select name="anio" defaultValue={estado.anio ?? ""}
            aria-invalid={Boolean(estado.errores.anio)} className={claseCampo(Boolean(estado.errores.anio))}>
            <option value="">Todos</option>
            {anios.map((anio) => <option key={anio} value={anio}>{anio}</option>)}
          </select>
        </label>
        <label className={claseEtiqueta}>
          Semáforo
          <select name="semaforo" defaultValue={estado.consulta.filtros.semaforo ?? ""}
            aria-invalid={Boolean(estado.errores.semaforo)} className={claseCampo(Boolean(estado.errores.semaforo))}>
            <option value="">Todos</option>
            <option value="VERDE">Vigente</option>
            <option value="AMARILLO">Por vencer</option>
            <option value="ROJO">Vencido</option>
          </select>
        </label>
        {estado.columnas.length > 0 && <div className="grid grid-cols-2 gap-4 sm:hidden">
          <label className={claseEtiqueta}>
            Ordenar por
            <select name="orden" defaultValue={ordenVisible} aria-invalid={Boolean(estado.errores.orden)}
              className={claseCampo(Boolean(estado.errores.orden))}>
              {estado.columnas.map((columna) => (
                <option key={columna} value={columna}>{ETIQUETA_COLUMNA[columna]}</option>
              ))}
            </select>
          </label>
          <label className={claseEtiqueta}>
            Sentido
            <select name="dir" defaultValue={estado.consulta.dir} aria-invalid={Boolean(estado.errores.dir)}
              className={claseCampo(Boolean(estado.errores.dir))}>
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

function Encabezado({ estado, columna }: { estado: EstadoReporte; columna: ColumnaVigencia }) {
  const activa = estado.consulta.orden === columna;
  const href = enlaceReporte(BASE, estado, siguienteOrden(estado.consulta, columna));
  return (
    <th scope="col" aria-sort={activa ? (estado.consulta.dir === "asc" ? "ascending" : "descending") : undefined}
      className={claseTabla.celdaEncabezado}>
      <Link href={href} className="inline-flex items-center gap-1 rounded-lg hover:text-texto">
        {ETIQUETA_COLUMNA[columna]}
        <span aria-hidden="true" className={activa ? "text-marca" : "text-texto-3"}>
          {activa ? (estado.consulta.dir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </Link>
    </th>
  );
}

function Celda({ fila, columna }: { fila: FilaVigencia; columna: ColumnaVigencia }) {
  if (columna !== "semaforo") return textoColumna(fila, columna);
  return <EtiquetaEstado tipo={TIPO_ETIQUETA[fila.semaforo]}>{ETIQUETA_SEMAFORO[fila.semaforo]}</EtiquetaEstado>;
}

function Paginacion({ estado, paginacion }: { estado: EstadoReporte; paginacion: { pagina: number; totalPaginas: number; total: number; desde: number; hasta: number } }) {
  const { pagina, totalPaginas, total, desde, hasta } = paginacion;
  const enlace = (destino: number) => enlaceReporte(BASE, estado, { pagina: destino });
  return (
    <div className="flex flex-col gap-4">
      <p role="status" className="text-sm text-texto-3">
        Mostrando {desde}–{hasta} de {new Intl.NumberFormat("es-MX").format(total)} distinciones.
      </p>
      {totalPaginas > 1 && (
        <nav aria-label="Paginación" className="flex flex-wrap items-center justify-between gap-4">
          {pagina > 1
            ? <Link className={claseBotonSecundario} href={enlace(pagina - 1)}>Anterior</Link>
            : <span aria-disabled="true" className="text-sm text-texto-3">Anterior</span>}
          <span className="text-sm text-texto-3">Página {pagina} de {totalPaginas}</span>
          {pagina < totalPaginas
            ? <Link className={claseBotonSecundario} href={enlace(pagina + 1)}>Siguiente</Link>
            : <span aria-disabled="true" className="text-sm text-texto-3">Siguiente</span>}
        </nav>
      )}
    </div>
  );
}
