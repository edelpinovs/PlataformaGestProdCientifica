import { Marco } from "@/components/marco";
import { Panel } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { FormularioProfesor } from "./formulario";

export const metadata = {
  title: "Nuevo profesor — PGPC",
  description: "Registra un nuevo profesor investigador en el directorio de la plataforma.",
};

export default async function NuevoProfesorPage() {
  const perfil = await requireModulo("profesores");

  const [grados, departamentos] = await Promise.all([
    prisma.gradoCientifico.findMany({ orderBy: { nombre: "asc" } }),
    prisma.departamento.findMany({ orderBy: { nombre: "asc" } }),
  ]);

  return (
    <Marco
      correo={perfil.correo}
      rol={perfil.rol}
      activo="profesores"
      titulo="Nuevo profesor"
      volver={{ href: "/profesores", texto: "Directorio de profesores" }}
    >
      <Panel
        titulo="Datos del profesor investigador"
        descripcion="Los campos marcados con * son obligatorios."
      >
        <FormularioProfesor grados={grados} departamentos={departamentos} />
      </Panel>
    </Marco>
  );
}
