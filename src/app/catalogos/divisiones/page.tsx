import { FilaEditable } from "@/components/fila-editable";
import { BarraListado, EncabezadoOrdenable, PaginacionListado } from "@/components/listado";
import { Marco } from "@/components/marco";
import { Aviso, claseTabla, EstadoVacio, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { analizarListado, hayFiltrosActivos, paginar } from "@/lib/listados/consulta";
import { prisma } from "@/lib/prisma";
import { COLUMNAS_DIVISIONES, filtroDivisiones, LISTADO_DIVISIONES, ordenDivisiones } from "@/modules/catalogos/divisiones-listado";
import { editarDivision, eliminarDivision } from "./actions";
import { FormularioDivision } from "./formulario";

const BASE = "/catalogos/divisiones";

export default async function DivisionesPage({ searchParams }: PageProps<"/catalogos/divisiones">) {
  const perfil = await requireModulo("catalogos");

  // Editar y eliminar redirigen aquí con el resultado (#59).
  const parametros = await searchParams;
  const { editada, eliminada } = parametros;
  const resultado =
    typeof editada === "string" ? `Se guardaron los cambios de «${editada}».`
    : typeof eliminada === "string" ? `Se eliminó «${eliminada}».`
    : null;

  // Búsqueda, orden y página vienen de la URL (D-009); lo inválido se ignora y se avisa.
  const { consulta, errores } = analizarListado(LISTADO_DIVISIONES, parametros);
  const where = filtroDivisiones(consulta);
  const total = await prisma.division.count({ where });
  const paginacion = paginar(total, consulta);
  const divisiones = await prisma.division.findMany({
    where, orderBy: ordenDivisiones(consulta), skip: paginacion.salto, take: paginacion.tamanio,
    include: { _count: { select: { departamentos: true } } },
  });
  const contexto = { base: BASE, definicion: LISTADO_DIVISIONES, consulta: { ...consulta, pagina: paginacion.pagina } };

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="catalogos" titulo="Divisiones académicas"
      volver={{ href: "/catalogos", texto: "Catálogos" }}>
      <Panel titulo="Registrar división">
        <FormularioDivision />
      </Panel>

      <Panel titulo={`En el catálogo (${total})`}>
        {resultado && <div className="mb-4"><Aviso tipo="exito">{resultado}</Aviso></div>}
        <div className="flex flex-col gap-4">
          <BarraListado base={BASE} consulta={contexto.consulta} columnas={COLUMNAS_DIVISIONES} errores={errores}
            etiquetaBusqueda="Buscar divisiones" placeholder="Nombre o clave" />
          {divisiones.length === 0 ? (
            <EstadoVacio>
              {hayFiltrosActivos(consulta) ? "No hay divisiones con esta búsqueda. Prueba con otro texto o limpia la búsqueda." : "Aún no hay divisiones registradas."}
            </EstadoVacio>
          ) : (
            <table className={claseTabla.tabla}>
              <thead className={claseTabla.encabezado}>
                <tr>
                  <EncabezadoOrdenable {...contexto} columna="nombre" className={claseTabla.celdaEncabezado}>Nombre</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="clave" className={claseTabla.celdaEncabezado}>Clave</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="departamentos" className={`${claseTabla.celdaEncabezado} text-right`}>Departamentos</EncabezadoOrdenable>
                  <th className={`${claseTabla.celdaEncabezado} pr-0 text-right`}>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {divisiones.map((d) => (
                  // La key incluye los datos: tras guardar, la fila vuelve a mostrarse cerrada.
                  <FilaEditable key={`${d.id}-${d.nombre}-${d.clave}`} id={d.id} nombre={d.nombre}
                    detalle={d.clave} editar={editarDivision} eliminar={eliminarDivision}
                    celdas={[
                      { contenido: d.nombre },
                      { contenido: d.clave, className: "font-mono" },
                      { contenido: d._count.departamentos, className: "text-right" },
                    ]}
                    campos={[
                      { nombre: "nombre", etiqueta: "Nombre", valor: d.nombre, maxLength: 150 },
                      { nombre: "clave", etiqueta: "Clave institucional", valor: d.clave, maxLength: 20, ancho: "corto" },
                    ]} />
                ))}
              </tbody>
            </table>
          )}
          <PaginacionListado {...contexto} paginacion={paginacion} nombre="divisiones" />
        </div>
      </Panel>
    </Marco>
  );
}
