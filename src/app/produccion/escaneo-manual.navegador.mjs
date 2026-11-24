import path from "node:path";
import { probarEnChrome } from "./pruebas-navegador.mjs";

await probarEnChrome(`
import React from "react";import {createRoot} from "react-dom/client";
import {FormularioEscaneo} from ${JSON.stringify(path.join(process.cwd(), "src/app/produccion/formulario-escaneo.tsx"))};
import {Panel} from ${JSON.stringify(path.join(process.cwd(), "src/components/ui.tsx"))};
createRoot(document.getElementById("raiz")).render(<main className="min-h-screen bg-fondo p-5 text-texto"><Panel titulo="Búsqueda manual de Coordinación" descripcion="Inicio: 9 nov 2026, 10:00. Zona horaria: America/Mexico_City."><FormularioEscaneo profesores={[{id:1,codigo:"DEMO-001",nombres:"Profesor ficticio",apellidos:"Ejemplo"}]} trabajoPendiente={7}/></Panel><output id="resultado">EN CURSO</output></main>);
const esperar=async c=>{for(let i=0;i<500;i++){if(c())return;await new Promise(r=>setTimeout(r,10));}throw Error("Tiempo agotado")};
const comprobar=(c,m)=>{if(!c)throw Error(m)};
(async()=>{try{
 await esperar(()=>document.querySelector("button"));
 await new Promise(r=>setTimeout(r,3200));
 comprobar(!window.solicitudes,"Abrir la pantalla inició una continuación sin decisión manual");
 comprobar(document.querySelector('button[type="submit"]').textContent==="Continuar búsqueda pendiente","Falta continuación explícita");
 comprobar(document.querySelector('input[type="checkbox"]').matches(":disabled"),"Permite alterar el profesor del trabajo pendiente");
 document.querySelector("form").requestSubmit();
 await esperar(()=>document.querySelector("progress:not([value])"));
 comprobar(document.querySelector('[role="status"]').textContent==="Iniciando búsqueda…","Falta anunciar el inicio");
 await esperar(()=>window.solicitudes?.length===1);
 comprobar(window.solicitudes[0].jobId==="7","No continúa el trabajo original");
 await esperar(()=>document.querySelector('[role="status"]').textContent.includes("Consultando ORCID"));
 comprobar(document.querySelector("progress").value===1 && document.querySelector("progress").max===2,"El avance no coincide con el trabajo");
 await esperar(()=>document.querySelector('button[type="submit"]').textContent==="Buscar novedades");
 comprobar(window.solicitudes[1].jobId==="7","El avance no se actualizó automáticamente");
 comprobar(document.querySelector('[role="status"]').textContent.includes("2 de 2"),"No muestra el avance final");
 comprobar(document.body.textContent.includes("Escaneo con resultados parciales."),"No muestra el resultado parcial");
 comprobar(!document.querySelector('input[type="checkbox"]').matches(":disabled"),"No habilitó una nueva búsqueda al terminar");
 document.querySelector("form").requestSubmit();
 await esperar(()=>window.solicitudes?.length===3);
 comprobar(!window.solicitudes[2].jobId,"La nueva búsqueda usa el trabajo anterior");
 comprobar(window.solicitudes[2].profesorId==="todos","Falta el alcance nuevo");
 await esperar(()=>document.body.textContent.includes("Escaneo finalizado."));
 comprobar(document.documentElement.scrollWidth<=innerWidth,"El formulario desborda el ancho");
 document.getElementById("resultado").textContent="CORRECTO: inicio, fuente actual, progreso automático, resultado parcial y éxito";
}catch(e){document.getElementById("resultado").textContent="FALLO: "+e.message}})();
`, "escaneo-manual", [{name:"accion-simulada",setup(b){
  b.onResolve({filter:/^\.\/actions$/},args=>args.importer.endsWith("formulario-escaneo.tsx")?{path:"accion",namespace:"escaneo"}:undefined);
  b.onLoad({filter:/.*/,namespace:"escaneo"},()=>({contents:`
    export async function iniciarEscaneoAction(_,datos){
      window.solicitudes=(window.solicitudes||[]);
      window.solicitudes.push(Object.fromEntries(datos));
      await new Promise(resolve=>setTimeout(resolve,250));
      if(window.solicitudes.length===1) return {jobId:7,pendiente:true,avance:1,total:2,fuenteEnCurso:"ORCID"};
      if(window.solicitudes.length===2) return {jobId:7,avance:2,total:2,resultado:{tipo:"aviso",mensaje:"Escaneo con resultados parciales.",incidencias:[]}};
      return {jobId:8,avance:1,total:1,exito:true,resultado:{tipo:"exito",mensaje:"Escaneo finalizado.",incidencias:[]}};
    }
  `}));
}}]);
