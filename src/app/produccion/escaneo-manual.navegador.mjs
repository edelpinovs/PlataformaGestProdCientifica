import path from "node:path";
import { probarEnChrome } from "./pruebas-navegador.mjs";

await probarEnChrome(`
import React from "react";import {createRoot} from "react-dom/client";
import {FormularioEscaneo} from ${JSON.stringify(path.join(process.cwd(), "src/app/produccion/formulario-escaneo.tsx"))};
import {Panel} from ${JSON.stringify(path.join(process.cwd(), "src/components/ui.tsx"))};
createRoot(document.getElementById("raiz")).render(<main className="min-h-screen bg-fondo p-5 text-texto"><Panel titulo="Búsqueda manual de Coordinación" descripcion="Inicio: 9 nov 2026, 10:00. Zona horaria: America/Mexico_City."><FormularioEscaneo profesores={[{id:1,nombres:"Profesor ficticio",apellidos:"Ejemplo"}]} trabajoPendiente={7}/></Panel><output id="resultado">EN CURSO</output></main>);
const esperar=async c=>{for(let i=0;i<500;i++){if(c())return;await new Promise(r=>setTimeout(r,10));}throw Error("Tiempo agotado")};
const comprobar=(c,m)=>{if(!c)throw Error(m)};
(async()=>{try{
 await esperar(()=>document.querySelector("button"));
 await new Promise(r=>setTimeout(r,3200));
 comprobar(!window.solicitudes,"Abrir la pantalla inició una continuación sin decisión manual");
 comprobar(document.querySelector('button[type="submit"]').textContent==="Continuar búsqueda pendiente","Falta continuación explícita");
 comprobar(document.querySelector("select").disabled,"Permite alterar el profesor del trabajo pendiente");
 document.querySelector("form").requestSubmit();
 await esperar(()=>window.solicitudes?.length===1);
 comprobar(window.solicitudes[0].jobId==="7","No continúa el trabajo original");
 await esperar(()=>document.querySelector('button[type="submit"]').textContent==="Buscar novedades");
 comprobar(!document.querySelector("select").disabled,"No habilitó una nueva búsqueda al terminar");
 document.querySelector("form").requestSubmit();
 await esperar(()=>window.solicitudes?.length===2);
 comprobar(!window.solicitudes[1].jobId,"La nueva búsqueda usa el trabajo anterior");
 comprobar(window.solicitudes[1].profesorId==="todos","Falta el alcance nuevo");
 comprobar(document.documentElement.scrollWidth<=innerWidth,"El formulario desborda el ancho");
 document.getElementById("resultado").textContent="CORRECTO: continuación manual, parámetros conservados y nueva búsqueda independiente";
}catch(e){document.getElementById("resultado").textContent="FALLO: "+e.message}})();
`, "escaneo-manual", [{name:"accion-simulada",setup(b){b.onResolve({filter:/^\.\/actions$/},args=>args.importer.endsWith("formulario-escaneo.tsx")?{path:"accion",namespace:"escaneo"}:undefined);b.onLoad({filter:/.*/,namespace:"escaneo"},()=>({contents:'export async function iniciarEscaneoAction(_,datos){window.solicitudes=(window.solicitudes||[]);window.solicitudes.push(Object.fromEntries(datos));return {jobId:7,pendiente:false,exito:true,mensaje:"Búsqueda ficticia terminada"}}'}));}}]);
