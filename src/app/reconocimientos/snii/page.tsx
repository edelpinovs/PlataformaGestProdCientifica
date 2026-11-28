import { BarraListado, EncabezadoOrdenable, PaginacionListado } from "@/components/listado";
import { Marco } from "@/components/marco";
import { Aviso, claseTabla, EstadoVacio, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { analizarListado, hayFiltrosActivos, paginar } from "@/lib/listados/consulta";
import { prisma } from "@/lib/prisma";
import { ESTATUS, ETIQUETAS_ESTATUS, estatusReconocimiento } from "@/modules/reconocimientos/estatus";
import { NIVELES_SNII, TIPOS_PARTICIPACION_SNII } from "@/modules/reconocimientos/snii";
import { inicioDelDiaUtc } from "@/modules/reportes/vigencias";
import {
  COLUMNAS_SNII,
  ETIQUETAS_NIVEL_SNII,
  ETIQUETAS_PARTICIPACION_SNII,
  ETIQUETAS_RESULTADO_SNII,
  filtroSnii,
  LISTADO_SNII,
  ordenSnii,
  RESULTADOS_SNII,
} from "@/modules/reconocimientos/snii-listado";
import { FilaSnii } from "./fila";
import { FormularioSnii } from "./formulario";

const BASE = "/reconocimientos/snii";
const profesorListado = { id: true, codigo: true, nombres: true, apellidos: true, cvu: true } as const;

// Issue 111 (D-009): «Reconocimientos registrados» paginado de 10 en 10, con búsqueda, orden por
// columna y filtros, con la pieza compartida de listados (como PRODEP).
export default async function SniiPage({ searchParams }: PageProps<"/reconocimientos/snii">) {
  const perfil = await requireModulo("reconocimientos");
  const parametros = await searchParams;
  const { consulta, errores } = analizarListado(LISTADO_SNII, parametros);
  // El estatus se calcula con el día de hoy, igual en el filtro y en cada fila (issue 248).
  const hoy = inicioDelDiaUtc(new Date());
  const where = filtroSnii(consulta, hoy);
  const total = await prisma.reconocimientoSnii.count({ where });
  const paginacion = paginar(total, consulta);
  const [profesores, reconocimientos] = await Promise.all([
    prisma.profesor.findMany({ select: profesorListado, orderBy: [{ apellidos: "asc" }, { nombres: "asc" }] }),
    prisma.reconocimientoSnii.findMany({
      where,
      include: { profesor: { select: profesorListado } },
      orderBy: ordenSnii(consulta),
      skip: paginacion.salto,
      take: paginacion.tamanio,
    }),
  ]);
  const mensaje = parametros.editado === "1" ? "Se actualizaron los datos del reconocimiento SNII."
    : parametros.eliminado === "1" ? "Se eliminó el reconocimiento SNII."
    : null;
  const contexto = { base: BASE, definicion: LISTADO_SNII, consulta: { ...consulta, pagina: paginacion.pagina } };

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="reconocimientos" titulo="Reconocimiento SNII"
      volver={{ href: "/reconocimientos", texto: "Reconocimientos" }}>
      {mensaje && <Aviso tipo="exito">{mensaje}</Aviso>}
      <div className="flex justify-end">
        {profesores.length === 0 ? <EstadoVacio>Registra primero un profesor para agregar un reconocimiento SNII.</EstadoVacio>
          : <FormularioSnii profesores={profesores} />}
      </div>
      <Panel titulo={`Reconocimientos registrados (${total})`}>
        <div className="flex flex-col gap-4">
          <BarraListado
            {...contexto}
            columnas={COLUMNAS_SNII}
            errores={errores}
            etiquetaBusqueda="Buscar reconocimientos"
            placeholder="Profesor, código, CVU, nivel o fecha"
            filtros={[
              { clave: "nivel", etiqueta: "Nivel", opciones: NIVELES_SNII.map((valor) => ({ valor, texto: ETIQUETAS_NIVEL_SNII[valor] })) },
              {
                clave: "tipoParticipacion",
                etiqueta: "Participación",
                opciones: TIPOS_PARTICIPACION_SNII.map((valor) => ({ valor, texto: ETIQUETAS_PARTICIPACION_SNII[valor] })),
              },
              { clave: "resultado", etiqueta: "Resultado", opciones: RESULTADOS_SNII.map((valor) => ({ valor, texto: ETIQUETAS_RESULTADO_SNII[valor] })) },
              { clave: "estatus", etiqueta: "Estatus", opciones: ESTATUS.map((valor) => ({ valor, texto: ETIQUETAS_ESTATUS[valor] })) },
            ]}
          />
          {reconocimientos.length === 0 ? (
            <EstadoVacio>
              {hayFiltrosActivos(consulta)
                ? "No hay reconocimientos SNII con esta búsqueda. Prueba con otro texto o limpia los filtros."
                : "Aún no hay reconocimientos SNII registrados."}
            </EstadoVacio>
          ) : (
            <table className={claseTabla.tabla}>
              <thead className={`${claseTabla.encabezado} hidden sm:table-header-group`}>
                <tr>
                  {COLUMNAS_SNII.map((columna) => (
                    <EncabezadoOrdenable key={columna.clave} {...contexto} columna={columna.clave} className={claseTabla.celdaEncabezado}>
                      {columna.texto}
                    </EncabezadoOrdenable>
                  ))}
                  <th className={`${claseTabla.celdaEncabezado} pr-0 text-right`}><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {reconocimientos.map((reconocimiento) => (
                  <FilaSnii key={reconocimiento.id} reconocimiento={reconocimiento} profesores={profesores}
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
