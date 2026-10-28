'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workflowRoot = path.resolve(__dirname, '..', '..', '.github', 'workflows');

test('CI y Pages fijan cada acción a un commit inmutable', () => {
  for (const file of ['ci.yml', 'pages.yml']) {
    const workflow = fs.readFileSync(path.join(workflowRoot, file), 'utf8');
    const actions = [...workflow.matchAll(/^\s*uses:\s*([^\s#]+)/gm)].map(match => match[1]);
    assert.ok(actions.length > 0, file + ' debe declarar acciones');
    for (const action of actions) {
      assert.match(action, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+@[0-9a-f]{40}$/, file + ': ' + action);
    }
    assert.doesNotMatch(workflow, /pull_request_target/);
  }
});

test('Pages solo publica la demo estática de docs', () => {
  const pages = fs.readFileSync(path.join(workflowRoot, 'pages.yml'), 'utf8');
  assert.match(pages, /path:\s*CodigoClaro_v3\/docs\b/);
  assert.doesNotMatch(pages, /node server\.js|npm start/i);
});
