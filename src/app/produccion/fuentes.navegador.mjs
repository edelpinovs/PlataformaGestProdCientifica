import path from "node:path";
import { probarEnChrome } from "./pruebas-navegador.mjs";
await probarEnChrome(`
import React from "react";import {createRoot} from "react-dom/client";
import {FormularioEscaneo} from ${JSON.stringify(path.join(process.cwd(),"src/app/produccion/formulario-escaneo.tsx"))};
import {Panel} from ${JSON.stringify(path.join(process.cwd(),"src/components/ui.tsx"))};
createRoot(document.getElementById("raiz")).render(<main className="min-h-screen bg-fondo p-5 text-texto"><Panel titulo="Elegir fuentes de búsqueda"><FormularioEscaneo profesores={[{id:1,codigo:"DEMO-001",nombres:"Persona",apellidos:"Ficticia"}]}/></Panel><output id="resultado">EN CURSO</output></main>);
const esperar=async c=>{for(let i=0;i<500;i++){if(c())return;await new Promise(r=>setTimeout(r,10));}throw Error("Tiempo agotado")};
const comprobar=(c,m)=>{if(!c)throw Error(m)};
(async()=>{try{
 await esperar(()=>document.querySelectorAll('input[name="fuentes"]').length===5);
 comprobar(document.querySelectorAll('input[name="fuentes"]:checked').length===5,"No ofrece las cinco fuentes");
 document.querySelectorAll('input[name="fuentes"]').forEach(c=>c.click());await esperar(()=>document.querySelectorAll('input[name="fuentes"]:checked').length===0);
 document.querySelector("form").requestSubmit();await esperar(()=>document.querySelector('[role="alert"]'));
 comprobar(document.body.textContent.includes("Selecciona al menos una fuente"),"No explica una selección vacía");
 document.querySelector('input[value="ORCID"]').click();await esperar(()=>document.querySelectorAll('input[name="fuentes"]:checked').length===1);
 document.querySelector("form").requestSubmit();await esperar(()=>window.ultimaSeleccion?.length===1);
 comprobar(window.ultimaSeleccion[0]==="ORCID","No envía la fuente elegida");
 [...document.querySelectorAll("button")].find(b=>b.textContent==="Seleccionar todas").click();await esperar(()=>document.querySelectorAll('input[name="fuentes"]:checked').length===5);
 comprobar(document.documentElement.scrollWidth<=innerWidth,"Desbordamiento horizontal");
 document.getElementById("resultado").textContent="CORRECTO: cinco fuentes, selección vacía, una fuente y seleccionar todas";
}catch(e){document.getElementById("resultado").textContent="FALLO: "+e.message}})();
`,"fuentes",[{name:"accion-ficticia",setup(b){b.onResolve({filter:/^\.\/actions$/},args=>args.importer.endsWith("formulario-escaneo.tsx")?{path:"accion",namespace:"seleccion"}:undefined);b.onLoad({filter:/.*/,namespace:"seleccion"},()=>({contents:'export async function iniciarEscaneoAction(_,datos){window.ultimaSeleccion=datos.getAll("fuentes");return window.ultimaSeleccion.length?{exito:true}:{error:"Selecciona al menos una fuente para iniciar la búsqueda.",erroresCampos:{fuentes:"Selecciona al menos una fuente"}}}'}));}}]);
