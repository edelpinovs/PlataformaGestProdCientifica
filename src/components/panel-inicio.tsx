import type { Rol } from "@/lib/auth/roles";
import type { DatosInicio, NivelInicio } from "@/lib/inicio";
import type { Semaforo } from "@/modules/reportes/semaforo";
import { Marco } from "./marco";
import { Aviso, claseTabla, EstadoVacio, EtiquetaEstado, Icono, Panel } from "./ui";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const ETIQUETA_SEMAFORO: Record<Semaforo, string> = {
  VERDE: "Vigente",
  AMARILLO: "Por vencer",
  ROJO: "Vencido",
};

const TIPO_SEMAFORO = { VERDE: "exito", AMARILLO: "aviso", ROJO: "error" } as const satisfies Record<Semaforo, string>;

const numero = new Intl.NumberFormat("es-MX");

export function PanelInicio({
  correo,
  rol,
  datos,
  aviso,
}: {
  correo: string;
  rol: Rol;
  datos: DatosInicio;
  aviso: string | null;
}) {
  const mesActual = new Date().getUTCMonth();

  return (
    <Marco correo={correo} rol={rol} activo="inicio" titulo="Inicio" subtitulo="Bienvenido. Este es el resumen de la plataforma.">
      {aviso && <Aviso tipo="error">{aviso}</Aviso>}

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
          color="var(--grafica)"
          colorActual="var(--marca)"
          className="xl:col-span-2"
        />
        <Grafica
          titulo="Vigencias del año"
          detalle={`SNII y PRODEP que concluyen en ${datos.anio}`}
          valores={datos.vigenciasPorMes}
          mesActual={mesActual}
          color="var(--grafica-2)"
          colorActual="var(--grafica-acento)"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Panel
          titulo="Reconocimientos por vencer"
          descripcion="Los que siguen vigentes, del más próximo al más lejano"
          accion={datos.muestraNombres ? { href: "/reconocimientos", texto: "Ver módulo" } : undefined}
          className="xl:col-span-2"
        >
          {datos.muestraNombres ? <Tabla filas={datos.filas} /> : (
            <EstadoVacio>El detalle de vigencias está disponible para la Coordinación.</EstadoVacio>
          )}
        </Panel>
        <Dona niveles={datos.niveles} total={datos.sniiVigentes} />
      </section>
    </Marco>
  );
}

function Tarjeta({ titulo, valor, nota, icono }: { titulo: string; valor: number; nota: string; icono: string }) {
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
    <article className={`rounded-2xl bg-superficie p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{titulo}</h2>
          <p className="text-xs text-texto-3">{detalle}</p>
        </div>
        <p className="text-sm font-medium text-marca">{numero.format(total)}</p>
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
            <span className="text-[10px] text-texto-3">{MESES[indice]}</span>
          </div>
        ))}
      </div>
      {total === 0 && <p className="mt-3 text-xs text-texto-3">Sin registros en este año.</p>}
    </article>
  );
}

function Tabla({ filas }: { filas: DatosInicio["filas"] }) {
  if (filas.length === 0) return <EstadoVacio>No hay reconocimientos vigentes por mostrar.</EstadoVacio>;

  return (
    <div className="overflow-x-auto">
      <table className={`${claseTabla.tabla} min-w-[36rem]`}>
        <thead className={claseTabla.encabezado}>
          <tr>
            <th className={claseTabla.celdaEncabezado}>Profesor</th>
            <th className={claseTabla.celdaEncabezado}>Programa</th>
            <th className={claseTabla.celdaEncabezado}>Detalle</th>
            <th className={claseTabla.celdaEncabezado}>Vence</th>
            <th className={claseTabla.celdaEncabezado}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila.id} className={claseTabla.fila}>
              <td className={`${claseTabla.celda} font-medium`}>{fila.profesor}</td>
              <td className={`${claseTabla.celda} text-texto-2`}>{fila.programa}</td>
              <td className={`${claseTabla.celda} text-texto-2`}>{fila.detalle}</td>
              <td className={`${claseTabla.celda} text-texto-2`}>{fila.vence}</td>
              <td className={claseTabla.celda}>
                <EtiquetaEstado tipo={TIPO_SEMAFORO[fila.semaforo]}>{ETIQUETA_SEMAFORO[fila.semaforo]}</EtiquetaEstado>
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
    ? "var(--linea)"
    : `conic-gradient(${segmentos.map((s) => `${s.color} ${s.inicio * 100}% ${s.fin * 100}%`).join(", ")})`;

  return (
    <Panel titulo="SNII vigente" descripcion="Distribución por nivel">
      <div className="mx-auto mb-5 grid h-40 w-40 place-items-center rounded-full" style={{ background: gradiente }} role="img" aria-label={`SNII vigente: ${total}`}>
        <div className="grid h-24 w-24 place-items-center rounded-full bg-superficie text-center">
          <span>
            <span className="block text-xl font-semibold">{numero.format(total)}</span>
            <span className="block text-[10px] text-texto-3">vigentes</span>
          </span>
        </div>
      </div>
      {niveles.length === 0 ? (
        <p className="text-center text-xs text-texto-3">Sin reconocimientos SNII en periodo.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {niveles.map((nivel) => (
            <li key={nivel.clave} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-texto-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: nivel.color }} />
                {nivel.etiqueta}
              </span>
              <span className="font-medium">{numero.format(nivel.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
