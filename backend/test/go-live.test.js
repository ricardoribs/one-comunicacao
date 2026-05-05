const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const env = require('../src/config/env');
const userModel = require('../src/models/userModel');
const mfaService = require('../src/services/mfaService');

async function createClient(name, company, managerId = null) {
  const { rows } = await pool.query(
    `INSERT INTO clients (name, company, plan, mrr, manager_id)
     VALUES ($1, $2, 'One Start', 0, $3)
     RETURNING id`,
    [name, company, managerId]
  );
  return rows[0].id;
}

async function createUser({ name, email, role, clientId = null, password = 'Valid@Test123' }) {
  const hash = await bcrypt.hash(password, 12);
  return userModel.create({
    name,
    email,
    password: hash,
    role,
    client_id: clientId,
    is_active: true,
    email_verified_at: new Date().toISOString(),
  });
}

async function login(email, password = 'Valid@Test123') {
  global.__oneLoginRequestCounter = (global.__oneLoginRequestCounter || 10) + 1;
  const ip = `203.0.113.${global.__oneLoginRequestCounter}`;
  const initial = await request(app)
    .post('/api/auth/login')
    .set('X-Forwarded-For', ip)
    .send({ email, password });

  if (initial.body?.accessToken || initial.status !== 200) {
    return initial;
  }

  const challengeToken = initial.body.challenge_token || initial.body.challengeToken;
  if (!challengeToken) {
    return initial;
  }

  if (initial.body.mfa_enrollment_required || initial.body.mfaEnrollmentRequired) {
    const setup = await request(app)
      .post('/api/auth/mfa/totp/setup')
      .set('X-Forwarded-For', ip)
      .send({ challenge_token: challengeToken });
    assert.equal(setup.status, 200);
    assert.ok(setup.body.secret);

    const otp = mfaService.generateCurrentOtp(setup.body.secret);
    return request(app)
      .post('/api/auth/mfa/totp/enroll')
      .set('X-Forwarded-For', ip)
      .send({
        challenge_token: challengeToken,
        otp,
      });
  }

  const user = await userModel.findByEmail(email);
  assert.ok(user?.mfa_totp_secret_encrypted);
  const secret = mfaService.decryptSecret(user.mfa_totp_secret_encrypted);
  const otp = mfaService.generateCurrentOtp(secret);
  return request(app)
    .post('/api/auth/mfa/totp/verify')
    .set('X-Forwarded-For', ip)
    .send({
      challenge_token: challengeToken,
      otp,
    });
}

test('readiness publico responde 200 sem checks internos', { concurrency: false }, async () => {
  const response = await request(app).get('/api/ready');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: 'ok',
    database: 'up',
  });
});

test('health publico responde 200 com payload reduzido', { concurrency: false }, async () => {
  const response = await request(app).get('/api/health');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: 'ok',
    database: 'up',
  });
});

test('health interno exige admin e expõe checks detalhados apenas autenticado', { concurrency: false }, async () => {
  const suffix = Date.now() + 200;
  const admin = await createUser({
    name: `Admin Health ${suffix}`,
    email: `admin.health.${suffix}@one.test`,
    role: 'admin',
  });

  const unauthenticated = await request(app).get('/api/health/internal');
  assert.equal(unauthenticated.status, 401);

  const auth = await login(admin.email);
  const response = await request(app).get('/api/health/internal').set('Authorization', `Bearer ${auth.body.accessToken}`);

  assert.equal(response.status, 200);
  assert.ok(['ok', 'degraded'].includes(response.body.status));
  assert.equal(response.body.checks.database.status, 'up');
  assert.ok(response.body.checks.mail.status);

  await userModel.remove(admin.id);
});

test('listagem de usuarios omite metadados sensiveis no endpoint principal', { concurrency: false }, async () => {
  const suffix = Date.now() + 201;
  const admin = await createUser({
    name: `Admin Users ${suffix}`,
    email: `admin.users.${suffix}@one.test`,
    role: 'admin',
  });

  const auth = await login(admin.email);
  const response = await request(app).get('/api/users').set('Authorization', `Bearer ${auth.body.accessToken}`);

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body));
  assert.ok(response.body.length >= 1);

  const currentAdmin = response.body.find((user) => user.id === admin.id);
  assert.ok(currentAdmin);
  assert.equal('failed_login_attempts' in currentAdmin, false);
  assert.equal('locked_until' in currentAdmin, false);
  assert.equal('last_login_at' in currentAdmin, false);
  assert.equal('password' in currentAdmin, false);

  await userModel.remove(admin.id);
});

test('financeiro interno permite lançar e listar custos por cliente', { concurrency: false }, async () => {
  const suffix = Date.now() + 210;
  const admin = await createUser({
    name: `Admin Cost ${suffix}`,
    email: `admin.cost.${suffix}@one.test`,
    role: 'admin',
  });
  const clientId = await createClient(`Cliente Cost ${suffix}`, `Empresa Cost ${suffix}`, admin.id);

  const auth = await login(admin.email);
  const created = await request(app)
    .post('/api/cost-entries')
    .set('Authorization', `Bearer ${auth.body.accessToken}`)
    .send({
      client_id: clientId,
      category: 'operacao',
      description: 'Deslocamento da equipe',
      amount: 1250.5,
      incurred_on: '2026-03-31',
    });

  assert.equal(created.status, 201);
  assert.equal(created.body.client_id, clientId);
  assert.equal(created.body.category, 'operacao');
  assert.equal(Number(created.body.amount), 1250.5);

  const listed = await request(app)
    .get('/api/cost-entries')
    .set('Authorization', `Bearer ${auth.body.accessToken}`);

  assert.equal(listed.status, 200);
  assert.equal(Array.isArray(listed.body), true);
  assert.equal(listed.body.some((entry) => Number(entry.id) === Number(created.body.id)), true);

  await pool.query('DELETE FROM cost_entries');
  await pool.query('DELETE FROM clients WHERE id = $1', [clientId]);
  await userModel.remove(admin.id);
});

