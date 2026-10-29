/** Prueba el flujo Java del IDE con el servicio remoto sustituido por una respuesta local controlada. */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { URL } = require('node:url');

const aula = fs.readFileSync(path.join(__dirname, '../public/aula.html'), 'utf8').replace(/\r\n/g, '\n');

function extract(startMarker, endMarker) {
  const start = aula.indexOf(startMarker);
  const end = aula.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, 'no se encontró el bloque del IDE: ' + startMarker);
  return aula.slice(start, end).trim();
}

const judgeBase64 = vm.runInNewContext(
  extract('function ideJudgeEncodeBase64(', '\nfunction ideCancelJudgeRun') + '\n({encode:ideJudgeEncodeBase64,decode:ideJudgeDecodeBase64});',
  { TextEncoder, TextDecoder, Uint8Array, btoa, atob }
);

function runnerContext(consentChecked, { timeoutImmediately = false } = {}) {
  const calls = [];
  const messages = [];
  let runTimeoutCallback = null;
  const privacySettings = { open: false };
  const consent = {
    checked: consentChecked,
    dataset: { endpoint: 'https://ce.judge0.com' },
    closest: selector => selector === 'details' ? privacySettings : null,
    focus() { this.focused = true; }
  };
  const cancelClasses = new Set(['hide']);
  const cancelButton = { classList: {
    add: name => cancelClasses.add(name),
    remove: name => cancelClasses.delete(name),
    contains: name => cancelClasses.has(name)
  } };
  const elements = {
    ideRemoteConsent: consent,
    ideCancelRemoteRun: cancelButton,
    ideStdin: { value: 'Ada' },
    judgeToken: { value: 'session-token' }
  };
  const context = {
    URL,
    AbortController,
    document: { getElementById: id => elements[id] || null },
    ideLang: () => ({ id: 'java', label: 'Java' }),
    ideGetCode: () => 'public class Main { public static void main(String[] args) { System.out.println("Hola"); } }',
    ideShowOutput: (message, kind) => messages.push({ message, kind }),
    ideStatus: message => messages.push({ status: message }),
    ideJudgeConfig: () => ({ base: 'https://ce.judge0.com' }),
    ccJudgeRunController: null,
    ccJudgeCheckController: null,
    ideSaveJudgeSettings: () => {},
    ideVersionScore: () => 17,
    ideJudgeEncodeBase64: judgeBase64.encode,
    ideJudgeDecodeBase64: judgeBase64.decode,
    ccJudgeLanguages: [{ id: 62, name: 'Java (OpenJDK 17)' }],
    ccJudgeLanguagesEndpoint: 'https://ce.judge0.com',
    ideJudgeFetch: async (endpoint, options = {}) => {
      if (options.signal?.aborted) {
        const error = new Error('aborted');
        error.name = 'AbortError';
        throw error;
      }
      calls.push({ endpoint, options });
      if (endpoint === '/languages/') return [{ id: 17, name: 'Java (OpenJDK 21)' }];
      if (options.method === 'POST') return { token: 'test-job' };
      return {
        status: { id: 3, description: 'Accepted' },
        stdout: judgeBase64.encode('¡Hola, niña! ☕\n'),
        stderr: judgeBase64.encode('aviso: café'),
        compile_output: judgeBase64.encode('compilación: áéíóú'),
        message: judgeBase64.encode('resultado: pingüino')
      };
    },
    setTimeout: (callback, delay) => {
      if (delay === 30000) runTimeoutCallback = callback;
      if (delay === 900) {
        if (timeoutImmediately) runTimeoutCallback?.();
        callback();
      }
      return delay;
    },
    clearTimeout: () => {}
  };
  return {
    calls,
    messages,
    context,
    cancelButton,
    cancelClasses,
    consent,
    privacySettings
  };
}

test('el botón Ejecutar dirige Java al compilador remoto', () => {
  const source = extract('function ideRun(){', '\n// ideShowOutput:');
  let invoked = 0;
  const context = {
    ideLang: () => ({ id: 'java', label: 'Java' }),
    ideGetCode: () => 'class Main {}',
    ideRunJudge0: () => { invoked += 1; return 'java-run'; }
  };
  const run = vm.runInNewContext(source + '\nideRun;', context);
  assert.equal(run(), 'java-run');
  assert.equal(invoked, 1);
});

