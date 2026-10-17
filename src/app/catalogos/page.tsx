import Link from "next/link";
import { Marco } from "@/components/marco";
import { requireModulo } from "@/lib/auth/session";
import { getModulo } from "@/modules/registry";

const CATALOGOS = [
  { href: "/catalogos/grados", nombre: "Grados científicos", requisito: "RF-001" },
  { href: "/catalogos/divisiones", nombre: "Divisiones académicas", requisito: "RF-002" },
  { href: "/catalogos/departamentos", nombre: "Departamentos", requisito: "RF-003" },
];

export default async function CatalogosPage() {
  const perfil = await requireModulo("catalogos");
  const modulo = getModulo("catalogos");

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="catalogos" titulo={modulo.nombre} subtitulo={modulo.descripcion}>
      <ul className="grid gap-4 sm:grid-cols-3">
        {CATALOGOS.map((c) => (
          <li key={c.requisito}>
            <Link href={c.href}
              className="flex h-full flex-col gap-1 rounded-2xl bg-superficie p-5 outline-marca hover:outline-2">
              <span className="font-mono text-xs text-marca">{c.requisito}</span>
              <span className="font-medium">{c.nombre}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Marco>
  );
}
