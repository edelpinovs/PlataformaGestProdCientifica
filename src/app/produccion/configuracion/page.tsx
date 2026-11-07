import { Marco } from "@/components/marco";
import { Aviso, Panel } from "@/components/ui";
import { requireRol } from "@/lib/auth/session";
import { estadoConfiguracionScopus } from "../configuracion-scopus";
import { FormularioConfiguracionScopus } from "./formulario";

export default async function ConfiguracionScopusPage() {
  const perfil = await requireRol(["ADMINISTRADOR"]);
  let estado;
  try { estado = await estadoConfiguracionScopus(); } catch { estado = null; }
  return <Marco correo={perfil.correo} rol={perfil.rol} activo="produccion" titulo="Configuración de Scopus"
    subtitulo="Administra la conexión institucional con Scopus."
    volver={{ href: "/produccion", texto: "Producción científica" }}>
    <Panel titulo="Conexión con Scopus">
      {estado ? <div className="flex flex-col gap-4">
        <p className="text-sm text-texto-2">{estado.configurada ? "Clave configurada" : "Sin clave configurada"} · {estado.origen}</p>
        {estado.actualizadaEn && <p className="text-sm text-texto-3">Última actualización: {new Date(estado.actualizadaEn).toLocaleString("es-MX", { timeZone: "America/Mexico_City" })}</p>}
        <FormularioConfiguracionScopus protegida={estado.protegida} />
      </div> : <Aviso tipo="error">No se pudo consultar la configuración. Inténtalo de nuevo más tarde.</Aviso>}
    </Panel>
  </Marco>;
}