test('Java no envía código si falta consentimiento para el endpoint seleccionado', async () => {
  const source = extract('async function ideRunJudge0(){', '// ideLoadSql');
  const setup = runnerContext(false);
  const run = vm.runInNewContext(source + '\nideRunJudge0;', setup.context);

  await run();

  assert.equal(setup.calls.length, 0, 'no debe consultarse ni enviarse nada al servicio');
  assert.match(setup.messages[0].message, /confirma.*enviar el código/i);
  assert.equal(setup.privacySettings.open, true, 'debe abrir la sección que contiene el consentimiento');
  assert.equal(setup.consent.focused, true, 'debe llevar el foco a la casilla de consentimiento');
});

test('con consentimiento Java compila y muestra la salida devuelta por el servicio simulado', async () => {
  const source = extract('async function ideRunJudge0(){', '// ideLoadSql');
  const setup = runnerContext(true);
  const run = vm.runInNewContext(source + '\nideRunJudge0;', setup.context);

  await run();

  const post = setup.calls.find(call => call.options.method === 'POST');
  assert.ok(post, 'debe crear un envío de código Java');
  assert.match(post.endpoint, /base64_encoded=true/, 'la creación debe indicar que el contenido se envía en Base64');
  const payload = JSON.parse(post.options.body);
  assert.equal(judgeBase64.decode(payload.source_code), setup.context.ideGetCode());
  assert.equal(judgeBase64.decode(payload.stdin), 'Ada');
  const poll = setup.calls.find(call => call.options.method === 'GET');
  assert.ok(poll);
  assert.match(poll.endpoint, /base64_encoded=true/, 'la respuesta debe solicitarse codificada en Base64');
  const output = setup.messages.filter(message => message.message).at(-1)?.message || '';
  assert.match(output, /¡Hola, niña! ☕/);
  assert.match(output, /aviso: café/);
  assert.match(output, /compilación: áéíóú/);
  assert.match(output, /resultado: pingüino/);
  assert.equal(setup.messages.find(message => message.kind)?.kind, 'ok');
});

test('el IDE selecciona un runtime vigente para Java, Kotlin, Node.js y Python', async () => {
  const source = extract('async function ideRunJudge0(){', '// ideLoadSql');
  const cases = [
    { id: 'java', label: 'Java', code: 'class Main { public static void main(String[] args) { System.out.println("Hola"); } }', languages: [{ id: 62, name: 'Java (OpenJDK 13.0.1)' }, { id: 91, name: 'Java (JDK 17.0.6)' }], expected: 91 },
    { id: 'kotlin', label: 'Kotlin', code: 'fun main() { println("Hola") }', languages: [{ id: 78, name: 'Kotlin (1.3.70)' }, { id: 111, name: 'Kotlin (2.1.10)' }], expected: 111 },
    { id: 'node', label: 'Node.js', code: 'console.log("Hola")', languages: [{ id: 93, name: 'JavaScript (Node.js 18.15.0)' }, { id: 102, name: 'JavaScript (Node.js 22.08.0)' }], expected: 102 },
    { id: 'python', label: 'Python', code: 'print("Hola")', languages: [{ id: 100, name: 'Python (3.12.5)' }, { id: 113, name: 'Python (3.14.0)' }], expected: 113 }
  ];

  for (const item of cases) {
    const setup = runnerContext(true);
    setup.context.ideLang = () => ({ id: item.id, label: item.label });
    setup.context.ideGetCode = () => item.code;
    setup.context.ccJudgeLanguages = item.languages;
    setup.context.ideVersionScore = name => (name.match(/\d+(?:\.\d+)*/g) || []).join('.').split('.').reduce((score, part, index) => score + Number(part) / 100 ** index, 0);
    await vm.runInNewContext(source + '\nideRunJudge0;', setup.context)();

    const post = setup.calls.find(call => call.options.method === 'POST');
    assert.ok(post, `debe enviar una tarea ${item.label}`);
    assert.equal(JSON.parse(post.options.body).language_id, item.expected, `debe elegir el runtime más reciente de ${item.label}`);
    assert.equal(judgeBase64.decode(JSON.parse(post.options.body).source_code), item.code);
    assert.equal(setup.messages.find(message => message.kind)?.kind, 'ok');
  }
});

