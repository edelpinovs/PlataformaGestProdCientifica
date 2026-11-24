import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getModulo } from "@/modules/registry";
import type { Rol } from "./roles";

// Perfil del usuario con sesión iniciada, o null si no hay sesión, no tiene perfil o está desactivado.
export async function getPerfil() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const perfil = await prisma.perfil.findUnique({ where: { id: user.id } });
  // Un perfil desactivado desde el panel de administración se trata como sin acceso. Es el único
  // punto por el que pasan requireRol, requireModulo y las pantallas, así que cubre todos los módulos.
  return perfil?.activo ? perfil : null;
}

// Corta la petición si el usuario no tiene alguno de los roles indicados (RNF-005).
export async function requireRol(roles: Rol[]) {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login");
  if (!roles.includes(perfil.rol)) redirect("/?error=sin-permiso");
  return perfil;
}

export async function requireModulo(slug: string) {
  return requireRol(getModulo(slug).roles);
}
