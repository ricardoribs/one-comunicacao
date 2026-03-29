const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const userModel = require('../src/models/userModel');

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
  return request(app)
    .post('/api/auth/login')
    .set('X-Forwarded-For', `203.0.113.${global.__oneLoginRequestCounter}`)
    .send({ email, password });
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
    name: `Demo Motion Designer ${suffix}`,
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
    name: `Demo Motion Designer Backfill ${suffix}`,
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