test('Judge0 conserva texto español al codificar y decodificar UTF-8 en Base64', () => {
  const samples = [
    'public class Main { // acción, año, pingüino, € 😀 }',
    'Entrada estándar: ¿qué tal? ¡café con leche!\n'
  ];
  for (const text of samples) assert.equal(judgeBase64.decode(judgeBase64.encode(text)), text);
  assert.throws(() => judgeBase64.decode('no es base64'), /resultado Base64 o UTF-8 no válido/);
});

test('el endpoint remoto no sigue redirecciones después del consentimiento', async () => {
  let request;
  const fetcher = async (url, options) => {
    request = {url,options};
    return {ok:true,status:200,headers:{get:()=>'application/json'},text:async()=>'{\"ok\":true}'};
  };
  const judgeFetch = vm.runInNewContext(
    extract('async function ideJudgeFetch(', '\nfunction ideJudgeEncodeBase64') + '\nideJudgeFetch;',
    {URL,fetch:fetcher,TextEncoder,TextDecoder,Uint8Array}
  );
  await judgeFetch('/languages/', {}, {base:'https://judge.example',token:'secret'});
  assert.equal(request.options.redirect, 'error');
  assert.equal(request.url, 'https://judge.example/languages/');
});

test('el endpoint remoto rechaza respuestas con Content-Length excesivo sin leerlas', async () => {
  let bodyRead = false;
  const judgeFetch = vm.runInNewContext(
    extract('async function ideJudgeFetch(', '\nfunction ideJudgeEncodeBase64') + '\nideJudgeFetch;',
    {URL,fetch:async()=>({
      ok:true,status:200,headers:{get:name=>name==='content-length'?'1000001':'application/json'},
      text:async()=>{bodyRead=true;return '{}'}
    }),TextEncoder,TextDecoder,Uint8Array}
  );
  await assert.rejects(judgeFetch('/languages/', {}, {base:'https://judge.example',token:''}), /límite local de 1 MB/);
  assert.equal(bodyRead, false);
});

test('el endpoint remoto cancela una respuesta en streaming cuando supera 1 MB', async () => {
  let reads = 0, cancelled = false;
  const response = {
    ok:true,status:200,headers:{get:()=>null},
    body:{getReader:()=>({
      async read(){reads++;return reads<=2?{done:false,value:new Uint8Array(600000)}:{done:true}},
      async cancel(){cancelled=true},
      releaseLock(){}
    })}
  };
  const judgeFetch = vm.runInNewContext(
    extract('async function ideJudgeFetch(', '\nfunction ideJudgeEncodeBase64') + '\nideJudgeFetch;',
    {URL,fetch:async()=>response,TextEncoder,TextDecoder,Uint8Array}
  );
  await assert.rejects(judgeFetch('/submissions/', {}, {base:'https://judge.example',token:''}), /límite local de 1 MB/);
  assert.equal(reads, 2);
  assert.equal(cancelled, true);
});

test('Java invalida la lista de runtimes si se cambia el endpoint', async () => {
  const source = extract('async function ideRunJudge0(){', '// ideLoadSql');
  const setup = runnerContext(true);
  setup.context.ideJudgeConfig = () => ({ base: 'https://judge.example', token: '' });
  setup.context.document.getElementById('ideRemoteConsent').dataset.endpoint = 'https://judge.example';
  setup.context.ccJudgeLanguagesEndpoint = 'https://old-judge.example';
  const run = vm.runInNewContext(source + '\nideRunJudge0;', setup.context);

  await run();

  assert.ok(setup.calls.some(call => call.endpoint === '/languages/'), 'debe consultar los runtimes del endpoint nuevo');
  const post = setup.calls.find(call => call.options.method === 'POST');
  assert.ok(post, 'debe crear el envío en el endpoint nuevo');
  assert.equal(JSON.parse(post.options.body).language_id, 17, 'debe usar el ID devuelto por el endpoint nuevo');
  assert.equal(setup.context.ccJudgeLanguagesEndpoint, 'https://judge.example');
});

