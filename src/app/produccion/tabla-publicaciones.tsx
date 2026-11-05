import { claseTabla, EtiquetaEstado } from "@/components/ui";
import { ETIQUETAS_TIPO, ETIQUETAS_FUENTE, ETIQUETAS_ESTADO } from "@/modules/produccion/consulta";
import type { consultarPublicaciones } from "./consultas";

type PublicacionConsulta = Awaited<ReturnType<typeof consultarPublicaciones>>["publicaciones"][number];
const celda = "block break-words py-1.5 text-sm md:table-cell md:py-3 md:pr-3";

export function TablaPublicaciones({ publicaciones }: { publicaciones: PublicacionConsulta[] }) {
  return (
    <table className={`${claseTabla.tabla} block table-fixed md:table`}>
      <thead className={`${claseTabla.encabezado} hidden md:table-header-group`}>
        <tr>
          <th scope="col" className={`${claseTabla.celdaEncabezado} w-1/3`}>Título</th>
          <th scope="col" className={claseTabla.celdaEncabezado}>Tipo</th>
          <th scope="col" className={claseTabla.celdaEncabezado}>Revista / DOI</th>
          <th scope="col" className={claseTabla.celdaEncabezado}>Profesores vinculados</th>
          <th scope="col" className={claseTabla.celdaEncabezado}>Fuente</th>
        </tr>
      </thead>
      <tbody className="block md:table-row-group">
        {publicaciones.map((publicacion) => <tr key={publicacion.id} className={`${claseTabla.fila} block py-4 md:table-row md:py-0`}>
          <td className={`${celda} font-medium text-texto`}>
            <p>{publicacion.titulo}</p>
            <p className="mt-1 text-xs font-normal text-texto-3">{publicacion.autoresTexto}</p>
          </td>
          <td className={celda}>
            <span className="mr-1 text-xs text-texto-3 md:hidden">Tipo:</span>{ETIQUETAS_TIPO[publicacion.tipo]}
          </td>
          <td className={celda}>
            <p className="text-xs text-texto-2">{publicacion.revistaEditorial || "Sin revista"}</p>
            {publicacion.doi && <p className="break-all font-mono text-xs text-texto-3">DOI: {publicacion.doi}</p>}
          </td>
          <td className={celda}>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-texto-3 md:hidden">Profesores vinculados:</span>
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
