import Link from "next/link";
import { claseBotonSecundario } from "@/components/ui";
import { enlaceConsulta, paginasVisibles, type ConsultaPublicaciones } from "@/modules/produccion/consulta";
import { CantidadPublicaciones } from "./cantidad-publicaciones";

type Paginacion = { total: number; pagina: number; totalPaginas: number; desde: number; hasta: number };

export function PaginacionPublicaciones({ consulta, resultado, superior = false, errorCantidad = false }: {
  consulta: ConsultaPublicaciones; resultado: Paginacion | null; superior?: boolean; errorCantidad?: boolean;
}) {
  return <div className="flex flex-col gap-4">
    {superior && <div className="flex flex-wrap items-center justify-between gap-4">
      <p role="status" className="text-sm text-texto-3">{resultado
        ? `Mostrando ${resultado.desde}–${resultado.hasta} de ${new Intl.NumberFormat("es-MX").format(resultado.total)} publicaciones.`
        : "Corrige los filtros para consultar las publicaciones."}</p>
      <CantidadPublicaciones key={consulta.tamanio} consulta={consulta} conError={errorCantidad} />
    </div>}
    {resultado && <nav aria-label={`Paginación ${superior ? "superior" : "inferior"} de publicaciones`} className="flex flex-wrap items-center justify-between gap-4">
      {resultado.pagina > 1 ? <Link className={claseBotonSecundario} href={enlaceConsulta(consulta, resultado.pagina - 1)}>Anterior</Link>
        : <span aria-disabled="true" className="px-4 py-2.5 text-sm text-texto-3">Anterior</span>}
      <div className="flex flex-wrap items-center gap-1">
        {paginasVisibles(resultado.pagina, resultado.totalPaginas).map((pagina, indice) => pagina === "separador"
          ? <span key={`separador-${indice}`} aria-hidden="true" className="px-2 text-texto-3">…</span>
          : pagina === resultado.pagina
            ? <span key={pagina} aria-current="page" aria-label={`Página ${pagina}, actual`} className="rounded-xl bg-marca px-3 py-2 text-sm font-semibold text-sobre-marca">{pagina}</span>
            : <Link key={pagina} aria-label={`Ir a la página ${pagina}`} className={claseBotonSecundario} href={enlaceConsulta(consulta, pagina)}>{pagina}</Link>)}
      </div>
      {resultado.pagina < resultado.totalPaginas ? <Link className={claseBotonSecundario} href={enlaceConsulta(consulta, resultado.pagina + 1)}>Siguiente</Link>
        : <span aria-disabled="true" className="px-4 py-2.5 text-sm text-texto-3">Siguiente</span>}
      <p className="w-full text-center text-xs text-texto-3">Página {resultado.pagina} de {resultado.totalPaginas}</p>
    </nav>}
  </div>;
}
