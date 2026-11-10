import path from "node:path";
import { probarEnChrome } from "./pruebas-navegador.mjs";

await probarEnChrome(`
import React, {useState} from "react";
import {createRoot} from "react-dom/client";
import {SelectorProfesor} from ${JSON.stringify(path.join(process.cwd(), "src/components/selector-profesor.tsx"))};
const opciones=[{id:1,nombres:"Profesora Ámbar",apellidos:"Ejemplo Norte",codigo:"DEMO-001"},{id:2,nombres:"Profesor Bruno",apellidos:"Ejemplo Sur",codigo:"DEMO-002"}];
function Ejemplo(){const [permitidas,cambiar]=useState(opciones);return <main className="min-h-screen bg-fondo p-5 text-texto"><form className="mx-auto flex max-w-lg flex-col gap-4 rounded-2xl bg-superficie p-5" onSubmit={e=>{e.preventDefault();window.enviado=new FormData(e.currentTarget).get("profesorId")}}><SelectorProfesor opciones={permitidas}/><button type="submit">Enviar ejemplo ficticio</button><button type="button" onClick={()=>cambiar([opciones[1]])}>Simular cambio de elegibilidad</button><button type="button" onClick={()=>cambiar(opciones)}>Restaurar opciones ficticias</button></form><output id="resultado">EN CURSO</output></main>}
createRoot(document.getElementById("raiz")).render(<React.StrictMode><Ejemplo/></React.StrictMode>);
const esperar=async c=>{for(let i=0;i<500;i++){if(c())return;await new Promise(r=>setTimeout(r,10));}throw Error("Tiempo agotado")};
const comprobar=(c,m)=>{if(!c)throw Error(m)};
const campo=()=>document.querySelector('[role="combobox"]');
const elegido=()=>document.querySelector('input[type="hidden"]').value;
const teclear=async(key,shift=false)=>{window.solicitudTecla={key,shift};await esperar(()=>!window.solicitudTecla)};
const escribir=async texto=>{campo().select();window.solicitudTecla={texto};await esperar(()=>!window.solicitudTecla)};
(async()=>{try{
 await esperar(()=>campo());campo().focus();
 await escribir("ambar norte");await esperar(()=>document.querySelectorAll('[role="option"]').length===1);
 await teclear("ArrowDown");await teclear("Enter");await esperar(()=>elegido()==="1");
 comprobar(campo().getAttribute("aria-expanded")==="false","Elegir no cerró sugerencias");
 await escribir("bruno");comprobar(elegido()==="1","Buscar borró la selección");
 await esperar(()=>document.querySelectorAll('[role="option"]').length===1);
 await teclear("Escape");comprobar(campo().getAttribute("aria-expanded")==="false","Escape no cerró sugerencias");
 document.querySelector("form").requestSubmit();comprobar(window.enviado==="1","Se envió la búsqueda en vez de la selección");
 campo().focus();await escribir("sin coincidencias");await esperar(()=>document.body.textContent.includes("No se encontraron profesores"));
 comprobar(elegido()==="1","Sin coincidencias borró la selección");
 document.querySelector('[aria-label="Quitar profesor seleccionado"]').click();await esperar(()=>elegido()==="");
 document.querySelector("form").requestSubmit();await esperar(()=>document.querySelector('[role="alert"]'));
 comprobar(campo().getAttribute("aria-invalid")==="true","Falta mensaje de selección requerida");
 await escribir("DEMO-002");await esperar(()=>document.querySelectorAll('[role="option"]').length===1);
 await teclear("Enter");await esperar(()=>elegido()==="2");
 comprobar(campo().getAttribute("aria-invalid")==="false","No limpió la validación tras elegir");
 campo().focus();await escribir("Ámbar");await esperar(()=>document.querySelectorAll('[role="option"]').length===1);
 document.querySelector('[role="option"]').click();await esperar(()=>elegido()==="1");
 [...document.querySelectorAll("button")].find(b=>b.textContent==="Simular cambio de elegibilidad").click();
 await esperar(()=>document.body.textContent.includes("ya no está entre las opciones permitidas"));
 comprobar(elegido()==="1","Cambiar elegibilidad borró silenciosamente la selección");
 [...document.querySelectorAll("button")].find(b=>b.textContent==="Restaurar opciones ficticias").click();
 await esperar(()=>!document.body.textContent.includes("ya no está entre las opciones permitidas"));
 campo().focus();await teclear("ArrowDown");await teclear("Home");await teclear("End");await teclear("ArrowUp");
 comprobar(document.getElementById(campo().getAttribute("aria-activedescendant"))?.textContent.includes("DEMO-001"),"Home, End y flechas no actualizan la opción activa");
 comprobar(document.documentElement.scrollWidth<=innerWidth,"El selector desborda en celular");
 document.getElementById("resultado").textContent="CORRECTO: búsqueda, teclado, ratón, selección conservada, validación y elegibilidad";
}catch(e){document.getElementById("resultado").textContent="FALLO: "+e.message}})();
`, "selector");
