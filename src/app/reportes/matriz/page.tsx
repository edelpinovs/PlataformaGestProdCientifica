import Link from "next/link";
import { Marco } from "@/components/marco";
import { Aviso, claseBoton, claseBotonSecundario, claseCampo, claseEtiqueta, claseTabla, EstadoVacio, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { siguienteOrden, type ParametrosListado } from "@/lib/listados/consulta";
import { cargarMatriz } from "@/modules/reportes/cargar-matriz";
import { enlaceDescarga } from "@/modules/reportes/exportar";
import {
  analizarMatriz,
  COLUMNAS_MATRIZ,
  consultarMatriz,
  enlaceMatriz,
  ETIQUETA_COLUMNA_MATRIZ,
  textoMatriz,
  type ColumnaMatriz,
  type EstadoMatriz,
} from "@/modules/reportes/matriz";
import { Descargas } from "../descargas";
import { EnlacesReportes } from "../enlaces";

const BASE = "/reportes/matriz";

export default async function MatrizPage({ searchParams }: { searchParams: Promise<ParametrosListado> }) {
  const perfil = await requireModulo("reportes");
  const carga = await cargarMatriz();
  const estado = analizarMatriz(await searchParams, {
    departamentos: carga.departamentos.map((fila) => fila.id),
    programas: carga.programas.map((fila) => fila.id),
  });
  const { filas, paginacion } = consultarMatriz(carga.filas, estado);
  const vista: EstadoMatriz = { ...estado, consulta: { ...estado.consulta, pagina: paginacion.pagina } };
  const mensajes = Object.values(vista.errores);
  const acotado = Boolean(vista.consulta.q) || vista.departamentoId !== null || vista.programaId !== null;
  const columnas = COLUMNAS_MATRIZ.filter((columna) => vista.columnas.includes(columna));

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="reportes" titulo="Matriz de acreditación"
      volver={{ href: "/reportes", texto: "Reportes" }}>
      <Panel titulo="Armar reporte" descripcion="Elige el departamento, el programa educativo y las columnas. El SNII y el PRODEP aparecen solo si hoy están vigentes.">
        <EnlacesReportes actual="matriz" />
        <Constructor estado={vista} departamentos={carga.departamentos} programas={carga.programas} />
      </Panel>
      <Panel titulo="Resultado" descripcion="Una fila por profesor. No incluye proyectos activos.">
        <div className="flex flex-col gap-4">
          {mensajes.length > 0 && (
            <Aviso tipo="error"><ul>{mensajes.map((mensaje) => <li key={mensaje}>{mensaje}</li>)}</ul></Aviso>
          )}
          {vista.columnas.length > 0 && (
            <Descargas
              excel={enlaceDescarga("matriz", "xlsx", enlaceMatriz(BASE, vista))}
              pdf={enlaceDescarga("matriz", "pdf", enlaceMatriz(BASE, vista))}
            />
          )}
          {vista.columnas.length === 0 || filas.length === 0 ? (
            <EstadoVacio>
              {vista.columnas.length === 0
                ? "Elige al menos una columna para ver el reporte."
                : acotado
                  ? "No hay profesores con este reporte. Prueba con otro departamento, otro programa o limpia la búsqueda."
                  : "Aún no hay profesores registrados."}
            </EstadoVacio>
          ) : (
            <table className={claseTabla.tabla}>
              <thead className={`${claseTabla.encabezado} hidden sm:table-header-group`}>
                <tr>{columnas.map((columna) => <Encabezado key={columna} estado={vista} columna={columna} />)}</tr>
              </thead>
              <tbody>
                {filas.map((fila) => (
                  <tr key={fila.id} className={`${claseTabla.fila} flex flex-col py-3 sm:table-row sm:py-0`}>
                    {columnas.map((columna) => (
                      <td key={columna} className={`${claseTabla.celda} break-words`}>
                        <span className="mr-1 text-xs text-texto-3 sm:hidden">{ETIQUETA_COLUMNA_MATRIZ[columna]}: </span>
                        {textoMatriz(fila, columna)}
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

function Constructor({ estado, departamentos, programas }: {
  estado: EstadoMatriz;
  departamentos: { id: number; nombre: string }[];
  programas: { id: number; nombre: string }[];
}) {
  const clave = [estado.columnas.join(","), estado.departamentoId ?? "", estado.programaId ?? "", estado.consulta.q, estado.consulta.orden, estado.consulta.dir].join("|");
  const ordenVisible = estado.columnas.includes(estado.consulta.orden as ColumnaMatriz) ? estado.consulta.orden : estado.columnas[0] ?? estado.consulta.orden;

  return (
    <form key={clave} action={BASE} method="get" className="flex flex-col gap-4">
      <input type="hidden" name="armado" value="1" />
      <fieldset className="flex flex-col gap-4">
        <legend className="text-sm font-medium text-texto-2">Columnas</legend>
        <div className="flex flex-wrap gap-4">
          {COLUMNAS_MATRIZ.map((columna) => (
            <label key={columna} className="flex items-center gap-2 text-sm text-texto">
              <input type="checkbox" name="columnas" value={columna} defaultChecked={estado.columnas.includes(columna)} />
              {ETIQUETA_COLUMNA_MATRIZ[columna]}
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
          </select>
        </label>
        <label className={claseEtiqueta}>
          Programa educativo
          <select name="programa" defaultValue={estado.programaId ?? ""}
            aria-invalid={Boolean(estado.errores.programa)} className={claseCampo(Boolean(estado.errores.programa))}>
            <option value="">Todos</option>
            {programas.map((fila) => <option key={fila.id} value={fila.id}>{fila.nombre}</option>)}
          </select>
        </label>
        <label className={claseEtiqueta}>
          Buscar
          <input name="q" type="search" defaultValue={estado.consulta.q} maxLength={200}
            placeholder="Código, nombre, programa o distinción" aria-invalid={Boolean(estado.errores.q)}
            className={claseCampo(Boolean(estado.errores.q))} />
        </label>
        {estado.columnas.length > 0 && <div className="grid grid-cols-2 gap-4 sm:hidden">
          <label className={claseEtiqueta}>
            Ordenar por
            <select name="orden" defaultValue={ordenVisible} className={claseCampo(Boolean(estado.errores.orden))}>
              {estado.columnas.map((columna) => <option key={columna} value={columna}>{ETIQUETA_COLUMNA_MATRIZ[columna]}</option>)}
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

function Encabezado({ estado, columna }: { estado: EstadoMatriz; columna: ColumnaMatriz }) {
  const activa = estado.consulta.orden === columna;
  return (
    <th scope="col" aria-sort={activa ? (estado.consulta.dir === "asc" ? "ascending" : "descending") : undefined} className={claseTabla.celdaEncabezado}>
      <Link href={enlaceMatriz(BASE, estado, siguienteOrden(estado.consulta, columna))} className="inline-flex items-center gap-1 rounded-lg hover:text-texto">
        {ETIQUETA_COLUMNA_MATRIZ[columna]}
        <span aria-hidden="true" className={activa ? "text-marca" : "text-texto-3"}>{activa ? (estado.consulta.dir === "asc" ? "↑" : "↓") : "↕"}</span>
      </Link>
    </th>
  );
}

function Paginacion({ estado, paginacion }: {
  estado: EstadoMatriz;
  paginacion: { pagina: number; totalPaginas: number; total: number; desde: number; hasta: number };
}) {
  const enlace = (destino: number) => enlaceMatriz(BASE, estado, { pagina: destino });
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
