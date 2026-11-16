import { BarraListado, EncabezadoOrdenable, PaginacionListado } from "@/components/listado";
import { Marco } from "@/components/marco";
import { Aviso, claseTabla, EstadoVacio, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { analizarListado, hayFiltrosActivos, paginar } from "@/lib/listados/consulta";
import { prisma } from "@/lib/prisma";
import {
  filtrarReconocimientosProdep,
  LISTADO_PRODEP,
  ordenarReconocimientosProdep,
  RESULTADOS_PRODEP,
} from "@/modules/reconocimientos/prodep";
import { FilaProdep } from "./fila";
import { FormularioProdep } from "./formulario";
import type { HistorialConProfesor } from "./formulario-campos";

const BASE = "/reconocimientos/prodep";

const ETIQUETAS_RESULTADO: Record<(typeof RESULTADOS_PRODEP)[number], string> = {
  APROBADO: "Aprobado",
  NO_APROBADO: "No aprobado",
  EN_RECONSIDERACION: "En reconsideración",
};

const ETIQUETAS_COLUMNA: Record<(typeof LISTADO_PRODEP.columnas)[number], string> = {
  profesor: "Profesor",
  tipoSolicitud: "Solicitud",
  inicio: "Inicio",
  fin: "Fin",
  resultado: "Dictamen",
};

export default async function ProdepPage({ searchParams }: PageProps<"/reconocimientos/prodep">) {
  const perfil = await requireModulo("reconocimientos");
  const parametros = await searchParams;
  const { consulta, errores } = analizarListado(LISTADO_PRODEP, parametros);
  const where = filtrarReconocimientosProdep(consulta);
  const [profesores, historial, total] = await Promise.all([
    prisma.profesor.findMany({
      select: { id: true, codigo: true, nombres: true, apellidos: true },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    }),
    prisma.reconocimientoProdep.findMany({
      select: {
        id: true,
        profesorId: true,
        tipoSolicitud: true,
        resultado: true,
        inicio: true,
        fin: true,
      },
      orderBy: [{ inicio: "asc" }, { id: "asc" }],
    }),
    prisma.reconocimientoProdep.count({ where }),
  ]);
  const paginacion = paginar(total, consulta);
  const reconocimientos = await prisma.reconocimientoProdep.findMany({
    where,
    orderBy: ordenarReconocimientosProdep(consulta),
    skip: paginacion.salto,
    take: paginacion.tamanio,
    include: {
      profesor: { select: { id: true, codigo: true, nombres: true, apellidos: true } },
    },
  });
  const historialConProfesor: HistorialConProfesor[] = historial.map((registro) => ({
    id: registro.id,
    profesorId: registro.profesorId,
    tipoSolicitud: registro.tipoSolicitud,
    resultado: registro.resultado,
    fechaInicio: registro.inicio,
    fechaFin: registro.fin,
  }));
  const contexto = {
    base: BASE,
    definicion: LISTADO_PRODEP,
    consulta: { ...consulta, pagina: paginacion.pagina },
  };
  const exito = parametros.editado === "1" ? "Se actualizaron los datos del reconocimiento PRODEP."
    : parametros.eliminado === "1" ? "Se eliminó el reconocimiento PRODEP."
    : null;
  const encabezado = claseTabla.celdaEncabezado;
  const encabezadoSm = `${encabezado} hidden sm:table-cell`;

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="reconocimientos" titulo="Reconocimiento PRODEP"
      volver={{ href: "/reconocimientos", texto: "Reconocimientos" }}>
      <Panel titulo="Registrar reconocimiento" descripcion="RF-010 · CU-006">
        {profesores.length === 0
          ? <EstadoVacio>Registra primero un profesor para agregar un reconocimiento PRODEP.</EstadoVacio>
          : <FormularioProdep profesores={profesores} historial={historialConProfesor} />}
      </Panel>

      <Panel titulo={`Reconocimientos registrados (${total})`}>
        {exito && <div className="mb-4"><Aviso tipo="exito">{exito}</Aviso></div>}
        <div className="flex flex-col gap-4">
          <BarraListado {...contexto}
          columnas={LISTADO_PRODEP.columnas.map((clave) => ({ clave, texto: ETIQUETAS_COLUMNA[clave] }))}
          errores={errores} etiquetaBusqueda="Buscar reconocimientos PRODEP"
          placeholder="Profesor, solicitud, fecha o dictamen"
          filtros={[{
            clave: "resultado",
            etiqueta: "Dictamen",
            opciones: RESULTADOS_PRODEP.map((resultado) => ({
              valor: resultado,
              texto: ETIQUETAS_RESULTADO[resultado],
            })),
          }]} />
          {reconocimientos.length === 0 ? (
            <EstadoVacio>
              {hayFiltrosActivos(consulta)
                ? "No hay reconocimientos PRODEP con esta búsqueda. Prueba con otro texto o limpia los filtros."
                : "Aún no hay reconocimientos PRODEP registrados."}
            </EstadoVacio>
          ) : (
            <table className={`${claseTabla.tabla} w-full table-fixed`}>
              <thead className={claseTabla.encabezado}>
                <tr>
                  <EncabezadoOrdenable {...contexto} columna="profesor" className={encabezado}>Profesor</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="tipoSolicitud" className={encabezadoSm}>Solicitud</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="inicio" className={encabezadoSm}>Inicio</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="fin" className={encabezadoSm}>Fin</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="resultado" className={encabezadoSm}>Dictamen</EncabezadoOrdenable>
                  <th className={`${encabezado} pr-0 text-right`}><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {reconocimientos.map((reconocimiento) => (
                  <FilaProdep key={reconocimiento.id} reconocimiento={reconocimiento} profesores={profesores}
                    historial={historialConProfesor} />
                ))}
              </tbody>
            </table>
          )}
          <PaginacionListado {...contexto} paginacion={paginacion} nombre="reconocimientos PRODEP" />
        </div>
      </Panel>
    </Marco>
  );
}
