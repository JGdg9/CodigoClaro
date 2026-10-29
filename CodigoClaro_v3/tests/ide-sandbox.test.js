"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../public/sandbox-runner.js"), "utf8");

function loadSandbox(workerReply) {
  let messageListener;
  let frame;
  const window = {
    addEventListener(type, listener) { if (type === "message") messageListener = listener; },
    removeEventListener(type, listener) { if (type === "message" && messageListener === listener) messageListener = null; },
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis)
  };
  const document = {
    createElement() {
      frame = {contentWindow:{},style:{},setAttribute(){},remove(){}};
      return frame;
    },
    body: {
      appendChild(element) {
        const script = element.srcdoc.match(/<script>([\s\S]*)<\/script>/)[1];
        class MessageChannel {
          constructor() {
            this.port1 = {onmessage:null,start(){},close(){}};
            this.port2 = {close(){},_peer:this.port1};
          }
        }
        class Worker {
          postMessage(_payload, ports) { ports[0]._peer.onmessage({data:workerReply}); }
          terminate() {}
        }
        const context = {
          Blob: class Blob {},
          URL: {createObjectURL(){return "blob:worker";},revokeObjectURL(){}},
          Worker,
          MessageChannel,
          parent: {postMessage(data) { messageListener({source:frame.contentWindow,data}); }},
          document,
          setTimeout: globalThis.setTimeout.bind(globalThis),
          clearTimeout: globalThis.clearTimeout.bind(globalThis)
        };
        vm.runInNewContext(script, context);
      }
    }
  };
  const context = {window,document,setTimeout:window.setTimeout,clearTimeout:window.clearTimeout};
  vm.runInNewContext(source, context);
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../public/ide-sandbox.js"), "utf8"), context);
  return window;
}

test("el runner crea el documento auxiliar con CSP sin red y sin navegación", () => {
  assert.match(source, /connect-src 'none'/);
  assert.match(source, /frame-src 'none'/);
  assert.match(source, /img-src 'none'/);
  assert.match(source, /worker-src blob:/);
  assert.match(source, /setAttribute\("sandbox", "allow-scripts"\)/);
  assert.doesNotMatch(source, /connect-src[^;]*https:/);
});

test("el runner impone límites de tamaño, tiempo y salida", () => {
  assert.match(source, /MAX_WORKER_SOURCE = 120000/);
  assert.match(source, /MAX_OUTPUT_CHARS = 20000/);
  assert.match(source, /Math\.min\(30000/);
  assert.match(source, /JSON\.stringify\(safeResult\)\.length > outputLimit/);
  assert.match(source, /new MessageChannel\(\)/);
  assert.match(source, /worker\.postMessage\(payload, \[channel\.port2\]\)/);
  assert.doesNotMatch(source, /worker\.onmessage\s*=/);
});

test("el evaluador del IDE no descarga módulos ni incrusta el código en el HTML", () => {
  const ideSandbox = fs.readFileSync(path.join(__dirname, "../public/ide-sandbox.js"), "utf8");
  assert.match(ideSandbox, /CCSandbox\.run\(WORKER_SOURCE, \{kind, code\}/);
  assert.match(ideSandbox, /MAX_CODE_CHARS = 50000/);
  assert.match(ideSandbox, /timeoutMs:5000/);
  assert.match(ideSandbox, /event\.ports && event\.ports\[0\]/);
  assert.doesNotMatch(ideSandbox, /importScripts\(|https:\/\//);
});

test("el runner muestra errores devueltos por el worker y no escucha mensajes directos de ese worker", () => {
  assert.match(source, /result\.error \|\| result\.output/);
  assert.doesNotMatch(source, /worker\.onmessage\s*=/);
  assert.match(source, /channel\.port1\.onmessage/);
});

test("el puente del IDE conserva la salida y el corrector recibe sus valores", async () => {
  const ide = loadSandbox({ok:true,output:"Hola desde el worker"});
  const result = await ide.CCIdeSandbox.run("console.log('Hola')", "javascript");
  assert.equal(result.output, "Hola desde el worker");

  const grader = loadSandbox({ok:true,value:[{value:7}]});
  const value = await grader.CCSandbox.run("", {});
  assert.equal(JSON.stringify(value), JSON.stringify([{value:7}]));
});

test("el puente del IDE conserva el error concreto del worker", async () => {
  const ide = loadSandbox({ok:false,output:"ERROR: TypeError: dato inválido"});
  await assert.rejects(ide.CCIdeSandbox.run("throw new Error()", "javascript"), /ERROR: TypeError: dato inválido/);
});

test("el IDE incorpora validación XML y consultas XPath locales", () => {
  const aula = fs.readFileSync(path.join(__dirname, "../public/aula.html"), "utf8");
  assert.match(aula, /id:'xml',label:'XML'/);
  assert.match(aula, /id:'xpath',label:'XPath'/);
  assert.match(aula, /if\(l\.id==='xml'\)return ideRunXml\(\)/);
  assert.match(aula, /if\(l\.id==='xpath'\)return ideRunXPath\(\)/);
  assert.match(aula, /if\s*\(!language\)\s*\{\s*ideStatus\('Este reto todavía no tiene un editor asignado\.'/);
  assert.match(aula, /xpath:'xpath'/);
});
