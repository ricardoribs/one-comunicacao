const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const env = require('../src/config/env');

test('CORS permite POST same-origin mesmo quando o host nao esta em CORS_ORIGINS', async (t) => {
  const originalCorsOrigins = env.corsOrigins.slice();
  const originalAppBaseUrl = env.appBaseUrl;
  env.corsOrigins.splice(0, env.corsOrigins.length, 'https://app.example.test');
  env.appBaseUrl = 'https://app.example.test';
  t.after(() => {
    env.corsOrigins.splice(0, env.corsOrigins.length, ...originalCorsOrigins);
    env.appBaseUrl = originalAppBaseUrl;
  });

  const origin = 'https://app-preview.example.test';
  const response = await request(app)
    .post('/api/auth/login')
    .set('Host', 'app-preview.example.test')
    .set('Origin', origin)
    .send({ email: 'cors.same-host@example.test', password: 'wrong-password' });

  assert.equal(response.status, 401);
  assert.equal(response.headers['access-control-allow-origin'], origin);
});

test('CORS bloqueia POST com Origin externo quando CORS_ORIGINS esta configurado', async (t) => {
  const originalCorsOrigins = env.corsOrigins.slice();
  const originalAppBaseUrl = env.appBaseUrl;
  env.corsOrigins.splice(0, env.corsOrigins.length, 'https://app.example.test');
  env.appBaseUrl = 'https://app.example.test';
  t.after(() => {
    env.corsOrigins.splice(0, env.corsOrigins.length, ...originalCorsOrigins);
    env.appBaseUrl = originalAppBaseUrl;
  });

  const response = await request(app)
    .post('/api/auth/login')
    .set('Host', 'app-preview.example.test')
    .set('Origin', 'https://evil.example.test')
    .send({ email: 'cors.blocked@example.test', password: 'wrong-password' });

  assert.equal(response.status, 403);
  assert.equal(response.body.message, 'Origem nao permitida por CORS.');
});
