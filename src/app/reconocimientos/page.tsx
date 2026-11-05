import Link from "next/link";
import { Marco } from "@/components/marco";
import { Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";

export default async function ReconocimientosPage() {
  const perfil = await requireModulo("reconocimientos");

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="reconocimientos" titulo="Reconocimientos SNII y PRODEP">
      <Panel titulo="Reconocimiento SNII" descripcion="Registra niveles, vigencias y reconsideraciones de profesores.">
        <Link href="/reconocimientos/snii" className="inline-flex rounded-xl bg-marca px-4 py-2.5 text-sm font-medium text-sobre-marca hover:opacity-90">
          Abrir registros SNII
        </Link>
      </Panel>
    </Marco>
  );
}
