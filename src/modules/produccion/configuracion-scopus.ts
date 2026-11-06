import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";

export const claveScopusEsquema = z.string({ error: "Introduce la clave de Scopus." }).trim()
  .min(1, "Introduce la clave de Scopus.").max(256, "La clave es demasiado larga.")
  .regex(/^[a-zA-Z0-9_-]+$/, "La clave solo admite letras, números, guiones y guiones bajos.");

function leerMaestra(valor: string | undefined) {
  if (!valor || !/^[a-fA-F0-9]{64}$/.test(valor)) throw new Error("La protección de claves no está configurada en el servidor.");
  return Buffer.from(valor, "hex");
}

export function proteccionConfigurada(maestra: string | undefined) {
  return !!maestra && /^[a-fA-F0-9]{64}$/.test(maestra);
}

export function cifrarClaveScopus(clave: string, maestra: string | undefined) {
  const nonce = randomBytes(12);
  const cifrador = createCipheriv("aes-256-gcm", leerMaestra(maestra), nonce);
  cifrador.setAAD(Buffer.from("PGPC:SCOPUS:v1"));
  const contenido = Buffer.concat([cifrador.update(clave, "utf8"), cifrador.final()]);
  return ["v1", nonce.toString("hex"), cifrador.getAuthTag().toString("hex"), contenido.toString("hex")].join(":");
}

export function descifrarClaveScopus(valor: string, maestra: string | undefined) {
  try {
    const [version, nonce, etiqueta, contenido, extra] = valor.split(":");
    if (version !== "v1" || extra !== undefined || !/^[a-f0-9]{24}$/.test(nonce) || !/^[a-f0-9]{32}$/.test(etiqueta)
      || !/^(?:[a-f0-9]{2})+$/.test(contenido)) throw new Error();
    const descifrador = createDecipheriv("aes-256-gcm", leerMaestra(maestra), Buffer.from(nonce, "hex"));
    descifrador.setAAD(Buffer.from("PGPC:SCOPUS:v1"));
    descifrador.setAuthTag(Buffer.from(etiqueta, "hex"));
    return Buffer.concat([descifrador.update(Buffer.from(contenido, "hex")), descifrador.final()]).toString("utf8");
  } catch { throw new Error("No se pudo abrir la configuración de Scopus. Revisa la protección de claves del servidor."); }
}

export function resolverClaveScopus(cifrada: string | undefined, maestra: string | undefined, respaldo: string | undefined) {
  return cifrada === undefined ? respaldo : descifrarClaveScopus(cifrada, maestra);
}

export function mensajeConexionScopus(estado: number, respuestaValida: boolean) {
  if (estado === 200 && respuestaValida) return null;
  if (estado === 401 || estado === 403) return "Scopus rechazó el acceso. Revisa la clave y los permisos de la cuenta.";
  if (estado === 429) return "Se agotó la cuota de Scopus. Inténtalo más tarde.";
  return "No se pudo comprobar la conexión con Scopus. Inténtalo más tarde.";
}
