import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getModulo } from "@/modules/registry";
import type { Rol } from "./roles";

// Perfil del usuario con sesión iniciada, o null si no hay sesión o no tiene perfil.
export async function getPerfil() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return prisma.perfil.findUnique({ where: { id: user.id } });
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
