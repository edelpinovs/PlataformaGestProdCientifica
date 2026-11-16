import Link from "next/link";
import { Aviso, claseBoton, claseBotonContorno, claseBotonSecundario, claseCampo, claseEtiqueta, Icono, ICONOS } from "./ui";
import { SelectorFiltro } from "./listado-cliente";
import {
  enlaceListado,
  hayFiltrosActivos,
  paginasVisibles,
  siguienteOrden,
  type ConsultaListado,
  type DefinicionListado,
  type ErroresListado,
  type Paginacion,
} from "@/lib/listados/consulta";

// Piezas de interfaz de los listados (regla D-009 y pauta visual). Se usan con las funciones
// puras de src/lib/listados/consulta.ts; ver el ejemplo en src/app/catalogos/grados/.

/** La lista desplegable nativa no hereda el fondo transparente del selector: sin esto se ve clara en el tema oscuro. */
const claseOpcion = "bg-superficie text-texto";

type Contexto = { base: string; definicion: DefinicionListado; consulta: ConsultaListado };

export type FiltroUi = {
  /** Nombre del parámetro, igual al de `definicion.filtros`. */
  clave: string;
  etiqueta: string;
  opciones: { valor: string; texto: string }[];
  /** Campo compuesto por el módulo, con su etiqueta, nombre y validación. */
  contenido?: React.ReactNode;
};

/** Filtro de pocas opciones que se muestra como grupo de botones («Todos», «Activos»…). */
export type SegmentadoUi = {
  /** Nombre del parámetro, igual al de `definicion.filtros`. */
  clave: string;
  /** Nombre del grupo para tecnologías de asistencia, p. ej. «Situación». */
  etiqueta: string;
  /** Cada opción filtra por su `valor`; «Todos» se agrega al inicio y quita el filtro. */
  opciones: { valor: string; texto: string }[];
};

/**
 * Barra del listado: búsqueda de texto libre, filtros y, solo en celular, «Ordenar por».
 * Es un formulario GET y el estado queda en la URL. Las listas de filtro aplican al elegir y
 * Enter envía la búsqueda; sin JavaScript aparece el botón «Buscar». El grupo `segmentado`
 * son enlaces que conservan el resto del estado. Al enviarlo vuelve a la página 1 porque no manda `pagina`.
 */
export function BarraListado({ base, definicion, consulta, filtros = [], segmentado, columnas, errores = {}, etiquetaBusqueda = "Buscar", placeholder }: Omit<Contexto, "definicion"> & {
  /** Obligatoria con `segmentado`: sus enlaces necesitan las reglas del listado. */
  definicion?: DefinicionListado;
  filtros?: FiltroUi[];
  segmentado?: SegmentadoUi;
  /** Columnas ordenables con su texto, para el selector de celular. */
  columnas: { clave: string; texto: string }[];
  errores?: ErroresListado;
  etiquetaBusqueda?: string;
  placeholder?: string;
}) {
  if (segmentado && !definicion) throw new Error("BarraListado: el grupo segmentado necesita `definicion`.");
  const mensajes = Object.values(errores);
  // El grupo segmentado son enlaces: su valor viaja en el formulario como campo oculto.
  const valorSegmentado = segmentado ? consulta.filtros[segmentado.clave] ?? "" : "";
  // Un filtro compuesto por el módulo no sabe enviarse solo: necesita el botón.
  const necesitaBoton = filtros.some((filtro) => filtro.contenido !== undefined);
  const claseSelector = (clave: string) =>
    `min-w-0 max-w-48 cursor-pointer bg-transparent py-2.5 pr-1 text-sm font-medium focus:outline-2 focus:outline-marca ${errores[clave] ? "text-peligro" : "text-texto"}`;
  return (
    <div className="flex flex-col gap-4">
      {/* La key vuelve a montar el formulario al cambiar la URL (p. ej. «Limpiar»); los campos usan
          defaultValue y, sin ella, conservarían lo que la persona eligió antes. */}
      <form key={JSON.stringify([consulta.q, consulta.orden, consulta.dir, consulta.filtros])}
        action={base} method="get" className="flex flex-col gap-3">
        {segmentado && valorSegmentado && <input type="hidden" name={segmentado.clave} value={valorSegmentado} />}
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-60 flex-1">
            <span className="sr-only">{etiquetaBusqueda}</span>
            <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-texto-3">
              <Icono d={ICONOS.buscar} />
            </span>
            <input name="q" type="search" defaultValue={consulta.q} maxLength={200} placeholder={placeholder}
              aria-invalid={Boolean(errores.q)} className={`${claseCampo(Boolean(errores.q))} w-full min-w-0 pl-10`} />
          </label>
          {segmentado && definicion && <GrupoSegmentado base={base} definicion={definicion} consulta={consulta} segmentado={segmentado} />}
          {filtros.map((filtro) => (
            filtro.contenido !== undefined ? <div key={filtro.clave} className="min-w-0">{filtro.contenido}</div> : (
              <label key={filtro.clave}
                className={`flex min-w-0 items-center gap-2 rounded-xl border bg-superficie px-3 text-sm text-texto-3 ${errores[filtro.clave] ? "border-peligro" : "border-linea"}`}>
                {filtro.etiqueta}
                <SelectorFiltro name={filtro.clave} defaultValue={consulta.filtros[filtro.clave] ?? ""}
                  aria-invalid={Boolean(errores[filtro.clave])} className={claseSelector(filtro.clave)}>
                  <option value="" className={claseOpcion}>Todos</option>
                  {filtro.opciones.map((opcion) => <option className={claseOpcion} key={opcion.valor} value={opcion.valor}>{opcion.texto}</option>)}
                </SelectorFiltro>
              </label>
            )
          ))}
          {necesitaBoton
            ? <button type="submit" className={claseBoton}>Buscar</button>
            : <noscript><button type="submit" className={claseBoton}>Buscar</button></noscript>}
          {hayFiltrosActivos(consulta) && <Link href={base} className={claseBotonSecundario}>Limpiar</Link>}
        </div>
        {/* En celular los encabezados se ocultan: el orden se elige aquí. */}
        <div className="grid grid-cols-2 gap-4 sm:hidden">
          <label className={`${claseEtiqueta} min-w-0`}>
            Ordenar por
            <SelectorFiltro name="orden" defaultValue={consulta.orden} aria-invalid={Boolean(errores.orden)}
              className={`${claseCampo(Boolean(errores.orden))} min-w-0 w-full`}>
              {columnas.map((columna) => <option key={columna.clave} value={columna.clave}>{columna.texto}</option>)}
            </SelectorFiltro>
          </label>
          <label className={`${claseEtiqueta} min-w-0`}>
            Sentido
            <SelectorFiltro name="dir" defaultValue={consulta.dir} aria-invalid={Boolean(errores.dir)}
              className={`${claseCampo(Boolean(errores.dir))} min-w-0 w-full`}>
              <option value="asc">A–Z, menor a mayor</option>
              <option value="desc">Z–A, mayor a menor</option>
            </SelectorFiltro>
          </label>
        </div>
      </form>
      {mensajes.length > 0 && (
        <Aviso tipo="error">
          <ul>{mensajes.map((mensaje) => <li key={mensaje}>{mensaje}</li>)}</ul>
        </Aviso>
      )}
    </div>
  );
}

