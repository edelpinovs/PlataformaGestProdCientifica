import { FilaEditable } from "@/components/fila-editable";
import { BarraListado, EncabezadoOrdenable, PaginacionListado } from "@/components/listado";
import { Marco } from "@/components/marco";
import { Aviso, claseTabla, EstadoVacio, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { analizarListado, hayFiltrosActivos, paginar } from "@/lib/listados/consulta";
import { prisma } from "@/lib/prisma";
import { COLUMNAS_AREAS, filtroAreas, LISTADO_AREAS, ordenAreas } from "@/modules/catalogos/areas-listado";
import { editarArea, eliminarArea } from "./actions";
import { RegistrarArea } from "./registrar-area";

const BASE = "/catalogos/areas";

export default async function AreasPage({ searchParams }: PageProps<"/catalogos/areas">) {
  const perfil = await requireModulo("catalogos");

  // Editar y eliminar redirigen aquí con el resultado (#59).
  const parametros = await searchParams;
  const { editada, eliminada } = parametros;
  const resultado =
    typeof editada === "string" ? `Se guardaron los cambios de «${editada}».`
    : typeof eliminada === "string" ? `Se eliminó «${eliminada}».`
    : null;

  // Búsqueda, orden y página vienen de la URL (D-009); lo inválido se ignora y se avisa.
  const { consulta, errores } = analizarListado(LISTADO_AREAS, parametros);
  const where = filtroAreas(consulta);
  const total = await prisma.area.count({ where });
  const paginacion = paginar(total, consulta);
  const areas = await prisma.area.findMany({
    where, orderBy: ordenAreas(consulta), skip: paginacion.salto, take: paginacion.tamanio,
    include: { _count: { select: { subareas: true } } },
  });
  const contexto = { base: BASE, definicion: LISTADO_AREAS, consulta: { ...consulta, pagina: paginacion.pagina } };

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="catalogos" titulo="Áreas"
      subtitulo="Consulta y administra las áreas a las que pertenecen las subáreas."
      volver={{ href: "/catalogos", texto: "Catálogos" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-marca-suave px-3 py-1 text-xs font-medium text-marca">
          {new Intl.NumberFormat("es-MX").format(total)} {hayFiltrosActivos(consulta) ? "coinciden" : "en el catálogo"}
        </span>
        <RegistrarArea />
      </div>

      <Panel>
        {resultado && <div className="mb-4"><Aviso tipo="exito">{resultado}</Aviso></div>}
        <div className="flex flex-col gap-4">
          <BarraListado base={BASE} consulta={contexto.consulta} columnas={COLUMNAS_AREAS} errores={errores}
            etiquetaBusqueda="Buscar áreas" placeholder="Nombre del área" />
          {areas.length === 0 ? (
            <EstadoVacio>
              {hayFiltrosActivos(consulta) ? "No hay áreas con esta búsqueda. Prueba con otro texto o limpia la búsqueda." : "Aún no hay áreas registradas."}
            </EstadoVacio>
          ) : (
            <table className={claseTabla.tabla}>
              <thead className={claseTabla.encabezado}>
                <tr>
                  <EncabezadoOrdenable {...contexto} columna="nombre" className={claseTabla.celdaEncabezado}>Nombre</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="subareas" className={`${claseTabla.celdaEncabezado} text-right`}>Subáreas</EncabezadoOrdenable>
                  <th className={`${claseTabla.celdaEncabezado} pr-0 text-right`}>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {areas.map((a) => (
                  // La key incluye los datos: tras guardar, la fila vuelve a mostrarse cerrada.
                  <FilaEditable key={`${a.id}-${a.nombre}`} id={a.id} nombre={a.nombre}
                    editar={editarArea} eliminar={eliminarArea}
                    celdas={[
                      { contenido: a.nombre },
                      { contenido: a._count.subareas, className: "text-right" },
                    ]}
                    campos={[{ nombre: "nombre", etiqueta: "Nombre", valor: a.nombre, maxLength: 150 }]} />
                ))}
              </tbody>
            </table>
          )}
          <PaginacionListado {...contexto} paginacion={paginacion} nombre="áreas" />
        </div>
      </Panel>
    </Marco>
  );
}
