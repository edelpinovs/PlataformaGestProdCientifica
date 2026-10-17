import Link from "next/link";
import { Encabezado } from "@/components/encabezado";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { FormularioDivision } from "./formulario";

export default async function DivisionesPage() {
  const perfil = await requireModulo("catalogos");
  const divisiones = await prisma.division.findMany({
    orderBy: { nombre: "asc" },
    include: { _count: { select: { departamentos: true } } },
  });

  return (
    <>
      <Encabezado correo={perfil.correo} rol={perfil.rol} />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
        <div className="flex flex-col gap-1">
          <Link href="/catalogos" className="text-sm text-neutral-500 underline underline-offset-2">Catálogos</Link>
          <h1 className="text-2xl font-semibold">Divisiones académicas</h1>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Registrar división</h2>
          <FormularioDivision />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-medium">En el catálogo ({divisiones.length})</h2>
          {divisiones.length === 0 ? (
            <p className="text-sm text-neutral-500">Aún no hay divisiones registradas.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-800">
                <tr>
                  <th className="py-2 pr-4 font-normal">Nombre</th>
                  <th className="py-2 pr-4 font-normal">Clave</th>
                  <th className="py-2 text-right font-normal">Departamentos</th>
                </tr>
              </thead>
              <tbody>
                {divisiones.map((d) => (
                  <tr key={d.id} className="border-b border-neutral-100 dark:border-neutral-900">
                    <td className="py-2 pr-4">{d.nombre}</td>
                    <td className="py-2 pr-4 font-mono">{d.clave}</td>
                    <td className="py-2 text-right">{d._count.departamentos}</td>
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