test('calendario interno permite leitura para a equipe e escrita apenas para admin ou gestor', { concurrency: false }, async () => {
  const suffix = Date.now() + 205;
  const admin = await createUser({
    name: `Admin Calendar ${suffix}`,
    email: `admin.calendar.${suffix}@one.test`,
    role: 'admin',
  });
  const designer = await createUser({
    name: `Designer Calendar ${suffix}`,
    email: `designer.calendar.${suffix}@one.test`,
    role: 'designer',
  });

  const adminAuth = await login(admin.email);
  const startsAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

  const created = await request(app)
    .post('/api/calendar-events')
    .set('Authorization', `Bearer ${adminAuth.body.accessToken}`)
    .send({
      title: 'Alinhamento de pauta semanal',
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      location: 'Sala principal',
      color: 'pink',
      description: 'Definição das entregas da semana.',
    });

  assert.equal(created.status, 201);
  assert.equal(created.body.title, 'Alinhamento de pauta semanal');

  const designerAuth = await login(designer.email);
  const listed = await request(app)
    .get('/api/calendar-events')
    .query({
      from: new Date(startsAt.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      to: new Date(endsAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    })
    .set('Authorization', `Bearer ${designerAuth.body.accessToken}`);

  assert.equal(listed.status, 200);
  assert.equal(Array.isArray(listed.body), true);
  assert.equal(listed.body.some((event) => Number(event.id) === Number(created.body.id)), true);

  const forbiddenCreate = await request(app)
    .post('/api/calendar-events')
    .set('Authorization', `Bearer ${designerAuth.body.accessToken}`)
    .send({
      title: 'Tentativa sem permissão',
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
    });

  assert.equal(forbiddenCreate.status, 403);

  await pool.query('DELETE FROM notifications');
  await pool.query('DELETE FROM calendar_event_reminders');
  await pool.query('DELETE FROM calendar_events');
  await userModel.remove(designer.id);
  await userModel.remove(admin.id);
});

test('notificacoes criam lembrete de evento quando a agenda entra na janela de aviso', { concurrency: false }, async () => {
  const suffix = Date.now() + 206;
  const admin = await createUser({
    name: `Admin Reminder ${suffix}`,
    email: `admin.reminder.${suffix}@one.test`,
    role: 'admin',
  });
  const designer = await createUser({
    name: `Designer Reminder ${suffix}`,
    email: `designer.reminder.${suffix}@one.test`,
    role: 'designer',
  });

  const adminAuth = await login(admin.email);
  const startsAt = new Date(Date.now() + 30 * 60 * 1000);
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

  const created = await request(app)
    .post('/api/calendar-events')
    .set('Authorization', `Bearer ${adminAuth.body.accessToken}`)
    .send({
      title: 'Cobertura externa da equipe',
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      color: 'blue',
    });

  assert.equal(created.status, 201);

  const designerAuth = await login(designer.email);
  const unreadCount = await request(app)
    .get('/api/notifications/unread-count')
    .set('Authorization', `Bearer ${designerAuth.body.accessToken}`);

  assert.equal(unreadCount.status, 200);
  assert.equal(unreadCount.body.total >= 1, true);

  const notifications = await request(app)
    .get('/api/notifications')
    .set('Authorization', `Bearer ${designerAuth.body.accessToken}`);

  assert.equal(notifications.status, 200);
  const reminder = notifications.body.find(
    (item) => item.type === 'calendar_event_reminder_1h' && Number(item.entity_id) === Number(created.body.id)
  );
  assert.ok(reminder);
  assert.equal(reminder.entity_type, 'calendar_event');

  await pool.query('DELETE FROM notifications');
  await pool.query('DELETE FROM calendar_event_reminders');
  await pool.query('DELETE FROM calendar_events');
  await userModel.remove(designer.id);
  await userModel.remove(admin.id);
});

test('cliente nao envia mensagem para outro cliente fora do canal interno permitido', { concurrency: false }, async () => {
  const suffix = Date.now() + 202;
  const gestor = await createUser({
    name: `Gestor Message ${suffix}`,
    email: `gestor.message.${suffix}@one.test`,
    role: 'gestor',
  });

  const clientAId = await createClient(`Cliente Msg A ${suffix}`, 'Empresa Msg A', gestor.id);
  const clientBId = await createClient(`Cliente Msg B ${suffix}`, 'Empresa Msg B', gestor.id);

  const clientA = await createUser({
    name: `Cliente A Msg ${suffix}`,
    email: `clientea.message.${suffix}@one.test`,
    role: 'client',
    clientId: clientAId,
  });
  const clientB = await createUser({
    name: `Cliente B Msg ${suffix}`,
    email: `clienteb.message.${suffix}@one.test`,
    role: 'client',
    clientId: clientBId,
  });

  const auth = await login(clientA.email);
  const blocked = await request(app)
    .post('/api/messages')
    .set('Authorization', `Bearer ${auth.body.accessToken}`)
    .send({
      receiver_id: clientB.id,
      context_type: 'general',
      content: 'Mensagem indevida entre clientes',
    });

  assert.equal(blocked.status, 403);

  const allowed = await request(app)
    .post('/api/messages')
    .set('Authorization', `Bearer ${auth.body.accessToken}`)
    .send({
      receiver_id: gestor.id,
      context_type: 'general',
      content: 'Mensagem permitida para a equipe interna vinculada',
    });

  assert.equal(allowed.status, 201);

  await pool.query('DELETE FROM messages');
  await userModel.remove(clientB.id);
  await userModel.remove(clientA.id);
  await userModel.remove(gestor.id);
  await pool.query('DELETE FROM clients');
});

test(
  'dashboard do cliente respeita tenant e retorna apenas dados do proprio cliente',
  { concurrency: false },
  async () => {
    const suffix = Date.now();
    const gestor = await createUser({
      name: `Gestor ${suffix}`,
      email: `gestor.dashboard.${suffix}@one.test`,
      role: 'gestor',
    });

    const clientAId = await createClient(`Cliente A ${suffix}`, 'Empresa A', gestor.id);
    const clientBId = await createClient(`Cliente B ${suffix}`, 'Empresa B', gestor.id);

    const clientUser = await createUser({
      name: `Cliente A ${suffix}`,
      email: `cliente.dashboard.${suffix}@one.test`,
      role: 'client',
      clientId: clientAId,
    });

    await pool.query(
      `INSERT INTO campaigns (client_id, name, channel, audience, objective, budget, status)
     VALUES ($1, 'Campanha A', 'Meta', 'Local', 'Leads', 1000, 'Ativa'),
            ($2, 'Campanha B', 'Google', 'Regional', 'Leads', 2000, 'Ativa')`,
      [clientAId, clientBId]
    );

    const campaigns = await pool.query('SELECT id, client_id FROM campaigns ORDER BY id ASC');
    const campaignA = campaigns.rows.find((item) => Number(item.client_id) === Number(clientAId));
    const campaignB = campaigns.rows.find((item) => Number(item.client_id) === Number(clientBId));

    await pool.query(
      `INSERT INTO metrics (campaign_id, period, leads, revenue, impressions, clicks)
     VALUES ($1, CURRENT_DATE, 12, 4500, 1000, 120),
            ($2, CURRENT_DATE, 99, 9900, 2000, 220)`,
      [campaignA.id, campaignB.id]
    );

    await pool.query(
      `INSERT INTO reports (client_id, title, report_month, summary, file_url)
     VALUES ($1, 'Relatório Cliente A', CURRENT_DATE, 'Resumo A', 'https://example.com/a.pdf'),
            ($2, 'Relatório Cliente B', CURRENT_DATE, 'Resumo B', 'https://example.com/b.pdf')`,
      [clientAId, clientBId]
    );

    await pool.query(
      `INSERT INTO materials (client_id, campaign_id, uploaded_by, title, status, url)
     VALUES ($1, $2, $3, 'Criativo A', 'Pendente', 'https://example.com/material-a'),
            ($4, $5, $3, 'Criativo B', 'Pendente', 'https://example.com/material-b')`,
      [clientAId, campaignA.id, gestor.id, clientBId, campaignB.id]
    );

    await pool.query(
      `INSERT INTO invoices (client_id, amount, status, due_date)
     VALUES ($1, 1500, 'Em aberto', CURRENT_DATE),
            ($2, 9900, 'Em aberto', CURRENT_DATE)`,
      [clientAId, clientBId]
    );

    await pool.query(
      `INSERT INTO tasks (client_id, assigned_to, status, type, column_name, title, description, deadline)
     VALUES ($1, $2, 'Em andamento', 'design', 'doing', 'Task A', 'Descricao A', CURRENT_DATE),
            ($3, $2, 'Em andamento', 'design', 'doing', 'Task B', 'Descricao B', CURRENT_DATE)`,
      [clientAId, gestor.id, clientBId]
    );

    await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, context_type, content)
     VALUES ($1, $2, 'general', 'Mensagem cliente A'),
            ($1, $3, 'general', 'Mensagem cliente B')`,
      [gestor.id, clientUser.id, gestor.id]
    );

    const auth = await login(clientUser.email);
    const response = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${auth.body.accessToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.mode, 'client');
    assert.equal(response.body.summary.campaigns_count, 1);
    assert.equal(response.body.campaigns.length, 1);
    assert.equal(response.body.reports.length, 1);
    assert.equal(response.body.materials.length, 1);
    assert.equal(response.body.invoices.length, 1);
    assert.equal(response.body.tasks.length, 1);
    assert.equal(response.body.messages.length, 1);
    assert.ok(Array.isArray(response.body.team));

    await pool.query('DELETE FROM messages');
    await pool.query('DELETE FROM tasks');
    await pool.query('DELETE FROM invoices');
    await pool.query('DELETE FROM materials');
    await pool.query('DELETE FROM reports');
    await pool.query('DELETE FROM metrics');
    await pool.query('DELETE FROM campaigns');
    await userModel.remove(clientUser.id);
    await userModel.remove(gestor.id);
    await pool.query('DELETE FROM clients');
  }
);

test('dashboard do cliente limita a equipe ao gerente e usuarios vinculados ao proprio cliente', { concurrency: false }, async () => {
  const suffix = Date.now() + 10;
  const gestor = await createUser({
    name: `Gestor Equipe ${suffix}`,
    email: `gestor.equipe.${suffix}@one.test`,
    role: 'gestor',
  });
  const designerVinculado = await createUser({
    name: `Designer Vinculado ${suffix}`,
    email: `designer.vinculado.${suffix}@one.test`,
    role: 'designer',
  });
  const designerExterno = await createUser({
    name: `Designer Externo ${suffix}`,
    email: `designer.externo.${suffix}@one.test`,
    role: 'designer',
  });

  const clientAId = await createClient(`Cliente Equipe A ${suffix}`, 'Empresa Equipe A', gestor.id);
  const clientBId = await createClient(`Cliente Equipe B ${suffix}`, 'Empresa Equipe B', gestor.id);

  await userModel.update(designerVinculado.id, { client_id: clientAId });
  await userModel.update(designerExterno.id, { client_id: clientBId });

  const clientUser = await createUser({
    name: `Cliente Equipe ${suffix}`,
    email: `cliente.equipe.${suffix}@one.test`,
    role: 'client',
    clientId: clientAId,
  });

  const auth = await login(clientUser.email);
  const response = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${auth.body.accessToken}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.mode, 'client');

  const teamIds = response.body.team.map((user) => user.id).sort((left, right) => left - right);
  assert.deepEqual(teamIds, [designerVinculado.id, gestor.id].sort((left, right) => left - right));
  assert.equal(response.body.team.some((user) => user.id === designerExterno.id), false);

  await userModel.remove(clientUser.id);
  await userModel.remove(designerExterno.id);
  await userModel.remove(designerVinculado.id);
  await userModel.remove(gestor.id);
  await pool.query('DELETE FROM clients');
});

test('dashboard interno do gestor aplica widgets e sanitizacao por capacidade', { concurrency: false }, async () => {
  const suffix = Date.now() + 1;
  const gestor = await createUser({
    name: `Gestor Interno ${suffix}`,
    email: `gestor.interno.${suffix}@one.test`,
    role: 'gestor',
  });

  const clientId = await createClient(`Cliente Gestor ${suffix}`, 'Empresa Gestor', gestor.id);

  await pool.query(
    `INSERT INTO campaigns (client_id, name, channel, audience, objective, budget, status)
     VALUES ($1, 'Campanha Gestor', 'Meta', 'Local', 'Leads', 3000, 'Ativa')`,
    [clientId]
  );
  const { rows: campaignRows } = await pool.query('SELECT id FROM campaigns WHERE client_id = $1', [clientId]);
  const campaignId = campaignRows[0].id;

  await pool.query(
    `INSERT INTO metrics (campaign_id, period, leads, revenue, impressions, clicks)
     VALUES ($1, CURRENT_DATE, 22, 7800, 1200, 150)`,
    [campaignId]
  );
  await pool.query(
    `INSERT INTO tasks (client_id, assigned_to, status, type, column_name, title, description, deadline)
     VALUES ($1, $2, 'Em andamento', 'copy', 'doing', 'Task Gestor', 'Descricao', CURRENT_DATE)`,
    [clientId, gestor.id]
  );

  const auth = await login(gestor.email);
  const response = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${auth.body.accessToken}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.mode, 'internal');
  assert.equal(response.body.widgets.financial, false);
  assert.equal(response.body.widgets.team, true);
  assert.equal(response.body.summary.clients_count, 1);
  assert.equal(response.body.summary.campaigns_count, 1);
  assert.equal(response.body.summary.open_tasks, 1);
  assert.equal(response.body.summary.leads, 22);
  assert.equal(response.body.summary.revenue, 0);

  await pool.query('DELETE FROM tasks');
  await pool.query('DELETE FROM metrics');
  await pool.query('DELETE FROM campaigns');
  await userModel.remove(gestor.id);
  await pool.query('DELETE FROM clients');
});

test('equipe interna lista apenas usuarios internos ativos em /users/team e /users/assignable', { concurrency: false }, async () => {
  const suffix = Date.now() + 11;
  const gestor = await createUser({
    name: `Gestor Time ${suffix}`,
    email: `gestor.time.${suffix}@one.test`,
    role: 'gestor',
  });
  const designerAtivo = await createUser({
    name: `Designer Ativo ${suffix}`,
    email: `designer.ativo.${suffix}@one.test`,
    role: 'designer',
  });
  const designerInativo = await createUser({
    name: `Designer Inativo ${suffix}`,
    email: `designer.inativo.${suffix}@one.test`,
    role: 'designer',
  });
  const clientUser = await createUser({
    name: `Cliente Interno ${suffix}`,
    email: `cliente.interno.${suffix}@one.test`,
    role: 'client',
  });

  await userModel.update(designerInativo.id, { is_active: false });

  const auth = await login(gestor.email);
  const [teamResponse, assignableResponse] = await Promise.all([
    request(app).get('/api/users/team').set('Authorization', `Bearer ${auth.body.accessToken}`),
    request(app).get('/api/users/assignable').set('Authorization', `Bearer ${auth.body.accessToken}`),
  ]);

  assert.equal(teamResponse.status, 200);
  assert.equal(assignableResponse.status, 200);

  const expectedIds = [designerAtivo.id, gestor.id].sort((left, right) => left - right);
  const teamIds = teamResponse.body.map((user) => user.id).sort((left, right) => left - right);
  const assignableIds = assignableResponse.body.map((user) => user.id).sort((left, right) => left - right);

  assert.deepEqual(teamIds, expectedIds);
  assert.deepEqual(assignableIds, expectedIds);
  assert.equal(teamResponse.body.some((user) => user.id === designerInativo.id), false);
  assert.equal(teamResponse.body.some((user) => user.id === clientUser.id), false);

  await userModel.remove(clientUser.id);
  await userModel.remove(designerInativo.id);
  await userModel.remove(designerAtivo.id);
  await userModel.remove(gestor.id);
});

test('gestor cria tarefa para cliente do proprio escopo sem erro interno', { concurrency: false }, async () => {
  const suffix = Date.now() + 13;
  const gestor = await createUser({
    name: `Gestor Tarefa ${suffix}`,
    email: `gestor.tarefa.${suffix}@one.test`,
    role: 'gestor',
  });

  const clientId = await createClient(`Cliente Tarefa ${suffix}`, `Empresa Tarefa ${suffix}`, gestor.id);
  const auth = await login(gestor.email);

  const response = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${auth.body.accessToken}`)
    .send({
      client_id: clientId,
      assigned_to: gestor.id,
      status: 'Backlog',
      type: 'design',
      column_name: 'todo',
      title: 'Tarefa de validacao',
      description: 'Criada por gestor no proprio escopo operacional.',
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.client_id, clientId);
  assert.equal(response.body.assigned_to, gestor.id);
  assert.equal(response.body.title, 'Tarefa de validacao');

  await pool.query('DELETE FROM tasks');
  await userModel.remove(gestor.id);
  await pool.query('DELETE FROM clients');
});

test('gestor consegue atribuir a mesma tarefa para mais de uma pessoa', { concurrency: false }, async () => {
  const suffix = Date.now() + 131;
  const gestor = await createUser({
    name: `Gestor Multi ${suffix}`,
    email: `gestor.multi.${suffix}@one.test`,
    role: 'gestor',
  });
  const designerA = await createUser({
    name: `Designer A ${suffix}`,
    email: `designer.a.${suffix}@one.test`,
    role: 'designer',
  });
  const designerB = await createUser({
    name: `Designer B ${suffix}`,
    email: `designer.b.${suffix}@one.test`,
    role: 'designer',
  });

  const clientId = await createClient(`Cliente Multi ${suffix}`, `Empresa Multi ${suffix}`, gestor.id);
  const gestorAuth = await login(gestor.email);

  const createResponse = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${gestorAuth.body.accessToken}`)
    .send({
      client_id: clientId,
      assigned_to_ids: [designerA.id, designerB.id],
      status: 'Backlog',
      type: 'planejamento',
      column_name: 'todo',
      title: 'Tarefa com dois responsáveis',
      description: 'Executada em conjunto por mais de uma pessoa.',
    });

  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.body.assigned_to, designerA.id);
  assert.deepEqual(
    createResponse.body.assigned_user_ids.map((value) => Number(value)).sort((left, right) => left - right),
    [designerA.id, designerB.id].sort((left, right) => left - right)
  );
  assert.deepEqual(
    createResponse.body.assigned_user_names.sort(),
    [designerA.name, designerB.name].sort()
  );

  const [designerAAuth, designerBAuth] = await Promise.all([login(designerA.email), login(designerB.email)]);
  const [designerAUnread, designerBUnread] = await Promise.all([
    request(app).get('/api/notifications/unread-count').set('Authorization', `Bearer ${designerAAuth.body.accessToken}`),
    request(app).get('/api/notifications/unread-count').set('Authorization', `Bearer ${designerBAuth.body.accessToken}`),
  ]);

  assert.equal(designerAUnread.status, 200);
  assert.equal(designerBUnread.status, 200);
  assert.equal(designerAUnread.body.total, 1);
  assert.equal(designerBUnread.body.total, 1);

  await pool.query('DELETE FROM notifications');
  await pool.query('DELETE FROM tasks');
  await userModel.remove(designerB.id);
  await userModel.remove(designerA.id);
  await userModel.remove(gestor.id);
  await pool.query('DELETE FROM clients');
});

test('usuario interno limpa o historico do checklist sem afetar os itens ativos do dia', { concurrency: false }, async () => {
  const suffix = Date.now() + 132;
  const gestor = await createUser({
    name: `Gestor Checklist ${suffix}`,
    email: `gestor.checklist.${suffix}@one.test`,
    role: 'gestor',
  });

  await pool.query(
    `INSERT INTO user_daily_checklists (user_id, checklist_date, items, completed_at)
     VALUES
       ($1, CURRENT_DATE - 1, $2::jsonb, NOW()),
       ($1, CURRENT_DATE, $3::jsonb, NULL)`,
    [
      gestor.id,
      JSON.stringify([{ id: 'hist_1', label: 'Item antigo', done: true }]),
      JSON.stringify([{ id: 'active_1', label: 'Item de hoje', done: false }]),
    ]
  );

  const auth = await login(gestor.email);
  const response = await request(app)
    .delete('/api/checklists/daily/history')
    .set('Authorization', `Bearer ${auth.body.accessToken}`);

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.history, []);
  assert.equal(response.body.activeItems.length, 1);
  assert.equal(response.body.activeItems[0].label, 'Item de hoje');

  await pool.query('DELETE FROM user_daily_checklists WHERE user_id = $1', [gestor.id]);
  await userModel.remove(gestor.id);
});

test('tarefa compartilhada fica visivel para equipe interna e nao aparece no dashboard do cliente', { concurrency: false }, async () => {
  const suffix = Date.now() + 14;
  const gestor = await createUser({
    name: `Gestor Compartilhada ${suffix}`,
    email: `gestor.compartilhada.${suffix}@one.test`,
    role: 'gestor',
  });
  const designer = await createUser({
    name: `Designer Compartilhada ${suffix}`,
    email: `designer.compartilhada.${suffix}@one.test`,
    role: 'designer',
  });

  const clientId = await createClient(`Cliente Compartilhado ${suffix}`, `Empresa Compartilhada ${suffix}`, gestor.id);
  const clientUser = await createUser({
    name: `Cliente Compartilhado ${suffix}`,
    email: `cliente.compartilhado.${suffix}@one.test`,
    role: 'client',
    clientId,
  });

  const gestorAuth = await login(gestor.email);
  const createTaskResponse = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${gestorAuth.body.accessToken}`)
    .send({
      client_id: clientId,
      status: 'Backlog',
      type: 'planejamento',
      column_name: 'todo',
      title: 'Tarefa compartilhada da equipe',
      description: 'Pode ser acompanhada por qualquer pessoa interna.',
    });

  assert.equal(createTaskResponse.status, 201);
  assert.equal(createTaskResponse.body.assigned_to, null);

  const designerAuth = await login(designer.email);
  const [tasksResponse, internalDashboardResponse] = await Promise.all([
    request(app).get('/api/tasks').set('Authorization', `Bearer ${designerAuth.body.accessToken}`),
    request(app).get('/api/dashboard').set('Authorization', `Bearer ${designerAuth.body.accessToken}`),
  ]);

  assert.equal(tasksResponse.status, 200);
  assert.equal(internalDashboardResponse.status, 200);
  assert.ok(tasksResponse.body.some((task) => task.id === createTaskResponse.body.id && task.assigned_to === null));
  assert.equal(internalDashboardResponse.body.summary.open_tasks, 1);

  const moveResponse = await request(app)
    .put(`/api/tasks/${createTaskResponse.body.id}`)
    .set('Authorization', `Bearer ${designerAuth.body.accessToken}`)
    .send({
      status: 'Concluido',
      column_name: 'done',
    });

  assert.equal(moveResponse.status, 200);
  assert.equal(moveResponse.body.status, 'Concluido');
  assert.equal(moveResponse.body.column_name, 'done');

  const clientAuth = await login(clientUser.email);
  const clientDashboardResponse = await request(app)
    .get('/api/dashboard')
    .set('Authorization', `Bearer ${clientAuth.body.accessToken}`);

  assert.equal(clientDashboardResponse.status, 200);
  assert.equal(clientDashboardResponse.body.tasks.some((task) => task.id === createTaskResponse.body.id), false);

  await pool.query('DELETE FROM tasks');
  await userModel.remove(clientUser.id);
  await userModel.remove(designer.id);
  await userModel.remove(gestor.id);
  await pool.query('DELETE FROM clients');
});

