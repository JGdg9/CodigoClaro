const { test } = require('node:test');
const assert = require('node:assert/strict');
const { acceptsHtml, sendHtmlError } = require('../lib/http-errors');

function fakeResponse() {
  return {
    statusCode: 0,
    headers: {},
    body: null,
    writeHead(status, headers) {
      this.statusCode = status;
      this.headers = headers;
    },
    end(body) {
      this.body = body || '';
    }
  };
}

test('acceptsHtml reconoce navegaciones HTML y rechaza respuestas JSON', () => {
  assert.equal(acceptsHtml({ headers: { accept: 'text/html,application/xhtml+xml' } }), true);
  assert.equal(acceptsHtml({ headers: { accept: 'application/json' } }), false);
  assert.equal(acceptsHtml({ headers: {} }), false);
});

for (const status of [404, 500]) {
  test('sendHtmlError emite página ' + status + ' no cacheable y genérica', () => {
    const res = fakeResponse();
    sendHtmlError({ method: 'GET' }, res, status);
    assert.equal(res.statusCode, status);
    assert.match(res.headers['Content-Type'], /text\/html/);
    assert.equal(res.headers['Cache-Control'], 'no-store');
    assert.equal(Number(res.headers['Content-Length']), Buffer.byteLength(res.body));
    assert.match(res.body, /CódigoClaro/);
    assert.match(res.body, /Volver a la portada/);
    assert.doesNotMatch(res.body, /stack trace|\/Users\//i);
  });
}

test('sendHtmlError conserva el estado para HEAD y no envía cuerpo', () => {
  const res = fakeResponse();
  sendHtmlError({ method: 'HEAD' }, res, 404);
  assert.equal(res.statusCode, 404);
  assert.equal(res.body, '');
});
