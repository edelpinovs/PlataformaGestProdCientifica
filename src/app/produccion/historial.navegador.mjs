import path from "node:path";
import { probarEnChrome } from "./pruebas-navegador.mjs";

for (const vista of ["historial", "continuidad"]) {
  const fixture = `
import React from "react";import {createRoot} from "react-dom/client";
import Pagina from ${JSON.stringify(path.join(process.cwd(),`src/app/produccion/${vista}/page.tsx`))};
(async()=>{window.vista=${JSON.stringify(vista)};
const pagina=await Pagina({searchParams:Promise.resolve(window.vista==="historial"?{pagina:"2",registro:"12"}:{pagina:"2"})});
createRoot(document.getElementById("raiz")).render(<>{pagina}<output id="resultado">EN CURSO</output></>);
setTimeout(async()=>{try{
 if(!document.body.textContent.includes("Mostrando 11–20 de 23"))throw Error("Falta el resumen paginado");
 if(document.querySelectorAll("tbody tr").length!==10)throw Error("La página no tiene diez filas");
 if(window.vista==="historial"){if(!document.body.textContent.includes("Búsqueda #12"))throw Error("Falta el detalle");if(!document.body.textContent.includes("1 de 1 profesor revisado"))throw Error("Avance sin concordancia");if([...document.querySelectorAll("li")].filter(li=>li.textContent.includes("Scopus")).length!==1)throw Error("Scopus debe tener una sola línea en el detalle");if(!document.querySelector("tr[aria-current]"))throw Error("No resalta la búsqueda abierta");if(!document.body.textContent.includes("Publicaciones guardadas en esta búsqueda (2)"))throw Error("Faltan las publicaciones de la búsqueda");if(!document.body.textContent.includes("Nueva")||!document.body.textContent.includes("Ya existía, actualizada"))throw Error("No distingue nuevas de existentes");if(!document.body.textContent.includes("3 obras"))throw Error("Falta el conteo de obras por fuente");if(!document.body.textContent.includes("10 min"))throw Error("Falta la duración");if(![...document.querySelectorAll("button")].some(b=>b.textContent==="Reintentar lo que falló"))throw Error("Falta reintentar una búsqueda con incidencias");if([...document.querySelectorAll("button")].some(b=>b.textContent==="Cancelar búsqueda"))throw Error("No se cancela una búsqueda terminada");}
 if(window.vista==="historial"){
  const dialogo=document.querySelector("dialog");
  if(!dialogo?.open)throw Error("El detalle no se abre en un modal");
  if(!dialogo.textContent.includes("Búsqueda #12"))throw Error("El modal no tiene el detalle");
  const icono=document.getElementById("ver-busqueda-12");
  if(!icono||icono.getAttribute("aria-label")!=="Ver detalle de la búsqueda 12"||!icono.querySelector("svg"))throw Error("Falta el icono con nombre accesible");
  if(document.body.textContent.includes("Ver detalle de"))throw Error("Queda el enlace de texto");
  window.solicitudTecla={key:"Escape"};
  for(let i=0;i<200&&dialogo.open;i++)await new Promise(r=>setTimeout(r,10));
  if(dialogo.open)throw Error("Escape no cierra el modal");
  if(!window.reemplazo||window.reemplazo.includes("registro="))throw Error("Cerrar no vuelve al listado sin el detalle");
  if(!window.reemplazo.includes("pagina=2"))throw Error("Cerrar pierde la página");
  for(let i=0;i<50&&document.activeElement!==icono;i++)await new Promise(r=>setTimeout(r,10));
  if(document.activeElement!==icono)throw Error("El foco no vuelve al icono de la fila");
 }
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
      `export const prisma={profesor:{findUnique:async()=>({apellidos:"Ficticio Prueba",nombres:"Persona",codigo:"DEMO-005"}),findMany:async()=>[]},publicacion:{findMany:async()=>[{id:40,titulo:"Estudio ficticio de prueba sobre agua",tipo:"ARTICULO",fechaPublicacion:new Date("2025-05-01T00:00:00Z"),doi:"10.1000/ficticio-1",creadaEn:new Date("2026-11-25T03:25:00Z")},{id:41,titulo:"Capítulo ficticio previo",tipo:"CAPITULO",fechaPublicacion:null,doi:null,creadaEn:new Date("2026-01-01T00:00:00Z")}]},job:{findFirst:async()=>window.vista==="historial"?{id:12,estado:"FALLIDO",avance:1,total:1,creadoEn:new Date("2026-11-25T03:20:00Z"),actualizadoEn:new Date("2026-11-25T03:30:00Z"),datos:{version:1,profesoresIds:[5],indice:1,desde:"2024-06-19",hasta:"2026-11-24",finalizadoEn:"2026-11-25T03:30:00.000Z",fuentes:["ORCID","SCOPUS","CROSSREF"],resumen:{profesoresProcesados:1,publicacionesEncontradas:3,publicacionesGuardadas:3,autoriasCreadas:1,coautoriasDetectadas:0,errores:["Scopus (Prof. 5): NO_API_KEY"],procedencia:[{publicacionId:40,fuentes:["CROSSREF"]},{publicacionId:41,fuentes:["CROSSREF"]}],consultasFuentes:[{profesorId:5,fuente:"ORCID",estado:"SIN_RESULTADOS",cantidad:0},{profesorId:5,fuente:"OPENALEX",estado:"NO_SELECCIONADA",cantidad:0},{profesorId:5,fuente:"SCOPUS",estado:"INCIDENCIA",cantidad:0},{profesorId:5,fuente:"CROSSREF",estado:"COMPLETADA",cantidad:3},{profesorId:5,fuente:"GOOGLE_SCHOLAR",estado:"NO_SELECCIONADA",cantidad:0}]}}}:null},$queryRaw:async q=>q.text.startsWith("SELECT count")?[{total:23}]:Array.from({length:10},(_,i)=>window.vista==="historial"?{id:i+11,inicio:"09/11/2026 10:00",actualizacion:"09/11/2026 10:12",estado:i===1?"FALLIDO":"COMPLETADO",estadoTexto:i===1?"Con incidencias":"Completado",tipoTexto:"Manual",alcance:"Profesores: 30; novedades",fuentes:"No registradas",avance:12,total:30}:{profesorId:i+11,profesor:"Profesor ficticio "+(i+11)+" · DEMO-"+(i+11),fuente:"ORCID",fuenteTexto:"ORCID",corte:null,corteTexto:"Sin búsqueda previa completada"})}`,
    }));
  } }, { name: "acciones-ficticias", setup(b) {
    b.onResolve({ filter: /^\.\/actions$/ }, args => /control-busqueda\.tsx$/.test(args.importer) ? { path: "acciones", namespace: "acciones" } : undefined);
    b.onLoad({ filter: /.*/, namespace: "acciones" }, () => ({ contents: "export async function cancelarEscaneoAction(){return {}}export async function reintentarEscaneoAction(){return {}}" }));
  } }]);
}
