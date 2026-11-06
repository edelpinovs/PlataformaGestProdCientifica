import Link from "next/link";
import { Aviso, claseBoton, claseBotonSecundario, claseCampo, claseEtiqueta } from "./ui";
import {
  enlaceListado,
  siguienteOrden,
  type ConsultaListado,
  type DefinicionListado,
  type ErroresListado,
  type Paginacion,
} from "@/lib/listados/consulta";

// Piezas de interfaz de los listados (regla D-009 y pauta visual). Se usan con las funciones
// puras de src/lib/listados/consulta.ts; ver el ejemplo en src/app/catalogos/grados/.

type Contexto = { base: string; definicion: DefinicionListado; consulta: ConsultaListado };

export type FiltroUi = {
  /** Nombre del parámetro, igual al de `definicion.filtros`. */
  clave: string;
  etiqueta: string;
  opciones: { valor: string; texto: string }[];
};

/**
 * Búsqueda de texto libre, filtros y, solo en celular, «Ordenar por».
 * Es un formulario GET: no hace falta JavaScript y el estado queda en la URL.
 * Al enviarlo vuelve a la página 1 porque no manda `pagina`.
 */
export function BarraListado({ base, consulta, filtros = [], columnas, errores = {}, etiquetaBusqueda = "Buscar", placeholder }: Omit<Contexto, "definicion"> & {
  filtros?: FiltroUi[];
  /** Columnas ordenables con su texto, para el selector de celular. */
  columnas: { clave: string; texto: string }[];
  errores?: ErroresListado;
  etiquetaBusqueda?: string;
  placeholder?: string;
}) {
  const mensajes = Object.values(errores);
  return (
    <div className="flex flex-col gap-4">
      <form action={base} method="get" className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <label className={`${claseEtiqueta} min-w-0`}>
            {etiquetaBusqueda}
            <input name="q" type="search" defaultValue={consulta.q} maxLength={200} placeholder={placeholder}
              aria-invalid={Boolean(errores.q)} className={`${claseCampo(Boolean(errores.q))} min-w-0 w-full`} />
          </label>
          {filtros.map((filtro) => (
            <label key={filtro.clave} className={`${claseEtiqueta} min-w-0`}>
              {filtro.etiqueta}
              <select name={filtro.clave} defaultValue={consulta.filtros[filtro.clave] ?? ""}
                aria-invalid={Boolean(errores[filtro.clave])} className={`${claseCampo(Boolean(errores[filtro.clave]))} min-w-0 w-full`}>
                <option value="">Todos</option>
                {filtro.opciones.map((opcion) => <option key={opcion.valor} value={opcion.valor}>{opcion.texto}</option>)}
              </select>
            </label>
          ))}
          {/* En celular los encabezados se ocultan: el orden se elige aquí. */}
          <div className="grid grid-cols-2 gap-4 sm:hidden">
            <label className={`${claseEtiqueta} min-w-0`}>
              Ordenar por
              <select name="orden" defaultValue={consulta.orden} aria-invalid={Boolean(errores.orden)}
                className={`${claseCampo(Boolean(errores.orden))} min-w-0 w-full`}>
                {columnas.map((columna) => <option key={columna.clave} value={columna.clave}>{columna.texto}</option>)}
              </select>
            </label>
            <label className={`${claseEtiqueta} min-w-0`}>
              Sentido
              <select name="dir" defaultValue={consulta.dir} aria-invalid={Boolean(errores.dir)}
                className={`${claseCampo(Boolean(errores.dir))} min-w-0 w-full`}>
                <option value="asc">A–Z, menor a mayor</option>
                <option value="desc">Z–A, mayor a menor</option>
              </select>
            </label>
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <button type="submit" className={claseBoton}>Buscar</button>
          <Link href={base} className={claseBotonSecundario}>Limpiar</Link>
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

/** «Mostrando a–b de N» y navegación Anterior/Siguiente. */
export function PaginacionListado({ base, definicion, consulta, paginacion, nombre = "resultados" }: Contexto & {
  paginacion: Paginacion;
  /** Lo que se cuenta, en plural: «grados», «profesores»… */
  nombre?: string;
}) {
  const { pagina, totalPaginas, total, desde, hasta } = paginacion;
  const enlace = (destino: number) => enlaceListado(base, definicion, consulta, { pagina: destino });
  return (
    <div className="flex flex-col gap-4">
      <p role="status" className="text-sm text-texto-3">
        Mostrando {desde}–{hasta} de {new Intl.NumberFormat("es-MX").format(total)} {nombre}.
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
