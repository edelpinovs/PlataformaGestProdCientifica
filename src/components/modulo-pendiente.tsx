import { requireModulo } from "@/lib/auth/session";
import { getModulo } from "@/modules/registry";
import { Encabezado } from "./encabezado";

// Página temporal de cada módulo hasta que su integrante la reemplace.
export async function ModuloPendiente({ slug }: { slug: string }) {
  const perfil = await requireModulo(slug);
  const modulo = getModulo(slug);

  return (
    <>
      <Encabezado correo={perfil.correo} rol={perfil.rol} />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-10">
        <p className="font-mono text-xs uppercase tracking-wide text-teal-700">{modulo.requisitos}</p>
        <h1 className="text-2xl font-semibold">{modulo.nombre}</h1>
        <p className="text-neutral-500">{modulo.descripcion}</p>
        <p className="text-sm text-neutral-500">
          En desarrollo por {modulo.integrante}. Liberación prevista: {modulo.liberacion}.
        </p>
      </main>
    </>
  );
}
