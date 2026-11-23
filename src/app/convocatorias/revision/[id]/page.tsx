import { notFound } from "next/navigation";
import { BarraListado, EncabezadoOrdenable, PaginacionListado } from "@/components/listado";
import { Marco } from "@/components/marco";
import { Aviso, claseTabla, EstadoVacio, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { analizarListado, hayFiltrosActivos, paginar } from "@/lib/listados/consulta";
import { prisma } from "@/lib/prisma";
import { clasificarCarga, type Clasificacion } from "@/modules/convocatorias/balance";
import { nombreDeRuta } from "@/modules/convocatorias/carga";
import {
  COLUMNAS_REVISION,
  CRITERIOS,
  ETIQUETA_CLASIFICACION,
  ETIQUETA_CRITERIO,
  filtrarYOrdenarRevision,
  LISTADO_REVISION,
} from "@/modules/convocatorias/revision-listado";
import { CuerpoRevision, type FilaVista } from "./fila-revision";

const cifra = new Intl.NumberFormat("es-MX");
const dia = (fecha: Date) => fecha.toISOString().slice(0, 10);

const TIPO_CLASIFICACION: Record<Clasificacion, FilaVista["clasificacion"]["tipo"]> = {
  PROMOCION: "exito", RENOVACION: "exito", NUEVO_INGRESO: "exito",
  NO_APROBADO: "error", DUDOSO: "aviso", SIN_COINCIDENCIA: "aviso",
};

const TARJETAS: { clave: Clasificacion; titulo: string; nota: string }[] = [
  { clave: "PROMOCION", titulo: "Promociones", nota: "suben de nivel SNII" },
  { clave: "RENOVACION", titulo: "Renovaciones", nota: "ya tenían el reconocimiento" },
  { clave: "NUEVO_INGRESO", titulo: "Nuevos ingresos", nota: "primer reconocimiento" },
  { clave: "NO_APROBADO", titulo: "No aprobados", nota: "participantes que no aparecen" },
];

// RF-019 (CU-010): previsualización del balance de una carga en revisión antes de confirmarla.
// La clasificación sale del historial aprobado de M3 con las reglas del reporte anual (RF-028), así
// que la lista completa se arma y pagina en memoria (justificado en el #24). Nada se confirma aquí.
export default async function RevisionPage({ params, searchParams }: PageProps<"/convocatorias/revision/[id]">) {
  const perfil = await requireModulo("convocatorias");

  const { id: bruto } = await params;
  const id = /^[1-9]\d{0,9}$/.test(bruto) ? Number(bruto) : NaN;
  if (!Number.isInteger(id) || id > 2147483647) notFound();

  const carga = await prisma.cargaResultados.findUnique({
    where: { id },
    select: { id: true, estado: true, archivoRuta: true, convocatoria: { select: { id: true, programa: true, anio: true } } },
  });
  if (!carga) notFound();
  const { convocatoria } = carga;
  const programa = convocatoria.programa as "SNII" | "PRODEP";
  const enRevision = carga.estado === "EN_REVISION";

  const [renglones, participantes, profesores] = await Promise.all([
    prisma.renglonResultado.findMany({
      where: { cargaId: carga.id },
      select: { id: true, numero: true, apellidoPaterno: true, apellidoMaterno: true, nombres: true, profesorId: true, criterio: true, nivel: true },
      orderBy: { numero: "asc" },
    }),
    prisma.participacionConvocatoria.findMany({ where: { convocatoriaId: convocatoria.id }, select: { profesorId: true } }),
    prisma.profesor.findMany({
      select: { id: true, nombres: true, apellidos: true, codigo: true, estatusLaboral: true },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    }),
  ]);
  const conProfesor = [...new Set(renglones.flatMap((r) => (r.profesorId === null ? [] : [r.profesorId])))];
  const [historialSnii, historialProdep] = await Promise.all([
    programa === "SNII"
      ? prisma.reconocimientoSnii.findMany({ where: { resultado: "APROBADO", profesorId: { in: conProfesor } }, select: { id: true, profesorId: true, nivel: true, inicio: true } })
      : [],
    programa === "PRODEP"
      ? prisma.reconocimientoProdep.findMany({ where: { resultado: "APROBADO", profesorId: { in: conProfesor } }, select: { id: true, profesorId: true, inicio: true } })
      : [],
  ]);

  const { filas, balance } = clasificarCarga({
    programa,
    anio: convocatoria.anio,
    renglones: renglones.map((r) => ({
      id: r.id, numero: r.numero, profesorId: r.profesorId, criterio: r.criterio, nivel: r.nivel,
      nombre: [r.apellidoPaterno, r.apellidoMaterno, r.nombres].filter(Boolean).join(" "),
    })),
    historialSnii: historialSnii.map((h) => ({ id: h.id, profesorId: h.profesorId, nivel: h.nivel, inicio: dia(h.inicio) })),
    historialProdep: historialProdep.map((h) => ({ id: h.id, profesorId: h.profesorId, inicio: dia(h.inicio) })),
    participantes: participantes.map((p) => p.profesorId),
  });

  const porId = new Map(profesores.map((p) => [p.id, p]));
  const nombreProfesor = (pid: number) => {
    const p = porId.get(pid);
    return p ? `${p.apellidos}, ${p.nombres} · ${p.codigo}` : "";
  };
  const parametros = await searchParams;
  const { consulta, errores } = analizarListado(LISTADO_REVISION, parametros);
  const elegidas = filtrarYOrdenarRevision(filas, consulta, nombreProfesor);
  const paginacion = paginar(elegidas.length, consulta);
  const pagina = elegidas.slice(paginacion.salto, paginacion.salto + paginacion.tamanio);
  const base = `/convocatorias/revision/${carga.id}`;
  const contexto = { base, definicion: LISTADO_REVISION, consulta: { ...consulta, pagina: paginacion.pagina } };

  const vista: FilaVista[] = pagina.map((f) => ({
    clave: f.clave,
    renglonId: f.renglonId,
    numero: f.numero,
    nombreListado: f.nombreListado,
    profesor: f.profesorId === null ? null : nombreProfesor(f.profesorId) || null,
    criterio: f.criterio ? ETIQUETA_CRITERIO[f.criterio] : null,
    accion: !enRevision || f.renglonId === null ? null
      : f.criterio === "AMBIGUO" || f.criterio === "SIN_COINCIDENCIA" ? "asignar"
      : f.criterio === "MANUAL" ? "quitar" : null,
    clasificacion: { tipo: TIPO_CLASIFICACION[f.clasificacion], texto: ETIQUETA_CLASIFICACION[f.clasificacion] },
  }));
  const opciones = enRevision
    ? profesores.filter((p) => p.estatusLaboral === "ACTIVO").map(({ id: pid, nombres, apellidos, codigo }) => ({ id: pid, nombres, apellidos, codigo }))
    : [];
  const nombreConvocatoria = `${convocatoria.programa} ${convocatoria.anio}`;

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="convocatorias" titulo={`Balance de ${nombreConvocatoria}`}
      subtitulo={`Previsualización de la carga «${nombreDeRuta(carga.archivoRuta)}» antes de confirmarla (RF-019).`}
      volver={{ href: "/convocatorias", texto: "Convocatorias" }}>
      {!enRevision && (
        <Aviso tipo="aviso">Esta carga ya no está en revisión: el balance se muestra solo para consulta y no se puede cambiar.</Aviso>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Balance">
        {TARJETAS.map((t) => (
          <article key={t.clave} className="rounded-2xl bg-marca-tenue p-4">
            <p className="text-sm text-texto-3">{t.titulo}</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{cifra.format(balance[t.clave])}</p>
            <p className="mt-1 text-xs text-texto-3">{t.nota}</p>
          </article>
        ))}
      </section>

      <Panel titulo="Detalle de la carga"
        descripcion={`${cifra.format(balance.DUDOSO)} ${balance.DUDOSO === 1 ? "dudoso" : "dudosos"} y ${cifra.format(balance.SIN_COINCIDENCIA)} sin coincidencia no cuentan en el balance${enRevision ? "; asígnales su profesor para que cuenten" : ""}.`}>
        <div className="flex flex-col gap-4">
          <BarraListado {...contexto} columnas={COLUMNAS_REVISION} errores={errores}
            etiquetaBusqueda="Buscar en la carga" placeholder="Nombre en el listado o del profesor"
            filtros={[
              { clave: "clasificacion", etiqueta: "Clasificación", opciones: Object.entries(ETIQUETA_CLASIFICACION).map(([valor, texto]) => ({ valor, texto })) },
              { clave: "criterio", etiqueta: "Criterio", opciones: CRITERIOS.map((valor) => ({ valor, texto: ETIQUETA_CRITERIO[valor] })) },
            ]} />
          {vista.length === 0 ? (
            <EstadoVacio>
              {hayFiltrosActivos(consulta)
                ? "No hay renglones con esta búsqueda. Prueba con otro texto o limpia los filtros."
                : "Esta carga no tiene renglones ni participantes registrados."}
            </EstadoVacio>
          ) : (
            <table className={claseTabla.tabla}>
              <thead className={claseTabla.encabezado}>
                <tr>
                  <EncabezadoOrdenable {...contexto} columna="listado" className={claseTabla.celdaEncabezado}>En el listado</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="profesor" className={`${claseTabla.celdaEncabezado} hidden sm:table-cell`}>Profesor del directorio</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="criterio" className={`${claseTabla.celdaEncabezado} hidden sm:table-cell`}>Criterio</EncabezadoOrdenable>
                  <EncabezadoOrdenable {...contexto} columna="clasificacion" className={`${claseTabla.celdaEncabezado} hidden sm:table-cell`}>Clasificación</EncabezadoOrdenable>
                  <th className={`${claseTabla.celdaEncabezado} pr-0 text-right`}><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <CuerpoRevision cargaId={carga.id} filas={vista} opciones={opciones} />
            </table>
          )}
          <PaginacionListado {...contexto} paginacion={paginacion} nombre="renglones" />
        </div>
      </Panel>

      <p className="text-xs text-texto-3">
        La confirmación se habilitará cuando se resuelvan D-224 y las reglas de M3 (#24). Mientras tanto, nada de esta pantalla cambia los reconocimientos ni el resultado de los participantes.
      </p>
    </Marco>
  );
}
