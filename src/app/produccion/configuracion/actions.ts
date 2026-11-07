"use server";

import { requireRol } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { claveScopusEsquema, proteccionConfigurada } from "@/modules/produccion/configuracion-scopus";
import { comprobarClaveScopus, guardarClaveScopus, obtenerClaveScopus } from "../configuracion-scopus";

export type EstadoConfiguracion = { error?: string; exito?: string };

export async function configurarScopusAction(_: EstadoConfiguracion, datos: FormData): Promise<EstadoConfiguracion> {
  await requireRol(["ADMINISTRADOR"]);
  try {
    const operacion = datos.get("operacion");
    if (operacion === "comprobar-actual") {
      const clave = await obtenerClaveScopus();
      if (!clave) return { error: "Todavía no hay una clave configurada." };
      const error = await comprobarClaveScopus(clave);
      return error ? { error } : { exito: "La conexión con Scopus funciona." };
    }
    if (operacion !== "guardar") return { error: "Selecciona una operación válida." };
    const lectura = claveScopusEsquema.safeParse(datos.get("clave"));
    if (!lectura.success) return { error: lectura.error.issues[0].message };
    if (!proteccionConfigurada(process.env.SCOPUS_CLAVE_MAESTRA)) return { error: "Falta configurar la protección de claves en el servidor." };
    const error = await comprobarClaveScopus(lectura.data);
    if (error) return { error };
    await guardarClaveScopus(lectura.data);
    revalidatePath("/produccion/configuracion");
    return { exito: "Clave guardada. La conexión con Scopus funciona." };
  } catch { return { error: "No se pudo completar la operación. La configuración anterior se conserva si no se guardó el cambio." }; }
}
