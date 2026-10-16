import Link from "next/link";
import { Encabezado } from "@/components/encabezado";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { FormularioGrado } from "./formulario";

export default async function GradosPage() {
  const perfil = await requireModulo("catalogos");
  const grados = await prisma.gradoCientifico.findMany({ orderBy: { nombre: "asc" } });

  return (
    <>
      <Encabezado correo={perfil.correo} rol={perfil.rol} />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
        <div className="flex flex-col gap-1">
          <Link href="/catalogos" className="text-sm text-neutral-500 underline underline-offset-2">Catálogos</Link>
          <h1 className="text-2xl font-semibold">Grados científicos</h1>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Registrar grado</h2>
          <FormularioGrado />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-medium">En el catálogo ({grados.length})</h2>
          {grados.length === 0 ? (
            <p className="text-sm text-neutral-500">Aún no hay grados registrados.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-800">
                <tr>
                  <th className="py-2 pr-4 font-normal">Nombre</th>
                  <th className="py-2 font-normal">Nomenclatura</th>
                </tr>
              </thead>
              <tbody>
                {grados.map((g) => (
                  <tr key={g.id} className="border-b border-neutral-100 dark:border-neutral-900">
                    <td className="py-2 pr-4">{g.nombre}</td>
                    <td className="py-2 font-mono">{g.nomenclatura}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </>
  );
}
