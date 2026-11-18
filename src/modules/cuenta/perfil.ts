import { ETIQUETA_ROL, type Rol } from "@/lib/auth/roles";

// Datos de la sección «Perfil» de Mi cuenta (issue #225).

export type EntradaPerfil = {
  correo: string;
  rol: Rol;
  creadoEn: Date;
  profesor: {
    nombres: string;
    apellidos: string;
    departamento: { nombre: string } | null;
  } | null;
};

export type ResumenPerfil = {
  correo: string;
  rol: string;
  alta: string;
  profesor: { nombre: string; departamento: string | null } | null;
};

// La fecha se guarda en UTC; se muestra tal cual para que no dependa de la zona del servidor.
const FORMATO_ALTA = new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeZone: "UTC" });

export function resumenPerfil(perfil: EntradaPerfil): ResumenPerfil {
  return {
    correo: perfil.correo,
    rol: ETIQUETA_ROL[perfil.rol],
    alta: FORMATO_ALTA.format(perfil.creadoEn),
    profesor: perfil.profesor
      ? {
          nombre: `${perfil.profesor.nombres} ${perfil.profesor.apellidos}`,
          departamento: perfil.profesor.departamento?.nombre ?? null,
        }
      : null,
  };
}
