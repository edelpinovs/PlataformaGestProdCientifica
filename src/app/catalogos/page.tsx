import Link from "next/link";
import { Marco } from "@/components/marco";
import { EtiquetaEstado, Icono } from "@/components/ui";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getModulo } from "@/modules/registry";

// Orden por jerarquía: la división agrupa departamentos; el grado se asigna a profesores.
const CATALOGOS = [
  {
    clave: "divisiones",
    href: "/catalogos/divisiones",
    nombre: "Divisiones académicas",
    descripcion: "Agrupan a los departamentos de la institución.",
    icono: "M4 21V8l8-5 8 5v13M9 21v-6h6v6M3 21h18",
  },
  {
    clave: "departamentos",
    href: "/catalogos/departamentos",
    nombre: "Departamentos",
    descripcion: "Unidades donde se adscriben los profesores.",
    icono: "m12 3 9 5-9 5-9-5zM3 13l9 5 9-5",
  },
  {
    clave: "grados",
    href: "/catalogos/grados",
    nombre: "Grados científicos",
    descripcion: "Grados que se asignan a los profesores.",
    icono: "m2 9 10-5 10 5-10 5zM6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5",
  },
  {
    clave: "areas",
    href: "/catalogos/areas",
    nombre: "Áreas",
    descripcion: "Áreas del conocimiento que agrupan a las subáreas.",
    icono: "M3 6h18M3 12h18M3 18h18",
  },
  {
    clave: "subareas",
    href: "/catalogos/subareas",
    nombre: "Subáreas",
    descripcion: "Subdivisiones de cada área.",
    icono: "M4 6h16M8 12h12M12 18h8",
  },
] as const;

const formatoNumero = new Intl.NumberFormat("es-MX");

export default async function CatalogosPage() {
  const perfil = await requireModulo("catalogos");
  const modulo = getModulo("catalogos");

  const [divisiones, departamentos, grados, areas, subareas] = await Promise.all([
    prisma.division.count(),
    prisma.departamento.count(),
    prisma.gradoCientifico.count(),
    prisma.area.count(),
    prisma.subarea.count(),
  ]);
  const totales: Record<(typeof CATALOGOS)[number]["clave"], number> = { divisiones, departamentos, grados, areas, subareas };

  return (
    <Marco correo={perfil.correo} rol={perfil.rol} activo="catalogos" titulo={modulo.nombre} subtitulo={modulo.descripcion}>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATALOGOS.map((c) => {
          const total = totales[c.clave];
          return (
            <li key={c.clave}>
              <Link href={c.href}
                className="flex h-full flex-col gap-3 rounded-2xl bg-superficie p-5 outline-marca hover:outline-2">
                <span className="flex items-start justify-between gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-marca-suave text-marca">
                    <Icono d={c.icono} />
                  </span>
                  {total === 0 ? (
                    <EtiquetaEstado tipo="aviso">Sin registros</EtiquetaEstado>
                  ) : (
                    <span className="rounded-full bg-marca-suave px-3 py-1 text-xs font-medium text-marca">
                      {formatoNumero.format(total)} {total === 1 ? "registro" : "registros"}
                    </span>
                  )}
                </span>
                <span className="flex flex-col gap-1">
                  <span className="text-base font-semibold">{c.nombre}</span>
                  <span className="text-sm text-texto-3">{c.descripcion}</span>
                </span>
                <span className="mt-auto pt-1 text-sm font-medium text-marca">Ver listado →</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Marco>
  );
}
