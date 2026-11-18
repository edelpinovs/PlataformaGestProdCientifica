import Link from "next/link";
import { EstadoVacio } from "@/components/ui";
import { textoVisitas, type AccesoFrecuente } from "@/modules/cuenta/accesos";

type Tarjeta = Omit<AccesoFrecuente, "conteo"> & { conteo?: number };

// Contenido del panel «Accesos frecuentes»: los módulos más usados y, sin historial, los del rol.
export function AccesosFrecuentes({ accesos, sugeridos }: { accesos: AccesoFrecuente[]; sugeridos: Tarjeta[] }) {
  if (accesos.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <EstadoVacio>Aún no tienes accesos frecuentes. Entra a un módulo y aparecerá aquí.</EstadoVacio>
        {sugeridos.length > 0 && <Lista tarjetas={sugeridos} etiqueta="Módulos disponibles" />}
      </div>
    );
  }
  return <Lista tarjetas={accesos} etiqueta="Accesos frecuentes" />;
}

function Lista({ tarjetas, etiqueta }: { tarjetas: Tarjeta[]; etiqueta: string }) {
  return (
    <ul aria-label={etiqueta} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {tarjetas.map((acceso) => (
        <li key={acceso.slug}>
          <Link href={acceso.href} className="flex h-full flex-col gap-1 rounded-xl bg-marca-tenue p-4 hover:bg-marca-suave">
            <span className="text-sm font-medium">{acceso.nombre}</span>
            <span className="line-clamp-2 text-xs text-texto-3">{acceso.descripcion}</span>
            {acceso.conteo !== undefined && (
              <span className="mt-auto pt-2 text-xs font-medium text-marca">{textoVisitas(acceso.conteo)}</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
