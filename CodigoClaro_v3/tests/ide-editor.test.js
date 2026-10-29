"use strict";

const {test} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const aula = fs.readFileSync(path.join(__dirname, "../public/aula.html"), "utf8");

function extract(startMarker, endMarker) {
  const start = aula.indexOf(startMarker);
  const end = aula.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, "no se encontró el bloque del editor: " + startMarker);
  return aula.slice(start, end);
}

test("el editor carga los modos de sintaxis adecuados según el lenguaje", async () => {
  const source = extract("function ideModeFiles(", "\nasync function ideEnsureEditor(");
  const modes = vm.runInNewContext(source + "\n({files:ideModeFiles,mode:ideMode});", {
    ideMode: language => language.id === "java" ? "text/x-java" : language.id === "html" ? "text/html" : "text/plain"
  });

  assert.deepEqual(Array.from(modes.files({id:"html"})), [
    "mode/xml/xml.js", "mode/javascript/javascript.js", "mode/css/css.js", "mode/htmlmixed/htmlmixed.js"
  ]);
  assert.deepEqual(Array.from(modes.files({id:"java"})), ["mode/clike/clike.js"]);
  assert.deepEqual(Array.from(modes.files({id:"python"})), ["mode/python/python.js"]);
  assert.deepEqual(Array.from(modes.files({id:"typescript"})), ["mode/javascript/javascript.js"]);
  assert.deepEqual(Array.from(modes.files({id:"xpath"})), []);
});

test("HTML, CSS y SQL usan el modo de resaltado correspondiente", () => {
  const source = extract("function ideMode(", "\n// ccLoadScript:");
  const mode = vm.runInNewContext(source + "\nideMode;", {});

  assert.equal(mode({id:"html"}), "text/html");
  assert.equal(mode({id:"css"}), "text/css");
  assert.equal(mode({id:"sql-postgres"}), "text/x-sql");
  assert.equal(mode({id:"typescript"}), "text/typescript");
});

test("la vista previa React compila el JSX aislada, bloquea red y codifica el código fuente", () => {
  const source = extract("function ideReactPreviewDocument(", "\n// ideRunReact:");
  const context = {
    TextEncoder,
    btoa,
    CC_REACT_CDN:"https://cdnjs.cloudflare.com",
    CC_REACT_BABEL:"https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.26.4/babel.min.js",
    CC_REACT_JS:"https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js",
    CC_REACT_DOM:"https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"
  };
  const makeDocument = vm.runInNewContext(source + "\nideReactPreviewDocument;", context);
  const code = "export default function App(){return <button onClick={() => alert('ok')}>ñ</button>}";
  const html = makeDocument(code, "prueba-1");

  assert.match(html, /Babel\.transform/);
  assert.match(html, /ReactDOM\.createRoot/);
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /script-src 'unsafe-inline' https:\/\/cdnjs\.cloudflare\.com/);
  assert.match(aula, /frame\.setAttribute\('sandbox','allow-scripts'\)/);
  assert.doesNotMatch(html, /alert\('ok'\)|>ñ</);
  assert.equal(Buffer.from(html.match(/const encoded = "([^"]+)"/)[1], "base64").toString(), code);
});

test("Ejecutar monta React en el iframe aislado y muestra la respuesta del componente", () => {
  const source = extract("function ideRunReact(){", "\nfunction ideTestSample()");
  const classes = new Set(["hide"]);
  const frame = {
    contentWindow:{},
    attributes:{},
    setAttribute(name,value){this.attributes[name]=value;},
    set srcdoc(value){this.document=value;},
    get srcdoc(){return this.document;}
  };
  const box = {classList:{remove(name){classes.delete(name);}}};
  const outputs=[],statuses=[];
  let messageHandler;
  const context = {
    TextEncoder,
    Date,
    Math,
    document:{getElementById:id=>id==='reactPreviewBox'?box:id==='reactPreview'?frame:null},
    window:{
      addEventListener(name,handler){if(name==='message')messageHandler=handler;},
      removeEventListener(){}
    },
    ideGetCode:()=>"export default function App(){return <button>Hola</button>}",
    ideStopReactPreview(){},
    ideReactPreviewDocument:(_code,runId)=>`<html><script>const runId = ${JSON.stringify(runId)};</script></html>`,
    ideShowOutput:(message,kind)=>outputs.push({message,kind}),
    ideStatus:message=>statuses.push(message),
    setTimeout:()=>1,
    clearTimeout(){}
  };
  vm.runInNewContext("let ccReactRunCleanup=null,ccReactFrame=null;\n"+source+"\nideRunReact();",context);

  assert.equal(frame.attributes.sandbox,"allow-scripts");
  assert.equal(classes.has("hide"),false);
  assert.match(outputs[0].message,/Compilando JSX/);
  const runId=frame.srcdoc.match(/const runId = "([^"]+)"/)[1];
  messageHandler({source:frame.contentWindow,data:{source:"cc-react-preview",runId,status:"ready",message:"Montado"}});
  assert.deepEqual(outputs[outputs.length-1],{message:"Montado",kind:"ok"});
  assert.ok(statuses.includes("Vista previa React lista"));
});

