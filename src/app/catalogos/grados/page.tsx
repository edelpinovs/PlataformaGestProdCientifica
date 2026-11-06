import { FilaEditable } from "@/components/fila-editable";
import { BarraListado, EncabezadoOrdenable, PaginacionListado } from "@/components/listado";
import { Marco } from "@/components/marco";
import { Aviso, claseTabla, EstadoVacio, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { analizarListado, hayFiltrosActivos, paginar } from "@/lib/listados/consulta";
import { prisma } from "@/lib/prisma";
import { COLUMNAS_GRADOS, filtroGrados, LISTADO_GRADOS, ordenGrados } from "@/modules/catalogos/grados-listado";
import { editarGrado, eliminarGrado } from "./actions";
import { FormularioGrado } from "./formulario";

const BASE = "/catalogos/grados";

export default async function GradosPage({ searchParams }: PageProps<"/catalogos/grados">) {
  const perfil = await requireModulo("catalogos");

  // Editar y eliminar redirigen aquí con el resultado (#55).
  const parametros = await searchParams;
  const { editado, eliminado } = parametros;
  const resultado =
    typeof editado === "string" ? `Se guardaron los cambios de «${editado}».`
    : typeof eliminado === "string" ? `Se eliminó «${eliminado}».`
    : null;

  // Búsqueda, orden y página vienen de la URL (D-009); lo inválido se ignora y se avisa.
  const { consulta, errores } = analizarListado(LISTADO_GRADOS, parametros);
  const where = filtroGrados(consulta);
  const total = await prisma.gradoCientifico.count({ where });
  const paginacion = paginar(total, consulta);
  const grados = await prisma.gradoCientifico.findMany({
    where, orderBy: ordenGrados(consulta), skip: paginacion.salto, take: paginacion.tamanio,
  });
  const contexto = { base: BASE, definicion: LISTADO_GRADOS, consulta: { ...consulta, pagina: paginacion.pagina } };

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="catalogos" titulo="Grados científicos"
      volver={{ href: "/catalogos", texto: "Catálogos" }}>
      <Panel titulo="Registrar grado">
        <FormularioGrado />
      </Panel>

      <Panel titulo={`En el catálogo (${total})`}>
        {resultado && <div className="mb-4"><Aviso tipo="exito">{resultado}</Aviso></div>}
        <div className="flex flex-col gap-4">
          <BarraListado {...contexto} columnas={COLUMNAS_GRADOS} errores={errores}
            etiquetaBusqueda="Buscar grados" placeholder="Nombre o nomenclatura" />
          {grados.length === 0 ? (
            <EstadoVacio>
              {hayFiltrosActivos(consulta) ? "No hay grados con esta búsqueda. Prueba con otro texto o limpia la búsqueda." : "Aún no hay grados registrados."}
            </EstadoVacio>
          ) : (
            <table className={claseTabla.tabla}>
              <thead className={claseTabla.encabezado}>
                <tr>
                  <EncabezadoOrdenable {...contexto} columna="nombre" className={claseTabla.celdaEncabezado}>Nombre</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="nomenclatura" className={claseTabla.celdaEncabezado}>Nomenclatura</EncabezadoOrdenable>
                  <th className={`${claseTabla.celdaEncabezado} pr-0 text-right`}>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {grados.map((g) => (
                  // La key incluye los datos: tras guardar, la fila vuelve a mostrarse cerrada.
                  <FilaEditable key={`${g.id}-${g.nombre}-${g.nomenclatura}`} id={g.id} nombre={g.nombre}
                    detalle={g.nomenclatura} editar={editarGrado} eliminar={eliminarGrado}
                    celdas={[{ contenido: g.nombre }, { contenido: g.nomenclatura, className: "font-mono" }]}
                    campos={[
                      { nombre: "nombre", etiqueta: "Nombre", valor: g.nombre, maxLength: 100 },
                      { nombre: "nomenclatura", etiqueta: "Nomenclatura", valor: g.nomenclatura, maxLength: 10, ancho: "corto" },
                    ]} />
                ))}
              </tbody>
            </table>
          )}
          <PaginacionListado {...contexto} paginacion={paginacion} nombre="grados" />
        </div>
      </Panel>
    </Marco>
  );
}
