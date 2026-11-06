import { Marco } from "@/components/marco";
import { Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { FormularioEscaneo } from "../formulario-escaneo";
import { NavegacionProduccion } from "../navegacion-produccion";
import { obtenerTrabajoPendiente } from "../trabajos";

export const maxDuration = 300;

export default async function EscaneoPage() {
  const perfil = await requireModulo("produccion");
  const [profesores, ultimoJob, pendiente] = await Promise.all([
    prisma.profesor.findMany({ where: { estatusLaboral: "ACTIVO" },
      select: { id: true, nombres: true, apellidos: true }, orderBy: [{ apellidos: "asc" }, { id: "asc" }] }),
    prisma.job.findFirst({ where: { tipo: { in: ["escaneo-manual", "escaneo-diario"] } }, orderBy: { creadoEn: "desc" } }),
    obtenerTrabajoPendiente(),
  ]);
  return <Marco correo={perfil.correo} rol={perfil.rol} activo="produccion" titulo="Escanear producción"
    subtitulo="Extracción desde ORCID, Scopus y OpenAlex con deduplicación y vinculación de autorías."
    volver={{ href: "/produccion", texto: "Producción científica" }}>
    <NavegacionProduccion actual="escaneo" />
    <Panel titulo="Escanear producción científica" descripcion="Elige un profesor activo o inicia el escaneo de todos. El avance se guarda por profesor.">
      <FormularioEscaneo profesores={profesores} trabajoPendiente={pendiente?.id} />
    </Panel>
    <Panel titulo="Último escaneo registrado">
      <p className="text-sm text-texto-2">{ultimoJob ? `${ultimoJob.estado} · ${ultimoJob.avance} de ${ultimoJob.total} profesores revisados` : "Todavía no hay escaneos registrados."}</p>
    </Panel>
  </Marco>;
}
