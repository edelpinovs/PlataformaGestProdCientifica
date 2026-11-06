import Link from "next/link";
import { Marco } from "@/components/marco";
import { Aviso, claseBotonSecundario, EstadoVacio, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { analizarConsulta, CONSULTA_INICIAL, enlaceConsulta, type ErroresConsulta, type ParametrosConsulta } from "@/modules/produccion/consulta";
import { FormularioEscaneo } from "./formulario-escaneo";
import { FiltrosPublicaciones } from "./filtros-publicaciones";
import { consultarPublicaciones } from "./consultas";
import { TablaPublicaciones } from "./tabla-publicaciones";

export const maxDuration = 300;

export default async function ProduccionPage({ searchParams }: { searchParams: Promise<ParametrosConsulta> }) {
  const perfil = await requireModulo("produccion");
  const parametros = await searchParams;
  const analisis = analizarConsulta(parametros);
  const consulta = analisis.success ? analisis.data : { ...CONSULTA_INICIAL };
  const errores: ErroresConsulta = {};
  if (!analisis.success) {
    for (const error of analisis.error.issues) {
      const campo = error.path[0] as keyof typeof consulta;
      errores[campo] ??= error.message;
    }
    // Conserva los campos válidos de una URL manipulada sin ejecutar una
    // consulta diferente de la solicitada cuando cualquier parámetro falla.
    for (const campo of Object.keys(CONSULTA_INICIAL) as (keyof typeof consulta)[]) {
      const individual = analizarConsulta({ [campo]: parametros[campo] });
      if (individual.success) Object.assign(consulta, { [campo]: individual.data[campo] });
    }
  }

  const [profesores, totalPublicaciones, totalPendientes, ultimoJob, resultado] = await Promise.all([
    prisma.profesor.findMany({
      select: { id: true, nombres: true, apellidos: true, codigo: true, estatusLaboral: true },
      orderBy: [{ apellidos: "asc" }, { id: "asc" }],
    }),
    prisma.publicacion.count(),
    prisma.autoria.count({ where: { estado: "PENDIENTE" } }),
    prisma.job.findFirst({ where: { tipo: { in: ["escaneo-manual", "escaneo-diario"] } }, orderBy: { creadoEn: "desc" } }),
    analisis.success ? consultarPublicaciones(consulta) : Promise.resolve(null),
  ]);

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="produccion" titulo="Motor de escaneo"
      subtitulo="Extracción desde ORCID, Scopus y OpenAlex y consulta de publicaciones registradas.">
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
      <Panel titulo="Escanear producción científica (RF-020)" descripcion="Consulta las fuentes externas y vincula la producción de los profesores activos.">
        <FormularioEscaneo profesores={profesores.filter((profesor) => profesor.estatusLaboral === "ACTIVO")}
          trabajoPendiente={ultimoJob && (ultimoJob.estado === "PENDIENTE" || ultimoJob.estado === "EN_PROCESO") ? ultimoJob.id : undefined} />
      </Panel>

      <div id="publicaciones" className="min-w-0 scroll-mt-4">
        <Panel titulo="Consultar publicaciones" descripcion="Combina filtros para consultar las obras registradas. El estado corresponde a la autoría de cada profesor.">
          <div className="flex min-w-0 flex-col gap-4">
            <FiltrosPublicaciones key={JSON.stringify(consulta)} consulta={consulta} profesores={profesores} errores={errores} />
            {!analisis.success && <Aviso tipo="error"><ul>{Object.entries(errores).map(([campo, mensaje]) => <li key={campo}>{mensaje}</li>)}</ul></Aviso>}
            {resultado && <>
              <p role="status" className="text-sm text-texto-3">
                Mostrando {resultado.desde}–{resultado.hasta} de {new Intl.NumberFormat("es-MX").format(resultado.total)} publicaciones.
              </p>
              {resultado.publicaciones.length ? <TablaPublicaciones publicaciones={resultado.publicaciones} /> :
                <EstadoVacio>{totalPublicaciones ? "No hay publicaciones con estos filtros. Prueba a limpiarlos o cambiar la búsqueda." : "Aún no hay publicaciones registradas."}</EstadoVacio>}
              <nav aria-label="Paginación de publicaciones" className="flex flex-wrap items-center justify-between gap-4">
                {resultado.pagina > 1 ? <Link className={claseBotonSecundario} href={enlaceConsulta(consulta, resultado.pagina - 1)}>Anterior</Link> : <span aria-disabled="true" className="text-sm text-texto-3">Anterior</span>}
                <span className="text-sm text-texto-3">Página {resultado.pagina} de {resultado.totalPaginas}</span>
                {resultado.pagina < resultado.totalPaginas ? <Link className={claseBotonSecundario} href={enlaceConsulta(consulta, resultado.pagina + 1)}>Siguiente</Link> : <span aria-disabled="true" className="text-sm text-texto-3">Siguiente</span>}
              </nav>
            </>}
          </div>
        </Panel>
      </div>
    </Marco>
  );
}
