const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const app = require('../src/app');
const userModel = require('../src/models/userModel');
const pool = require('../src/config/db');
const env = require('../src/config/env');
let testIpCounter = 10;

async function createVerifiedUser(email) {
  const password = await bcrypt.hash('Valid@Test123', 12);
  return userModel.create({
    name: 'Test User',
    email,
    password,
    role: 'client',
    is_active: true,
    email_verified_at: new Date().toISOString(),
  });
}

function findRefreshCookie(setCookie = []) {
  const cookie = setCookie.find((value) => value.startsWith(`${env.refreshCookieName}=`));
  return cookie ? cookie.split(';')[0] : null;
}

function nextTestIp() {
  testIpCounter += 1;
  return `198.51.100.${testIpCounter}`;
}

test('login valido retorna access token e cookie de refresh', async () => {
  const email = `auth.valid.${Date.now()}@one.com`;
  const user = await createVerifiedUser(email);

  const response = await request(app).post('/api/auth/login').send({
    email,
    password: 'Valid@Test123',
  }).set('X-Forwarded-For', nextTestIp());

  assert.equal(response.status, 200);
  assert.ok(response.body.accessToken);
  assert.ok(response.headers['set-cookie']);

  await userModel.remove(user.id);
});

test('senha errada retorna 401', async () => {
  const email = `auth.invalid.${Date.now()}@one.com`;
  const user = await createVerifiedUser(email);

  const response = await request(app).post('/api/auth/login').send({
    email,
    password: 'Errada@Test123',
  }).set('X-Forwarded-For', nextTestIp());

  assert.equal(response.status, 401);
  await userModel.remove(user.id);
});

test('hash de senha invalido nao derruba login com 500', async () => {
  const email = `auth.bad-hash.${Date.now()}@one.com`;
  const user = await userModel.create({
    name: 'Broken Hash',
    email,
    password: 'hash-legado-invalido',
    role: 'client',
    is_active: true,
    email_verified_at: new Date().toISOString(),
  });

  const response = await request(app).post('/api/auth/login').send({
    email,
    password: 'Valid@Test123',
  }).set('X-Forwarded-For', nextTestIp());

  assert.equal(response.status, 401);
  await userModel.remove(user.id);
});

test('token adulterado em /auth/me retorna 401', async () => {
  const response = await request(app).get('/api/auth/me').set('Authorization', 'Bearer token-falso');
  assert.equal(response.status, 401);
});

test('cliente nao acessa rota de admin', async () => {
  const email = `auth.client.${Date.now()}@one.com`;
  const user = await createVerifiedUser(email);
  const login = await request(app).post('/api/auth/login').send({
    email,
    password: 'Valid@Test123',
  }).set('X-Forwarded-For', nextTestIp());

  const response = await request(app).get('/api/users').set('Authorization', `Bearer ${login.body.accessToken}`);
  assert.equal(response.status, 403);

  await userModel.remove(user.id);
});

test('refresh token rotativo invalida o token anterior e revoga todas as sessoes ao detectar replay', async () => {
  const email = `auth.refresh.${Date.now()}@one.com`;
  const user = await createVerifiedUser(email);

  const login = await request(app).post('/api/auth/login').send({
    email,
    password: 'Valid@Test123',
  }).set('X-Forwarded-For', nextTestIp());

  const originalRefreshCookie = findRefreshCookie(login.headers['set-cookie']);
  assert.ok(originalRefreshCookie);

  const firstRefresh = await request(app).post('/api/auth/refresh').set('Cookie', originalRefreshCookie);
  assert.equal(firstRefresh.status, 200);

  const rotatedRefreshCookie = findRefreshCookie(firstRefresh.headers['set-cookie']);
  assert.ok(rotatedRefreshCookie);
  assert.notEqual(rotatedRefreshCookie, originalRefreshCookie);

  const replayAttempt = await request(app).post('/api/auth/refresh').set('Cookie', originalRefreshCookie);
  assert.equal(replayAttempt.status, 401);

  const rotatedRefresh = await request(app).post('/api/auth/refresh').set('Cookie', rotatedRefreshCookie);
  assert.equal(rotatedRefresh.status, 401);

  await userModel.remove(user.id);
});

test('usuario de um cliente nao recebe invoices de outro cliente', async () => {
  const clientA = await pool.query(
    "INSERT INTO clients (name, company, plan, mrr) VALUES ($1, $2, 'growth', 0) RETURNING id",
    [`Client A ${Date.now()}`, 'Empresa A']
  );
  const clientB = await pool.query(
    "INSERT INTO clients (name, company, plan, mrr) VALUES ($1, $2, 'growth', 0) RETURNING id",
    [`Client B ${Date.now()}`, 'Empresa B']
  );

  const password = await bcrypt.hash('Valid@Test123', 12);
  const userA = await userModel.create({
    name: 'Tenant A',
    email: `tenant.a.${Date.now()}@one.com`,
    password,
    role: 'client',
    client_id: clientA.rows[0].id,
    is_active: true,
    email_verified_at: new Date().toISOString(),
  });

  await pool.query('INSERT INTO invoices (client_id, amount, status, due_date) VALUES ($1, $2, $3, $4)', [
    clientB.rows[0].id,
    999,
    'Em aberto',
    new Date().toISOString().slice(0, 10),
  ]);

  const login = await request(app).post('/api/auth/login').send({
    email: userA.email,
    password: 'Valid@Test123',
  }).set('X-Forwarded-For', nextTestIp());

  const response = await request(app).get('/api/invoices').set('Authorization', `Bearer ${login.body.accessToken}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.length, 0);

  await userModel.remove(userA.id);
  await pool.query('DELETE FROM invoices WHERE client_id IN ($1, $2)', [clientA.rows[0].id, clientB.rows[0].id]);
  await pool.query('DELETE FROM clients WHERE id IN ($1, $2)', [clientA.rows[0].id, clientB.rows[0].id]);
});
