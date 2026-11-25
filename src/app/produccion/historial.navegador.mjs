import path from "node:path";
import { probarEnChrome } from "./pruebas-navegador.mjs";

for (const vista of ["historial", "continuidad"]) {
  const fixture = `
import React from "react";import {createRoot} from "react-dom/client";
import Pagina from ${JSON.stringify(path.join(process.cwd(),`src/app/produccion/${vista}/page.tsx`))};
(async()=>{window.vista=${JSON.stringify(vista)};
const pagina=await Pagina({searchParams:Promise.resolve(window.vista==="historial"?{pagina:"2",registro:"12"}:{pagina:"2"})});
createRoot(document.getElementById("raiz")).render(<>{pagina}<output id="resultado">EN CURSO</output></>);
setTimeout(()=>{try{
 if(!document.body.textContent.includes("Mostrando 11–20 de 23"))throw Error("Falta el resumen paginado");
 if(document.querySelectorAll("tbody tr").length!==10)throw Error("La página no tiene diez filas");
 if(window.vista==="historial"){if(!document.body.textContent.includes("Búsqueda #12"))throw Error("Falta el detalle");if(!document.body.textContent.includes("1 de 1 profesor revisado"))throw Error("Avance sin concordancia");if([...document.querySelectorAll("li")].filter(li=>li.textContent.includes("Scopus")).length!==1)throw Error("Scopus debe tener una sola línea en el detalle");if(!document.querySelector("tr[aria-current]"))throw Error("No resalta la búsqueda abierta");}
 if(document.documentElement.scrollWidth>innerWidth)throw Error("Hay desplazamiento horizontal");
 if(!document.querySelector('nav[aria-label="Paginación"]'))throw Error("Falta navegación entre páginas");
 if(innerWidth<640 && ![...document.querySelectorAll("label")].some(e=>e.textContent.includes("Ordenar por")))throw Error("Falta orden móvil");
 document.getElementById("resultado").textContent="CORRECTO: paginación, búsqueda, filtros, orden y presentación adaptable";
}catch(e){document.getElementById("resultado").textContent="FALLO: "+e.message}},100);})();`;
  await probarEnChrome(fixture, vista, [{ name: "datos-ficticios", setup(b) {
    b.onResolve({ filter: /^@\/(lib\/(prisma|auth\/session)|components\/marco|generated\/prisma\/client)$/ }, args => ({ path: args.path, namespace: "ficticio" }));
    b.onLoad({ filter: /.*/, namespace: "ficticio" }, args => ({ resolveDir: process.cwd(), contents:
      args.path.endsWith("/session") ? 'export const requireModulo=async()=>({rol:"COORDINADOR",correo:"coordinacion@demo.invalid"})' :
      args.path.endsWith("/marco") ? 'import React from "react";export function Marco({titulo,subtitulo,children}){return React.createElement("main",{className:"min-h-screen bg-fondo p-5 text-texto flex flex-col gap-5"},React.createElement("h1",{className:"text-xl font-semibold"},titulo),React.createElement("p",null,subtitulo),children)}' :
      args.path.endsWith("/client") ? 'export const Prisma={sql:(s,...v)=>({text:s.join("?"),values:v}),join:v=>v,raw:t=>({text:t,values:[]}),empty:{}}' :
      `export const prisma={profesor:{findUnique:async()=>({apellidos:"Ficticio Prueba",nombres:"Persona",codigo:"DEMO-005"})},job:{findFirst:async()=>window.vista==="historial"?{id:12,estado:"FALLIDO",avance:1,total:1,creadoEn:new Date("2026-11-25T03:20:00Z"),actualizadoEn:new Date("2026-11-25T03:30:00Z"),datos:{version:1,profesoresIds:[5],indice:1,desde:"2024-06-19",hasta:"2026-11-24",finalizadoEn:"2026-11-25T03:30:00.000Z",fuentes:["ORCID","SCOPUS","CROSSREF"],resumen:{profesoresProcesados:1,publicacionesEncontradas:3,publicacionesGuardadas:3,autoriasCreadas:1,coautoriasDetectadas:0,errores:["Scopus (Prof. 5): NO_API_KEY"],consultasFuentes:[{profesorId:5,fuente:"ORCID",estado:"SIN_RESULTADOS",cantidad:0},{profesorId:5,fuente:"OPENALEX",estado:"NO_SELECCIONADA",cantidad:0},{profesorId:5,fuente:"SCOPUS",estado:"INCIDENCIA",cantidad:0},{profesorId:5,fuente:"CROSSREF",estado:"COMPLETADA",cantidad:3},{profesorId:5,fuente:"GOOGLE_SCHOLAR",estado:"NO_SELECCIONADA",cantidad:0}]}}}:null},$queryRaw:async q=>q.text.startsWith("SELECT count")?[{total:23}]:Array.from({length:10},(_,i)=>window.vista==="historial"?{id:i+11,inicio:"09/11/2026 10:00",actualizacion:"09/11/2026 10:12",estado:i===1?"FALLIDO":"COMPLETADO",estadoTexto:i===1?"Con incidencias":"Completado",tipoTexto:"Manual",alcance:"Profesores: 30; novedades",fuentes:"No registradas",avance:12,total:30}:{profesorId:i+11,profesor:"Profesor ficticio "+(i+11)+" · DEMO-"+(i+11),fuente:"ORCID",fuenteTexto:"ORCID",corte:null,corteTexto:"Sin búsqueda previa completada"})}`,
    }));
  } }]);
}
