import { claseBotonSecundario } from "@/components/ui";
import type { ConsultaListado, DefinicionListado } from "@/lib/listados/consulta";
import { enlaceExportacion, type ListadoExportable } from "@/modules/administracion/exportar";

/** Botones de descarga de un listado. Llevan la búsqueda, los filtros y el orden actuales, sin la página. */
export function Descargas({ listado, definicion, consulta }: { listado: ListadoExportable; definicion: DefinicionListado; consulta: ConsultaListado }) {
  return (
    <div className="flex flex-wrap gap-3">
      <a className={claseBotonSecundario} href={enlaceExportacion(listado, "xlsx", definicion, consulta)}>Descargar Excel</a>
      <a className={claseBotonSecundario} href={enlaceExportacion(listado, "pdf", definicion, consulta)}>Descargar PDF</a>
    </div>
  );
}
