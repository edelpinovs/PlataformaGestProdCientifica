import Link from "next/link";
import { FilaEditable } from "@/components/fila-editable";
import { Marco } from "@/components/marco";
import { Aviso, claseBoton, claseTabla, EstadoVacio, EtiquetaEstado, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ETIQUETA_CONTRATACION, ETIQUETA_ESTATUS } from "@/modules/profesores/profesores";
import { editarProfesor, eliminarProfesor } from "./actions";

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

const OPCIONES_CONTRATACION = Object.entries(ETIQUETA_CONTRATACION).map(([valor, texto]) => ({ valor, texto }));
const OPCIONES_ESTATUS = Object.entries(ETIQUETA_ESTATUS).map(([valor, texto]) => ({ valor, texto }));

export default async function ProfesoresPage({ searchParams }: PageProps<"/profesores">) {
  const perfil = await requireModulo("profesores");

  const [profesores, grados, departamentos] = await Promise.all([
    prisma.profesor.findMany({
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
      include: {
        grado: { select: { nomenclatura: true } },
        departamento: { select: { nombre: true } },
      },
    }),
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

  const { editado, eliminado } = await searchParams;
  const resultado =
    typeof editado === "string" ? `Se guardaron los cambios de «${editado}».`
    : typeof eliminado === "string" ? `Se eliminó a «${eliminado}».`
    : null;

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="profesores" titulo="Directorio de profesores">
      <Panel titulo={`Profesores registrados (${profesores.length})`}
        accion={{ href: "/profesores/nuevo", texto: "Registrar profesor" }}>
        {resultado && <div className="mb-4"><Aviso tipo="exito">{resultado}</Aviso></div>}
        {profesores.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <EstadoVacio>Aún no hay profesores registrados en el directorio.</EstadoVacio>
            <Link href="/profesores/nuevo" className={claseBoton}>Registrar el primer profesor</Link>
          </div>
        ) : (
          <table className={claseTabla.tabla}>
            <thead className={claseTabla.encabezado}>
              <tr>
                <th className={claseTabla.celdaEncabezado}>Código</th>
                <th className={claseTabla.celdaEncabezado}>Nombre</th>
                <th className={claseTabla.celdaEncabezado}>Correo</th>
                <th className={claseTabla.celdaEncabezado}>Estatus</th>
                <th className={`${claseTabla.celdaEncabezado} pr-0 text-right`}>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {profesores.map((p) => {
                const nombre = `${p.nombres} ${p.apellidos}`;
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
                            </span>
                          </span>
                        ),
                      },
                      { contenido: p.correo, className: "text-texto-3" },
                      {
                        contenido: (
                          <EtiquetaEstado tipo={ESTATUS_TIPO[p.estatusLaboral]}>
                            {ETIQUETA_ESTATUS[p.estatusLaboral]}
                          </EtiquetaEstado>
                        ),
                      },
                    ]}
                    campos={[
                      { nombre: "codigo", etiqueta: "Código CUValles", valor: p.codigo, maxLength: 20, ancho: "corto" },
                      { nombre: "nombres", etiqueta: "Nombres", valor: p.nombres, maxLength: 150 },
                      { nombre: "apellidos", etiqueta: "Apellidos", valor: p.apellidos, maxLength: 150 },
                      { nombre: "correo", etiqueta: "Correo institucional", valor: p.correo, maxLength: 200 },
                      { nombre: "genero", etiqueta: "Género", valor: p.genero, opciones: OPCIONES_GENERO, ancho: "corto" },
                      { nombre: "tipoContratacion", etiqueta: "Tipo de contratación", valor: p.tipoContratacion,
                        opciones: OPCIONES_CONTRATACION, ancho: "medio" },
                      { nombre: "estatusLaboral", etiqueta: "Estatus laboral", valor: p.estatusLaboral,
                        opciones: OPCIONES_ESTATUS, ancho: "medio" },
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
      </Panel>
    </Marco>
  );
}