function GrupoSegmentado({ base, definicion, consulta, segmentado }: Contexto & { segmentado: SegmentadoUi }) {
  const actual = consulta.filtros[segmentado.clave] ?? "";
  const opciones = [{ valor: "", texto: "Todos" }, ...segmentado.opciones];
  return (
    <div role="group" aria-label={segmentado.etiqueta} className="flex rounded-xl bg-superficie-alt p-1">
      {opciones.map((opcion) => {
        const activa = opcion.valor === actual;
        return (
          <Link key={opcion.valor || "todos"} aria-current={activa ? "true" : undefined}
            href={enlaceListado(base, definicion, consulta, { filtros: { [segmentado.clave]: opcion.valor } })}
            className={`rounded-lg px-3 py-1.5 text-sm ${activa ? "bg-superficie font-semibold text-texto" : "text-texto-2 hover:text-texto"}`}>
            {opcion.texto}
          </Link>
        );
      })}
    </div>
  );
}

/** Encabezado de columna que ordena: el primer clic ordena de A a Z; el siguiente invierte. */
export function EncabezadoOrdenable({ base, definicion, consulta, columna, className, children }: Contexto & {
  columna: string;
  className?: string;
  children: React.ReactNode;
}) {
  const activa = consulta.orden === columna;
  const ariaSort = activa ? (consulta.dir === "asc" ? "ascending" : "descending") : undefined;
  const href = enlaceListado(base, definicion, consulta, siguienteOrden(consulta, columna));
  return (
    <th scope="col" aria-sort={ariaSort} className={className}>
      <Link href={href} className="inline-flex items-center gap-1 rounded-lg hover:text-texto">
        {children}
        <span aria-hidden="true" className={activa ? "text-marca" : "text-texto-3"}>
          {activa ? (consulta.dir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </Link>
    </th>
  );
}

/** «Mostrando a–b de N», números de página y navegación Anterior/Siguiente. */
export function PaginacionListado({ base, definicion, consulta, paginacion, nombre = "resultados" }: Contexto & {
  paginacion: Paginacion;
  /** Lo que se cuenta, en plural: «grados», «profesores»… */
  nombre?: string;
}) {
  const { pagina, totalPaginas, total, desde, hasta } = paginacion;
  const enlace = (destino: number) => enlaceListado(base, definicion, consulta, { pagina: destino });
  const inactivo = "inline-flex items-center rounded-xl border border-linea px-3.5 py-2 text-sm text-texto-3 opacity-60";
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p role="status" className="text-sm text-texto-3">
        Mostrando {desde}–{hasta} de {new Intl.NumberFormat("es-MX").format(total)} {nombre}.
      </p>
      {totalPaginas > 1 && (
        <nav aria-label="Paginación" className="flex flex-wrap items-center gap-1.5">
          {pagina > 1
            ? <Link className={claseBotonContorno} href={enlace(pagina - 1)}>Anterior</Link>
            : <span aria-disabled="true" className={inactivo}>Anterior</span>}
          {paginasVisibles(pagina, totalPaginas).map((numero, i) => (
            numero === "…"
              ? <span key={`hueco-${i}`} aria-hidden="true" className="px-1.5 text-sm text-texto-3">…</span>
              : numero === pagina
                ? <span key={numero} aria-current="page" className="grid h-9 min-w-9 place-items-center rounded-xl bg-marca px-2 text-sm font-medium text-sobre-marca">{numero}</span>
                : <Link key={numero} href={enlace(numero)} aria-label={`Ir a la página ${numero}`}
                    className="grid h-9 min-w-9 place-items-center rounded-xl px-2 text-sm text-texto-2 hover:bg-hover">{numero}</Link>
          ))}
          {pagina < totalPaginas
            ? <Link className={claseBotonContorno} href={enlace(pagina + 1)}>Siguiente</Link>
            : <span aria-disabled="true" className={inactivo}>Siguiente</span>}
        </nav>
      )}
    </div>
  );
}
