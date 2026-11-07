import Link from "next/link";
import { redirect } from "next/navigation";
import { Marco } from "@/components/marco";
import { claseBoton, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { redireccionConsultaAnterior, type ParametrosConsulta } from "@/modules/produccion/consulta";
import { NavegacionProduccion } from "./navegacion-produccion";

export default async function ProduccionPage({ searchParams }: { searchParams: Promise<ParametrosConsulta> }) {
  const perfil = await requireModulo("produccion");
  const destino = redireccionConsultaAnterior(await searchParams);
  if (destino) redirect(destino);
  const [totalPublicaciones, totalPendientes, ultimoJob] = await Promise.all([
    prisma.publicacion.count(),
    prisma.autoria.count({ where: { estado: "PENDIENTE" } }),
    prisma.job.findFirst({ where: { tipo: { in: ["escaneo-manual", "escaneo-diario"] } }, orderBy: { creadoEn: "desc" } }),
  ]);
  return <Marco correo={perfil.correo} rol={perfil.rol} activo="produccion" titulo="Producción científica"
    subtitulo="Resumen de publicaciones y acceso al escaneo y a la consulta.">
    <NavegacionProduccion actual="resumen" />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-2xl bg-marca-tenue p-4">
        <p className="text-xs text-texto-3">Total de publicaciones</p>
        <p className="text-2xl font-semibold tracking-tight text-texto">{new Intl.NumberFormat("es-MX").format(totalPublicaciones)}</p>
      </div>
      <div className="rounded-2xl bg-marca-tenue p-4">
        <p className="text-xs text-texto-3">Autorías pendientes de validar</p>
        <p className="text-2xl font-semibold tracking-tight text-texto">{new Intl.NumberFormat("es-MX").format(totalPendientes)}</p>
      </div>
      <div className="rounded-2xl bg-marca-tenue p-4">
        <p className="text-xs text-texto-3">Último escaneo registrado</p>
        <p className="text-sm font-medium text-texto">{ultimoJob ? `${ultimoJob.estado} (${ultimoJob.avance}/${ultimoJob.total})` : "Sin escaneos previos"}</p>
      </div>
    </div>
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <Panel titulo="Publicaciones" descripcion="Busca las obras registradas, aplica filtros y ordénalas por cualquier columna. Se muestran 10 por página.">
        <Link className={`${claseBoton} inline-block`} href="/produccion/publicaciones">Consultar publicaciones</Link>
      </Panel>
      <Panel titulo="Escaneo de producción" descripcion="Consulta ORCID, Scopus y OpenAlex para los profesores activos y revisa el avance.">
        <Link className={`${claseBoton} inline-block`} href="/produccion/escaneo">Ir al escaneo</Link>
      </Panel>
    </div>
    {perfil.rol === "ADMINISTRADOR" && <Panel titulo="Configuración de Scopus">
      <Link className={`${claseBoton} inline-block`} href="/produccion/configuracion">Administrar conexión</Link>
    </Panel>}
  </Marco>;
}
