import DOMPurify from 'dompurify';

const MAX_SOURCE_BYTES = 32 * 1024;
const MAX_HTML_BYTES = 64 * 1024;
const WORKER_TIMEOUT_MS = 5000;
const CSP = "default-src 'none'; script-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:; media-src data:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'";
const ALLOWED_TAGS = [
  'main','div','section','article','header','footer','nav','aside',
  'h1','h2','h3','h4','h5','h6','p','span','strong','em','b','i','small',
  'br','hr','ul','ol','li','code','pre','blockquote','button','label',
  'input','textarea','select','option','table','thead','tbody','tr','td','th',
  'img','a'
];
const ALLOWED_ATTR = [
  'class','id','title','alt','width','height','role','aria-label','aria-labelledby',
  'aria-describedby','style','type','value','placeholder','disabled','checked',
  'colspan','rowspan','src'
];

function byteLength(value) {
  return new TextEncoder().encode(value).byteLength;
}

function previewDocument(untrustedHtml) {
  const html = DOMPurify.sanitize(untrustedHtml, {
    ALLOWED_TAGS:ALLOWED_TAGS,
    ALLOWED_ATTR:ALLOWED_ATTR,
    FORBID_TAGS:['script','style','iframe','object','embed','form','base','link','meta','svg','math','template'],
    FORBID_ATTR:['href','action','formaction','target','srcset','xlink:href'],
    ALLOW_DATA_ATTR:false
  });
  if (byteLength(html) > MAX_HTML_BYTES) throw new Error('La vista previa sanitizada supera el límite local de 64 KB.');
  return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="' + CSP + '"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui,sans-serif;margin:1rem}img{max-width:100%;height:auto}</style></head><body><main>' + html + '</main></body></html>';
}

function render(source) {
  if (typeof source !== 'string') return Promise.reject(new Error('El código React debe ser texto.'));
  if (byteLength(source) > MAX_SOURCE_BYTES) return Promise.reject(new Error('El código React supera el límite local de 32 KB.'));
  if (typeof Worker !== 'function') return Promise.reject(new Error('Este navegador no admite el worker local de React.'));
  return new Promise(function (resolve,reject) {
    let worker;
    let settled = false;
    let timer;
    const finish = function (error,value) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (worker) worker.terminate();
      if (error) reject(error);
      else resolve(value);
    };
    try {
      worker = new Worker(new URL('./react-preview-worker.js',document.baseURI), {name:'codigoclaro-react-preview'});
      timer = setTimeout(function () {
        finish(new Error('La vista previa React superó los 5 segundos y el worker se detuvo.'));
      },WORKER_TIMEOUT_MS);
      worker.onmessage = function (event) {
        const message = event.data;
        if (!message || message.type !== 'cc-react-preview-result' || typeof message.ok !== 'boolean') return;
        if (!message.ok) return finish(new Error(String(message.error || 'No se pudo renderizar React.').slice(0,500)));
        if (typeof message.html !== 'string' || byteLength(message.html) > MAX_HTML_BYTES) {
          return finish(new Error('El worker devolvió una salida mayor que el límite local de 64 KB.'));
        }
        try { finish(null,{document:previewDocument(message.html)}); }
        catch (error) { finish(error); }
      };
      worker.onerror = function () { finish(new Error('Falló el worker local de React.')); };
      worker.postMessage({source:source});
    } catch (error) {
      finish(new Error('No se pudo iniciar el worker local de React: ' + String(error && error.message || error).slice(0,300)));
    }
  });
}

window.CCReactPreview = Object.freeze({render:render});
