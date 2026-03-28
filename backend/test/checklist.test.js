const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const app = require('../src/app');
const userModel = require('../src/models/userModel');
const pool = require('../src/config/db');

async function createInternalUser(email) {
  const password = await bcrypt.hash('Valid@Test123', 12);
  return userModel.create({
    name: 'Checklist User',
    email,
    password,
    role: 'admin',
    is_active: true,
    email_verified_at: new Date().toISOString(),
  });
}

test('checklist diário persiste por usuário e arquiva ao concluir todos os itens', async () => {
  const email = `checklist.${Date.now()}@one.test`;
  const user = await createInternalUser(email);

  const login = await request(app).post('/api/auth/login').send({
    email,
    password: 'Valid@Test123',
  });

  const authHeader = { Authorization: `Bearer ${login.body.accessToken}` };
  const draftItems = [
    { id: 'item-1', label: 'Primeiro item', done: false, createdAt: new Date().toISOString() },
    { id: 'item-2', label: 'Segundo item', done: true, createdAt: new Date().toISOString() },
  ];

  const draftResponse = await request(app).put('/api/checklists/daily').set(authHeader).send({ items: draftItems });
  assert.equal(draftResponse.status, 200);
  assert.equal(draftResponse.body.activeItems.length, 2);
  assert.equal(draftResponse.body.history.length, 0);

  const doneResponse = await request(app)
    .put('/api/checklists/daily')
    .set(authHeader)
    .send({
      items: draftItems.map((item) => ({ ...item, done: true })),
    });

  assert.equal(doneResponse.status, 200);
  assert.equal(doneResponse.body.activeItems.length, 0);
  assert.equal(doneResponse.body.history.length, 1);
  assert.equal(doneResponse.body.history[0].items.length, 2);

  const fetchResponse = await request(app).get('/api/checklists/daily').set(authHeader);
  assert.equal(fetchResponse.status, 200);
  assert.equal(fetchResponse.body.history.length, 1);

  await pool.query('DELETE FROM user_daily_checklists WHERE user_id = $1', [user.id]);
  await userModel.remove(user.id);
});