test('gestor atualiza manual da marca e designer relacionado visualiza o cliente no escopo operacional', { concurrency: false }, async () => {
  const suffix = Date.now() + 12;
  const gestor = await createUser({
    name: `Gestor Manual ${suffix}`,
    email: `gestor.manual.${suffix}@one.test`,
    role: 'gestor',
  });
  const designer = await createUser({
    name: `Designer Manual ${suffix}`,
    email: `designer.manual.${suffix}@one.test`,
    role: 'designer',
  });

  const clientId = await createClient(`Cliente Manual ${suffix}`, `Empresa Manual ${suffix}`, gestor.id);

  await pool.query(
    `INSERT INTO campaigns (client_id, name, channel, audience, objective, budget, status)
     VALUES ($1, 'Campanha Manual', 'Instagram', 'Regional', 'Posicionamento', 500, 'Ativa')`,
    [clientId]
  );

  await pool.query(
    `INSERT INTO tasks (client_id, assigned_to, status, type, column_name, title, description, deadline)
     VALUES ($1, $2, 'Em progresso', 'design', 'doing', 'Peca principal', 'Criacao visual', CURRENT_DATE)`,
    [clientId, designer.id]
  );

  const gestorAuth = await login(gestor.email);
  const updateResponse = await request(app)
    .put(`/api/clients/${clientId}`)
    .set('Authorization', `Bearer ${gestorAuth.body.accessToken}`)
    .send({
      brand_manual: 'Tom consultivo, foco em prova social e CTA objetivo.',
      legal_document: '12345678000199',
    });

  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.brand_manual, 'Tom consultivo, foco em prova social e CTA objetivo.');

  const designerAuth = await login(designer.email);
  const [clientsResponse, campaignsResponse] = await Promise.all([
    request(app).get('/api/clients').set('Authorization', `Bearer ${designerAuth.body.accessToken}`),
    request(app).get('/api/campaigns').set('Authorization', `Bearer ${designerAuth.body.accessToken}`),
  ]);

  assert.equal(clientsResponse.status, 200);
  assert.equal(campaignsResponse.status, 200);
  assert.equal(clientsResponse.body.length, 1);
  assert.equal(clientsResponse.body[0].id, clientId);
  assert.equal(clientsResponse.body[0].brand_manual, 'Tom consultivo, foco em prova social e CTA objetivo.');
  assert.equal('legal_document' in clientsResponse.body[0], false);
  assert.equal(campaignsResponse.body.length, 1);
  assert.equal(campaignsResponse.body[0].client_id, clientId);

  await pool.query('DELETE FROM tasks');
  await pool.query('DELETE FROM campaigns');
  await userModel.remove(designer.id);
  await userModel.remove(gestor.id);
  await pool.query('DELETE FROM clients');
});

