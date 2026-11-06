import Link from "next/link";
import { FilaEditable } from "@/components/fila-editable";
import { BarraListado, EncabezadoOrdenable, PaginacionListado } from "@/components/listado";
import { Marco } from "@/components/marco";
import { Aviso, claseTabla, EstadoVacio, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { analizarListado, hayFiltrosActivos, paginar } from "@/lib/listados/consulta";
import { prisma } from "@/lib/prisma";
import {
  COLUMNAS_DEPARTAMENTOS, filtroDepartamentos, listadoDepartamentos, ordenDepartamentos,
} from "@/modules/catalogos/departamentos-listado";
import { editarDepartamento, eliminarDepartamento } from "./actions";
import { FormularioDepartamento } from "./formulario";

const BASE = "/catalogos/departamentos";

export default async function DepartamentosPage({ searchParams }: PageProps<"/catalogos/departamentos">) {
  const perfil = await requireModulo("catalogos");
  const divisiones = await prisma.division.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, clave: true } });
  const opcionesDivision = divisiones.map((d) => ({ valor: String(d.id), texto: `${d.nombre} (${d.clave})` }));

  // Editar y eliminar redirigen aquí con el resultado (#59).
  const parametros = await searchParams;
  const { editado, eliminado } = parametros;
  const resultado =
    typeof editado === "string" ? `Se guardaron los cambios de «${editado}».`
    : typeof eliminado === "string" ? `Se eliminó «${eliminado}».`
    : null;

  // Búsqueda, filtro por división, orden y página vienen de la URL (D-009); lo inválido se ignora y se avisa.
  const definicion = listadoDepartamentos(divisiones.map((d) => d.id));
  const { consulta, errores } = analizarListado(definicion, parametros);
  const where = filtroDepartamentos(consulta);
  const total = await prisma.departamento.count({ where });
  const paginacion = paginar(total, consulta);
  const departamentos = await prisma.departamento.findMany({
    where, orderBy: ordenDepartamentos(consulta), skip: paginacion.salto, take: paginacion.tamanio,
    include: { division: { select: { nombre: true, clave: true } } },
  });
  const contexto = { base: BASE, definicion, consulta: { ...consulta, pagina: paginacion.pagina } };

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="catalogos" titulo="Departamentos"
      volver={{ href: "/catalogos", texto: "Catálogos" }}>
      <Panel titulo="Registrar departamento">
        {divisiones.length === 0 ? (
          <EstadoVacio>
            Todo departamento pertenece a una división.{" "}
            <Link href="/catalogos/divisiones" className="font-medium text-marca">Registra primero una división</Link>.
          </EstadoVacio>
        ) : (
          <FormularioDepartamento divisiones={divisiones} />
        )}
      </Panel>

      <Panel titulo={`En el catálogo (${total})`}>
        {resultado && <div className="mb-4"><Aviso tipo="exito">{resultado}</Aviso></div>}
        <div className="flex flex-col gap-4">
          <BarraListado base={BASE} consulta={contexto.consulta} columnas={COLUMNAS_DEPARTAMENTOS} errores={errores}
            etiquetaBusqueda="Buscar departamentos" placeholder="Nombre, nomenclatura o división"
            filtros={[{ clave: "division", etiqueta: "División", opciones: opcionesDivision }]} />
          {departamentos.length === 0 ? (
            <EstadoVacio>
              {hayFiltrosActivos(consulta) ? "No hay departamentos con esta búsqueda. Prueba con otro texto o limpia los filtros." : "Aún no hay departamentos registrados."}
            </EstadoVacio>
          ) : (
            <div className="overflow-x-auto">
              <table className={claseTabla.tabla}>
                <thead className={claseTabla.encabezado}>
                  <tr>
                    <EncabezadoOrdenable {...contexto} columna="nombre" className={claseTabla.celdaEncabezado}>Nombre</EncabezadoOrdenable>
                    <EncabezadoOrdenable {...contexto} columna="nomenclatura" className={claseTabla.celdaEncabezado}>Nomenclatura</EncabezadoOrdenable>
                    <EncabezadoOrdenable {...contexto} columna="division" className={claseTabla.celdaEncabezado}>División</EncabezadoOrdenable>
                    <th className={`${claseTabla.celdaEncabezado} pr-0 text-right`}>
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {departamentos.map((d) => (
                    // La key incluye los datos: tras guardar, la fila vuelve a mostrarse cerrada.
                    <FilaEditable key={`${d.id}-${d.nombre}-${d.nomenclatura}-${d.divisionId}`} id={d.id}
                      nombre={d.nombre} detalle={d.nomenclatura}
                      editar={editarDepartamento} eliminar={eliminarDepartamento}
                      celdas={[
                        { contenido: d.nombre },
                        { contenido: d.nomenclatura, className: "font-mono" },
                        {
                          contenido: (
                            <>{d.division.nombre} <span className="font-mono text-texto-3">({d.division.clave})</span></>
                          ),
                        },
                      ]}
                      campos={[
                        { nombre: "divisionId", etiqueta: "División académica", valor: String(d.divisionId),
                          opciones: opcionesDivision, ancho: "medio" },
                        { nombre: "nombre", etiqueta: "Nombre", valor: d.nombre, maxLength: 150 },
                        { nombre: "nomenclatura", etiqueta: "Nomenclatura", valor: d.nomenclatura, maxLength: 20,
                          ancho: "corto" },
                      ]} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <PaginacionListado {...contexto} paginacion={paginacion} nombre="departamentos" />
        </div>
      </Panel>
    </Marco>
  );
}
