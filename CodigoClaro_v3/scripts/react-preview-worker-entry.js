import React from 'react';
import { renderToReadableStream } from 'react-dom/server.browser';
import * as Babel from '@babel/standalone';

const MAX_SOURCE_BYTES = 32 * 1024;
const MAX_HTML_BYTES = 64 * 1024;
const RENDER_ABORT_MS = 4000;
const workerPostMessage = self.postMessage.bind(self);
const DynamicFunction = Function;

function disableWorkerApis() {
  for (const name of [
    'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts',
    'Worker', 'SharedWorker', 'BroadcastChannel', 'indexedDB', 'caches',
    'document', 'localStorage', 'sessionStorage', 'process', 'require',
    'eval', 'Function', 'postMessage', 'close'
  ]) {
    try {
      Object.defineProperty(self, name, {
        value:undefined, writable:false, configurable:false
      });
    } catch (_) {}
  }
}

function validateImports(ast) {
  const pending = [ast];
  const seen = new Set();
  while (pending.length) {
    const value = pending.pop();
    if (!value || typeof value !== 'object' || seen.has(value)) continue;
    seen.add(value);
    if (Array.isArray(value)) {
      for (const item of value) pending.push(item);
      continue;
    }
    if (value.type === 'ImportDeclaration' && value.source && value.source.value !== 'react') {
      throw new Error('La vista previa solo admite imports de React; los módulos externos están bloqueados.');
    }
    if (value.type === 'ImportExpression' || (value.type === 'CallExpression' && value.callee && value.callee.type === 'Import')) {
      throw new Error('Los imports dinámicos están desactivados en la vista previa.');
    }
    if ((value.type === 'ExportNamedDeclaration' || value.type === 'ExportAllDeclaration') && value.source) {
      throw new Error('No se permiten reexports en la vista previa.');
    }
    for (const key of Object.keys(value)) {
      if (key !== 'loc' && key !== 'tokens' && key !== 'comments' && key !== 'leadingComments' && key !== 'trailingComments') {
        pending.push(value[key]);
      }
    }
  }
}

function compileComponent(source) {
  const ast = Babel.packages.parser.parse(source, {sourceType:'module',plugins:['jsx']});
  validateImports(ast);
  const compiled = Babel.transform(source, {
    filename:'App.jsx',
    sourceType:'module',
    presets:[['env',{modules:'commonjs',targets:{chrome:'120'}}],'react'],
    sourceMaps:false,
    comments:false
  }).code;
  const moduleRecord = {exports:{}};
  const localRequire = function (name) {
    if (name === 'react') return React;
    throw new Error('Solo se puede importar React en la vista previa.');
  };
  const execute = new DynamicFunction('require','module','exports','React','"use strict";\n' + compiled);
  execute(localRequire,moduleRecord,moduleRecord.exports,React);
  const exported = moduleRecord.exports;
  const Component = exported && (exported.default || exported.App || exported);
  if (typeof Component !== 'function' && !(Component && typeof Component === 'object')) {
    throw new Error('Exporta un componente React por defecto, por ejemplo: export default function App() { ... }');
  }
  return Component;
}

function joinChunks(chunks, size) {
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk,offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(bytes);
}

async function render(source) {
  if (typeof source !== 'string') throw new Error('El código React debe ser texto.');
  if (new TextEncoder().encode(source).byteLength > MAX_SOURCE_BYTES) {
    throw new Error('El código React supera el límite local de 32 KB.');
  }
  const Component = compileComponent(source);
  const controller = new AbortController();
  const abortTimer = setTimeout(function () { controller.abort(); }, RENDER_ABORT_MS);
  let reader;
  try {
    const stream = await renderToReadableStream(React.createElement(Component), {signal:controller.signal});
    reader = stream.getReader();
    const chunks = [];
    let size = 0;
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      size += item.value.byteLength;
      if (size > MAX_HTML_BYTES) {
        await reader.cancel();
        throw new Error('La vista previa supera el límite local de 64 KB.');
      }
      chunks.push(item.value);
    }
    return joinChunks(chunks,size);
  } finally {
    clearTimeout(abortTimer);
    if (reader) {
      try { await reader.cancel(); } catch (_) {}
    }
  }
}

disableWorkerApis();
self.onmessage = async function (event) {
  try {
    const html = await render(event.data && event.data.source);
    workerPostMessage({type:'cc-react-preview-result',ok:true,html:html});
  } catch (error) {
    workerPostMessage({
      type:'cc-react-preview-result',ok:false,
      error:String(error && error.message || error).slice(0,500)
    });
  }
};
