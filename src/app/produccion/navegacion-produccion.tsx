import Link from "next/link";
import { claseBotonSecundario } from "@/components/ui";

const PANTALLAS = [
  { href: "/produccion", texto: "Resumen", clave: "resumen" },
  { href: "/produccion/escaneo", texto: "Escanear", clave: "escaneo" },
  { href: "/produccion/publicaciones", texto: "Publicaciones", clave: "publicaciones" },
  { href: "/produccion/historial", texto: "Historial", clave: "historial" },
] as const;

export function NavegacionProduccion({ actual }: { actual: typeof PANTALLAS[number]["clave"] }) {
  return <nav aria-label="Pantallas de producción" className="flex flex-wrap gap-4">
    {PANTALLAS.map((pantalla) => <Link key={pantalla.clave} href={pantalla.href}
      aria-current={pantalla.clave === actual ? "page" : undefined}
      className={pantalla.clave === actual ? "rounded-xl bg-marca-suave px-4 py-2.5 text-sm font-semibold text-marca" : claseBotonSecundario}>
      {pantalla.texto}
    </Link>)}
  </nav>;
}