test('Java cancela el sondeo y muestra un error si la ejecución remota supera su límite', async () => {
  const source = extract('async function ideRunJudge0(){', '// ideLoadSql');
  const setup = runnerContext(true, { timeoutImmediately: true });
  const run = vm.runInNewContext(source + '\nideRunJudge0;', setup.context);

  await run();

  const post = setup.calls.find(call => call.options.method === 'POST');
  assert.ok(post, 'el tiempo límite debe ocurrir después de iniciar el envío con consentimiento');
  assert.equal(post.options.signal.aborted, true, 'la petición debe cancelarse al superar el límite');
  assert.equal(setup.calls.some(call => call.options.method === 'GET'), false, 'no debe continuar el sondeo después del aborto');
  assert.match(setup.messages.filter(message => message.message).at(-1)?.message || '', /superó el límite de 30 segundos/i);
  assert.equal(setup.messages.find(message => message.kind)?.kind, 'bad');
});

test('Java permite cancelar desde el IDE y avisa si el runner ya recibió el código', async () => {
  const source = extract('async function ideRunJudge0(){', '// ideLoadSql');
  const setup = runnerContext(true);
  const cancelSource = extract('function ideCancelJudgeRun(){', '\n// ideCheckJudge:');
  setup.context.ideCancelJudgeRun = vm.runInNewContext(cancelSource + '\nideCancelJudgeRun;', setup.context);
  const originalSetTimeout = setup.context.setTimeout;
  setup.context.setTimeout = (callback, delay) => {
    if (delay === 900) {
      assert.equal(setup.cancelButton.classList.contains('hide'), false, 'el botón debe estar visible mientras espera al runner');
      setup.context.ideCancelJudgeRun();
    }
    return originalSetTimeout(callback, delay);
  };
  const run = vm.runInNewContext(source + '\nideRunJudge0;', setup.context);

  await run();

  const post = setup.calls.find(call => call.options.method === 'POST');
  assert.ok(post, 'solo debe enviar la tarea tras el consentimiento');
  assert.equal(post.options.signal.aborted, true);
  assert.equal(setup.calls.some(call => call.options.method === 'GET'), false, 'no debe seguir consultando el resultado');
  assert.equal(setup.consent.checked, false, 'cancelar debe revocar el consentimiento local');
  assert.equal(setup.cancelButton.classList.contains('hide'), true, 'el botón debe ocultarse al terminar la cancelación');
  assert.match(setup.messages.filter(message => message.message).at(-1)?.message || '', /si el endpoint ya recibió el código, puede terminar de procesarlo/i);
});

function ccApiRunner(fetch) {
  const client = require('../public/api-client.js');
  return (url, options = {}) => client.request(url, options, fetch);
}

function ccApiResponse(status, error, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => contentType },
    json: async () => ({ error }),
    text: async () => error
  };
}

test('ccApi oculta el host y los detalles internos si falla la conexión', async () => {
  const api = ccApiRunner(async () => { throw new Error('ECONNREFUSED localhost:3000 /api/progress'); });

  await assert.rejects(api('/api/progress'), error => {
    assert.equal(error.message, 'No se pudo conectar con CódigoClaro. Comprueba tu conexión e inténtalo de nuevo.');
    assert.doesNotMatch(error.message, /localhost|3000|\/api\/progress|ECONNREFUSED/);
    return true;
  });
});

test('ccApi sustituye errores HTTP 5xx por un mensaje genérico', async () => {
  const api = ccApiRunner(async () => ccApiResponse(500, 'Error interno en http://localhost:3000/api/progress'));

  await assert.rejects(api('/api/progress'), error => {
    assert.equal(error.message, 'CódigoClaro no pudo completar la solicitud. Inténtalo de nuevo más tarde.');
    assert.doesNotMatch(error.message, /localhost|3000|\/api\/progress|interno/);
    return true;
  });
});