test('gestor nao cria cobranca para lead fora do proprio tenant operacional', { concurrency: false }, async () => {
  const suffix = Date.now() + 2;
  const gestorA = await createUser({
    name: `Gestor A ${suffix}`,
    email: `gestor.a.${suffix}@one.test`,
    role: 'gestor',
  });
  const gestorB = await createUser({
    name: `Gestor B ${suffix}`,
    email: `gestor.b.${suffix}@one.test`,
    role: 'gestor',
  });

  const { rows } = await pool.query(
    `INSERT INTO contacts (
      name, phone, whatsapp, email, company, service, source, document, lead_stage, estimated_value,
      message, notes, owner_id, assigned_to
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, 'Prospecao', 1000,
      $9, $10, $11, $12
    )
    RETURNING id`,
    [
      `Lead Bloqueado ${suffix}`,
      '11999999999',
      '11999999999',
      `lead.bloqueado.${suffix}@one.test`,
      'Empresa Restrita',
      'Midia',
      'Indicacao',
      '12345678900',
      'Lead de outro gestor',
      'Nao deve ficar visivel',
      gestorB.id,
      gestorB.id,
    ]
  );

  const auth = await login(gestorA.email);
  const response = await request(app)
    .post('/api/charges')
    .set('Authorization', `Bearer ${auth.body.accessToken}`)
    .send({
      contact_id: rows[0].id,
      payment_method: 'PAYMENT_LINK',
      description: 'Cobranca restrita',
      amount: 150,
    });

  assert.equal(response.status, 403);

  await pool.query('DELETE FROM contacts WHERE id = $1', [rows[0].id]);
  await userModel.remove(gestorA.id);
  await userModel.remove(gestorB.id);
});

