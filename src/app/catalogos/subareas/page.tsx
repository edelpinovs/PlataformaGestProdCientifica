import Link from "next/link";
import { FilaEditable } from "@/components/fila-editable";
import { BarraListado, EncabezadoOrdenable, PaginacionListado } from "@/components/listado";
import { Marco } from "@/components/marco";
import { Aviso, claseTabla, EstadoVacio, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { analizarListado, hayFiltrosActivos, paginar } from "@/lib/listados/consulta";
import { prisma } from "@/lib/prisma";
import { COLUMNAS_SUBAREAS, filtroSubareas, listadoSubareas, ordenSubareas } from "@/modules/catalogos/subareas-listado";
import { editarSubarea, eliminarSubarea } from "./actions";
import { RegistrarSubarea } from "./registrar-subarea";

const BASE = "/catalogos/subareas";

export default async function SubareasPage({ searchParams }: PageProps<"/catalogos/subareas">) {
  const perfil = await requireModulo("catalogos");
  const areas = await prisma.area.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } });
  const opcionesArea = areas.map((a) => ({ valor: String(a.id), texto: a.nombre }));

  // Editar y eliminar redirigen aquí con el resultado (#59).
  const parametros = await searchParams;
  const { editada, eliminada } = parametros;
  const resultado =
    typeof editada === "string" ? `Se guardaron los cambios de «${editada}».`
    : typeof eliminada === "string" ? `Se eliminó «${eliminada}».`
    : null;

  // Búsqueda, filtro por área, orden y página vienen de la URL (D-009); lo inválido se ignora y se avisa.
  const definicion = listadoSubareas(areas.map((a) => a.id));
  const { consulta, errores } = analizarListado(definicion, parametros);
  const where = filtroSubareas(consulta);
  const total = await prisma.subarea.count({ where });
  const paginacion = paginar(total, consulta);
  const subareas = await prisma.subarea.findMany({
    where, orderBy: ordenSubareas(consulta), skip: paginacion.salto, take: paginacion.tamanio,
    include: { area: { select: { nombre: true } } },
  });
  const contexto = { base: BASE, definicion, consulta: { ...consulta, pagina: paginacion.pagina } };

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="catalogos" titulo="Subáreas"
      subtitulo="Consulta y administra las subáreas de cada área."
      volver={{ href: "/catalogos", texto: "Catálogos" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-marca-suave px-3 py-1 text-xs font-medium text-marca">
          {new Intl.NumberFormat("es-MX").format(total)} {hayFiltrosActivos(consulta) ? "coinciden" : "en el catálogo"}
        </span>
        {areas.length === 0 ? (
          <EstadoVacio>
            Toda subárea pertenece a un área.{" "}
            <Link href="/catalogos/areas" className="font-medium text-marca">Registra primero un área</Link>.
          </EstadoVacio>
        ) : (
          <RegistrarSubarea areas={areas} />
        )}
      </div>

      <Panel>
        {resultado && <div className="mb-4"><Aviso tipo="exito">{resultado}</Aviso></div>}
        <div className="flex flex-col gap-4">
          <BarraListado base={BASE} consulta={contexto.consulta} columnas={COLUMNAS_SUBAREAS} errores={errores}
            etiquetaBusqueda="Buscar subáreas" placeholder="Nombre de la subárea o del área"
            filtros={[{ clave: "area", etiqueta: "Área", opciones: opcionesArea }]} />
          {subareas.length === 0 ? (
            <EstadoVacio>
              {hayFiltrosActivos(consulta) ? "No hay subáreas con esta búsqueda. Prueba con otro texto o limpia los filtros." : "Aún no hay subáreas registradas."}
            </EstadoVacio>
          ) : (
            <table className={claseTabla.tabla}>
              <thead className={claseTabla.encabezado}>
                <tr>
                  <EncabezadoOrdenable {...contexto} columna="nombre" className={claseTabla.celdaEncabezado}>Nombre</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="area" className={claseTabla.celdaEncabezado}>Área</EncabezadoOrdenable>
                  <th className={`${claseTabla.celdaEncabezado} pr-0 text-right`}>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {subareas.map((s) => (
                  // La key incluye los datos: tras guardar, la fila vuelve a mostrarse cerrada.
                  <FilaEditable key={`${s.id}-${s.nombre}-${s.areaId}`} id={s.id} nombre={s.nombre}
                    editar={editarSubarea} eliminar={eliminarSubarea}
                    celdas={[{ contenido: s.nombre }, { contenido: s.area.nombre }]}
                    campos={[
                      { nombre: "areaId", etiqueta: "Área", valor: String(s.areaId), opciones: opcionesArea, ancho: "medio" },
                      { nombre: "nombre", etiqueta: "Nombre", valor: s.nombre, maxLength: 150 },
                    ]} />
                ))}
              </tbody>
            </table>
          )}
          <PaginacionListado {...contexto} paginacion={paginacion} nombre="subáreas" />
        </div>
      </Panel>
    </Marco>
  );
}
