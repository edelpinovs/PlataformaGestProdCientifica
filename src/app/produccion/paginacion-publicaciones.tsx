import Link from "next/link";
import { PaginacionListado } from "@/components/listado";
import { claseBotonSecundario } from "@/components/ui";
import { TAMANIO_PAGINA, type Paginacion } from "@/lib/listados/consulta";
import { enlaceConsulta, paginasVisibles, LISTADO_PUBLICACIONES, RUTA_PUBLICACIONES, type ConsultaPublicaciones } from "@/modules/produccion/consulta";

export function PaginacionPublicaciones({ consulta, resultado, superior = false }: {
  consulta: ConsultaPublicaciones; resultado: Paginacion | null; superior?: boolean;
}) {
  if (!resultado) return <p className="text-sm text-texto-3">Corrige los filtros para consultar las publicaciones.</p>;
  const actual = { ...consulta, pagina: resultado.pagina };
  return <div className="flex flex-col gap-4">
    {superior && <p className="text-right text-sm font-medium text-texto-2">{TAMANIO_PAGINA} elementos por página</p>}
    <PaginacionListado base={RUTA_PUBLICACIONES} definicion={LISTADO_PUBLICACIONES} consulta={actual} paginacion={resultado} nombre="publicaciones" />
    {resultado.totalPaginas > 1 && <nav aria-label={`Números de página ${superior ? "superiores" : "inferiores"}`} className="flex flex-wrap justify-center gap-1">
      {paginasVisibles(resultado.pagina, resultado.totalPaginas).map((pagina, indice) => pagina === "separador"
        ? <span key={`separador-${indice}`} aria-hidden="true" className="px-2 text-texto-3">…</span>
        : pagina === resultado.pagina
          ? <span key={pagina} aria-current="page" aria-label={`Página ${pagina}, actual`} className="rounded-xl bg-marca px-3 py-2 text-sm font-semibold text-sobre-marca">{pagina}</span>
          : <Link key={pagina} aria-label={`Ir a la página ${pagina}`} className={claseBotonSecundario} href={enlaceConsulta(actual, pagina)}>{pagina}</Link>)}
    </nav>}
  </div>;
}
