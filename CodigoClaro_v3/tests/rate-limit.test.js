'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRateLimiter } = require('../lib/rate-limit');

test('rate limiter cuenta por IP y ruta, comparte la ventana entre query strings y la restablece', () => {
  let current = 1000;
  const throttled = createRateLimiter({ now: () => current });
  const request = (remoteAddress, url) => ({ socket: { remoteAddress }, url });

  assert.equal(throttled(request('127.0.0.1', '/api/login?next=a'), 2), false);
  assert.equal(throttled(request('127.0.0.1', '/api/login?next=b'), 2), false);
  assert.equal(throttled(request('127.0.0.1', '/api/login'), 2), true);
  assert.equal(throttled(request('127.0.0.1', '/api/register'), 2), false);
  assert.equal(throttled(request('127.0.0.2', '/api/login'), 2), false);

  current += 15 * 60 * 1000 + 1;
  assert.equal(throttled(request('127.0.0.1', '/api/login'), 2), false);
});

test('rate limiter ignora CF-Connecting-IP si el proxy no está declarado confiable', () => {
  const throttled = createRateLimiter({ now: () => 1000 });
  const makeRequest = address => ({
    headers: { 'cf-connecting-ip': address },
    socket: { remoteAddress: '10.0.0.5' },
    url: '/api/login'
  });

  assert.equal(throttled(makeRequest('203.0.113.10'), 1), false);
  assert.equal(throttled(makeRequest('203.0.113.11'), 1), true);
});

test('rate limiter usa CF-Connecting-IP válido cuando el proxy está declarado confiable', () => {
  const throttled = createRateLimiter({ now: () => 1000, trustCloudflare: true });
  const request = clientIp => ({
    socket: { remoteAddress: '10.0.0.5' },
    url: '/api/login',
    headers: {
      'cf-connecting-ip': clientIp,
      'x-forwarded-for': '198.51.100.200'
    }
  });

  assert.equal(throttled(request('203.0.113.10'), 1), false);
  assert.equal(throttled(request('203.0.113.11'), 1), false);
  assert.equal(throttled(request('203.0.113.10'), 1), true);

  const invalidHeader = { socket: { remoteAddress: '10.0.0.5' }, url: '/api/login', headers: { 'cf-connecting-ip': 'not-an-ip' } };
  assert.equal(throttled(invalidHeader, 1), false);
});

test('rate limiter no supera su capacidad y vuelve a admitir nuevas entradas al vencer la ventana', () => {
  let current = 1000;
  const throttled = createRateLimiter({ now: () => current, maxEntries: 1 });
  const request = remoteAddress => ({ socket: { remoteAddress }, url: '/api/login' });

  assert.equal(throttled(request('127.0.0.1'), 1), false);
  assert.equal(throttled(request('127.0.0.2'), 1), true);

  current += 15 * 60 * 1000 + 1;
  assert.equal(throttled(request('127.0.0.2'), 1), false);
  assert.equal(throttled(request('127.0.0.3'), 1), true);

  const infiniteCapacity = createRateLimiter({ now: () => current, maxEntries: Infinity });
  for (let i = 1; i <= 5000; i++) {
    assert.equal(infiniteCapacity({ socket: { remoteAddress: '10.0.0.1' }, url: `/login/${i}` }, 1), false);
  }
  assert.equal(infiniteCapacity({ socket: { remoteAddress: '10.0.0.1' }, url: '/login/5001' }, 1), true);
});
