import Link from "next/link";
import { cerrarSesion } from "@/app/login/actions";
import { ETIQUETA_ROL, type Rol } from "@/lib/auth/roles";
import type { DatosInicio, NivelInicio } from "@/lib/inicio";
import type { Modulo } from "@/modules/registry";
import type { Semaforo } from "@/modules/reportes/semaforo";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const ETIQUETA_SEMAFORO: Record<Semaforo, string> = {
  VERDE: "Vigente",
  AMARILLO: "Por vencer",
  ROJO: "Vencido",
};

const CLASE_SEMAFORO: Record<Semaforo, string> = {
  VERDE: "bg-emerald-50 text-emerald-800",
  AMARILLO: "bg-amber-50 text-amber-800",
  ROJO: "bg-red-50 text-red-700",
};

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

const numero = new Intl.NumberFormat("es-MX");

export function PanelInicio({
  correo,
  rol,
  modulos,
  datos,
  aviso,
}: {
  correo: string;
  rol: Rol;
  modulos: Modulo[];
  datos: DatosInicio;
  aviso: string | null;
}) {
  const mesActual = new Date().getUTCMonth();

  return (
    <div className="min-h-screen bg-[#EFEAF8] p-3 font-sans text-[#16141F] sm:p-4">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1440px] flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_20px_50px_rgba(68,60,222,0.08)] lg:flex-row">
        <aside className="flex w-full flex-col gap-4 border-[#EEEAF8] px-4 py-4 lg:w-60 lg:shrink-0 lg:gap-6 lg:border-r lg:py-5">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3 px-2">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#443CDE] text-sm font-bold text-white">P</span>
              <span>
                <span className="block text-sm font-semibold leading-tight">PGPC</span>
                <span className="block text-xs text-[#8A86A3]">CUValles</span>
              </span>
            </Link>
            <div className="flex items-center gap-1 lg:hidden">
              <Link href="/cuenta/contrasena" className="rounded-xl px-3 py-2 text-sm text-[#5C5872] hover:bg-[#F6F4FB]">
                Contraseña
              </Link>
              <form action={cerrarSesion}>
                <button type="submit" className="rounded-xl px-3 py-2 text-sm text-[#5C5872] hover:bg-[#F6F4FB]">
                  Salir
                </button>
              </form>
            </div>
          </div>

          <nav aria-label="Módulos" className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            <p className="hidden px-3 pb-1 text-[11px] font-medium tracking-wide text-[#8A86A3] uppercase lg:block">Módulos</p>
            <Link
              href="/"
              aria-current="page"
              className="flex shrink-0 items-center gap-2 rounded-xl bg-[#EEE9FF] px-3 py-2.5 text-sm font-medium whitespace-nowrap text-[#443CDE] lg:gap-3"
            >
              <Icono d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
              Inicio
            </Link>
            {modulos.map((modulo) => (
              <Link
                key={modulo.slug}
                href={`/${modulo.slug}`}
                className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm whitespace-nowrap text-[#5C5872] hover:bg-[#F6F4FB] lg:gap-3"
              >
                <Icono d={ICONO_MODULO[modulo.slug] ?? ICONO_MODULO.catalogos} />
                {NOMBRE_CORTO[modulo.slug] ?? modulo.nombre}
              </Link>
            ))}
          </nav>

          <div className="mt-auto hidden flex-col gap-1 border-t border-[#EEEAF8] pt-4 lg:flex">
            <Link href="/cuenta/contrasena" className="rounded-xl px-3 py-2 text-sm text-[#5C5872] hover:bg-[#F6F4FB]">
              Cambiar contraseña
            </Link>
            <form action={cerrarSesion}>
              <button type="submit" className="w-full rounded-xl px-3 py-2 text-left text-sm text-[#5C5872] hover:bg-[#F6F4FB]">
                Cerrar sesión
              </button>
            </form>
          </div>
        </aside>

        <div className="min-w-0 flex-1 bg-[#F7F5FC]">
          <header className="flex items-center justify-between gap-4 px-4 py-5 sm:px-6">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Inicio</h1>
              <p className="text-sm text-[#8A86A3]">Bienvenido. Este es el resumen de la plataforma.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="max-w-56 truncate text-sm font-medium">{correo}</p>
                <p className="text-xs text-[#8A86A3]">{ETIQUETA_ROL[rol]}</p>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#443CDE] text-sm font-semibold text-white" aria-hidden>
                {iniciales(correo)}
              </span>
            </div>
          </header>

          <main className="flex flex-col gap-5 px-4 pb-6 sm:px-6">
            {aviso && (
              <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{aviso}</p>
            )}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Tarjeta titulo="Profesores" valor={datos.profesores} nota="en el directorio" icono="M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7" />
              <Tarjeta titulo="SNII vigente" valor={datos.sniiVigentes} nota="aprobados en periodo" icono="M12 3l2.2 4.6L19 8.2l-3.5 3.4.8 4.9L12 14.8 7.7 16.5l.8-4.9L5 8.2l4.8-.6z" />
              <Tarjeta titulo="PRODEP activo" valor={datos.prodepActivos} nota="aprobados en periodo" icono="M7 4h10a2 2 0 0 1 2 2v12l-4-2-3 2-3-2-4 2V6a2 2 0 0 1 2-2z" />
              <Tarjeta titulo="Cuerpos académicos" valor={datos.cuerpos} nota="registrados" icono="M4 7h16M4 12h16M4 17h10" />
            </section>

            <section className="grid gap-4 xl:grid-cols-3">
              <Grafica
                titulo="Producción científica"
                detalle={`Publicaciones con fecha en ${datos.anio}`}
                valores={datos.produccionPorMes}
                mesActual={mesActual}
                color="#C4B8F5"
                colorActual="#443CDE"
                className="xl:col-span-2"
              />
              <Grafica
                titulo="Vigencias del año"
                detalle={`SNII y PRODEP que concluyen en ${datos.anio}`}
                valores={datos.vigenciasPorMes}
                mesActual={mesActual}
                color="#DDD6FE"
                colorActual="#7C6BF2"
              />
            </section>

            <section className="grid gap-4 xl:grid-cols-3">
              <div className="rounded-2xl bg-white p-5 xl:col-span-2">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">Reconocimientos por vencer</h2>
                    <p className="text-xs text-[#8A86A3]">Los que siguen vigentes, del más próximo al más lejano</p>
                  </div>
                  {datos.muestraNombres && (
                    <Link href="/reconocimientos" className="text-sm font-medium text-[#443CDE]">Ver módulo</Link>
                  )}
                </div>
                {datos.muestraNombres ? <Tabla filas={datos.filas} /> : (
                  <p className="rounded-xl bg-[#F7F5FC] px-4 py-8 text-center text-sm text-[#6E6A86]">
                    El detalle de vigencias está disponible para la Coordinación.
                  </p>
                )}
              </div>
              <Dona niveles={datos.niveles} total={datos.sniiVigentes} />
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

function Tarjeta({ titulo, valor, nota, icono }: { titulo: string; valor: number; nota: string; icono: string }) {
  return (
    <article className="rounded-2xl bg-[#F3F0FF] p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-[#6E6A86]">{titulo}</p>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#443CDE]">
          <Icono d={icono} />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{numero.format(valor)}</p>
      <p className="mt-1 text-xs text-[#8A86A3]">{nota}</p>
    </article>
  );
}

function Grafica({
  titulo,
  detalle,
  valores,
  mesActual,
  color,
  colorActual,
  className = "",
}: {
  titulo: string;
  detalle: string;
  valores: number[];
  mesActual: number;
  color: string;
  colorActual: string;
  className?: string;
}) {
  const maximo = Math.max(1, ...valores);
  const total = valores.reduce((suma, valor) => suma + valor, 0);

  return (
    <article className={`rounded-2xl bg-white p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{titulo}</h2>
          <p className="text-xs text-[#8A86A3]">{detalle}</p>
        </div>
        <p className="text-sm font-medium text-[#443CDE]">{numero.format(total)}</p>
      </div>
      <div className="flex h-44 items-end gap-1.5 sm:gap-2" role="img" aria-label={`${titulo}. ${detalle}. Total ${total}.`}>
        {valores.map((valor, indice) => (
          <div key={MESES[indice]} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
            <div className="flex h-36 w-full items-end">
              <div
                className="w-full rounded-t-md"
                style={{
                  height: valor === 0 ? "2px" : `${Math.max(8, (valor / maximo) * 100)}%`,
                  background: indice === mesActual ? colorActual : color,
                }}
                title={`${MESES[indice]}: ${valor}`}
              />
            </div>
            <span className="text-[10px] text-[#8A86A3]">{MESES[indice]}</span>
          </div>
        ))}
      </div>
      {total === 0 && <p className="mt-3 text-xs text-[#8A86A3]">Sin registros en este año.</p>}
    </article>
  );
}

function Tabla({ filas }: { filas: DatosInicio["filas"] }) {
  if (filas.length === 0) {
    return (
      <p className="rounded-xl bg-[#F7F5FC] px-4 py-8 text-center text-sm text-[#6E6A86]">
        No hay reconocimientos vigentes por mostrar.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead className="text-xs text-[#8A86A3]">
          <tr className="border-b border-[#F0ECF8]">
            <th className="py-2 pr-3 font-medium">Profesor</th>
            <th className="py-2 pr-3 font-medium">Programa</th>
            <th className="py-2 pr-3 font-medium">Detalle</th>
            <th className="py-2 pr-3 font-medium">Vence</th>
            <th className="py-2 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila.id} className="border-b border-[#F7F5FC] last:border-0">
              <td className="py-3 pr-3 font-medium">{fila.profesor}</td>
              <td className="py-3 pr-3 text-[#5C5872]">{fila.programa}</td>
              <td className="py-3 pr-3 text-[#5C5872]">{fila.detalle}</td>
              <td className="py-3 pr-3 text-[#5C5872]">{fila.vence}</td>
              <td className="py-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${CLASE_SEMAFORO[fila.semaforo]}`}>
                  {ETIQUETA_SEMAFORO[fila.semaforo]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Dona({ niveles, total }: { niveles: NivelInicio[]; total: number }) {
  const segmentos = niveles.reduce<{ inicio: number; fin: number; color: string }[]>((lista, nivel) => {
    const previo = lista.at(-1)?.fin ?? 0;
    const parte = total === 0 ? 0 : nivel.total / total;
    lista.push({ inicio: previo, fin: previo + parte, color: nivel.color });
    return lista;
  }, []);
  const gradiente = segmentos.length === 0
    ? "#E7E4F2"
    : `conic-gradient(${segmentos.map((s) => `${s.color} ${s.inicio * 100}% ${s.fin * 100}%`).join(", ")})`;

  return (
    <article className="rounded-2xl bg-white p-5">
      <h2 className="text-base font-semibold">SNII vigente</h2>
      <p className="text-xs text-[#8A86A3]">Distribución por nivel</p>
      <div className="mx-auto my-5 grid h-40 w-40 place-items-center rounded-full" style={{ background: gradiente }} role="img" aria-label={`SNII vigente: ${total}`}>
        <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center">
          <span>
            <span className="block text-xl font-semibold">{numero.format(total)}</span>
            <span className="block text-[10px] text-[#8A86A3]">vigentes</span>
          </span>
        </div>
      </div>
      {niveles.length === 0 ? (
        <p className="text-center text-xs text-[#8A86A3]">Sin reconocimientos SNII en periodo.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {niveles.map((nivel) => (
            <li key={nivel.clave} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-[#5C5872]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: nivel.color }} />
                {nivel.etiqueta}
              </span>
              <span className="font-medium">{numero.format(nivel.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function Icono({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function iniciales(correo: string) {
  const local = correo.split("@")[0] ?? "";
  const letras = local.replace(/[^a-zA-Z]/g, "").slice(0, 2);
  return (letras || "PG").toUpperCase();
}

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
