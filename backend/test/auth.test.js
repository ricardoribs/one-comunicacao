const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const app = require('../src/app');
const userModel = require('../src/models/userModel');
const pool = require('../src/config/db');
const env = require('../src/config/env');
const mfaService = require('../src/services/mfaService');
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

async function completeLoginWithMfa(email, initialResponse, ipAddress) {
  if (initialResponse.body?.accessToken || initialResponse.status !== 200) {
    return initialResponse;
  }

  const challengeToken = initialResponse.body.challenge_token || initialResponse.body.challengeToken;
  if (!challengeToken) {
    return initialResponse;
  }

  if (initialResponse.body.mfa_enrollment_required || initialResponse.body.mfaEnrollmentRequired) {
    const setup = await request(app)
      .post('/api/auth/mfa/totp/setup')
      .set('X-Forwarded-For', ipAddress)
      .send({ challenge_token: challengeToken });
    assert.equal(setup.status, 200);
    assert.ok(setup.body.secret);
    assert.match(setup.body.qr_code_data_url || '', /^data:image\/png;base64,/);
    const otp = mfaService.generateCurrentOtp(setup.body.secret);
    return request(app)
      .post('/api/auth/mfa/totp/enroll')
      .set('X-Forwarded-For', ipAddress)
      .send({ challenge_token: challengeToken, otp });
  }

  const user = await userModel.findByEmail(email);
  assert.ok(user?.mfa_totp_secret_encrypted);
  const secret = mfaService.decryptSecret(user.mfa_totp_secret_encrypted);
  const otp = mfaService.generateCurrentOtp(secret);
  return request(app)
    .post('/api/auth/mfa/totp/verify')
    .set('X-Forwarded-For', ipAddress)
    .send({ challenge_token: challengeToken, otp });
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

test('admin recebe challenge MFA e conclui o login com TOTP', async () => {
  const email = `auth.admin.mfa.${Date.now()}@one.com`;
  const user = await userModel.create({
    name: 'Admin MFA',
    email,
    password: await bcrypt.hash('Valid@Test123', 12),
    role: 'admin',
    is_active: true,
    email_verified_at: new Date().toISOString(),
  });

  const ipAddress = nextTestIp();
  const initial = await request(app)
    .post('/api/auth/login')
    .set('X-Forwarded-For', ipAddress)
    .send({
      email,
      password: 'Valid@Test123',
    });

  assert.equal(initial.status, 200);
  assert.equal(initial.body.mfa_enrollment_required, true);
  assert.equal(Boolean(initial.body.accessToken), false);

  const finalLogin = await completeLoginWithMfa(email, initial, ipAddress);
  assert.equal(finalLogin.status, 200);
  assert.ok(finalLogin.body.accessToken);

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

test('usuario autenticado consulta e atualiza o proprio perfil', async () => {
  const email = `auth.profile.${Date.now()}@one.com`;
  const user = await userModel.create({
    name: 'Perfil Atual',
    email,
    password: await bcrypt.hash('Valid@Test123', 12),
    role: 'designer',
    is_active: true,
    email_verified_at: new Date().toISOString(),
  });

  const login = await request(app)
    .post('/api/auth/login')
    .set('X-Forwarded-For', nextTestIp())
    .send({
      email,
      password: 'Valid@Test123',
    });

  const profile = await request(app)
    .get('/api/users/me/profile')
    .set('Authorization', `Bearer ${login.body.accessToken}`);

  assert.equal(profile.status, 200);
  assert.equal(profile.body.user.name, 'Perfil Atual');
  assert.equal(profile.body.user.phone, null);

  const updated = await request(app)
    .patch('/api/users/me/profile')
    .set('Authorization', `Bearer ${login.body.accessToken}`)
    .send({
      name: 'Perfil Atualizado',
      phone: '+55 98 99999-0000',
      job_title: 'Coordenacao de Projetos',
      avatar_url: 'https://cdn.one.test/avatar.png',
    });

  assert.equal(updated.status, 200);
  assert.equal(updated.body.user.name, 'Perfil Atualizado');
  assert.equal(updated.body.user.phone, '+55 98 99999-0000');
  assert.equal(updated.body.user.job_title, 'Coordenacao de Projetos');
  assert.equal(updated.body.user.avatar_url, 'https://cdn.one.test/avatar.png');

  const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.accessToken}`);
  assert.equal(me.status, 200);
  assert.equal(me.body.user.name, 'Perfil Atualizado');
  assert.equal(me.body.user.phone, '+55 98 99999-0000');
  assert.equal(me.body.user.job_title, 'Coordenacao de Projetos');

  await userModel.remove(user.id);
});

test('usuario autenticado ajusta preferencias de notificacao e envia avatar real', async () => {
  const email = `auth.profile-assets.${Date.now()}@one.com`;
  const user = await userModel.create({
    name: 'Perfil Midia',
    email,
    password: await bcrypt.hash('Valid@Test123', 12),
    role: 'designer',
    is_active: true,
    email_verified_at: new Date().toISOString(),
  });

  const login = await request(app)
    .post('/api/auth/login')
    .set('X-Forwarded-For', nextTestIp())
    .send({
      email,
      password: 'Valid@Test123',
    });

  const preferencesResponse = await request(app)
    .patch('/api/users/me/notification-preferences')
    .set('Authorization', `Bearer ${login.body.accessToken}`)
    .send({
      task_assigned: true,
      task_completed: false,
      calendar_24h: true,
      calendar_1h: false,
    });

  assert.equal(preferencesResponse.status, 200);
  assert.equal(preferencesResponse.body.preferences.task_assigned, true);
  assert.equal(preferencesResponse.body.preferences.task_completed, false);
  assert.equal(preferencesResponse.body.preferences.calendar_24h, true);
  assert.equal(preferencesResponse.body.preferences.calendar_1h, false);

  const tempAvatarPath = path.join(os.tmpdir(), `one-avatar-${Date.now()}.png`);
  fs.writeFileSync(
    tempAvatarPath,
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0ioAAAAASUVORK5CYII=',
      'base64'
    )
  );

  const avatarResponse = await request(app)
    .post('/api/users/me/avatar')
    .set('Authorization', `Bearer ${login.body.accessToken}`)
    .attach('file', tempAvatarPath);

  fs.unlinkSync(tempAvatarPath);

  assert.equal(avatarResponse.status, 201);
  assert.match(avatarResponse.body.user.avatar_url, /^\/api\/files\/\d+\/content$/);

  const profile = await request(app)
    .get('/api/users/me/profile')
    .set('Authorization', `Bearer ${login.body.accessToken}`);

  assert.equal(profile.status, 200);
  assert.equal(profile.body.user.notification_preferences.task_completed, false);
  assert.match(profile.body.user.avatar_url, /^\/api\/files\/\d+\/content$/);

  const removeAvatarResponse = await request(app)
    .delete('/api/users/me/avatar')
    .set('Authorization', `Bearer ${login.body.accessToken}`);

  assert.equal(removeAvatarResponse.status, 200);
  assert.equal(removeAvatarResponse.body.user.avatar_url, null);

  await userModel.remove(user.id);
});

test('usuario autenticado altera a propria senha', async () => {
  const email = `auth.password.${Date.now()}@one.com`;
  const user = await userModel.create({
    name: 'Senha Atual',
    email,
    password: await bcrypt.hash('Valid@Test123', 12),
    role: 'designer',
    is_active: true,
    email_verified_at: new Date().toISOString(),
  });

  const login = await request(app)
    .post('/api/auth/login')
    .set('X-Forwarded-For', nextTestIp())
    .send({
      email,
      password: 'Valid@Test123',
    });

  const changed = await request(app)
    .patch('/api/users/me/password')
    .set('Authorization', `Bearer ${login.body.accessToken}`)
    .send({
      current_password: 'Valid@Test123',
      new_password: 'Updated@Test123',
    });

  assert.equal(changed.status, 200);
  assert.equal(changed.body.message, 'Senha atualizada com sucesso.');

  const oldLogin = await request(app)
    .post('/api/auth/login')
    .set('X-Forwarded-For', nextTestIp())
    .send({
      email,
      password: 'Valid@Test123',
    });
  assert.equal(oldLogin.status, 401);

  const newLogin = await request(app)
    .post('/api/auth/login')
    .set('X-Forwarded-For', nextTestIp())
    .send({
      email,
      password: 'Updated@Test123',
    });
  assert.equal(newLogin.status, 200);

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
