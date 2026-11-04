import { requireModulo } from "@/lib/auth/session";
import { Marco } from "@/components/marco";
import FormCarga from "./FormCarga";

export default async function Page() {
  const perfil = await requireModulo("convocatorias");

  return (
    <Marco
      correo={perfil.correo}
      rol={perfil.rol}
      activo="convocatorias"
      titulo="Cargar archivo oficial de resultados"
      subtitulo="Sube el documento oficial (PDF o Excel) de resultados para SNII o PRODEP."
      volver={{ href: "/convocatorias", texto: "Convocatorias" }}
    >
      <FormCarga />
    </Marco>
  );
}

