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

function runnerContext(consentChecked, { timeoutImmediately = false } = {}) {
  const calls = [];
  const messages = [];
  let runTimeoutCallback = null;
  const consent = { checked: consentChecked, dataset: { endpoint: 'https://ce.judge0.com' } };
  const elements = {
    ideJavaRemoteConsent: consent,
    ideStdin: { value: 'Ada' }
  };
  return {
    calls,
    messages,
    context: {
      URL,
      AbortController,
      document: { getElementById: id => elements[id] || null },
      ideLang: () => ({ id: 'java', label: 'Java' }),
      ideGetCode: () => 'public class Main { public static void main(String[] args) { System.out.println("Hola"); } }',
      ideShowOutput: (message, kind) => messages.push({ message, kind }),
      ideStatus: message => messages.push({ status: message }),
      ideJudgeConfig: () => ({ base: 'https://ce.judge0.com' }),
      ideSaveJudgeSettings: () => {},
      ideVersionScore: () => 17,
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
        return { status: { id: 3, description: 'Accepted' }, stdout: 'Hola\n' };
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
    }
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
  const source = extract('async function ideRunJudge0(){', '\n// ideLoadSql');
  const setup = runnerContext(false);
  const run = vm.runInNewContext(source + '\nideRunJudge0;', setup.context);

  await run();

  assert.equal(setup.calls.length, 0, 'no debe consultarse ni enviarse nada al servicio');
  assert.match(setup.messages[0].message, /consentimiento/i);
});

test('con consentimiento Java compila y muestra la salida devuelta por el servicio simulado', async () => {
  const source = extract('async function ideRunJudge0(){', '\n// ideLoadSql');
  const setup = runnerContext(true);
  const run = vm.runInNewContext(source + '\nideRunJudge0;', setup.context);

  await run();

  const post = setup.calls.find(call => call.options.method === 'POST');
  assert.ok(post, 'debe crear un envío de código Java');
  assert.equal(post.options.body && JSON.parse(post.options.body).source_code, setup.context.ideGetCode());
  assert.equal(JSON.parse(post.options.body).stdin, 'Ada');
  assert.match(setup.messages.filter(message => message.message).at(-1)?.message || '', /Hola/);
  assert.equal(setup.messages.find(message => message.kind)?.kind, 'ok');
});

test('Java invalida la lista de runtimes si se cambia el endpoint', async () => {
  const source = extract('async function ideRunJudge0(){', '\n// ideLoadSql');
  const setup = runnerContext(true);
  setup.context.ideJudgeConfig = () => ({ base: 'https://judge.example', token: '' });
  setup.context.document.getElementById('ideJavaRemoteConsent').dataset.endpoint = 'https://judge.example';
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
  const source = extract('async function ideRunJudge0(){', '\n// ideLoadSql');
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
