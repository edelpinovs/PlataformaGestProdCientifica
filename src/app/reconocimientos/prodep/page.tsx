import { BarraListado, EncabezadoOrdenable, PaginacionListado } from "@/components/listado";
import { Marco } from "@/components/marco";
import { Aviso, claseTabla, EstadoVacio, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { analizarListado, hayFiltrosActivos, paginar } from "@/lib/listados/consulta";
import { prisma } from "@/lib/prisma";
import { RESULTADOS_PRODEP, TIPOS_SOLICITUD_PRODEP } from "@/modules/reconocimientos/prodep";
import {
  COLUMNAS_PRODEP,
  filtroProdep,
  LISTADO_PRODEP,
  ordenProdep,
} from "@/modules/reconocimientos/prodep-listado";
import { FilaProdep } from "./fila";
import { FormularioProdep } from "./formulario";

const BASE = "/reconocimientos/prodep";

const ETIQUETAS_SOLICITUD: Record<(typeof TIPOS_SOLICITUD_PRODEP)[number], string> = {
  PRIMER_RECONOCIMIENTO: "Primer reconocimiento",
  RENOVACION: "Renovación",
};
const ETIQUETAS_RESULTADO: Record<(typeof RESULTADOS_PRODEP)[number], string> = {
  APROBADO: "Aprobado",
  NO_APROBADO: "No aprobado",
  EN_RECONSIDERACION: "En reconsideración",
};

export default async function ProdepPage({ searchParams }: PageProps<"/reconocimientos/prodep">) {
  const perfil = await requireModulo("reconocimientos");
  const parametros = await searchParams;
  const { consulta, errores } = analizarListado(LISTADO_PRODEP, parametros);
  const tipoSolicitud = TIPOS_SOLICITUD_PRODEP.find((tipo) => tipo === consulta.filtros.tipoSolicitud);
  const resultado = RESULTADOS_PRODEP.find((valor) => valor === consulta.filtros.resultado);
  const where = {
    ...filtroProdep(consulta),
    ...(tipoSolicitud ? { tipoSolicitud } : {}),
    ...(resultado ? { resultado } : {}),
  };
  const total = await prisma.reconocimientoProdep.count({ where });
  const paginacion = paginar(total, consulta);
  const [profesores, reconocimientos] = await Promise.all([
    prisma.profesor.findMany({
      select: { id: true, codigo: true, nombres: true, apellidos: true },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    }),
    prisma.reconocimientoProdep.findMany({
      where,
      include: { profesor: { select: { id: true, codigo: true, nombres: true, apellidos: true } } },
      orderBy: ordenProdep(consulta),
      skip: paginacion.salto,
      take: paginacion.tamanio,
    }),
  ]);
  const contexto = {
    base: BASE,
    definicion: LISTADO_PRODEP,
    consulta: { ...consulta, pagina: paginacion.pagina },
  };
  const mensaje = parametros.editado === "1" ? "Se actualizaron los datos del reconocimiento PRODEP."
    : parametros.eliminado === "1" ? "Se eliminó el reconocimiento PRODEP."
    : null;

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="reconocimientos" titulo="Reconocimiento PRODEP"
      volver={{ href: "/reconocimientos", texto: "Reconocimientos" }}>
      <Panel titulo="Registrar Perfil Deseable PRODEP">
        {profesores.length === 0
          ? <EstadoVacio>Registra primero un profesor para agregar un reconocimiento PRODEP.</EstadoVacio>
          : <FormularioProdep profesores={profesores} />}
      </Panel>
      <Panel titulo={`Reconocimientos registrados (${total})`}>
        {mensaje && <div className="mb-4"><Aviso tipo="exito">{mensaje}</Aviso></div>}
        <div className="flex flex-col gap-4">
          <BarraListado
            {...contexto}
            columnas={COLUMNAS_PRODEP}
            errores={errores}
            etiquetaBusqueda="Buscar reconocimientos"
            placeholder="Profesor, solicitud, resultado o fecha"
            filtros={[
              {
                clave: "tipoSolicitud",
                etiqueta: "Tipo de solicitud",
                opciones: TIPOS_SOLICITUD_PRODEP.map((tipo) => ({ valor: tipo, texto: ETIQUETAS_SOLICITUD[tipo] })),
              },
              {
                clave: "resultado",
                etiqueta: "Resultado",
                opciones: RESULTADOS_PRODEP.map((valor) => ({ valor, texto: ETIQUETAS_RESULTADO[valor] })),
              },
            ]}
          />
          {reconocimientos.length === 0 ? (
            <EstadoVacio>
              {hayFiltrosActivos(consulta)
                ? "No hay reconocimientos PRODEP con esta búsqueda. Prueba con otro texto o limpia los filtros."
                : "Aún no hay reconocimientos PRODEP registrados."}
            </EstadoVacio>
          ) : (
            <table className={claseTabla.tabla}>
              <thead className={`${claseTabla.encabezado} hidden sm:table-header-group`}>
                <tr>
                  <EncabezadoOrdenable {...contexto} columna="profesor" className={claseTabla.celdaEncabezado}>Profesor</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="tipoSolicitud" className={claseTabla.celdaEncabezado}>Solicitud</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="resultado" className={claseTabla.celdaEncabezado}>Resultado</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="inicio" className={claseTabla.celdaEncabezado}>Inicio</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="fin" className={claseTabla.celdaEncabezado}>Fin</EncabezadoOrdenable>
                  <th className={`${claseTabla.celdaEncabezado} pr-0 text-right`}><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {reconocimientos.map((reconocimiento) => (
                  <FilaProdep key={reconocimiento.id} reconocimiento={reconocimiento} profesores={profesores} />
                ))}
              </tbody>
            </table>
          )}
          <PaginacionListado {...contexto} paginacion={paginacion} nombre="reconocimientos" />
        </div>
      </Panel>
    </Marco>
  );
}
