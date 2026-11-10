import path from "node:path";
import { probarEnChrome } from "./pruebas-navegador.mjs";

const importar = archivo => JSON.stringify(path.join(process.cwd(), archivo));
const herramientas = `
const esperar=async c=>{for(let i=0;i<500;i++){if(c())return;await new Promise(r=>setTimeout(r,10));}throw Error("Tiempo agotado")};
const comprobar=(c,m)=>{if(!c)throw Error(m)};
const teclear=async key=>{window.solicitudTecla={key};await esperar(()=>!window.solicitudTecla)};
const escribir=async texto=>{const campo=document.querySelector('[role="combobox"]');campo.focus();campo.select();window.solicitudTecla={texto};await esperar(()=>!window.solicitudTecla)};
const opciones=[{id:1,nombres:"Ámbar",apellidos:"Ejemplo Norte",codigo:"DEMO-001",estatusLaboral:"ACTIVO"},{id:2,nombres:"Bruno",apellidos:"Ejemplo Sur",codigo:"DEMO-002",estatusLaboral:"ACTIVO"},{id:3,nombres:"Celia",apellidos:"Ejemplo Este",codigo:"DEMO-003",estatusLaboral:"BAJA"}];
`;

await probarEnChrome(`
import React,{useState} from "react";import {createRoot} from "react-dom/client";
import {FormularioEscaneo} from ${importar("src/app/produccion/formulario-escaneo.tsx")};
import {Panel,claseBotonSecundario} from ${importar("src/components/ui.tsx")};
${herramientas}
function Ejemplo(){const [pendiente,cambiar]=useState(false);return <main className="min-h-screen bg-fondo p-5 text-texto"><Panel titulo="Escanear producción científica"><FormularioEscaneo key={String(pendiente)} profesores={opciones.filter(p=>p.estatusLaboral==="ACTIVO")} trabajoPendiente={pendiente?7:undefined} profesorTrabajo={pendiente?"2":undefined} anioTrabajo={pendiente?2025:undefined}/><button type="button" className={claseBotonSecundario} onClick={()=>cambiar(true)}>Ver trabajo pendiente ficticio</button></Panel><output id="resultado">EN CURSO</output></main>}
createRoot(document.getElementById("raiz")).render(<Ejemplo/>);
(async()=>{try{
 await esperar(()=>document.querySelector('input[name="profesorId"]'));
 comprobar(document.querySelector('input[name="profesorId"]').value==="todos","No conserva el alcance de todos los activos");
 document.querySelector('input[type="checkbox"]:not([name])').click();await esperar(()=>document.querySelector('[role="combobox"]'));
 await escribir("ambar norte");await esperar(()=>document.querySelectorAll('[role="option"]').length===1);await teclear("ArrowDown");await teclear("Enter");
 await esperar(()=>document.querySelector('input[name="profesorId"]').value==="1");
 document.querySelector("form").requestSubmit();await esperar(()=>window.solicitudes?.length===1 && document.querySelector('[role="alert"]'));
 comprobar(window.solicitudes[0].profesorId==="1","No envía el identificador elegido");
 comprobar(document.querySelector('input[name="profesorId"]').value==="1","Una respuesta del servidor borró la selección");
 await escribir("sin coincidencias");await esperar(()=>document.body.textContent.includes("No se encontraron profesores"));
 comprobar(document.querySelector('input[name="profesorId"]').value==="1","Buscar borró la selección");await teclear("Escape");
 document.querySelector('[aria-label="Quitar profesor seleccionado"]').click();await esperar(()=>document.querySelector('input[name="profesorId"]').value==="");
 document.querySelector("form").requestSubmit();await esperar(()=>document.querySelector('[role="combobox"]').getAttribute("aria-invalid")==="true");
 comprobar(window.solicitudes.length===1,"Envió una selección individual vacía como todos");
 await escribir("DEMO-002");await esperar(()=>document.querySelectorAll('[role="option"]').length===1);await teclear("Enter");
 document.querySelector("form").requestSubmit();await esperar(()=>window.solicitudes.length===2);
 comprobar(window.solicitudes[1].profesorId==="2","No envió la segunda selección");
 [...document.querySelectorAll("button")].find(b=>b.textContent==="Ver trabajo pendiente ficticio").click();
 await esperar(()=>document.querySelector('[role="combobox"]')?.disabled);
 comprobar(document.querySelector('input[type="checkbox"]:not([name])').matches(":disabled"),"Permite cambiar el alcance pendiente");
 comprobar(document.body.textContent.includes("DEMO-002"),"No muestra el profesor original del trabajo");
 comprobar(!window.solicitudes.some(s=>s.jobId),"Abrir el trabajo lo continuó automáticamente");
 comprobar(document.documentElement.scrollWidth<=innerWidth,"Desbordamiento horizontal");
 document.getElementById("resultado").textContent="CORRECTO: búsqueda, teclado, validación, selección conservada y trabajo pendiente bloqueado";
}catch(e){document.getElementById("resultado").textContent="FALLO: "+e.message}})();
`, "selector-escaneo", [{name:"accion-ficticia",setup(b){b.onResolve({filter:/^\.\/actions$/},args=>args.importer.endsWith("formulario-escaneo.tsx")?{path:"accion",namespace:"seleccion"}:undefined);b.onLoad({filter:/.*/,namespace:"seleccion"},()=>({contents:'export async function iniciarEscaneoAction(_,datos){window.solicitudes=window.solicitudes||[];window.solicitudes.push(Object.fromEntries(datos));return window.solicitudes.length===1?{error:"Revisa el año de la búsqueda.",erroresCampos:{anio:"Indica un año válido."}}:{exito:true}}'}));}}]);

