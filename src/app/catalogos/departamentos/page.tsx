import Link from "next/link";
import { Encabezado } from "@/components/encabezado";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { FormularioDepartamento } from "./formulario";

export default async function DepartamentosPage() {
  const perfil = await requireModulo("catalogos");
  const [divisiones, departamentos] = await Promise.all([
    prisma.division.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, clave: true } }),
    prisma.departamento.findMany({
      orderBy: [{ division: { nombre: "asc" } }, { nombre: "asc" }],
      include: { division: { select: { nombre: true, clave: true } } },
    }),
  ]);

  return (
    <>
      <Encabezado correo={perfil.correo} rol={perfil.rol} />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
        <div className="flex flex-col gap-1">
          <Link href="/catalogos" className="text-sm text-neutral-500 underline underline-offset-2">Catálogos</Link>
          <h1 className="text-2xl font-semibold">Departamentos</h1>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Registrar departamento</h2>
          {divisiones.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Todo departamento pertenece a una división.{" "}
              <Link href="/catalogos/divisiones" className="underline underline-offset-2">Registra primero una división</Link>.
            </p>
          ) : (
            <FormularioDepartamento divisiones={divisiones} />
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-medium">En el catálogo ({departamentos.length})</h2>
          {departamentos.length === 0 ? (
            <p className="text-sm text-neutral-500">Aún no hay departamentos registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-800">
                  <tr>
                    <th className="py-2 pr-4 font-normal">Nombre</th>
                    <th className="py-2 pr-4 font-normal">Nomenclatura</th>
                    <th className="py-2 font-normal">División</th>
                  </tr>
                </thead>
                <tbody>
                  {departamentos.map((d) => (
                    <tr key={d.id} className="border-b border-neutral-100 dark:border-neutral-900">
                      <td className="py-2 pr-4">{d.nombre}</td>
                      <td className="py-2 pr-4 font-mono">{d.nomenclatura}</td>
                      <td className="py-2">
                        {d.division.nombre} <span className="font-mono text-neutral-500">({d.division.clave})</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
