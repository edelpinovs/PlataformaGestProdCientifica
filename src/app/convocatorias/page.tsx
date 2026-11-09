import Link from "next/link";
import { requireModulo } from "@/lib/auth/session";
import { Marco } from "@/components/marco";
import { Aviso, claseBoton, claseTabla, EstadoVacio, Icono, Panel } from "@/components/ui";
import { getModulo } from "@/modules/registry";
import { prisma } from "@/lib/prisma";
import { nombreDeRuta } from "@/modules/convocatorias/carga";
import { FilaCarga } from "./fila";

const numero = new Intl.NumberFormat("es-MX");

// RF-017: las Server Actions de esta página lanzan la lectura del archivo con after(); un listado
// de ~270 páginas tarda unos segundos y la lectura sigue con el tiempo máximo de la página.
export const maxDuration = 300;

const ICONO_CARGA = "M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-8-4-4m0 0L8 8m4-4v12";
const ICONO_CONVOCATORIA = "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z";
const ICONO_CHECK = "M5 13l4 4L19 7";
const ICONO_RELOJ = "M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0z";

export default async function Page({ searchParams }: PageProps<"/convocatorias">) {
  const perfil = await requireModulo("convocatorias");
  const modulo = getModulo("convocatorias");

  const [cargas, totalCargas, totalConvocatorias, cargasConfirmadas, jobsPendientes] =
    await Promise.all([
      prisma.cargaResultados.findMany({
        include: { convocatoria: true },
        orderBy: { creadaEn: "desc" },
        take: 10,
      }),
      prisma.cargaResultados.count(),
      prisma.convocatoria.count(),
      prisma.cargaResultados.count({ where: { estado: "CONFIRMADA" } }),
      prisma.job.count({ where: { tipo: "carga-resultados", estado: "PENDIENTE" } }),
    ]);

  // Eliminar redirige aquí con el resultado (#59).
  const { eliminado } = await searchParams;

  return (
    <Marco
      correo={perfil.correo}
      rol={perfil.rol}
      activo="convocatorias"
      titulo={modulo.nombre}
      subtitulo={modulo.descripcion}
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tarjeta
          titulo="Archivos cargados"
          valor={totalCargas}
          nota="resultados registrados"
          icono={ICONO_CARGA}
        />
        <Tarjeta
          titulo="Convocatorias"
          valor={totalConvocatorias}
          nota="SNII y PRODEP en BD"
          icono={ICONO_CONVOCATORIA}
        />
        <Tarjeta
          titulo="Confirmadas"
          valor={cargasConfirmadas}
          nota="conciliación aprobada"
          icono={ICONO_CHECK}
        />
        <Tarjeta
          titulo="En proceso"
          valor={jobsPendientes}
          nota="tareas en segundo plano"
          icono={ICONO_RELOJ}
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-2">
          <Panel
            titulo="Carga de resultados oficiales"
            descripcion="Ingesta de archivos oficiales de convocatorias anuales (RF-016)"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm text-texto-2">
                  Sube el documento publicado para SNII o PRODEP para iniciar el procesamiento,
                  extracción y cruce con el profesorado de CUValles.
                </p>
                <div className="flex flex-wrap gap-2 pt-2 text-xs text-texto-3">
                  <span className="flex items-center gap-1.5 rounded-full bg-superficie-alt px-2.5 py-1 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-marca" />
                    PDF y .xlsx
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full bg-superficie-alt px-2.5 py-1 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-marca" />
                    Hasta 50 MB
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full bg-superficie-alt px-2.5 py-1 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-marca" />
                    Procesamiento asíncrono
                  </span>
                </div>
              </div>
              <Link
                href="/convocatorias/carga"
                className={`${claseBoton} shrink-0 text-center whitespace-nowrap`}
              >
                Subir resultados oficiales
              </Link>
            </div>
          </Panel>


          <Panel
            titulo={`Historial de cargas (${numero.format(totalCargas)})`}
            descripcion={totalCargas > cargas.length ? `Se muestran las ${cargas.length} más recientes` : "Archivos oficiales cargados, del más reciente al más antiguo"}
          >
            {typeof eliminado === "string" && (
              <div className="mb-4"><Aviso tipo="exito">Se eliminó la carga «{eliminado}».</Aviso></div>
            )}
            {cargas.length === 0 ? (
              <EstadoVacio>Aún no hay archivos de resultados cargados.</EstadoVacio>
            ) : (
              <table className={claseTabla.tabla}>
                <thead className={claseTabla.encabezado}>
                  <tr>
                    <th className={claseTabla.celdaEncabezado}>Convocatoria</th>
                    <th className={`${claseTabla.celdaEncabezado} hidden sm:table-cell`}>Archivo</th>
                    <th className={`${claseTabla.celdaEncabezado} hidden sm:table-cell`}>Estado</th>
                    <th className={`${claseTabla.celdaEncabezado} hidden sm:table-cell`}>Fecha</th>
                    <th className={`${claseTabla.celdaEncabezado} pr-0 text-right`}>
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cargas.map((c) => (
                    <FilaCarga
                      key={`${c.id}-${c.estado}`}
                      carga={{
                        id: c.id,
                        programa: c.convocatoria.programa,
                        anio: c.convocatoria.anio,
                        nombre: nombreDeRuta(c.archivoRuta),
                        estado: c.estado,
                        fecha: c.creadaEn.toLocaleDateString("es-MX", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }),
                      }}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>

        <aside className="flex min-w-0 flex-col gap-5">
          <Panel titulo="Flujo del módulo" descripcion="Etapas del proceso de ingesta">
            <ol className="flex flex-col gap-3">
              <li className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-marca text-xs font-semibold text-sobre-marca">
                  1
                </span>
                <div>
                  <strong className="block text-texto">Carga oficial (RF-016)</strong>
                  <span className="text-xs text-texto-3">
                    Recepción y validación de PDF o Excel oficial en Storage.
                  </span>
                </div>
              </li>
              <li className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-superficie-alt text-xs font-semibold text-texto-2">
                  2
                </span>
                <div>
                  <strong className="block text-texto">Extracción y cruce (RF-017)</strong>
                  <span className="text-xs text-texto-3">
                    Procesamiento asíncrono y vinculación por CVU o nombre normalizado.
                  </span>
                </div>
              </li>
              <li className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-superficie-alt text-xs font-semibold text-texto-2">
                  3
                </span>
                <div>
                  <strong className="block text-texto">Conciliación (RF-018 / 019)</strong>
                  <span className="text-xs text-texto-3">
                    Revisión previa, balance de cambios y confirmación definitiva.
                  </span>
                </div>
              </li>
            </ol>
          </Panel>

          <Panel titulo="Detalles de M5" descripcion="Responsabilidad y fechas">
            <div className="rounded-xl bg-superficie-alt p-3.5 text-xs text-texto-3 space-y-2">
              <p>
                <strong className="text-texto font-medium">Requisitos:</strong> {modulo.requisitos}
              </p>
              <p>
                <strong className="text-texto font-medium">Liberación:</strong> {modulo.liberacion}
              </p>
              <p>
                <strong className="text-texto font-medium">Responsable:</strong>{" "}
                <span className="text-texto">{modulo.integrante}</span>
              </p>
            </div>
          </Panel>
        </aside>
      </div>
    </Marco>
  );
}

function Tarjeta({
  titulo,
  valor,
  nota,
  icono,
}: {
  titulo: string;
  valor: number;
  nota: string;
  icono: string;
}) {
  return (
    <article className="rounded-2xl bg-marca-tenue p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-texto-3">{titulo}</p>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-superficie text-marca">
          <Icono d={icono} />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{numero.format(valor)}</p>
      <p className="mt-1 text-xs text-texto-3">{nota}</p>
    </article>
  );
}
