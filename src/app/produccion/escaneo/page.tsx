import { Marco } from "@/components/marco";
import { Aviso, Panel } from "@/components/ui";
import { datosLoteEsquema } from "@/modules/produccion/lotes";
import { fechaEscaneo, ZONA_FECHAS_ESCANEO } from "@/modules/produccion/fechas-escaneo";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { FormularioEscaneo } from "../formulario-escaneo";
import { NavegacionProduccion } from "../navegacion-produccion";
import { obtenerTrabajoPendiente } from "../trabajos";
import { presentarResultadoEscaneo } from "@/modules/produccion/resultado-escaneo";
import { ResultadoEscaneo } from "../resultado-escaneo";
import Link from "next/link";
import { demoHabilitada } from "@/modules/produccion/demostracion";
import { claseBotonSecundario } from "@/components/ui";

export const maxDuration = 300;

export default async function EscaneoPage() {
  const perfil = await requireModulo("produccion");
  const [profesores, ultimoJob, pendiente] = await Promise.all([
    prisma.profesor.findMany({ where: { estatusLaboral: "ACTIVO" },
      select: { id: true, nombres: true, apellidos: true }, orderBy: [{ apellidos: "asc" }, { id: "asc" }] }),
    prisma.job.findFirst({ where: { tipo: { in: ["escaneo-manual", "escaneo-diario"] } }, orderBy: { creadoEn: "desc" } }),
    obtenerTrabajoPendiente(),
  ]);
  const datosPendientes = datosLoteEsquema.safeParse(pendiente?.datos);
  return <Marco correo={perfil.correo} rol={perfil.rol} activo="produccion" titulo="Escanear producción"
    subtitulo="Consulta una, varias o todas las fuentes: ORCID, OpenAlex, Scopus, Crossref y Google Scholar."
    volver={{ href: "/produccion", texto: "Producción científica" }}>
    <NavegacionProduccion actual="escaneo" />
    <Panel titulo="Antes de volver a buscar" descripcion="Consulta el avance guardado y el periodo que se volverá a revisar por indexaciones tardías.">
      <div className="flex flex-wrap gap-4"><Link href="/produccion/historial" className={claseBotonSecundario}>Consultar historial de búsquedas</Link><Link href="/produccion/continuidad" className={claseBotonSecundario}>Ver punto de continuación por profesor y fuente</Link></div>
    </Panel>
    {demoHabilitada(process.env.NODE_ENV, process.env.PRODUCCION_DEMO) && <Panel titulo="Prueba con datos ficticios">
      <Link href="/produccion/demostracion" className={claseBotonSecundario}>Abrir demostración sin base de datos</Link>
    </Panel>}
    <Panel titulo="Escanear producción científica" descripcion="Elige un profesor activo o inicia el escaneo de todos. El avance se guarda por profesor.">
      {perfil.rol === "COORDINADOR" ? <FormularioEscaneo profesores={profesores} trabajoPendiente={pendiente?.id} fuentesTrabajo={datosPendientes.data?.fuentes} profesorTrabajo={datosPendientes.data?.profesoresIds.length === 1 ? String(datosPendientes.data.profesoresIds[0]) : "todos"} anioTrabajo={datosPendientes.data?.anio} /> : <Aviso tipo="aviso">Solo Coordinación puede iniciar, reintentar o continuar búsquedas. Puedes consultar los resultados registrados.</Aviso>}
    </Panel>
    <Panel titulo="Último escaneo registrado">
      {ultimoJob && <ResultadoEscaneo resultado={presentarResultadoEscaneo(ultimoJob.estado, ultimoJob.datos)} />}
      {ultimoJob && <div className="flex flex-col gap-4 text-sm text-texto-3">
        <p>Inicio: {fechaEscaneo(ultimoJob.creadoEn)}.</p>
        <p>Última actualización de avance: {fechaEscaneo(ultimoJob.actualizadoEn)}. Zona horaria: {ZONA_FECHAS_ESCANEO}.</p>
      </div>}
      <p className="text-sm text-texto-2">{ultimoJob ? `${ultimoJob.avance} de ${ultimoJob.total} profesores revisados` : "Todavía no hay escaneos registrados."}</p>
    </Panel>
  </Marco>;
}
