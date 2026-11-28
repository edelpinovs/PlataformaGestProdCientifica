import { BarraListado, EncabezadoOrdenable, PaginacionListado } from "@/components/listado";
import { Marco } from "@/components/marco";
import { Aviso, claseTabla, EstadoVacio, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { analizarListado, hayFiltrosActivos, paginar } from "@/lib/listados/consulta";
import { prisma } from "@/lib/prisma";
import {
  COLUMNAS_PRODEP,
  ETIQUETAS_RESULTADO_PRODEP,
  ETIQUETAS_TIPO_SOLICITUD_PRODEP,
  filtroProdep,
  LISTADO_PRODEP,
  ordenProdep,
  RESULTADOS_PRODEP,
  TIPOS_SOLICITUD_PRODEP,
} from "@/modules/reconocimientos/prodep";
import { ESTATUS, ETIQUETAS_ESTATUS, estatusReconocimiento } from "@/modules/reconocimientos/estatus";
import { inicioDelDiaUtc } from "@/modules/reportes/vigencias";
import { FilaProdep } from "./fila";
import { FormularioProdep } from "./formulario";
import type { ProfesorProdep } from "./formulario-campos";

const BASE = "/reconocimientos/prodep";

export default async function ProdepPage({ searchParams }: PageProps<"/reconocimientos/prodep">) {
  const perfil = await requireModulo("reconocimientos");
  const parametros = await searchParams;
  const { consulta, errores } = analizarListado(LISTADO_PRODEP, parametros);
  // El estatus se calcula con el día de hoy, igual en el filtro y en cada fila (issue 248).
  const hoy = inicioDelDiaUtc(new Date());
  const where = filtroProdep(consulta, hoy);
  const total = await prisma.reconocimientoProdep.count({ where });
  const paginacion = paginar(total, consulta);
  const [profesores, reconocimientos] = await Promise.all([
    prisma.profesor.findMany({
      where: { tipoContratacion: "TIEMPO_COMPLETO" },
      select: { id: true, codigo: true, nombres: true, apellidos: true, tipoContratacion: true },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    }),
    prisma.reconocimientoProdep.findMany({
      where,
      include: {
        profesor: {
          select: { id: true, codigo: true, nombres: true, apellidos: true, tipoContratacion: true },
        },
      },
      orderBy: ordenProdep(consulta),
      skip: paginacion.salto,
      take: paginacion.tamanio,
    }),
  ]);
  const mensaje = parametros.editado === "1" ? "Se actualizaron los datos del reconocimiento PRODEP."
    : parametros.eliminado === "1" ? "Se eliminó el reconocimiento PRODEP."
    : null;
  const contexto = {
    base: BASE,
    definicion: LISTADO_PRODEP,
    consulta: { ...consulta, pagina: paginacion.pagina },
  };
  const opcionesProfesores: ProfesorProdep[] = profesores;

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="reconocimientos" titulo="Reconocimiento PRODEP"
      volver={{ href: "/reconocimientos", texto: "Reconocimientos" }}>
      {mensaje && <Aviso tipo="exito">{mensaje}</Aviso>}
      <Panel titulo="Registrar reconocimiento" descripcion="Solo se admiten profesores con contratación de Tiempo Completo.">
        {profesores.length === 0
          ? <EstadoVacio>Registra primero un profesor de Tiempo Completo para agregar un reconocimiento PRODEP.</EstadoVacio>
          : <FormularioProdep profesores={opcionesProfesores} />}
      </Panel>
      <Panel titulo={`Reconocimientos registrados (${total})`}>
        <div className="flex flex-col gap-4">
          <BarraListado
            {...contexto}
            columnas={COLUMNAS_PRODEP}
            errores={errores}
            etiquetaBusqueda="Buscar reconocimientos"
            placeholder="Profesor, solicitud, resultado, estatus o fecha"
            filtros={[
              {
                clave: "tipoSolicitud",
                etiqueta: "Tipo de solicitud",
                opciones: TIPOS_SOLICITUD_PRODEP.map((valor) => ({
                  valor,
                  texto: ETIQUETAS_TIPO_SOLICITUD_PRODEP[valor],
                })),
              },
              {
                clave: "resultado",
                etiqueta: "Resultado",
                opciones: RESULTADOS_PRODEP.map((valor) => ({ valor, texto: ETIQUETAS_RESULTADO_PRODEP[valor] })),
              },
              { clave: "estatus", etiqueta: "Estatus", opciones: ESTATUS.map((valor) => ({ valor, texto: ETIQUETAS_ESTATUS[valor] })) },
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
                  {COLUMNAS_PRODEP.map((columna) => (
                    <EncabezadoOrdenable key={columna.clave} {...contexto} columna={columna.clave}
                      className={claseTabla.celdaEncabezado}>
                      {columna.texto}
                    </EncabezadoOrdenable>
                  ))}
                  <th className={`${claseTabla.celdaEncabezado} pr-0 text-right`}>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {reconocimientos.map((reconocimiento) => (
                  <FilaProdep key={reconocimiento.id} reconocimiento={reconocimiento} profesores={opcionesProfesores}
                    estatus={estatusReconocimiento(reconocimiento.resultado, reconocimiento.fin, hoy)} />
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
