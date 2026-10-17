import Link from "next/link";
import { cerrarSesion } from "@/app/login/actions";
import { ETIQUETA_ROL, type Rol } from "@/lib/auth/roles";
import { MODULOS } from "@/modules/registry";
import { Icono } from "./ui";
import { SelectorTema } from "./selector-tema";

// Estructura común de toda pantalla con sesión: menú lateral de módulos, encabezado
// con título y usuario, y zona de contenido. Pauta: docs/diseno/PAUTA_VISUAL.md.
export function Marco({
  correo,
  rol,
  activo,
  titulo,
  subtitulo,
  volver,
  children,
}: {
  correo: string;
  rol: Rol;
  /** Slug del módulo actual, o "inicio". */
  activo: string;
  titulo: string;
  subtitulo?: string;
  /** Enlace a la página padre, encima del título (p. ej. Catálogos en /catalogos/grados). */
  volver?: { href: string; texto: string };
  children: React.ReactNode;
}) {
  const modulos = MODULOS.filter((m) => m.roles.includes(rol));
  const enlaces = [
    { href: "/", slug: "inicio", nombre: "Inicio", icono: ICONO_INICIO },
    ...modulos.map((m) => ({
      href: `/${m.slug}`,
      slug: m.slug,
      nombre: NOMBRE_CORTO[m.slug] ?? m.nombre,
      icono: ICONO_MODULO[m.slug] ?? ICONO_MODULO.catalogos,
    })),
  ];

  return (
    <div className="min-h-screen bg-fondo p-3 text-texto sm:p-4">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1440px] flex-col overflow-hidden rounded-[28px] bg-superficie shadow-marco lg:flex-row">
        <aside className="flex w-full flex-col gap-4 border-linea px-4 py-4 lg:w-60 lg:shrink-0 lg:gap-6 lg:border-r lg:py-5">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3 px-2">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-marca text-sm font-bold text-sobre-marca">P</span>
              <span>
                <span className="block text-sm font-semibold leading-tight">PGPC</span>
                <span className="block text-xs text-texto-3">CUValles</span>
              </span>
            </Link>
            <div className="flex items-center gap-1 lg:hidden">
              <OpcionesCuenta compacto />
            </div>
          </div>

          <nav aria-label="Módulos" className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            <p className="hidden px-3 pb-1 text-[11px] font-medium tracking-wide text-texto-3 uppercase lg:block">Módulos</p>
            {enlaces.map((enlace) => {
              const actual = enlace.slug === activo;
              return (
                <Link
                  key={enlace.slug}
                  href={enlace.href}
                  aria-current={actual ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm whitespace-nowrap lg:gap-3 ${
                    actual ? "bg-marca-suave font-medium text-marca" : "text-texto-2 hover:bg-hover"
                  }`}
                >
                  <Icono d={enlace.icono} />
                  {enlace.nombre}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto hidden flex-col gap-1 border-t border-linea pt-4 lg:flex">
            <OpcionesCuenta />
          </div>
        </aside>

        <div className="min-w-0 flex-1 bg-superficie-alt">
          <header className="flex items-center justify-between gap-4 px-4 py-5 sm:px-6">
            <div className="min-w-0">
              {volver && (
                <Link href={volver.href} className="text-sm text-texto-3 hover:text-marca">← {volver.texto}</Link>
              )}
              <h1 className="text-xl font-semibold tracking-tight">{titulo}</h1>
              {subtitulo && <p className="text-sm text-texto-3">{subtitulo}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="max-w-56 truncate text-sm font-medium">{correo}</p>
                <p className="text-xs text-texto-3">{ETIQUETA_ROL[rol]}</p>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-marca text-sm font-semibold text-sobre-marca" aria-hidden>
                {iniciales(correo)}
              </span>
            </div>
          </header>

          <main className="flex flex-col gap-5 px-4 pb-6 sm:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

function OpcionesCuenta({ compacto = false }: { compacto?: boolean }) {
  const clase = `rounded-xl px-3 py-2 text-left text-sm text-texto-2 hover:bg-hover ${compacto ? "" : "w-full"}`;
  return (
    <>
      <Link href="/cuenta/contrasena" className={clase}>{compacto ? "Contraseña" : "Cambiar contraseña"}</Link>
      <SelectorTema className={clase} />
      <form action={cerrarSesion}>
        <button type="submit" className={clase}>{compacto ? "Salir" : "Cerrar sesión"}</button>
      </form>
    </>
  );
}

function iniciales(correo: string) {
  const local = correo.split("@")[0] ?? "";
  const letras = local.replace(/[^a-zA-Z]/g, "").slice(0, 2);
  return (letras || "PG").toUpperCase();
}

const NOMBRE_CORTO: Record<string, string> = {
  catalogos: "Catálogos",
  profesores: "Profesores",
  reconocimientos: "SNII y PRODEP",
  "cuerpos-academicos": "Cuerpos académicos",
  convocatorias: "Convocatorias",
  produccion: "Producción",
  validacion: "Validación",
  reportes: "Reportes",
};

const ICONO_INICIO = "M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z";

const ICONO_MODULO: Record<string, string> = {
  catalogos: "M4 6h16M4 12h16M4 18h10",
  profesores: "M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  reconocimientos: "M12 3l2.2 4.6L19 8.2l-3.5 3.4.8 4.9L12 14.8 7.7 16.5l.8-4.9L5 8.2l4.8-.6z",
  "cuerpos-academicos": "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6M4 19v-1a4 4 0 0 1 4-4M20 19v-1a4 4 0 0 0-4-4M12 19v-1a3.5 3.5 0 0 0-2.2-3.3",
  convocatorias: "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
  produccion: "M4 19V10M10 19V5M16 19v-7M22 19H2",
  validacion: "M5 12.5 9 16.5 19 6.5",
  reportes: "M5 19V9M10 19V5M15 19v-6M20 19V8",
};