test('ccApi conserva validaciones 4xx seguras y oculta detalles internos', async () => {
  const safeApi = ccApiRunner(async () => ccApiResponse(400, 'La contraseña debe tener al menos 10 caracteres.'));
  await assert.rejects(safeApi('/api/register'), error => error.message === 'La contraseña debe tener al menos 10 caracteres.');

  const unsafeApi = ccApiRunner(async () => ccApiResponse(400, 'Fallo en http://localhost:3000/api/register: TypeError'));
  await assert.rejects(unsafeApi('/api/register'), error => {
    assert.equal(error.message, 'No se pudo completar la solicitud. Revisa los datos e inténtalo de nuevo.');
    assert.doesNotMatch(error.message, /localhost|3000|\/api\/register|TypeError/);
    return true;
  });

  const internalApi = ccApiRunner(async () => ccApiResponse(400, 'Error interno: fallo inesperado.'));
  await assert.rejects(internalApi('/api/register'), error => {
    assert.equal(error.message, 'No se pudo completar la solicitud. Revisa los datos e inténtalo de nuevo.');
    return true;
  });
});

test('el selector de lenguaje y el estado del endpoint tienen nombres y avisos accesibles', () => {
  assert.match(aula, /<select id="ideLang" aria-label="Lenguaje de programación"/);
  assert.match(aula, /id="judgeSettingsStatus" role="status" aria-live="polite" aria-atomic="true"/);
});

test('Java ofrece botones para comprobar la conexión y cancelar la ejecución', () => {
  const source = extract('function ideInitUI(){', '\n// idePage:');
  const endpoint = { value: '' }, token = { value: 'token-local' };
  const saveButton = { className: 'btn', before(button) { this.inserted = button; } };
  const elements = { ideLang: { value: 'java' }, judgeEndpoint: endpoint, judgeToken: token };
  const runButton = { after(button) { this.inserted = button; elements[button.id] = button; } };
  let cancelled = 0;
  const document = {
    getElementById: id => elements[id] || null,
    querySelector: selector => selector === 'button[onclick="ideSaveJudgeSettings()"]' ? saveButton : selector === 'button[onclick="ideRun()"]' ? runButton : null,
    createElement: () => ({ addEventListener(type, handler) { this.event = type; this.handler = handler; } })
  };
  let checks = 0;
  const check = () => { checks++; };
  vm.runInNewContext(source + '\nideInitUI();', {
    document, IDE_LANGS: [], ccStorageGet: () => '', ideLoadTemplate() {}, ideBindShortcuts() {}, ideEnsureEditor() {}, ideSetRuntimeText() {}, ideCheckJudge: check, ideCancelJudgeRun: () => { cancelled++; }
  });
  assert.equal(endpoint.value, 'https://ce.judge0.com');
  assert.equal(saveButton.inserted.textContent, 'Comprobar conexión');
  assert.equal(saveButton.inserted.event, 'click');
  saveButton.inserted.handler();
  assert.equal(checks, 1);
  assert.equal(runButton.inserted.id, 'ideCancelRemoteRun');
  assert.equal(runButton.inserted.textContent, 'Cancelar ejecución remota');
  assert.equal(runButton.inserted.className, 'btn hide');
  runButton.inserted.handler();
  assert.equal(cancelled, 1);
});

