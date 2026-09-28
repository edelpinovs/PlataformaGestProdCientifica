import Link from "next/link";
import { redirect } from "next/navigation";
import { Encabezado } from "@/components/encabezado";
import { getPerfil } from "@/lib/auth/session";
import { MODULOS } from "@/modules/registry";

export default async function Inicio({ searchParams }: PageProps<"/">) {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login");

  const { error } = await searchParams;
  const modulos = MODULOS.filter((m) => m.roles.includes(perfil.rol));

  return (
    <>
      <Encabezado correo={perfil.correo} rol={perfil.rol} />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
        <h1 className="text-2xl font-semibold">Módulos</h1>
        {error === "sin-permiso" && (
          <p role="alert" className="text-sm text-red-600">Tu rol no tiene acceso a ese módulo.</p>
        )}
        <ul className="grid gap-4 sm:grid-cols-2">
          {modulos.map((m) => (
            <li key={m.slug}>
              <Link href={`/${m.slug}`}
                className="flex h-full flex-col gap-1 rounded border border-neutral-200 p-4 hover:border-teal-700 dark:border-neutral-800">
                <span className="font-mono text-xs text-teal-700">{m.requisitos}</span>
                <span className="font-medium">{m.nombre}</span>
                <span className="text-sm text-neutral-500">{m.descripcion}</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