await probarEnChrome(`
import React from "react";import {createRoot} from "react-dom/client";
import {FiltrosPublicaciones} from ${importar("src/app/produccion/filtros-publicaciones.tsx")};
import {Panel} from ${importar("src/components/ui.tsx")};
${herramientas}
const consulta={pagina:3,q:"agua",orden:"revista",dir:"desc",filtros:{profesor:"1",anio:"2025",tipo:"ARTICULO",fuente:"ORCID",estado:"VALIDADA"}};
createRoot(document.getElementById("raiz")).render(<main className="min-h-screen bg-fondo p-5 text-texto"><Panel titulo="Buscar publicaciones"><FiltrosPublicaciones consulta={consulta} profesores={opciones} errores={{}}/></Panel><output id="resultado">EN CURSO</output></main>);
document.addEventListener("submit",e=>{e.preventDefault();window.filtrosEnviados=Object.fromEntries(new FormData(e.target))});
(async()=>{try{
 await esperar(()=>document.querySelector("details"));document.querySelector("details").open=true;
 comprobar(document.querySelector('input[name="profesor"]').value==="1","No restaura el profesor de la URL");
 await escribir("DEMO-003");await esperar(()=>document.querySelectorAll('[role="option"]').length===1);await teclear("Enter");
 document.querySelector("form").requestSubmit();await esperar(()=>window.filtrosEnviados);
 comprobar(window.filtrosEnviados.profesor==="3","No permite consultar publicaciones de un profesor no activo");
 for(const [campo,valor] of Object.entries({q:"agua",anio:"2025",tipo:"ARTICULO",fuente:"ORCID",estado:"VALIDADA",orden:"revista",dir:"desc"}))comprobar(window.filtrosEnviados[campo]===valor,"Perdió el filtro u orden: "+campo);
 comprobar(!("pagina" in window.filtrosEnviados),"No vuelve a la primera página al buscar");
 document.querySelector('[aria-label="Quitar profesor seleccionado"]').click();await esperar(()=>document.querySelector('input[name="profesor"]').value==="");
 document.querySelector("form").requestSubmit();comprobar(window.filtrosEnviados.profesor==="","No permite consultar todos los profesores");
 await escribir("bruno");await esperar(()=>document.querySelectorAll('[role="option"]').length===1);await teclear("Enter");
 comprobar(document.querySelector('a[href="/produccion/publicaciones"]'),"Falta limpiar filtros");
 comprobar(document.documentElement.scrollWidth<=innerWidth,"Desbordamiento horizontal");
 document.getElementById("resultado").textContent="CORRECTO: profesor opcional, no activos, filtros y orden conservados, página reiniciada";
}catch(e){document.getElementById("resultado").textContent="FALLO: "+e.message}})();
`, "selector-publicaciones");
