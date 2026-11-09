// Chrome aislado para pruebas de componentes; no usa el perfil personal ni la base.
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

export async function probarEnChrome(fuente, nombre, plugins = []) {
  const raiz = process.cwd();
  const temporal = await mkdtemp(path.join(tmpdir(), `pgpc-${nombre}-`));
  const chrome = process.env.CHROME_BIN || "C:/Program Files/Google/Chrome/Application/chrome.exe";
  await build({ stdin: { contents: fuente, loader: "tsx", resolveDir: raiz }, bundle: true, outfile: path.join(temporal, "prueba.js"), jsx: "automatic", define: { "process.env.NODE_ENV": '"development"' }, plugins: [{ name: "router-de-prueba", setup(b) {
    b.onResolve({ filter: /^next\/(navigation|link)$/ }, args => ({ path: args.path, namespace: "prueba" }));
    b.onLoad({ filter: /.*/, namespace: "prueba" }, args => ({ contents: args.path === "next/link" ? "export default function Link(){return null}" : "export const useRouter=()=>({refresh(){window.actualizaciones=(window.actualizaciones||0)+1}})" }));
  } }, ...plugins] });
  const css = await postcss([tailwind()]).process(await readFile("src/app/globals.css", "utf8"), { from: path.join(raiz, "src/app/globals.css") });
  await writeFile(path.join(temporal, "estilos.css"), css.css);
  for (const [tema, ancho, alto] of [["claro", 1280, 900], ["oscuro", 1280, 900], ["celular", 390, 844]]) {
    const html = path.join(temporal, `${tema}.html`);
    await writeFile(html, `<!doctype html><html lang="es" data-tema="${tema === "oscuro" ? "oscuro" : "claro"}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="estilos.css"></head><body><div id="raiz"></div><script>window.onerror=function(m){document.body.insertAdjacentHTML('beforeend','<output id="resultado">FALLO: '+m+'</output>')}</script><script src="prueba.js"></script></body></html>`);
    const hijo = spawn(chrome, ["--headless", `--user-data-dir=${path.join(temporal, `perfil-${tema}`)}`, "--no-first-run", "--no-default-browser-check", "--remote-debugging-address=127.0.0.1", "--remote-debugging-port=0", "about:blank"], { windowsHide: true });
    const direccion = await new Promise((resolver, rechazar) => {
      let errores = "";
      const limite = setTimeout(() => { hijo.kill(); rechazar(Error("Chrome no inició en 20 segundos.")); }, 20000);
      hijo.stderr.on("data", d => { errores += d; const enlace = errores.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (enlace) { clearTimeout(limite); resolver(enlace[1]); } });
      hijo.on("error", error => { clearTimeout(limite); rechazar(error); });
      hijo.on("exit", codigo => { clearTimeout(limite); rechazar(Error(`Chrome terminó antes de iniciar: ${codigo}`)); });
    });
    const socket = new WebSocket(direccion);
    await new Promise((resolver, rechazar) => { socket.addEventListener("open", resolver); socket.addEventListener("error", rechazar); });
    let siguiente = 0;
    const pendientes = new Map();
    socket.addEventListener("message", evento => { const m = JSON.parse(evento.data); if (!m.id) return; const promesa = pendientes.get(m.id); pendientes.delete(m.id); if (m.error) promesa?.rechazar(Error(m.error.message)); else promesa?.resolver(m.result); });
    const enviar = (method, params = {}, sessionId) => new Promise((resolver, rechazar) => { const id = ++siguiente; pendientes.set(id, { resolver, rechazar }); socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })); });
    let salida = "";
    try {
      const { targetId } = await enviar("Target.createTarget", { url: "about:blank" });
      const { sessionId } = await enviar("Target.attachToTarget", { targetId, flatten: true });
      const evaluar = async expression => (await enviar("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, sessionId)).result.value;
      await enviar("Emulation.setDeviceMetricsOverride", { width: ancho, height: alto, deviceScaleFactor: 1, mobile: tema === "celular" }, sessionId);
      await enviar("Page.navigate", { url: pathToFileURL(html).href + "?q=agua&pagina=3" }, sessionId);
      for (let intento = 0; intento < 1000; intento++) {
        const tecla = await evaluar("window.solicitudTecla");
        if (tecla) {
          if (typeof tecla.texto === "string") await enviar("Input.insertText", { text: tecla.texto }, sessionId);
          else if (tecla.click) {
            const punto = { x: tecla.x ?? 5, y: tecla.y ?? 5, button: "left", clickCount: 1 };
            await enviar("Input.dispatchMouseEvent", { type: "mousePressed", ...punto }, sessionId);
            await enviar("Input.dispatchMouseEvent", { type: "mouseReleased", ...punto }, sessionId);
          } else {
            const codigos = { Tab: 9, Escape: 27, Enter: 13, ArrowUp: 38, ArrowDown: 40, Home: 36, End: 35 };
            const evento = { key: tecla.key, code: tecla.key, modifiers: tecla.shift ? 8 : 0, windowsVirtualKeyCode: codigos[tecla.key] ?? 0 };
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
    if (!resultado?.startsWith("CORRECTO:")) { console.log(salida.slice(-1000)); process.exitCode = 1; }
  }
}