test("el editor enriquecido conserva el texto, habilita números de línea y autoguardado", async () => {
  const source = extract("async function ideEnsureEditor(", "function ideBindShortcuts(");
  const textarea = {value:"print('hola')",isConnected:true,classList:{add(){} }};
  const wrapperAttributes = {};
  let changeHandler;
  let editorOptions;
  const editor = {
    on(event, handler) { if (event === "change") changeHandler = handler; },
    getWrapperElement() { return {setAttribute(name, value) { wrapperAttributes[name] = value; }}; }
  };
  const statuses = [];
  const context = {
    ideEditor:null,
    CC_CODEMIRROR:"https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/",
    window:{CodeMirror:{fromTextArea(node, options) { assert.equal(node.value, "print('hola')"); editorOptions = options; return editor; }}},
    document:{getElementById:id => id === "ideCode" ? textarea : null},
    ccLoadCss:async () => {},
    ccLoadScript:async () => {},
    ideLang:() => ({id:"python"}),
    ideLoadMode:async () => {},
    ideMode:() => "python",
    ideUpdateCount() {},
    ideStatus:message => statuses.push(message),
    ideRun() {},
    ideSaveFile() {},
    ideSaveDraft() { statuses.push("guardado"); }
  };
  const createdEditor = await vm.runInNewContext("let ideEditor=null;\n" + source + "\nideEnsureEditor().then(()=>ideEditor);", context);

  assert.equal(createdEditor, editor, JSON.stringify(statuses));
  assert.equal(editorOptions.lineNumbers, true);
  assert.equal(editorOptions.mode, "python");
  assert.equal(wrapperAttributes["aria-label"], "Editor de código");
  assert.equal(typeof editorOptions.extraKeys["Ctrl-Enter"], "function");
  assert.equal(typeof editorOptions.extraKeys["Ctrl-S"], "function");
  changeHandler();
  assert.ok(statuses.includes("guardado"));
  assert.ok(statuses.includes("Editor con resaltado de sintaxis"));
});

test("si la CDN no responde, el editor de texto conserva el código", async () => {
  const source = extract("async function ideEnsureEditor(", "function ideBindShortcuts(");
  const classes = new Set();
  const textarea = {value:"class Main {}",isConnected:true,classList:{add:className => classes.add(className)}};
  const statuses = [];
  let rejectStyles;
  const context = {
    ideEditor:null,
    CC_CODEMIRROR:"https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/",
    window:{CodeMirror:null},
    document:{getElementById:id => id === "ideCode" ? textarea : null},
    ccLoadCss:() => new Promise((_resolve, reject) => { rejectStyles = reject; }),
    ccLoadScript:async () => {},
    ideLang:() => ({id:"java"}),
    ideLoadMode:async () => {},
    ideMode:() => "text/x-java",
    ideUpdateCount() {},
    ideStatus:message => statuses.push(message)
  };
  const pending = vm.runInNewContext("let ideEditor=null;\n" + source + "\nideEnsureEditor();", context);
  textarea.value = "class Main { // edición del alumno }";
  rejectStyles(new Error("sin red"));
  await pending;

  assert.equal(textarea.value, "class Main { // edición del alumno }");
  assert.ok(classes.has("editor"));
  assert.ok(statuses.some(message => message.startsWith("Editor de texto listo; resaltado no disponible")));
});

test("Ctrl/Cmd+Enter ejecuta y Ctrl/Cmd+S descarga solo desde el editor", () => {
  const source = extract("function ideBindShortcuts(", "function ideInitUI(");
  let handler;
  let runs = 0;
  let saves = 0;
  const context = {
    document:{
      documentElement:{dataset:{}},
      addEventListener(type, callback) { if (type === "keydown") handler = callback; },
      getElementById:id => id === "ideCode" ? {} : null
    },
    ideRun() { runs++; },
    ideSaveFile() { saves++; }
  };
  vm.runInNewContext(source + "\nideBindShortcuts();ideBindShortcuts();", context);
  assert.equal(typeof handler, "function");

  const event = (key, target, {ctrlKey=false,metaKey=false,altKey=false}={}) => ({
    key,target,ctrlKey,metaKey,altKey,preventDefault() { this.prevented = true; }
  });
  const editor = {closest:selector => selector === ".CodeMirror" ? {} : null};
  const runShortcut = event("Enter", editor, {ctrlKey:true});
  handler(runShortcut);
  assert.equal(runs, 1);
  assert.equal(runShortcut.prevented, true);
  const saveShortcut = event("s", editor, {metaKey:true});
  handler(saveShortcut);
  assert.equal(saves, 1);
  assert.equal(saveShortcut.prevented, true);
  handler(event("Enter", {}, {ctrlKey:true}));
  assert.equal(runs, 1);
});
