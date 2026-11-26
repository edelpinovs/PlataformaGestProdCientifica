import Link from "next/link";
import { ControlBusqueda } from "@/app/produccion/control-busqueda";
import { estadoConfiguracionScopus } from "@/app/produccion/configuracion-scopus";
import { TIPOS_ESCANEO } from "@/app/produccion/trabajos";
import { Marco } from "@/components/marco";
import { Aviso, claseBotonSecundario, claseTabla, EstadoVacio, EtiquetaEstado, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  estaSinAvance,
  resumirFuentes,
  resumirTrabajos,
  sinAvanceDesde,
  textoAvance,
  VENTANA_DIAS,
  ventanaDesde,
  type EstadoTrabajo,
} from "@/modules/administracion/escaneo";
import { ESTADOS_HISTORIAL } from "@/modules/produccion/historial";

const numero = new Intl.NumberFormat("es-MX");
const fechaHora = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" });
const fecha = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeZone: "America/Mexico_City" });

const TIPO_ESTADO: Record<EstadoTrabajo, "exito" | "aviso" | "error"> = {
  COMPLETADO: "exito",
  PENDIENTE: "aviso",
  EN_PROCESO: "aviso",
  FALLIDO: "error",
  CANCELADO: "aviso", // issue 279: detenido a petición
};

