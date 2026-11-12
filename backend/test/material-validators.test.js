const test = require('node:test');
const assert = require('node:assert/strict');
const {
  materialSchema,
  materialStatusSchema,
} = require('../src/validators/materialValidators');

test('materialSchema normaliza status com acento para o valor canonico do banco', () => {
  const parsed = materialSchema.parse({
    client_id: 1,
    title: 'Criativo teste',
    status: 'Revisão',
  });

  assert.equal(parsed.status, 'Revisao');
});

test('materialStatusSchema aceita variacoes de caixa e acento no status', () => {
  const parsed = materialStatusSchema.parse({
    status: 'revisão',
  });

  assert.equal(parsed.status, 'Revisao');
});
