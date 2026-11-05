import Link from "next/link";
import { Marco } from "@/components/marco";
import { claseBoton, EtiquetaEstado, Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";

export default async function ReconocimientosPage() {
  const perfil = await requireModulo("reconocimientos");

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="reconocimientos" titulo="Reconocimientos SNII y PRODEP">
      <Panel titulo="Reconocimiento SNII" descripcion="Registra niveles, vigencias y reconsideraciones de profesores.">
        <Link href="/reconocimientos/snii" className={`${claseBoton} inline-flex`}>
          Abrir registros SNII
        </Link>
      </Panel>
      <Panel titulo="Reconocimiento PRODEP" descripcion="Perfil Deseable: solicitudes, dictámenes y vigencias.">
        <EtiquetaEstado tipo="aviso">Próximamente</EtiquetaEstado>
      </Panel>
    </Marco>
  );
}
