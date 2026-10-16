import { redirect } from "next/navigation";
import { PanelInicio } from "@/components/panel-inicio";
import { getPerfil } from "@/lib/auth/session";
import { cargarInicio } from "@/lib/inicio";
import { MODULOS } from "@/modules/registry";

export default async function Inicio({ searchParams }: PageProps<"/">) {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login");

  const { error } = await searchParams;
  const modulos = MODULOS.filter((m) => m.roles.includes(perfil.rol));
  const datos = await cargarInicio(perfil.rol);

  return (
    <PanelInicio
      correo={perfil.correo}
      rol={perfil.rol}
      modulos={modulos}
      datos={datos}
      aviso={error === "sin-permiso" ? "Tu rol no tiene acceso a ese módulo." : null}
    />
  );
}
