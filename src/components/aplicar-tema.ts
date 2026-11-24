"use client";

import { guardarTema } from "@/app/cuenta/actions";
import { cookieTema, type Tema } from "@/modules/cuenta/tema";

// Aplica el tema al instante (atributo y cookie, para que no parpadee) y lo guarda en el perfil
// para que siga a la persona a otro navegador (issue 283). Si el guardado falla no se avisa ni se
// revierte: el tema ya cambió en este navegador y se reintenta en el siguiente cambio.
export function aplicarTema(tema: Tema) {
  document.documentElement.setAttribute("data-tema", tema);
  document.cookie = cookieTema(tema);
  void guardarTema(tema).catch(() => {});
}
