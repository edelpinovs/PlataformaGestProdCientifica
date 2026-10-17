import Link from "next/link";

// Piezas de interfaz de la pauta visual (docs/diseno/PAUTA_VISUAL.md).
// Úsalas antes de escribir clases nuevas; si falta una, agrégala aquí.

/** Botón principal: una acción por formulario. */
export const claseBoton =
  "rounded-xl bg-marca px-4 py-2.5 text-sm font-medium text-sobre-marca hover:opacity-90 disabled:opacity-60";

/** Botón secundario o acción menor. */
export const claseBotonSecundario =
  "rounded-xl px-4 py-2.5 text-sm font-medium text-texto-2 hover:bg-hover disabled:opacity-60";

/** Campo de texto; con `conError` se marca en rojo. Acompáñalo de aria-invalid. */
export function claseCampo(conError = false) {
  return `rounded-xl border bg-superficie px-3 py-2.5 text-sm text-texto placeholder:text-texto-3 focus:outline-2 focus:outline-marca ${
    conError ? "border-peligro" : "border-linea"
  }`;
}

/** Etiqueta encima de un campo; el campo va dentro del <label>. */
export const claseEtiqueta = "flex flex-col gap-1.5 text-sm font-medium text-texto-2";

/** Clases de tabla: <table className={claseTabla.tabla}>… */
export const claseTabla = {
  tabla: "w-full text-left text-sm",
  encabezado: "border-b border-linea text-xs text-texto-3",
  celdaEncabezado: "py-2 pr-3 font-medium",
  fila: "border-b border-linea last:border-0",
  celda: "py-3 pr-3",
};

/** Bloque blanco con título, descripción y una acción opcional a la derecha. */
export function Panel({
  titulo,
  descripcion,
  accion,
  className = "",
  children,
}: {
  titulo?: string;
  descripcion?: string;
  accion?: { href: string; texto: string };
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl bg-superficie p-5 ${className}`}>
      {(titulo || accion) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {titulo && <h2 className="text-base font-semibold">{titulo}</h2>}
            {descripcion && <p className="text-xs text-texto-3">{descripcion}</p>}
          </div>
          {accion && (
            <Link href={accion.href} className="text-sm font-medium text-marca">{accion.texto}</Link>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

/** Mensaje centrado cuando una lista o tabla no tiene datos. */
export function EstadoVacio({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl bg-superficie-alt px-4 py-8 text-center text-sm text-texto-3">{children}</p>
  );
}

const CLASE_AVISO = {
  error: "bg-peligro-suave text-peligro",
  exito: "bg-exito-suave text-exito",
  aviso: "bg-aviso-suave text-aviso",
};

/** Mensaje de resultado. Los errores se anuncian a lectores de pantalla. */
export function Aviso({ tipo, children }: { tipo: keyof typeof CLASE_AVISO; children: React.ReactNode }) {
  return (
    <p role={tipo === "error" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-sm ${CLASE_AVISO[tipo]}`}>
      {children}
    </p>
  );
}

/** Etiqueta pequeña de estado (semáforo): vigente, por vencer, vencido. */
export function EtiquetaEstado({ tipo, children }: { tipo: keyof typeof CLASE_AVISO; children: React.ReactNode }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${CLASE_AVISO[tipo]}`}>{children}</span>
  );
}

/** Icono de trazo de 16 px; `d` es el trazado SVG en una caja de 24×24. */
export function Icono({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
