import Link from "next/link";
import { FilaEditable } from "@/components/fila-editable";
import { BarraListado, EncabezadoOrdenable, PaginacionListado } from "@/components/listado";
import { Marco } from "@/components/marco";
import { Aviso, claseBoton, claseTabla, EstadoVacio, EtiquetaEstado, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { analizarListado, hayFiltrosActivos, paginar } from "@/lib/listados/consulta";
import { prisma } from "@/lib/prisma";
import {
  COLUMNAS_PROFESORES, filtroProfesores, listadoProfesores, ordenProfesores,
} from "@/modules/profesores/profesores-listado";
import { ETIQUETA_CONTRATACION, ETIQUETA_ESTATUS } from "@/modules/profesores/profesores";
import { editarProfesor, eliminarProfesor } from "./actions";

const BASE = "/profesores";

const ESTATUS_TIPO = {
  ACTIVO: "exito",
  LICENCIA: "aviso",
  BAJA_TEMPORAL: "aviso",
  BAJA_POSDOCTORAL: "aviso",
  TRASLADADO: "error",
} as const;

const OPCIONES_GENERO = [
  { valor: "M", texto: "Masculino" },
  { valor: "F", texto: "Femenino" },
];

export default async function ProfesoresPage({ searchParams }: PageProps<"/profesores">) {
  const perfil = await requireModulo("profesores");

  const [grados, departamentos] = await Promise.all([
    prisma.gradoCientifico.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, nomenclatura: true } }),
    prisma.departamento.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
  ]);
  const opcionesGrado = [
    { valor: "", texto: "Sin especificar" },
    ...grados.map((g) => ({ valor: String(g.id), texto: `${g.nombre} (${g.nomenclatura})` })),
  ];
  const opcionesDepartamento = [
    { valor: "", texto: "Sin asignar" },
    ...departamentos.map((d) => ({ valor: String(d.id), texto: d.nombre })),
  ];
  const opcionesEstatus = Object.entries(ETIQUETA_ESTATUS).map(([valor, texto]) => ({ valor, texto }));
  const opcionesContratacion = Object.entries(ETIQUETA_CONTRATACION).map(([valor, texto]) => ({ valor, texto }));

  const parametros = await searchParams;
  const { editado, eliminado } = parametros;
  const resultado =
    typeof editado === "string" ? `Se guardaron los cambios de «${editado}».`
    : typeof eliminado === "string" ? `Se eliminó a «${eliminado}».`
    : null;

  const definicion = listadoProfesores(departamentos.map((d) => d.id), grados.map((g) => g.id));
  const { consulta, errores } = analizarListado(definicion, parametros);
  const where = filtroProfesores(consulta);
  const total = await prisma.profesor.count({ where });
  const paginacion = paginar(total, consulta);
  const profesores = await prisma.profesor.findMany({
    where,
    orderBy: ordenProfesores(consulta),
    skip: paginacion.salto,
    take: paginacion.tamanio,
    include: {
      grado: { select: { nomenclatura: true } },
      departamento: { select: { nombre: true } },
    },
  });
  const contexto = { base: BASE, definicion, consulta: { ...consulta, pagina: paginacion.pagina } };
  const sinResultados = hayFiltrosActivos(consulta);

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="profesores" titulo="Directorio de profesores">
      <Panel titulo={`Profesores registrados (${total})`}
        accion={{ href: "/profesores/nuevo", texto: "Registrar profesor" }}>
        {resultado && <div className="mb-4"><Aviso tipo="exito">{resultado}</Aviso></div>}
        <div className="flex flex-col gap-4">
          <BarraListado {...contexto} columnas={COLUMNAS_PROFESORES} errores={errores}
            etiquetaBusqueda="Buscar profesores" placeholder="Código, nombre o correo"
            filtros={[
              { clave: "estatus", etiqueta: "Estatus", opciones: opcionesEstatus },
              { clave: "departamento", etiqueta: "Departamento", opciones: departamentos.map((d) => ({ valor: String(d.id), texto: d.nombre })) },
              { clave: "grado", etiqueta: "Grado científico", opciones: grados.map((g) => ({ valor: String(g.id), texto: `${g.nombre} (${g.nomenclatura})` })) },
            ]} />
          {profesores.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <EstadoVacio>
                {sinResultados
                  ? "No hay profesores con esta búsqueda. Prueba con otro texto o limpia los filtros."
                  : "Aún no hay profesores registrados en el directorio."}
              </EstadoVacio>
              {!sinResultados && (
                <Link href="/profesores/nuevo" className={claseBoton}>Registrar el primer profesor</Link>
              )}
            </div>
          ) : (
            <table className={claseTabla.tabla}>
              <thead className={claseTabla.encabezado}>
                <tr>
                  <EncabezadoOrdenable {...contexto} columna="codigo" className={claseTabla.celdaEncabezado}>Código</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="nombre" className={claseTabla.celdaEncabezado}>Nombre</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="correo" className={`${claseTabla.celdaEncabezado} hidden sm:table-cell`}>Correo</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="estatus" className={`${claseTabla.celdaEncabezado} hidden sm:table-cell`}>Estatus</EncabezadoOrdenable>
                  <th className={`${claseTabla.celdaEncabezado} pr-0 text-right`}>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {profesores.map((p) => {
                  const nombre = `${p.nombres} ${p.apellidos}`;
                  const etiquetaEstatus = (
                    <EtiquetaEstado tipo={ESTATUS_TIPO[p.estatusLaboral]}>
                      {ETIQUETA_ESTATUS[p.estatusLaboral]}
                    </EtiquetaEstado>
                  );
                  return (
                    <FilaEditable key={`${p.id}-${p.actualizadoEn.getTime()}`}
                      id={p.id} nombre={nombre} detalle={p.codigo}
                      editar={editarProfesor} eliminar={eliminarProfesor}
                      celdas={[
                        { contenido: p.codigo, className: "font-mono text-xs" },
                        {
                          contenido: (
                            <span className="font-medium">
                              {p.grado ? `${p.grado.nomenclatura}. ` : ""}
                              {p.apellidos}, {p.nombres}
                              <span className="mt-0.5 block text-xs font-normal text-texto-3">
                                {ETIQUETA_CONTRATACION[p.tipoContratacion]}
                                {p.departamento ? ` · ${p.departamento.nombre}` : ""}
                              </span>
                              <span className="mt-0.5 block break-all text-xs font-normal text-texto-3 sm:hidden">{p.correo}</span>
                              <span className="mt-1 inline-flex sm:hidden">
                                <EtiquetaEstado tipo={ESTATUS_TIPO[p.estatusLaboral]}>
                                  {ETIQUETA_ESTATUS[p.estatusLaboral]}
                                </EtiquetaEstado>
                              </span>
                            </span>
                          ),
                        },
                        { contenido: p.correo, className: "hidden break-all text-texto-3 sm:table-cell" },
                        { contenido: etiquetaEstatus, className: "hidden sm:table-cell" },
                      ]}
                      campos={[
                        { nombre: "codigo", etiqueta: "Código CUValles", valor: p.codigo, maxLength: 20, ancho: "corto" },
                        { nombre: "nombres", etiqueta: "Nombres", valor: p.nombres, maxLength: 150 },
                        { nombre: "apellidos", etiqueta: "Apellidos", valor: p.apellidos, maxLength: 150 },
                        { nombre: "correo", etiqueta: "Correo institucional", valor: p.correo, maxLength: 200 },
                        { nombre: "genero", etiqueta: "Género", valor: p.genero, opciones: OPCIONES_GENERO, ancho: "corto" },
                        { nombre: "tipoContratacion", etiqueta: "Tipo de contratación", valor: p.tipoContratacion,
                          opciones: opcionesContratacion, ancho: "medio" },
                        { nombre: "estatusLaboral", etiqueta: "Estatus laboral", valor: p.estatusLaboral,
                          opciones: opcionesEstatus, ancho: "medio" },
                        { nombre: "departamentoId", etiqueta: "Departamento", valor: p.departamentoId ? String(p.departamentoId) : "",
                          opciones: opcionesDepartamento, ancho: "medio", opcional: true },
                        { nombre: "gradoId", etiqueta: "Grado científico", valor: p.gradoId ? String(p.gradoId) : "",
                          opciones: opcionesGrado, ancho: "medio", opcional: true },
                        { nombre: "cvu", etiqueta: "CVU", valor: p.cvu ?? "", maxLength: 20, ancho: "corto", opcional: true },
                        { nombre: "orcid", etiqueta: "ORCID", valor: p.orcid ?? "", maxLength: 20, ancho: "medio",
                          opcional: true, placeholder: "0000-0000-0000-0000" },
                        { nombre: "scholarId", etiqueta: "Scholar ID", valor: p.scholarId ?? "", maxLength: 50, opcional: true },
                        { nombre: "scopusId", etiqueta: "Scopus ID", valor: p.scopusId ?? "", maxLength: 20, ancho: "corto", opcional: true },
                      ]} />
                  );
                })}
              </tbody>
            </table>
          )}
          <PaginacionListado {...contexto} paginacion={paginacion} nombre="profesores" />
        </div>
      </Panel>
    </Marco>
  );
}
