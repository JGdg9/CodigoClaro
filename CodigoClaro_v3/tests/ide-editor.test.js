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

test("React conserva edición y análisis con vista previa estática en worker", () => {
  assert.match(aula, /id="ideCode"/);
  assert.match(aula, /onclick="ideAnalyze\(\)"/);
  assert.match(aula, /function ideAnalyze\(\)/);
  assert.match(aula, /React\/JSX · vista previa estática local/);
  assert.match(aula, /worker terminable/);
  assert.match(aula, /id="reactPreview"/);
  assert.match(aula, /CCReactPreview\.render\(code\)/);
  assert.doesNotMatch(aula, /function ideReactPreviewDocument|Babel\.transform|ReactDOM\.createRoot/);
});

test("Ejecutar React envía el código al renderizador local y muestra HTML sanitizado", async () => {
  const source = extract("async function ideRunReact(){", "\nfunction ideTestSample()");
  const outputs=[],statuses=[];
  const frame={srcdoc:"",attributes:{},setAttribute(name,value){this.attributes[name]=value;}};
  const box={hidden:true,classList:{remove(){box.hidden=false;}}};
  const button={disabled:false};
  let editorReads=0,renderedCode="";
  const context = {
    ideGetCode(){editorReads++;return "useEffect(() => { while (true) {} });";},
    ideShowOutput:(message,kind)=>outputs.push({message,kind}),
    ideStatus:message=>statuses.push(message),
    ideLang:()=>({id:"react"}),
    ideSetRuntimeText(){},
    document:{getElementById(id){return {reactPreviewBox:box,reactPreview:frame,ideRunButton:button}[id]||null;}},
    window:{CCReactPreview:{async render(code){renderedCode=code;return {document:"<!doctype html><meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'\"><p>preview</p>"};}}}
  };
  await vm.runInNewContext(`(async()=>{${source}\nawait ideRunReact();})()`,context);

  assert.equal(editorReads,2,"lee el código al iniciar y vuelve a comprobar que no cambió mientras renderizaba");
  assert.match(renderedCode,/useEffect/);
  assert.match(frame.srcdoc,/<p>preview<\/p>/);
  assert.equal(frame.attributes.sandbox,"");
  assert.equal(box.hidden,false);
  assert.match(outputs.at(-1).message,/vista previa React estática lista/i);
  assert.equal(outputs.at(-1).kind,"ok");
  assert.ok(statuses.includes("Vista previa React lista"));
});

test("el selector habilita la vista previa solo cuando el motor React local está disponible", () => {
  const source = extract("function ideSetRuntimeText(){", "\n// ideAnalyze:");
  const runButton = {
    disabled:false,
    textContent:"▶ Ejecutar",
    attributes:{},
    setAttribute(name,value){this.attributes[name]=value;},
    removeAttribute(name){delete this.attributes[name];}
  };
  const runNotice = {
    hidden:true,
    classList:{toggle(_name,hidden){runNotice.hidden=hidden;}}
  };
  const elements = {
    runtimeBadge:{textContent:""},
    runDescription:{textContent:""},
    stdinPanel:{classList:{toggle(){}}},
    ideRunButton:runButton,
    ideRunNotice:runNotice
  };
  let language={id:"react"};
  const context={document:{getElementById:id=>elements[id]||null},ideLang:()=>language,window:{CCReactPreview:{render(){}}}};
  const setRuntimeText=vm.runInNewContext(source+"\nideSetRuntimeText;",context);

  setRuntimeText();
  assert.equal(runButton.disabled,false);
  assert.equal(runButton.textContent,"▶ Vista previa");
  assert.equal(runButton.attributes["aria-label"],"Vista previa estática de React");
  assert.equal(runButton.attributes["aria-describedby"],"ideRunNotice");
  assert.equal(runNotice.hidden,false);
  assert.match(elements.runDescription.textContent,/worker terminable/);

  language={id:"js"};
  setRuntimeText();
  assert.equal(runButton.disabled,false);
  assert.equal(runButton.textContent,"▶ Ejecutar");
  assert.equal("aria-label" in runButton.attributes,false);
  assert.equal("aria-describedby" in runButton.attributes,false);
  assert.equal(runNotice.hidden,true);
  assert.match(elements.runDescription.textContent,/worker/);
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
