import { Marco } from "@/components/marco";
import { EstadoVacio, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { analizarConsulta, type ErroresConsulta, type ParametrosConsulta } from "@/modules/produccion/consulta";
import { FiltrosPublicaciones } from "../filtros-publicaciones";
import { consultarPublicaciones } from "../consultas";
import { TablaPublicaciones } from "../tabla-publicaciones";
import { NavegacionProduccion } from "../navegacion-produccion";
import { PaginacionPublicaciones } from "../paginacion-publicaciones";

export default async function PublicacionesPage({ searchParams }: { searchParams: Promise<ParametrosConsulta> }) {
  const perfil = await requireModulo("produccion");
  const parametros = await searchParams;
  const analisis = analizarConsulta(parametros);
  const consulta = analisis.data;
  const errores: ErroresConsulta = {};
  if (!analisis.success) {
    for (const error of analisis.error.issues) errores[error.path[0]] ??= error.message;
  }
  const [profesores, resultado] = await Promise.all([
    prisma.profesor.findMany({ select: { id: true, nombres: true, apellidos: true, codigo: true, estatusLaboral: true },
      orderBy: [{ apellidos: "asc" }, { id: "asc" }] }),
    analisis.success ? consultarPublicaciones(consulta) : Promise.resolve(null),
  ]);
  return <Marco correo={perfil.correo} rol={perfil.rol} activo="produccion" titulo="Publicaciones"
    subtitulo="Consulta las obras registradas y filtra los resultados."
    volver={{ href: "/produccion", texto: "Producción científica" }}>
    <NavegacionProduccion actual="publicaciones" />
    <Panel titulo="Buscar publicaciones">
      <FiltrosPublicaciones key={JSON.stringify(consulta)} consulta={consulta} profesores={profesores} errores={errores} />
    </Panel>
    <div id="publicaciones" className="min-w-0 scroll-mt-4">
      <Panel titulo="Resultados">
        <div className="flex min-w-0 flex-col gap-4">
          {resultado && (resultado.publicaciones.length ? <TablaPublicaciones publicaciones={resultado.publicaciones} consulta={consulta} /> :
            <EstadoVacio>No hay publicaciones con estos filtros. Prueba a limpiarlos o cambiar la búsqueda.</EstadoVacio>)}
          <PaginacionPublicaciones consulta={consulta} resultado={resultado} />
        </div>
      </Panel>
    </div>
  </Marco>;
}