test('cadastro de cliente aceita os novos planos da One e servicos sob demanda', { concurrency: false }, async () => {
  const suffix = Date.now() + 21;
  const gestor = await createUser({
    name: `Gestor Plano ${suffix}`,
    email: `gestor.plano.${suffix}@one.test`,
    role: 'gestor',
  });

  const auth = await login(gestor.email);
  const createResponse = await request(app)
    .post('/api/clients')
    .set('Authorization', `Bearer ${auth.body.accessToken}`)
    .send({
      name: `Cliente Plano ${suffix}`,
      company: `Empresa Plano ${suffix}`,
      plan: 'Sob demanda \u00b7 Releases (Imprensa)',
      mrr: 0,
      segment: 'Servicos',
    });

  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.body.plan, 'Sob demanda \u00b7 Releases (Imprensa)');

  const updateResponse = await request(app)
    .put(`/api/clients/${createResponse.body.id}`)
    .set('Authorization', `Bearer ${auth.body.accessToken}`)
    .send({
      plan: 'One Master',
    });

  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.plan, 'One Master');

  await pool.query('DELETE FROM clients WHERE id = $1', [createResponse.body.id]);
  await userModel.remove(gestor.id);
});

test('atribuicao e conclusao de tarefa geram notificacoes para os envolvidos', { concurrency: false }, async () => {
  const suffix = Date.now() + 20;
  const gestor = await createUser({
    name: `Gestor Notificacao ${suffix}`,
    email: `gestor.notificacao.${suffix}@one.test`,
    role: 'gestor',
  });
  const thalisson = await createUser({
    name: `Thalisson ${suffix}`,
    email: `thalisson.${suffix}@one.test`,
    role: 'designer',
  });

  const clientId = await createClient(`Cliente Notificacao ${suffix}`, `Empresa Notificacao ${suffix}`, gestor.id);
  const gestorAuth = await login(gestor.email);

  const createTaskResponse = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${gestorAuth.body.accessToken}`)
    .send({
      client_id: clientId,
      assigned_to: thalisson.id,
      status: 'Backlog',
      type: 'design',
      column_name: 'todo',
      title: 'Landing page institucional',
      description: 'Criar estrutura inicial da página.',
    });

  assert.equal(createTaskResponse.status, 201);

  const thalissonAuth = await login(thalisson.email);
  const unreadCountResponse = await request(app)
    .get('/api/notifications/unread-count')
    .set('Authorization', `Bearer ${thalissonAuth.body.accessToken}`);

  assert.equal(unreadCountResponse.status, 200);
  assert.equal(unreadCountResponse.body.total, 1);

  const notificationsResponse = await request(app)
    .get('/api/notifications')
    .set('Authorization', `Bearer ${thalissonAuth.body.accessToken}`);

  assert.equal(notificationsResponse.status, 200);
  assert.equal(notificationsResponse.body.length, 1);
  assert.equal(notificationsResponse.body[0].user_id, thalisson.id);
  assert.equal(notificationsResponse.body[0].entity_type, 'task');
  assert.equal(notificationsResponse.body[0].entity_id, createTaskResponse.body.id);
  assert.equal(notificationsResponse.body[0].type, 'task_assigned');
  assert.equal(notificationsResponse.body[0].read_at, null);
  assert.match(notificationsResponse.body[0].body, /Landing page institucional/);
  assert.match(notificationsResponse.body[0].body, new RegExp(gestor.name));

  const markReadResponse = await request(app)
    .patch(`/api/notifications/${notificationsResponse.body[0].id}/read`)
    .set('Authorization', `Bearer ${thalissonAuth.body.accessToken}`)
    .send();

  assert.equal(markReadResponse.status, 204);

  const readBackResponse = await request(app)
    .get('/api/notifications')
    .set('Authorization', `Bearer ${thalissonAuth.body.accessToken}`);

  assert.equal(readBackResponse.status, 200);
  assert.ok(readBackResponse.body[0].read_at);

  const completionResponse = await request(app)
    .put(`/api/tasks/${createTaskResponse.body.id}`)
    .set('Authorization', `Bearer ${thalissonAuth.body.accessToken}`)
    .send({
      status: 'Concluido',
      column_name: 'done',
    });

  assert.equal(completionResponse.status, 200);
  assert.equal(completionResponse.body.status, 'Concluido');
  assert.equal(completionResponse.body.column_name, 'done');

  const gestorNotificationsResponse = await request(app)
    .get('/api/notifications')
    .set('Authorization', `Bearer ${gestorAuth.body.accessToken}`);

  assert.equal(gestorNotificationsResponse.status, 200);
  assert.equal(gestorNotificationsResponse.body.length, 1);
  assert.equal(gestorNotificationsResponse.body[0].user_id, gestor.id);
  assert.equal(gestorNotificationsResponse.body[0].entity_id, createTaskResponse.body.id);
  assert.equal(gestorNotificationsResponse.body[0].type, 'task_completed');
  assert.match(gestorNotificationsResponse.body[0].body, /conclu/i);

  await pool.query('DELETE FROM notifications');
  await pool.query('DELETE FROM tasks');
  await userModel.remove(thalisson.id);
  await userModel.remove(gestor.id);
  await pool.query('DELETE FROM clients');
});

test('tarefas antigas ja atribuidas fazem backfill de notificacao ao abrir o painel', { concurrency: false }, async () => {
  const suffix = Date.now() + 21;
  const gestor = await createUser({
    name: `Gabriel ${suffix}`,
    email: `gabriel.backfill.${suffix}@one.test`,
    role: 'gestor',
  });
  const thalisson = await createUser({
    name: `Thalisson Backfill ${suffix}`,
    email: `thalisson.backfill.${suffix}@one.test`,
    role: 'designer',
  });

  const clientId = await createClient(`Cliente Backfill ${suffix}`, `Empresa Backfill ${suffix}`, gestor.id);

  const insertedTask = await pool.query(
    `INSERT INTO tasks (client_id, created_by, assigned_to, status, type, column_name, title, description, deadline)
     VALUES ($1, $2, $3, 'Backlog', 'copywriting', 'todo', $4, $5, CURRENT_DATE)
     RETURNING id`,
    [clientId, gestor.id, thalisson.id, 'Ajustar copies da campanha', 'Tarefa sem notificacao previa']
  );

  const thalissonAuth = await login(thalisson.email);
  const unreadCountResponse = await request(app)
    .get('/api/notifications/unread-count')
    .set('Authorization', `Bearer ${thalissonAuth.body.accessToken}`);

  assert.equal(unreadCountResponse.status, 200);
  assert.equal(unreadCountResponse.body.total, 1);

  const notificationsResponse = await request(app)
    .get('/api/notifications')
    .set('Authorization', `Bearer ${thalissonAuth.body.accessToken}`);

  assert.equal(notificationsResponse.status, 200);
  assert.equal(notificationsResponse.body.length, 1);
  assert.equal(notificationsResponse.body[0].entity_id, insertedTask.rows[0].id);
  assert.equal(notificationsResponse.body[0].type, 'task_assigned');
  assert.match(notificationsResponse.body[0].body, /Gabriel/);
  assert.match(notificationsResponse.body[0].body, /Ajustar copies da campanha/);

  await pool.query('DELETE FROM notifications');
  await pool.query('DELETE FROM tasks');
  await userModel.remove(thalisson.id);
  await userModel.remove(gestor.id);
  await pool.query('DELETE FROM clients');
});

test('POST /api/contacts exige autenticacao', { concurrency: false }, async () => {
  const response = await request(app)
    .post('/api/contacts')
    .send({
      name: 'Lead Publico',
      phone: '11999999999',
      email: 'lead.publico@one.test',
    });

  assert.equal(response.status, 401);
});

test('exportacao da conta inclui mais de 100 registros por colecao', { concurrency: false }, async () => {
  const suffix = Date.now() + 301;
  const clientId = await createClient(`Cliente Export ${suffix}`, `Empresa Export ${suffix}`);
  const user = await createUser({
    name: `Cliente Export ${suffix}`,
    email: `cliente.export.${suffix}@one.test`,
    role: 'client',
    clientId,
  });
  const peer = await createUser({
    name: `Cliente Export Peer ${suffix}`,
    email: `cliente.export.peer.${suffix}@one.test`,
    role: 'client',
    clientId,
  });

  for (let index = 0; index < 101; index += 1) {
    await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, context_type, content)
       VALUES ($1, $2, 'general', $3)`,
      [peer.id, user.id, `Mensagem ${index + 1}`]
    );
  }

  const auth = await login(user.email);
  const response = await request(app)
    .get('/api/account/export')
    .set('Authorization', `Bearer ${auth.body.accessToken}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.messages.length, 101);

  await pool.query('DELETE FROM messages WHERE receiver_id = $1 OR sender_id = $1', [user.id]);
  await pool.query('DELETE FROM messages WHERE receiver_id = $1 OR sender_id = $1', [peer.id]);
  await userModel.remove(peer.id);
  await userModel.remove(user.id);
  await pool.query('DELETE FROM clients WHERE id = $1', [clientId]);
});

test('exclusao da conta anonimiza o usuario e remove residuos diretos', { concurrency: false }, async () => {
  const suffix = Date.now() + 302;
  const clientId = await createClient(`Cliente Delete ${suffix}`, `Empresa Delete ${suffix}`);
  const user = await createUser({
    name: `Designer Delete ${suffix}`,
    email: `designer.delete.${suffix}@one.test`,
    role: 'designer',
    clientId,
  });
  const peer = await createUser({
    name: `Peer Delete ${suffix}`,
    email: `peer.delete.${suffix}@one.test`,
    role: 'designer',
    clientId,
  });

  const task = await pool.query(
    `INSERT INTO tasks (client_id, created_by, assigned_to, status, type, column_name, title, description)
     VALUES ($1, $2, $2, 'Backlog', 'planejamento', 'todo', 'Task de exclusao', 'Fluxo LGPD')
     RETURNING id`,
    [clientId, user.id]
  );
  await pool.query('INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2)', [task.rows[0].id, user.id]);
  const contact = await pool.query(
    `INSERT INTO contacts (name, phone, email, owner_id, assigned_to)
     VALUES ($1, $2, $3, $4, $4)
     RETURNING id`,
    [`Lead Delete ${suffix}`, '11999999999', `lead.delete.${suffix}@one.test`, user.id]
  );
  const material = await pool.query(
    `INSERT INTO materials (client_id, uploaded_by, title, status, url)
     VALUES ($1, $2, $3, 'Pendente', 'https://example.com/material')
     RETURNING id`,
    [clientId, user.id, `Material Delete ${suffix}`]
  );
  const file = await pool.query(
    `INSERT INTO files (client_id, uploaded_by, original_name, stored_name, mime_type, size, url)
     VALUES ($1, $2, 'arquivo.pdf', 'arquivo.pdf', 'application/pdf', 10, '/uploads/arquivo.pdf')
     RETURNING id`,
    [clientId, user.id]
  );
  await pool.query(
    `INSERT INTO notifications (user_id, type, title, body)
     VALUES ($1, 'task_assigned', 'Alerta', 'Notificacao de seguranca')`,
    [user.id]
  );
  await pool.query(
    `INSERT INTO messages (sender_id, receiver_id, context_type, content)
     VALUES ($1, $2, 'general', 'Mensagem que deve ser removida')`,
    [user.id, peer.id]
  );
  await pool.query(
    `INSERT INTO user_daily_checklists (user_id, checklist_date, items, completed_at)
     VALUES ($1, CURRENT_DATE, $2::jsonb, NULL)`,
    [user.id, JSON.stringify([{ id: 'lgpd_1', label: 'Apagar conta', done: false }])]
  );

  const auth = await login(user.email);
  const response = await request(app)
    .delete('/api/account')
    .set('Authorization', `Bearer ${auth.body.accessToken}`);

  assert.equal(response.status, 204);

  const anonymizedUser = await userModel.findById(user.id);
  const notificationCount = await pool.query('SELECT COUNT(*)::int AS total FROM notifications WHERE user_id = $1', [user.id]);
  const messageCount = await pool.query('SELECT COUNT(*)::int AS total FROM messages WHERE sender_id = $1 OR receiver_id = $1', [user.id]);
  const checklistCount = await pool.query('SELECT COUNT(*)::int AS total FROM user_daily_checklists WHERE user_id = $1', [user.id]);
  const taskRow = await pool.query('SELECT assigned_to, created_by FROM tasks WHERE id = $1', [task.rows[0].id]);
  const contactRow = await pool.query('SELECT owner_id, assigned_to FROM contacts WHERE id = $1', [contact.rows[0].id]);
  const materialRow = await pool.query('SELECT uploaded_by FROM materials WHERE id = $1', [material.rows[0].id]);
  const fileRow = await pool.query('SELECT uploaded_by FROM files WHERE id = $1', [file.rows[0].id]);

  assert.equal(anonymizedUser.is_active, false);
  assert.match(anonymizedUser.email, /@anon\.invalid$/);
  assert.equal(anonymizedUser.phone, null);
  assert.equal(anonymizedUser.mfa_enabled_at, null);
  assert.equal(notificationCount.rows[0].total, 0);
  assert.equal(messageCount.rows[0].total, 0);
  assert.equal(checklistCount.rows[0].total, 0);
  assert.equal(taskRow.rows[0].assigned_to, null);
  assert.equal(taskRow.rows[0].created_by, null);
  assert.equal(contactRow.rows[0].owner_id, null);
  assert.equal(contactRow.rows[0].assigned_to, null);
  assert.equal(materialRow.rows[0].uploaded_by, null);
  assert.equal(fileRow.rows[0].uploaded_by, null);

  await pool.query('DELETE FROM task_assignees WHERE task_id = $1', [task.rows[0].id]);
  await pool.query('DELETE FROM tasks WHERE id = $1', [task.rows[0].id]);
  await pool.query('DELETE FROM contacts WHERE id = $1', [contact.rows[0].id]);
  await pool.query('DELETE FROM materials WHERE id = $1', [material.rows[0].id]);
  await pool.query('DELETE FROM files WHERE id = $1', [file.rows[0].id]);
  await userModel.remove(peer.id);
  await userModel.remove(user.id);
  await pool.query('DELETE FROM clients WHERE id = $1', [clientId]);
});

test('comercial nao atualiza invoice de outro tenant por ID', { concurrency: false }, async () => {
  const suffix = Date.now() + 303;
  const comercialA = await createUser({
    name: `Comercial Invoice A ${suffix}`,
    email: `comercial.invoice.a.${suffix}@one.test`,
    role: 'comercial',
  });
  const comercialB = await createUser({
    name: `Comercial Invoice B ${suffix}`,
    email: `comercial.invoice.b.${suffix}@one.test`,
    role: 'comercial',
  });
  const clientAId = await createClient(`Cliente Invoice A ${suffix}`, `Empresa Invoice A ${suffix}`, comercialA.id);
  const clientBId = await createClient(`Cliente Invoice B ${suffix}`, `Empresa Invoice B ${suffix}`, comercialB.id);

  const invoice = await pool.query(
    `INSERT INTO invoices (client_id, amount, status, due_date)
     VALUES ($1, 1200, 'Em aberto', CURRENT_DATE)
     RETURNING id`,
    [clientBId]
  );

  const auth = await login(comercialA.email);
  const response = await request(app)
    .put(`/api/invoices/${invoice.rows[0].id}`)
    .set('Authorization', `Bearer ${auth.body.accessToken}`)
    .send({
      status: 'Pago',
    });

  assert.equal(response.status, 404);

  await userModel.remove(comercialB.id);
  await userModel.remove(comercialA.id);
  await pool.query('DELETE FROM invoices WHERE id = $1', [invoice.rows[0].id]);
  await pool.query('DELETE FROM clients WHERE id IN ($1, $2)', [clientAId, clientBId]);
});

test('usuario interno nao obtem stream de arquivo de outro tenant', { concurrency: false }, async () => {
  const suffix = Date.now() + 304;
  const clientAId = await createClient(`Cliente File A ${suffix}`, `Empresa File A ${suffix}`);
  const clientBId = await createClient(`Cliente File B ${suffix}`, `Empresa File B ${suffix}`);
  const designerA = await createUser({
    name: `Designer File A ${suffix}`,
    email: `designer.file.a.${suffix}@one.test`,
    role: 'designer',
    clientId: clientAId,
  });
  const designerB = await createUser({
    name: `Designer File B ${suffix}`,
    email: `designer.file.b.${suffix}@one.test`,
    role: 'designer',
    clientId: clientBId,
  });

  const file = await pool.query(
    `INSERT INTO files (client_id, uploaded_by, original_name, stored_name, mime_type, size, url)
     VALUES ($1, $2, 'proposta.pdf', 'proposta.pdf', 'application/pdf', 128, '/uploads/proposta.pdf')
     RETURNING id`,
    [clientBId, designerB.id]
  );

  const auth = await login(designerA.email);
  const response = await request(app)
    .get(`/api/files/${file.rows[0].id}/content`)
    .set('Authorization', `Bearer ${auth.body.accessToken}`);

  assert.equal(response.status, 404);

  await pool.query('DELETE FROM files WHERE id = $1', [file.rows[0].id]);
  await userModel.remove(designerB.id);
  await userModel.remove(designerA.id);
  await pool.query('DELETE FROM clients WHERE id IN ($1, $2)', [clientAId, clientBId]);
});

test('access-url legado devolve URL interna temporaria e o stream abre sem expor o provider', { concurrency: false }, async () => {
  const suffix = Date.now() + 3041;
  const clientId = await createClient(`Cliente File Stream ${suffix}`, `Empresa File Stream ${suffix}`);
  const designer = await createUser({
    name: `Designer File Stream ${suffix}`,
    email: `designer.file.stream.${suffix}@one.test`,
    role: 'designer',
    clientId,
  });
  const fileName = `stream-${suffix}.png`;
  const filePath = path.join(env.uploadsDir, fileName);

  fs.writeFileSync(
    filePath,
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0ioAAAAASUVORK5CYII=',
      'base64'
    )
  );

  const file = await pool.query(
    `INSERT INTO files (client_id, uploaded_by, original_name, stored_name, mime_type, size, url)
     VALUES ($1, $2, 'stream.png', $3, 'image/png', 68, $4)
     RETURNING id`,
    [clientId, designer.id, fileName, `/uploads/${fileName}`]
  );

  const auth = await login(designer.email);
  const accessResponse = await request(app)
    .get(`/api/files/${file.rows[0].id}/access-url`)
    .set('Authorization', `Bearer ${auth.body.accessToken}`);

  assert.equal(accessResponse.status, 200);
  assert.match(accessResponse.body.url, new RegExp(`^/api/files/${file.rows[0].id}/content\\?download_token=`));
  assert.equal(accessResponse.body.url.includes('res.cloudinary.com'), false);

  const contentResponse = await request(app).get(accessResponse.body.url);

  assert.equal(contentResponse.status, 200);
  assert.match(contentResponse.headers['content-type'] || '', /^image\/png\b/);
  assert.equal(contentResponse.headers['cache-control'], 'no-store');

  await pool.query('DELETE FROM files WHERE id = $1', [file.rows[0].id]);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  await userModel.remove(designer.id);
  await pool.query('DELETE FROM clients WHERE id = $1', [clientId]);
});

test('gestor nao atualiza cobranca de outro tenant por ID', { concurrency: false }, async () => {
  const suffix = Date.now() + 305;
  const gestorA = await createUser({
    name: `Gestor Charge A ${suffix}`,
    email: `gestor.charge.a.${suffix}@one.test`,
    role: 'gestor',
  });
  const gestorB = await createUser({
    name: `Gestor Charge B ${suffix}`,
    email: `gestor.charge.b.${suffix}@one.test`,
    role: 'gestor',
  });
  const clientAId = await createClient(`Cliente Charge A ${suffix}`, `Empresa Charge A ${suffix}`, gestorA.id);
  const clientBId = await createClient(`Cliente Charge B ${suffix}`, `Empresa Charge B ${suffix}`, gestorB.id);

  const charge = await pool.query(
    `INSERT INTO charges (client_id, created_by, payment_method, description, amount, status)
     VALUES ($1, $2, 'PAYMENT_LINK', 'Cobranca de outro tenant', 250, 'PENDING')
     RETURNING id`,
    [clientBId, gestorB.id]
  );

  const auth = await login(gestorA.email);
  const response = await request(app)
    .patch(`/api/charges/${charge.rows[0].id}`)
    .set('Authorization', `Bearer ${auth.body.accessToken}`)
    .send({
      status: 'RECEIVED',
    });

  assert.equal(response.status, 404);

  await pool.query('DELETE FROM charges WHERE id = $1', [charge.rows[0].id]);
  await userModel.remove(gestorB.id);
  await userModel.remove(gestorA.id);
  await pool.query('DELETE FROM clients WHERE id IN ($1, $2)', [clientAId, clientBId]);
});