test('Java cancela y no envía código si cambia endpoint o consentimiento durante la carga de runtimes', async () => {
  const source = extract('async function ideRunJudge0(){', '// ideLoadSql');

  async function runAfterMutation(mutate) {
    const setup = runnerContext(true);
    setup.context.ccJudgeLanguages = null;
    let currentBase = 'https://ce.judge0.com';
    let currentToken = 'session-token';
    setup.context.ideJudgeConfig = () => ({ base: currentBase, token: currentToken });
    setup.context.ideCancelJudgeRun = () => {
      const consent = setup.context.document.getElementById('ideRemoteConsent');
      if (consent) { consent.checked = false; consent.dataset.endpoint = ''; }
      setup.context.ccJudgeRunController?.abort();
    };
    let resolveLanguages;
    let languageSignal;
    setup.context.ideJudgeFetch = (endpoint, options = {}) => {
      setup.calls.push({ endpoint, options });
      if (endpoint === '/languages/') {
        languageSignal = options.signal;
        return new Promise(resolve => { resolveLanguages = resolve; });
      }
      if (options.method === 'POST') return Promise.resolve({ token: 'test-job' });
      return Promise.resolve({ status: { id: 3, description: 'Accepted' }, stdout: 'Hola\n' });
    };
    const run = vm.runInNewContext(source + '\nideRunJudge0;', setup.context);
    const pending = run();
    assert.equal(typeof resolveLanguages, 'function', 'debe estar esperando la lista de runtimes');
    mutate({ setup, setBase: value => { currentBase = value; }, setToken: value => { currentToken = value; } });
    resolveLanguages([{ id: 17, name: 'Java (OpenJDK 21)' }]);
    await pending;
    assert.equal(languageSignal.aborted, true, 'la petición pendiente debe cancelarse');
    assert.equal(setup.calls.some(call => call.options.method === 'POST'), false, 'no debe enviarse el código');
  }

  await runAfterMutation(({ setup, setBase }) => {
    setBase('https://otro-endpoint.example');
    setup.context.ideCancelJudgeRun();
  });
  await runAfterMutation(({ setup }) => {
    const consent = setup.context.document.getElementById('ideRemoteConsent');
    consent.checked = false;
    consent.dataset.endpoint = '';
    setup.context.ideCancelJudgeRun();
  });

  await runAfterMutation(({ setup, setToken }) => {
    setToken('');
    setup.context.document.getElementById('judgeToken').value = '';
    setup.context.ideCancelJudgeRun();
  });
  assert.match(aula, /id="judgeEndpoint"[^>]*oninput="ideCancelJudgeRun\(\)"/);
  assert.match(aula, /id="ideRemoteConsent"[^>]*onchange="[^"]*ideCancelJudgeRun\(\)"/);
  assert.match(aula, /id="judgeToken"[^>]*oninput="ideCancelJudgeRun\(\)"/);
});

function judgeFetchRunner(fetch) {
  const source = extract('async function ideJudgeFetch(', '\nfunction ideCancelJudgeRun');
  return vm.runInNewContext(source + '\nideJudgeFetch;', { fetch, URL, TextEncoder, TextDecoder, Uint8Array });
}

test('Judge0 acepta la lista JSON de lenguajes que devuelve /languages/', async () => {
  const languages = [
    { id: 91, name: 'Java (JDK 17.0.6)' },
    { id: 111, name: 'Kotlin (2.1.10)' }
  ];
  const judgeFetch = judgeFetchRunner(async () => ({
    ok: true,
    status: 200,
    headers: { get: () => null },
    text: async () => JSON.stringify(languages)
  }));

  const response = await judgeFetch('/languages/', {}, { base: 'https://ce.judge0.com', token: '' });

  assert.equal(Array.isArray(response), true);
  assert.equal(response.length, 2);
  assert.equal(response[0].id, 91);
  assert.equal(response[0].name, 'Java (JDK 17.0.6)');
});

test('un endpoint vacío no recupera silenciosamente el endpoint predeterminado', () => {
  const elements = { judgeEndpoint: { value: '   ' }, judgeToken: { value: 'token-local' } };
  const source = extract('function ideJudgeConfig(){', '\n// ideSaveJudgeSettings:');
  const getConfig = vm.runInNewContext(source + '\nideJudgeConfig;', {
    document: { getElementById: id => elements[id] || null },
    ccStorageGet: () => 'https://ce.judge0.com'
  });

  assert.equal(getConfig().base, '');
  assert.equal(getConfig().token, 'token-local');
  delete elements.judgeEndpoint;
  assert.equal(getConfig().base, 'https://ce.judge0.com', 'el valor guardado solo se usa si no existe el campo');
});

