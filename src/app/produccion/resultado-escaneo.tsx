import Link from "next/link";
import { Aviso, claseBotonContorno, EtiquetaEstado } from "@/components/ui";
import type { EstadoFuenteResultado, presentarResultadoEscaneo } from "@/modules/produccion/resultado-escaneo";

/** Color de cada estado; «no seleccionada» es neutra porque no es un resultado. */
const TIPO_ESTADO: Record<EstadoFuenteResultado, "exito" | "aviso" | "error" | null> = {
  consultada: "exito", "sin resultados": "aviso", "con incidencias": "error", "no seleccionada": null,
};

export function ResultadoEscaneo({ resultado }: { resultado: ReturnType<typeof presentarResultadoEscaneo> }) {
  if (!resultado) return null;
  return <div className="flex flex-col gap-4">
    <Aviso tipo={resultado.tipo}>{resultado.mensaje}</Aviso>
    {resultado.fuentes.length > 0 && <ul aria-label="Resultado por fuente" className="flex flex-col gap-2">
      {resultado.fuentes.map(({ fuente, estado, detalle }) => <li key={fuente} className="flex flex-wrap items-center gap-2 text-sm text-texto-2">
        <span className="w-32 shrink-0 font-medium text-texto">{fuente}</span>
        {TIPO_ESTADO[estado]
          ? <EtiquetaEstado tipo={TIPO_ESTADO[estado]}>{estado}</EtiquetaEstado>
          : <span className="rounded-full bg-superficie-alt px-2.5 py-1 text-xs font-medium text-texto-3">{estado}</span>}
        {detalle && <span className="min-w-0 text-texto-3">{detalle}</span>}
      </li>)}
    </ul>}
    {resultado.incidencias.length > 0 && <ul className="list-inside list-disc text-sm text-texto-2">
      {resultado.incidencias.map((incidencia) => <li key={incidencia}>{incidencia}</li>)}
    </ul>}
    <Link href="/produccion/publicaciones" className={`${claseBotonContorno} w-fit`}>Consultar publicaciones</Link>
  </div>;
}
