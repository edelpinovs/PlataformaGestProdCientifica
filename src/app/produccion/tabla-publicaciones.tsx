import { claseTabla, EtiquetaEstado } from "@/components/ui";
import { EncabezadoOrdenable } from "@/components/listado";
import { ETIQUETAS_TIPO, ETIQUETAS_FUENTE, ETIQUETAS_ESTADO, LISTADO_PUBLICACIONES, RUTA_PUBLICACIONES, type ConsultaPublicaciones } from "@/modules/produccion/consulta";
import type { consultarPublicaciones } from "./consultas";

type PublicacionConsulta = Awaited<ReturnType<typeof consultarPublicaciones>>["publicaciones"][number];
const celda = "block break-words py-1.5 text-sm sm:table-cell sm:py-3 sm:pr-3";

export function TablaPublicaciones({ publicaciones, consulta }: { publicaciones: PublicacionConsulta[]; consulta: ConsultaPublicaciones }) {
  const contexto = { base: RUTA_PUBLICACIONES, definicion: LISTADO_PUBLICACIONES, consulta };
  return (
    <table className={`${claseTabla.tabla} block table-fixed sm:table`}>
      <thead className={`${claseTabla.encabezado} hidden sm:table-header-group`}>
        <tr>
          <EncabezadoOrdenable {...contexto} columna="titulo" className={`${claseTabla.celdaEncabezado} w-1/3`}>Título</EncabezadoOrdenable>
          <EncabezadoOrdenable {...contexto} columna="tipo" className={claseTabla.celdaEncabezado}>Tipo</EncabezadoOrdenable>
          <EncabezadoOrdenable {...contexto} columna="revista" className={claseTabla.celdaEncabezado}>Revista / editorial</EncabezadoOrdenable>
          <EncabezadoOrdenable {...contexto} columna="profesores" className={claseTabla.celdaEncabezado}>Profesores vinculados<span className="sr-only">, orden por cantidad</span></EncabezadoOrdenable>
          <EncabezadoOrdenable {...contexto} columna="fuente" className={claseTabla.celdaEncabezado}>Fuente</EncabezadoOrdenable>
        </tr>
      </thead>
      <tbody className="block sm:table-row-group">
        {publicaciones.map((publicacion) => <tr key={publicacion.id} className={`${claseTabla.fila} block py-4 sm:table-row sm:py-0`}>
          <td className={`${celda} font-medium text-texto`}>
            <p>{publicacion.titulo}</p>
            <p className="mt-1 text-xs font-normal text-texto-3">{publicacion.autoresTexto}</p>
          </td>
          <td className={celda}>
            <span className="mr-1 text-xs text-texto-3 sm:hidden">Tipo:</span>{ETIQUETAS_TIPO[publicacion.tipo]}
          </td>
          <td className={celda}>
            <p className="text-xs text-texto-2">{publicacion.revistaEditorial || "Sin revista"}</p>
            {publicacion.doi && <p className="break-all font-mono text-xs text-texto-3">DOI: {publicacion.doi}</p>}
          </td>
          <td className={celda}>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-texto-3 sm:hidden">Profesores vinculados:</span>
              {publicacion.autorias.length > 1 && <span className="w-fit"><EtiquetaEstado tipo="aviso">Coautoría ({publicacion.autorias.length})</EtiquetaEstado></span>}
              <ul className="text-xs text-texto-2">
                {publicacion.autorias.map((autoria) => <li key={autoria.profesorId}>
                  {autoria.profesor.apellidos}, {autoria.profesor.nombres}
                  <span className="text-texto-3"> · {ETIQUETAS_ESTADO[autoria.estado]}</span>
                </li>)}
              </ul>
            </div>
          </td>
          <td className={celda}><EtiquetaEstado tipo="exito">{ETIQUETAS_FUENTE[publicacion.fuente]}</EtiquetaEstado></td>
        </tr>)}
      </tbody>
    </table>
  );
}
