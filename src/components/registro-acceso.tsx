"use client";

import { useEffect } from "react";
import { registrarAcceso } from "@/app/cuenta/actions";
import { debeRegistrar } from "@/modules/cuenta/accesos";

// Avisa al servidor de que la persona entró a un módulo, para «Accesos frecuentes» de Mi cuenta
// (issue 226). No dibuja nada. El navegador recuerda la última visita avisada para no llamar
// en cada página; el servidor aplica la misma ventana, así que esta marca solo ahorra llamadas.
export function RegistroAcceso({ modulo }: { modulo: string }) {
  useEffect(() => {
    const clave = `acceso:${modulo}`;
    let ultima: number | null = null;
    try {
      const guardada = sessionStorage.getItem(clave);
      ultima = guardada === null ? null : Number(guardada);
    } catch {
      // Sin sessionStorage (modo privado, datos bloqueados): se avisa y el servidor decide.
    }

    const ahora = Date.now();
    if (!debeRegistrar(ultima, ahora)) return;
    try {
      sessionStorage.setItem(clave, String(ahora));
    } catch {
      // Igual que arriba.
    }
    registrarAcceso(modulo).catch(() => {
      // Contar visitas es secundario: nunca debe verse como un error.
    });
  }, [modulo]);

  return null;
}