// Resumen de solo lectura de lo que guarda el motor de escaneo. Iniciar, reintentar y continuar
// siguen en Producción (issue 243); aquí se muestra el estado y se enlaza a esas pantallas.
export default async function EscaneoPage() {
  const perfil = await requireModulo("administracion");

  // Las cifras de las tarjetas las calcula la base (count y groupBy); solo se cargan los cinco más recientes.
  const ahora = new Date();
  const [recientes, enCurso, sinAvance, ventana, cortes, activos, scopus] = await Promise.all([
    prisma.job.findMany({
      where: { tipo: { in: TIPOS_ESCANEO } },
      orderBy: [{ creadoEn: "desc" }, { id: "desc" }],
      take: 5,
      select: { id: true, estado: true, avance: true, total: true, creadoEn: true, actualizadoEn: true },
    }),
    prisma.job.count({ where: { tipo: { in: TIPOS_ESCANEO }, estado: { in: ["PENDIENTE", "EN_PROCESO"] } } }),
    prisma.job.count({
      where: { tipo: { in: TIPOS_ESCANEO }, estado: "EN_PROCESO", actualizadoEn: { lt: sinAvanceDesde(ahora) } },
    }),
    prisma.job.groupBy({
      by: ["estado"],
      where: { tipo: { in: TIPOS_ESCANEO }, creadoEn: { gte: ventanaDesde(ahora) } },
      _count: { _all: true },
    }),
    prisma.corteEscaneo.groupBy({
      by: ["fuente"],
      where: { profesor: { estatusLaboral: "ACTIVO" } },
      _count: { _all: true },
      _max: { ultimaFecha: true },
    }),
    prisma.profesor.count({ where: { estatusLaboral: "ACTIVO" } }),
    // Si la lectura de la clave falla, la página sigue y dice que no se pudo comprobar (como Estado del sistema).
    estadoConfiguracionScopus().catch(() => null),
  ]);

  const resumen = resumirTrabajos({ ultimo: recientes[0] ?? null, enCurso, sinAvance, ventana });
  const fuentes = resumirFuentes(
    cortes.map((c) => ({ fuente: c.fuente, profesores: c._count._all, ultimaFecha: c._max.ultimaFecha })),
    activos,
  );

  const tarjetas = [
    { texto: "Último escaneo", cifra: resumen.ultimo ? ESTADOS_HISTORIAL[resumen.ultimo.estado] : "Ninguno", nota: resumen.ultimo ? fechaHora.format(resumen.ultimo.creadoEn) : "Aún no se ha ejecutado" },
    {
      texto: "En curso",
      cifra: numero.format(resumen.enCurso),
      nota:
        resumen.sinAvance > 0
          ? `Pendientes o en proceso; ${numero.format(resumen.sinAvance)} sin avance`
          : "Pendientes o en proceso",
    },
    { texto: "Completados", cifra: numero.format(resumen.completados), nota: `Últimos ${VENTANA_DIAS} días` },
    { texto: "Con incidencias", cifra: numero.format(resumen.conIncidencias), nota: `Últimos ${VENTANA_DIAS} días` },
  ];

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="administracion" titulo="Control del escaneo"
      subtitulo="Estado de las búsquedas de publicaciones y de lo que falta por buscar."
      volver={{ href: "/administracion", texto: "Administración" }}>
      <section aria-label="Indicadores" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tarjetas.map((t) => (
          <div key={t.texto} className="flex flex-col gap-1 rounded-2xl bg-marca-tenue p-4">
            <span className="text-xs text-texto-3">{t.texto}</span>
            <strong className="text-2xl font-semibold tracking-tight text-texto">{t.cifra}</strong>
            <span className="text-xs text-texto-2">{t.nota}</span>
          </div>
        ))}
      </section>

      <Panel titulo="Por fuente" descripcion={`Profesores activos con una búsqueda registrada. Hay ${numero.format(activos)} profesores activos.`}>
        <table className={claseTabla.tabla}>
          <thead className={claseTabla.encabezado}>
            <tr>
              <th className={claseTabla.celdaEncabezado}>Fuente</th>
              <th className={claseTabla.celdaEncabezado}>Con búsqueda</th>
              <th className={claseTabla.celdaEncabezado}>Sin buscar</th>
              <th className={`${claseTabla.celdaEncabezado} pr-0`}>Última búsqueda</th>
            </tr>
          </thead>
          <tbody>
            {fuentes.map((f) => (
              <tr key={f.fuente} className={claseTabla.fila}>
                <td className={`${claseTabla.celda} text-texto`}>{f.nombre}</td>
                <td className={claseTabla.celda}>{numero.format(f.profesoresConCorte)}</td>
                <td className={claseTabla.celda}>
                  <EtiquetaEstado tipo={f.sinCorte > 0 ? "aviso" : "exito"}>{numero.format(f.sinCorte)}</EtiquetaEstado>
                </td>
                <td className={`${claseTabla.celda} pr-0`}>
                  {f.ultimaFecha ? fecha.format(f.ultimaFecha) : <span className="text-texto-3">Sin búsquedas</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel titulo="Últimos escaneos" descripcion="Los cinco más recientes. El historial completo está en Producción.">
        {recientes.length === 0 ? (
          <EstadoVacio>Aún no se ha ejecutado ningún escaneo.</EstadoVacio>
        ) : (
          <ul className="flex flex-col">
            {recientes.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-linea py-3 text-sm last:border-0">
                <div className="flex flex-col">
                  <span className="text-texto">{fechaHora.format(t.creadoEn)}</span>
                  <span className="text-xs text-texto-3">{textoAvance(t.avance, t.total)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <EtiquetaEstado tipo={TIPO_ESTADO[t.estado]}>{ESTADOS_HISTORIAL[t.estado]}</EtiquetaEstado>
                  {estaSinAvance(t, ahora) && <EtiquetaEstado tipo="error">Sin avance</EtiquetaEstado>}
                  <Link href={`/produccion/historial?registro=${t.id}`} className="font-medium text-marca hover:underline"
                    aria-label={`Ver el escaneo del ${fechaHora.format(t.creadoEn)}`}>
                    Ver
                  </Link>
                </div>
                {/* Cancelar y reintentar son las acciones de Producción (#279): validan el rol y el estado en el servidor. */}
                <div className="basis-full">
                  <ControlBusqueda key={`${t.id}-${t.estado}`} jobId={t.id}
                    cancelar={t.estado === "PENDIENTE" || t.estado === "EN_PROCESO"}
                    reintentar={t.estado === "FALLIDO" || t.estado === "CANCELADO"} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel titulo="Fuentes y acciones">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-texto-2">
            Clave de Scopus:{" "}
            {scopus ? (
              <>
                <strong className="text-texto">{scopus.configurada ? "configurada" : "sin configurar"}</strong>
                {scopus.configurada && ` (origen: ${scopus.origen.toLowerCase()})`}.
              </>
            ) : (
              <strong className="text-texto">no se pudo comprobar ahora.</strong>
            )}
          </p>
          <Aviso tipo="aviso">Administración y Coordinación pueden iniciar, reintentar o continuar un escaneo desde «Escaneo». Desde aquí puedes consultarlo y administrar la clave de Scopus.</Aviso>
          <div className="flex flex-wrap gap-3">
            <Link href="/produccion/escaneo" className={claseBotonSecundario}>Escaneo</Link>
            <Link href="/produccion/historial" className={claseBotonSecundario}>Historial de búsquedas</Link>
            <Link href="/produccion/continuidad" className={claseBotonSecundario}>Continuidad por profesor</Link>
            <Link href="/produccion/configuracion" className={claseBotonSecundario}>Configurar Scopus</Link>
          </div>
        </div>
      </Panel>
    </Marco>
  );
}
