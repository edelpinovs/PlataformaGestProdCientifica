// Prueba aislada con Chrome instalado: no inicia sesión ni consulta la base.
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

const raiz = process.cwd();
const temporal = await mkdtemp(path.join(tmpdir(), "pgpc-modal-"));
const chrome = process.env.CHROME_BIN || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const fixture = `
import React from "react";
import { createRoot } from "react-dom/client";
import { ModalAlta } from ${JSON.stringify(path.join(raiz, "src/components/modal-alta.tsx"))};
import { claseCampo, claseEtiqueta } from ${JSON.stringify(path.join(raiz, "src/components/ui.tsx"))};

let solicitudes = 0, resolver;
function Ejemplo() {
  return <main className="min-h-screen bg-fondo p-5 text-texto"><ModalAlta titulo="Registrar ejemplo ficticio" textoBoton="Registrar ejemplo" accion={async (_, datos) => {
    solicitudes++;
    if (datos.get("nombre") === "error") return {error:"Revisa el nombre ficticio.", campo:"nombre"};
    return await new Promise(r => { resolver = r; });
  }}>{({estado, valor}) => <label className={claseEtiqueta}>Nombre ficticio<input name="nombre" required defaultValue={valor("nombre")} aria-invalid={estado.campo === "nombre"} className={claseCampo(estado.campo === "nombre")} /></label>}</ModalAlta><output id="resultado">EN CURSO</output></main>;
}
createRoot(document.getElementById("raiz")).render(<React.StrictMode><Ejemplo /></React.StrictMode>);
const esperar = async (condicion) => { for(let i=0;i<500;i++) { if(condicion()) return; await new Promise(r=>setTimeout(r,10)); } throw Error("Tiempo agotado"); };
const comprobar = (condicion, texto) => { if(!condicion) throw Error(texto); };
const boton = texto => [...document.querySelectorAll("button")].find(b => b.textContent === texto);
const escribir = valor => { const campo = document.querySelector('input[name="nombre"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(campo, valor); campo.dispatchEvent(new Event("input",{bubbles:true})); };
const escape = () => document.querySelector("dialog").dispatchEvent(new Event("cancel",{cancelable:true}));
const teclear = async (key, shift=false) => { window.solicitudTecla={key,shift}; await esperar(()=>!window.solicitudTecla); };
const pulsarFondo = async () => { window.solicitudTecla={click:true}; await esperar(()=>!window.solicitudTecla); };
(async()=>{
 try {
  await esperar(()=>boton("Registrar ejemplo"));
  boton("Registrar ejemplo").click(); await esperar(()=>document.querySelector("dialog[open]"));
  comprobar(document.querySelector("dialog").contains(document.activeElement), "El foco inicial quedó fuera");
  await teclear("Tab",true); comprobar(document.activeElement === boton("Guardar"), "Mayús+Tab salió del modal");
  await teclear("Tab"); comprobar(document.activeElement === document.querySelector("input"), "Tab salió del modal");
  await pulsarFondo(); comprobar(document.querySelector("dialog[open]"), "El fondo cerró el formulario");
  boton("Cancelar").click(); await esperar(()=>!document.querySelector("dialog"));
  comprobar(document.activeElement === boton("Registrar ejemplo"), "No volvió el foco al disparador");
  boton("Registrar ejemplo").click(); await esperar(()=>document.querySelector("input"));
  escribir("ficticio"); await esperar(()=>document.querySelector("input").value === "ficticio");
  await teclear("Escape"); await esperar(()=>boton("Seguir editando"));
  comprobar(document.activeElement === boton("Seguir editando"), "La confirmación no recibió el foco");
  boton("Seguir editando").click(); await esperar(()=>document.activeElement === document.querySelector("input"));
  comprobar(document.querySelector("input").value === "ficticio", "Cancelar confirmación perdió los datos");
  escribir("error"); document.querySelector("form").requestSubmit();
  await esperar(()=>document.querySelector('[role="alert"]'));
  comprobar(document.querySelector("input").value === "error", "El error borró los datos");
  comprobar(document.querySelector("dialog[open]"), "El error cerró el modal");
  escribir("guardado ficticio"); document.querySelector("form").requestSubmit();
  await esperar(()=>resolver);
  comprobar(boton("Guardar") === undefined && boton("Guardando…").disabled, "No bloqueó el envío");
  escape(); comprobar(!boton("Seguir editando") || boton("Seguir editando").offsetParent === null, "Escape permitió cerrar durante el envío");
  document.querySelector("form").requestSubmit();
  comprobar(solicitudes === 2, "Se repitió el envío");
  resolver({exito:"Registro ficticio guardado."});
  await esperar(()=>!document.querySelector("dialog"));
  comprobar(document.querySelector('[role="status"]').textContent.includes("Registro ficticio guardado."), "Falta el aviso de éxito");
  comprobar(window.actualizaciones === 1, "No actualizó el listado");
  comprobar(location.search === "?q=agua&pagina=3", "Se perdió la URL del listado");
  boton("Registrar ejemplo").click(); await esperar(()=>document.querySelector("input"));
  comprobar(document.querySelector("input").value === "", "La nueva alta no empezó limpia");
  const espacio=document.createElement("div"); espacio.style.height="1500px"; espacio.textContent="Contenido ficticio largo"; document.querySelector("fieldset").append(espacio);
  comprobar(document.querySelector("dialog").scrollHeight > document.querySelector("dialog").clientHeight, "El contenido largo no puede desplazarse");
  boton("Guardar").scrollIntoView(); comprobar(boton("Guardar").getBoundingClientRect().bottom <= innerHeight, "No se alcanza Guardar con contenido largo");
  espacio.remove(); document.querySelector("input").focus();
  document.documentElement.dataset.medidas=JSON.stringify({ancho:innerWidth,documento:document.documentElement.scrollWidth,modal:document.querySelector("dialog").getBoundingClientRect().toJSON()});
  comprobar(document.querySelector("dialog").getBoundingClientRect().right <= innerWidth, "El modal desborda el ancho disponible");
  document.getElementById("resultado").textContent="CORRECTO: foco, cancelación, confirmación, error, envío único, éxito, URL y reinicio";
 } catch(e) { document.getElementById("resultado").textContent="FALLO: " + e.message; }
})();
`;
await build({ stdin: { contents: fixture, loader: "tsx", resolveDir: raiz }, bundle: true, outfile: path.join(temporal, "prueba.js"), jsx: "automatic", define: { "process.env.NODE_ENV": '"development"' }, plugins: [{ name: "router-de-prueba", setup(b) { b.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: "router", namespace: "prueba" })); b.onResolve({ filter: /^next\/link$/ }, () => ({ path: "enlace", namespace: "prueba" })); b.onLoad({ filter: /.*/, namespace: "prueba" }, args => ({ contents: args.path === "enlace" ? "export default function Link(){return null}" : "export const useRouter=()=>({refresh(){window.actualizaciones=(window.actualizaciones||0)+1}})" })); } }] });
const css = await postcss([tailwind()]).process(await readFile("src/app/globals.css", "utf8"), { from: path.join(raiz, "src/app/globals.css") });
await writeFile(path.join(temporal, "estilos.css"), css.css);
for (const [tema, ancho, alto] of [["claro", 1280, 900], ["oscuro", 1280, 900], ["celular", 390, 844]]) {
  const html = path.join(temporal, `${tema}.html`);
  await writeFile(html, `<!doctype html><html lang="es" data-tema="${tema === "oscuro" ? "oscuro" : "claro"}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="estilos.css"></head><body><div id="raiz"></div><script>window.onerror=function(m){document.body.insertAdjacentHTML('beforeend','<output id="resultado">FALLO: '+m+'</output>')}</script><script src="prueba.js"></script></body></html>`);
  const hijo = spawn(chrome, ["--headless", `--user-data-dir=${path.join(temporal, `perfil-${tema}`)}`, "--no-first-run", "--no-default-browser-check", "--remote-debugging-address=127.0.0.1", "--remote-debugging-port=0", "about:blank"], { windowsHide: true });
  const direccion = await new Promise((resolver, rechazar) => {
    let errores = "";
    hijo.stderr.on("data", d => { errores += d; const enlace = errores.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (enlace) resolver(enlace[1]); });
    hijo.on("error", rechazar);
    hijo.on("exit", codigo => rechazar(Error(`Chrome terminó antes de iniciar: ${codigo}`)));
  });
  const socket = new WebSocket(direccion);
  await new Promise((resolver, rechazar) => { socket.addEventListener("open", resolver); socket.addEventListener("error", rechazar); });
  let siguiente = 0;
  const pendientes = new Map();
  socket.addEventListener("message", evento => { const m = JSON.parse(evento.data); if (!m.id) return; const promesa = pendientes.get(m.id); pendientes.delete(m.id); if (m.error) promesa?.rechazar(Error(m.error.message)); else promesa?.resolver(m.result); });
  const enviar = (method, params = {}, sessionId) => new Promise((resolver, rechazar) => { const id = ++siguiente; pendientes.set(id, { resolver, rechazar }); socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })); });
  const { targetId } = await enviar("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await enviar("Target.attachToTarget", { targetId, flatten: true });
  const evaluar = async expression => (await enviar("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, sessionId)).result.value;
  await enviar("Emulation.setDeviceMetricsOverride", { width: ancho, height: alto, deviceScaleFactor: 1, mobile: tema === "celular" }, sessionId);
  await enviar("Page.navigate", { url: pathToFileURL(html).href + "?q=agua&pagina=3" }, sessionId);
  let salida = "";
  try {
    for (let intento = 0; intento < 1000; intento++) {
      const tecla = await evaluar("window.solicitudTecla");
      if (tecla) {
        if (tecla.click) {
          await enviar("Input.dispatchMouseEvent", { type: "mousePressed", x: 5, y: 5, button: "left", clickCount: 1 }, sessionId);
          await enviar("Input.dispatchMouseEvent", { type: "mouseReleased", x: 5, y: 5, button: "left", clickCount: 1 }, sessionId);
        } else {
        const evento = { key: tecla.key, code: tecla.key, modifiers: tecla.shift ? 8 : 0, windowsVirtualKeyCode: tecla.key === "Tab" ? 9 : 27 };
        await enviar("Input.dispatchKeyEvent", { type: "keyDown", ...evento }, sessionId);
        await enviar("Input.dispatchKeyEvent", { type: "keyUp", ...evento }, sessionId);
        }
        await evaluar("window.solicitudTecla = null");
      }
      const texto = await evaluar('document.getElementById("resultado")?.textContent');
      if (texto && texto !== "EN CURSO") break;
      await new Promise(r => setTimeout(r, 20));
    }
    salida = await evaluar("document.documentElement.outerHTML");
    const captura = await enviar("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }, sessionId);
    await writeFile(path.join(temporal, `${tema}.png`), Buffer.from(captura.data, "base64"));
  } finally {
    await enviar("Browser.close"); socket.close();
  }
  const resultado = salida.match(/<output id="resultado">([^<]*)<\/output>/)?.[1];
  console.log(JSON.stringify({ tema, resultado, captura: path.join(temporal, `${tema}.png`) }));
  console.log(salida.match(/data-medidas="([^"]*)"/)?.[1]);
  if (!resultado) console.log(salida.slice(-2000));
  if (!resultado?.startsWith("CORRECTO:")) process.exitCode = 1;
}
