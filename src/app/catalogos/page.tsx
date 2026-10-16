import Link from "next/link";
import { Encabezado } from "@/components/encabezado";
import { requireModulo } from "@/lib/auth/session";
import { getModulo } from "@/modules/registry";

const CATALOGOS = [
  { href: "/catalogos/grados", nombre: "Grados científicos", requisito: "RF-001" },
  { href: null, nombre: "Divisiones académicas", requisito: "RF-002" },
  { href: null, nombre: "Departamentos", requisito: "RF-003" },
];

export default async function CatalogosPage() {
  const perfil = await requireModulo("catalogos");
  const modulo = getModulo("catalogos");

  return (
    <>
      <Encabezado correo={perfil.correo} rol={perfil.rol} />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{modulo.nombre}</h1>
          <p className="text-neutral-500">{modulo.descripcion}</p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-3">
          {CATALOGOS.map((c) => (
            <li key={c.requisito}>
              {c.href ? (
                <Link href={c.href}
                  className="flex h-full flex-col gap-1 rounded border border-neutral-200 p-4 hover:border-teal-700 dark:border-neutral-800">
                  <span className="font-mono text-xs text-teal-700">{c.requisito}</span>
                  <span className="font-medium">{c.nombre}</span>
                </Link>
              ) : (
                <div className="flex h-full flex-col gap-1 rounded border border-dashed border-neutral-200 p-4 text-neutral-400 dark:border-neutral-800">
                  <span className="font-mono text-xs">{c.requisito}</span>
                  <span className="font-medium">{c.nombre}</span>
                  <span className="text-xs">En desarrollo</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