test('Comprobar conexión no hace solicitudes si falta el endpoint', async () => {
  const status = { textContent: '' };
  let requests = 0;
  const source = extract('async function ideCheckJudge(){', '\n// ideVersionScore:');
  const check = vm.runInNewContext(source + '\nideCheckJudge;', {
    document: { getElementById: () => status },
    ideJudgeConfig: () => ({ base: '', token: '' }),
    ideJudgeFetch: () => { requests += 1; },
    ccJudgeCheckController: null,
    AbortController
  });

  await check();
  assert.equal(requests, 0);
  assert.match(status.textContent, /Escribe una URL HTTPS/);
});

test('Comprobar conexión ignora la respuesta de una comprobación anterior', async () => {
  const status = { textContent: '' };
  const requests = [];
  const source = extract('async function ideCheckJudge(){', '\n// ideVersionScore:');
  const check = vm.runInNewContext(source + '\nideCheckJudge;', {
    document: { getElementById: () => status },
    ideJudgeConfig: () => ({ base: 'https://ce.judge0.com', token: '' }),
    ideJudgeFetch: (_path, options) => new Promise((resolve, reject) => {
      requests.push({ resolve, signal: options.signal });
      options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }),
    ccJudgeCheckController: null,
    AbortController,
    setTimeout: () => 1,
    clearTimeout() {}
  });

  const previous = check();
  const latest = check();
  assert.equal(requests.length, 2);
  assert.equal(requests[0].signal.aborted, true);
  requests[1].resolve([{ id: 91, name: 'Java (JDK 21)' }]);
  await Promise.all([previous, latest]);
  assert.match(status.textContent, /Conectado/);
});

test('Comprobar conexión termina con un mensaje cuando vence el tiempo límite', async () => {
  const status = { textContent: '' };
  let timeout;
  const source = extract('async function ideCheckJudge(){', '\n// ideVersionScore:');
  const check = vm.runInNewContext(source + '\nideCheckJudge;', {
    document: { getElementById: () => status },
    ideJudgeConfig: () => ({ base: 'https://ce.judge0.com', token: '' }),
    ideJudgeFetch: (_path, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }),
    ccJudgeCheckController: null,
    AbortController,
    setTimeout: callback => { timeout = callback; return 1; },
    clearTimeout() {}
  });

  const pending = check();
  timeout();
  await pending;
  assert.match(status.textContent, /superó el límite de 10 segundos/);
});

test('cambiar endpoint o token cancela solicitudes y revoca el consentimiento', () => {
  const consent = { checked: true, dataset: { endpoint: 'https://ce.judge0.com' } };
  const runController = new AbortController();
  const checkController = new AbortController();
  const source = extract('function ideCancelJudgeRun(){', '\n// ideCheckJudge:');
  const cancel = vm.runInNewContext(source + '\nideCancelJudgeRun;', {
    document: { getElementById: id => id === 'ideRemoteConsent' ? consent : null },
    ccJudgeRunController: runController,
    ccJudgeCheckController: checkController
  });

  cancel();
  assert.equal(consent.checked, false);
  assert.equal(consent.dataset.endpoint, '');
  assert.equal(runController.signal.aborted, true);
  assert.equal(checkController.signal.aborted, true);
});

test('el IDE Java no muestra cuerpos de error devueltos por el endpoint', async () => {
  let responseBodyRead = false;
  const fetch = async () => ({
    ok: false,
    status: 500,
    text: async () => {
      responseBodyRead = true;
      return 'stack trace at /srv/private.js with token=secret';
    }
  });
  const judgeFetch = judgeFetchRunner(fetch);

  await assert.rejects(judgeFetch('/languages/', {}, { base: 'https://ce.judge0.com', token: 'session-token' }), error => {
    assert.equal(error.message, 'El endpoint no pudo completar la petición (HTTP 500).');
    assert.doesNotMatch(error.message, /stack trace|private|secret|session-token/);
    return true;
  });
  assert.equal(responseBodyRead, false, 'no debe leer ni conservar el cuerpo de error');
});
