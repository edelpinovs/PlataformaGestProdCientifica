import Link from "next/link";
import { Marco } from "@/components/marco";
import { Aviso, claseBoton, claseBotonSecundario, claseCampo, claseEtiqueta, claseTabla, EstadoVacio, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { siguienteOrden, type ParametrosListado } from "@/lib/listados/consulta";
import { cargarResultados } from "@/modules/reportes/cargar-publicaciones";
import { enlaceDescarga } from "@/modules/reportes/exportar";
import { ETIQUETAS_FUENTE, ETIQUETAS_TIPO } from "@/modules/produccion/consulta";
import {
  COLUMNAS_RESULTADOS,
  consultarResultados,
  enlaceResultados,
  ETIQUETA_COLUMNA_RESULTADOS,
  filaResultados,
  FUENTES_REPORTE,
  textoResultados,
  TIPOS_REPORTE,
  analizarResultados,
  type ColumnaResultado,
  type EstadoResultados,
} from "@/modules/reportes/publicaciones";
import { Descargas } from "../descargas";
import { EnlacesReportes } from "../enlaces";

const BASE = "/reportes/publicaciones";

export default async function PublicacionesReportePage({ searchParams }: { searchParams: Promise<ParametrosListado> }) {
  const perfil = await requireModulo("reportes");
  const carga = await cargarResultados();
  const estado = analizarResultados(await searchParams, carga.catalogo);
  const armadas = carga.profesores.map((profesor) => filaResultados(profesor, estado));
  const { filas, paginacion, obrasDistintas } = consultarResultados(armadas, estado);
  const vista: EstadoResultados = { ...estado, consulta: { ...estado.consulta, pagina: paginacion.pagina } };
  const mensajes = Object.values(vista.errores);
  const acotado = Boolean(vista.consulta.q) || vista.departamentoId !== null || vista.actividad !== null || vista.anio !== null || vista.tipo !== null || vista.fuente !== null;
  const columnas = COLUMNAS_RESULTADOS.filter((columna) => vista.columnas.includes(columna));
  const cifra = new Intl.NumberFormat("es-MX").format(obrasDistintas);

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="reportes" titulo="Resultados de publicaciones"
      volver={{ href: "/reportes", texto: "Reportes" }}>
      <Panel titulo="Armar reporte" descripcion="Una fila por profesor. El total cuenta obras validadas; pendientes y rechazadas van en columnas aparte. Quien no está activo aparece como «No activo».">
        <EnlacesReportes actual="publicaciones" />
        <Constructor estado={vista} departamentos={carga.departamentos} anios={[...carga.catalogo.anios].sort((a, b) => b - a)} haySinAnio={carga.catalogo.haySinAnio} />
      </Panel>
      <Panel titulo="Resultado" descripcion="El año, el tipo y la fuente principal acotan qué obras se cuentan. La fuente principal es la que quedó guardada. El desglose es solo de las validadas.">
        <div className="flex flex-col gap-4">
          {mensajes.length > 0 && (
            <Aviso tipo="error"><ul>{mensajes.map((mensaje) => <li key={mensaje}>{mensaje}</li>)}</ul></Aviso>
          )}
          {vista.columnas.length > 0 && (
            <Descargas
              excel={enlaceDescarga("publicaciones", "xlsx", enlaceResultados(BASE, vista))}
              pdf={enlaceDescarga("publicaciones", "pdf", enlaceResultados(BASE, vista))}
            />
          )}
          {vista.columnas.length === 0 || filas.length === 0 ? (
            <EstadoVacio>
              {vista.columnas.length === 0
                ? "Elige al menos una columna para ver el reporte."
                : acotado
                  ? "No hay profesores con este reporte. Prueba con otro departamento, otro año o limpia la búsqueda."
                  : "Aún no hay profesores registrados."}
            </EstadoVacio>
          ) : (
            <>
              <p className="text-sm text-texto-3">
                En este corte hay {cifra} {obrasDistintas === 1 ? "obra validada distinta" : "obras validadas distintas"}. Una obra de varios profesores cuenta para cada uno y una sola vez en esta cifra.
              </p>
              <table className={claseTabla.tabla}>
                <thead className={`${claseTabla.encabezado} hidden sm:table-header-group`}>
                  <tr>{columnas.map((columna) => <Encabezado key={columna} estado={vista} columna={columna} />)}</tr>
                </thead>
                <tbody>
                  {filas.map((fila) => (
                    <tr key={fila.id} className={`${claseTabla.fila} flex flex-col py-3 sm:table-row sm:py-0`}>
                      {columnas.map((columna) => (
                        <td key={columna} className={`${claseTabla.celda} break-words`}>
                          <span className="mr-1 text-xs text-texto-3 sm:hidden">{ETIQUETA_COLUMNA_RESULTADOS[columna]}: </span>
                          {textoResultados(fila, columna)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          <Paginacion estado={vista} paginacion={paginacion} />
        </div>
      </Panel>
    </Marco>
  );
}

function Constructor({ estado, departamentos, anios, haySinAnio }: {
  estado: EstadoResultados;
  departamentos: { id: number; nombre: string }[];
  anios: number[];
  haySinAnio: boolean;
}) {
  const clave = [estado.columnas.join(","), estado.departamentoId ?? "", estado.actividad ?? "", estado.anio ?? "", estado.tipo ?? "", estado.fuente ?? "", estado.consulta.q, estado.consulta.orden, estado.consulta.dir].join("|");
  const ordenVisible = estado.columnas.includes(estado.consulta.orden as ColumnaResultado) ? estado.consulta.orden : estado.columnas[0] ?? estado.consulta.orden;

  return (
    <form key={clave} action={BASE} method="get" className="flex flex-col gap-4">
      <input type="hidden" name="armado" value="1" />
      <fieldset className="flex flex-col gap-4">
        <legend className="text-sm font-medium text-texto-2">Columnas</legend>
        <div className="flex flex-wrap gap-4">
          {COLUMNAS_RESULTADOS.map((columna) => (
            <label key={columna} className="flex items-center gap-2 text-sm text-texto">
              <input type="checkbox" name="columnas" value={columna} defaultChecked={estado.columnas.includes(columna)} />
              {ETIQUETA_COLUMNA_RESULTADOS[columna]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={claseEtiqueta}>
          Departamento
          <select name="departamento" defaultValue={estado.departamentoId ?? ""}
            aria-invalid={Boolean(estado.errores.departamento)} className={claseCampo(Boolean(estado.errores.departamento))}>
            <option value="">Todos</option>
            {departamentos.map((fila) => <option key={fila.id} value={fila.id}>{fila.nombre}</option>)}
            <option value="sin">Sin departamento</option>
          </select>
        </label>
        <label className={claseEtiqueta}>
          Actividad
          <select name="actividad" defaultValue={estado.actividad ?? ""}
            aria-invalid={Boolean(estado.errores.actividad)} className={claseCampo(Boolean(estado.errores.actividad))}>
            <option value="">Todas</option>
            <option value="activa">Activo</option>
            <option value="no-activa">No activo</option>
          </select>
        </label>
        <label className={claseEtiqueta}>
          Año
          <select name="anio" defaultValue={estado.anio ?? ""}
            aria-invalid={Boolean(estado.errores.anio)} className={claseCampo(Boolean(estado.errores.anio))}>
            <option value="">Todos</option>
            {anios.map((anio) => <option key={anio} value={anio}>{anio}</option>)}
            {(haySinAnio || estado.anio === "sin") && <option value="sin">Sin año</option>}
          </select>
        </label>
        <label className={claseEtiqueta}>
          Tipo
          <select name="tipo" defaultValue={estado.tipo ?? ""}
            aria-invalid={Boolean(estado.errores.tipo)} className={claseCampo(Boolean(estado.errores.tipo))}>
            <option value="">Todos</option>
            {TIPOS_REPORTE.map((tipo) => <option key={tipo} value={tipo}>{ETIQUETAS_TIPO[tipo]}</option>)}
          </select>
        </label>
        <label className={claseEtiqueta}>
          Fuente principal
          <select name="fuente" defaultValue={estado.fuente ?? ""}
            aria-invalid={Boolean(estado.errores.fuente)} className={claseCampo(Boolean(estado.errores.fuente))}>
            <option value="">Todas</option>
            {FUENTES_REPORTE.map((fuente) => <option key={fuente} value={fuente}>{ETIQUETAS_FUENTE[fuente]}</option>)}
          </select>
        </label>
        <label className={claseEtiqueta}>
          Buscar
          <input name="q" type="search" defaultValue={estado.consulta.q} maxLength={200}
            placeholder="Nombre, departamento o desglose" aria-invalid={Boolean(estado.errores.q)}
            className={claseCampo(Boolean(estado.errores.q))} />
        </label>
        {estado.columnas.length > 0 && <div className="grid grid-cols-2 gap-4 sm:hidden">
          <label className={claseEtiqueta}>
            Ordenar por
            <select name="orden" defaultValue={ordenVisible} className={claseCampo(Boolean(estado.errores.orden))}>
              {estado.columnas.map((columna) => <option key={columna} value={columna}>{ETIQUETA_COLUMNA_RESULTADOS[columna]}</option>)}
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

function Encabezado({ estado, columna }: { estado: EstadoResultados; columna: ColumnaResultado }) {
  const activa = estado.consulta.orden === columna;
  return (
    <th scope="col" aria-sort={activa ? (estado.consulta.dir === "asc" ? "ascending" : "descending") : undefined} className={claseTabla.celdaEncabezado}>
      <Link href={enlaceResultados(BASE, estado, siguienteOrden(estado.consulta, columna))} className="inline-flex items-center gap-1 rounded-lg hover:text-texto">
        {ETIQUETA_COLUMNA_RESULTADOS[columna]}
        <span aria-hidden="true" className={activa ? "text-marca" : "text-texto-3"}>{activa ? (estado.consulta.dir === "asc" ? "↑" : "↓") : "↕"}</span>
      </Link>
    </th>
  );
}

function Paginacion({ estado, paginacion }: {
  estado: EstadoResultados;
  paginacion: { pagina: number; totalPaginas: number; total: number; desde: number; hasta: number };
}) {
  const enlace = (destino: number) => enlaceResultados(BASE, estado, { pagina: destino });
  return (
    <div className="flex flex-col gap-4">
      <p role="status" className="text-sm text-texto-3">
        Mostrando {paginacion.desde}–{paginacion.hasta} de {new Intl.NumberFormat("es-MX").format(paginacion.total)} profesores.
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
