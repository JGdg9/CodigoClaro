'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('los backends disponibles rechazan secretos de ejemplo aunque cambien mayúsculas o espacios', t => {
  const examples = [
    'CAMBIA_ESTO_GENERA_UN_SECRET_ALEATORIO_DE_64_CARACTERES',
    '  cambia_esto_GENERA_UN_SECRET_ALEATORIO_DE_64_CARACTERES  '
  ];
  const servers = [['server.js', { DB_PATH: ':memory:' }]];
  try {
    require.resolve('pg', { paths: [root] });
    servers.push(['server-postgres.js', { DATABASE_URL: 'postgresql://user:pass@127.0.0.1:1/not-used' }]);
  } catch {
    t.diagnostic('No se ha instalado pg en este entorno; la prueba del backend PostgreSQL se ejecutará en CI después de npm ci.');
  }

  for (const [server, config] of servers) {
    for (const secret of examples) {
      const result = spawnSync(process.execPath, [server], {
        cwd: root,
        encoding: 'utf8',
        timeout: 3000,
        env: { ...process.env, ...config, NODE_ENV: 'production', SESSION_SECRET: secret }
      });
      const output = `${result.stdout || ''}\n${result.stderr || ''}`;

      assert.equal(result.status, 1, `${server} con secreto ${secret}: ${output}`);
      assert.match(output, /reemplaza el valor de ejemplo/i);
      assert.doesNotMatch(output, /ECONNREFUSED|connect ECONN/i);
    }
  }
});
