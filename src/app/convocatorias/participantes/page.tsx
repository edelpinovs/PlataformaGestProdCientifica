import { BarraListado, EncabezadoOrdenable, PaginacionListado } from "@/components/listado";
import { Marco } from "@/components/marco";
import { Aviso, claseTabla, EstadoVacio, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { analizarListado, hayFiltrosActivos, paginar } from "@/lib/listados/consulta";
import { prisma } from "@/lib/prisma";
import {
  COLUMNAS_PARTICIPANTES,
  ETIQUETA_ORIGEN,
  ETIQUETA_PRELIMINAR,
  ETIQUETA_RESULTADO,
  filtroParticipantes,
  listadoParticipantes,
  ordenParticipantes,
} from "@/modules/convocatorias/participantes-listado";
import { resultadoPreliminar } from "@/modules/convocatorias/participantes";
import { profesoresEnListado } from "@/modules/convocatorias/recalcular";
import { FilaParticipante } from "./fila-participante";
import { RegistrarParticipante } from "./registrar-participante";

const BASE = "/convocatorias/participantes";
const cifra = new Intl.NumberFormat("es-MX");

// RF-018 (CU-010): quiénes participaron en cada convocatoria y su resultado según el listado oficial.
export default async function ParticipantesPage({ searchParams }: PageProps<"/convocatorias/participantes">) {
  const perfil = await requireModulo("convocatorias");

  const parametros = await searchParams;
  const { eliminado } = parametros;

  const [convocatorias, activos] = await Promise.all([
    prisma.convocatoria.findMany({ select: { id: true, programa: true, anio: true }, orderBy: [{ anio: "desc" }, { programa: "asc" }] }),
    prisma.profesor.findMany({
      where: { estatusLaboral: "ACTIVO" },
      select: { id: true, nombres: true, apellidos: true, codigo: true },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    }),
  ]);
  const definicion = listadoParticipantes(convocatorias.map((c) => c.id));
  const { consulta, errores } = analizarListado(definicion, parametros);
  const where = filtroParticipantes(consulta);
  const total = await prisma.participacionConvocatoria.count({ where });
  const paginacion = paginar(total, consulta);
  const filas = await prisma.participacionConvocatoria.findMany({
    where,
    orderBy: ordenParticipantes(consulta),
    skip: paginacion.salto,
    take: paginacion.tamanio,
    select: {
      id: true, resultado: true, origen: true, convocatoriaId: true, profesorId: true,
      convocatoria: { select: { programa: true, anio: true } },
      profesor: { select: { nombres: true, apellidos: true, codigo: true } },
    },
  });
  const contexto = { base: BASE, definicion, consulta: { ...consulta, pagina: paginacion.pagina } };

  // Resultado preliminar: el de la carga en revisión de cada convocatoria mostrada. No se guarda
  // hasta confirmar la carga (RF-019), para que el reporte anual (RF-028) no lo cuente antes.
  const idsMostrados = [...new Set(filas.map((f) => f.convocatoriaId))];
  const enRevision = new Map(await Promise.all(
    idsMostrados.map(async (id) => [id, await profesoresEnListado(prisma, id, "EN_REVISION")] as const),
  ));
  const etiquetaResultado = (f: (typeof filas)[number]) => {
    if (f.resultado) return ETIQUETA_RESULTADO[f.resultado];
    const preliminar = resultadoPreliminar(f.profesorId, enRevision.get(f.convocatoriaId) ?? null);
    return preliminar ? ETIQUETA_PRELIMINAR[preliminar] : ETIQUETA_RESULTADO.PENDIENTE;
  };

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="convocatorias" titulo="Participantes de convocatorias"
      subtitulo="Quiénes participaron en cada convocatoria y su resultado según el listado oficial (RF-018). Mientras la carga está en revisión, el resultado es preliminar."
      volver={{ href: "/convocatorias", texto: "Convocatorias" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-marca-suave px-3 py-1 text-xs font-medium text-marca">
          {cifra.format(total)} {hayFiltrosActivos(consulta) ? (total === 1 ? "coincide" : "coinciden") : (total === 1 ? "registrado" : "registrados")}
        </span>
        <RegistrarParticipante profesores={activos} anioActual={new Date().getFullYear()} />
      </div>

      <Panel>
        {typeof eliminado === "string" && <div className="mb-4"><Aviso tipo="exito">Se quitó a {eliminado}.</Aviso></div>}
        <div className="flex flex-col gap-4">
          <BarraListado {...contexto} columnas={COLUMNAS_PARTICIPANTES} errores={errores}
            etiquetaBusqueda="Buscar participantes" placeholder="Nombre, apellidos o código"
            filtros={[
              { clave: "convocatoria", etiqueta: "Convocatoria", opciones: convocatorias.map((c) => ({ valor: String(c.id), texto: `${c.programa} ${c.anio}` })) },
              { clave: "resultado", etiqueta: "Resultado", opciones: [
                { valor: "APROBADO", texto: "Aprobado" }, { valor: "NO_APROBADO", texto: "No aprobado" }, { valor: "PENDIENTE", texto: "Sin confirmar" },
              ] },
              { clave: "origen", etiqueta: "Origen", opciones: [
                { valor: "MANUAL", texto: ETIQUETA_ORIGEN.MANUAL }, { valor: "LISTADO", texto: ETIQUETA_ORIGEN.LISTADO },
              ] },
            ]} />
          {filas.length === 0 ? (
            <EstadoVacio>
              {hayFiltrosActivos(consulta)
                ? "No hay participantes con esta búsqueda. Prueba con otro texto o limpia los filtros."
                : "Aún no hay participantes. Regístralos aquí; quienes salgan en el listado oficial se agregarán al confirmar la carga."}
            </EstadoVacio>
          ) : (
            <table className={claseTabla.tabla}>
              <thead className={claseTabla.encabezado}>
                <tr>
                  <EncabezadoOrdenable {...contexto} columna="convocatoria" className={claseTabla.celdaEncabezado}>Convocatoria</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="profesor" className={`${claseTabla.celdaEncabezado} hidden sm:table-cell`}>Profesor</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="codigo" className={`${claseTabla.celdaEncabezado} hidden sm:table-cell`}>Código</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="resultado" className={`${claseTabla.celdaEncabezado} hidden sm:table-cell`}>Resultado</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="origen" className={`${claseTabla.celdaEncabezado} hidden sm:table-cell`}>Origen</EncabezadoOrdenable>
                  <th className={`${claseTabla.celdaEncabezado} pr-0 text-right`}><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <FilaParticipante key={`${f.id}-${f.resultado}-${f.origen}`} p={{
                    id: f.id,
                    convocatoria: `${f.convocatoria.programa} ${f.convocatoria.anio}`,
                    profesor: `${f.profesor.apellidos}, ${f.profesor.nombres}`,
                    codigo: f.profesor.codigo,
                    resultado: etiquetaResultado(f),
                    origen: ETIQUETA_ORIGEN[f.origen],
                  }} />
                ))}
              </tbody>
            </table>
          )}
          <PaginacionListado {...contexto} paginacion={paginacion} nombre="participantes" />
        </div>
      </Panel>
    </Marco>
  );
}
