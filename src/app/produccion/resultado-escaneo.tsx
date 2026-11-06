import Link from "next/link";
import { Aviso, claseBotonSecundario } from "@/components/ui";
import type { presentarResultadoEscaneo } from "@/modules/produccion/resultado-escaneo";

export function ResultadoEscaneo({ resultado }: { resultado: ReturnType<typeof presentarResultadoEscaneo> }) {
  if (!resultado) return null;
  return <div className="flex flex-col gap-4">
    <Aviso tipo={resultado.tipo}>{resultado.mensaje}</Aviso>
    {resultado.incidencias.length > 0 && <ul className="list-inside list-disc text-sm text-texto-2">
      {resultado.incidencias.map((incidencia) => <li key={incidencia}>{incidencia}</li>)}
    </ul>}
    <Link href="/produccion/publicaciones" className={claseBotonSecundario}>Consultar publicaciones</Link>
  </div>;
}
