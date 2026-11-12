const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const env = require('../config/env');
const { runWithTenantContext } = require('./tenantDb');
const { assertStrongPassword } = require('../utils/passwordPolicy');

const SERVICE_ACTOR = Object.freeze({ role: 'admin' });

function serviceQuery(sql, params = []) {
  return runWithTenantContext(SERVICE_ACTOR, (client) => client.query(sql, params));
}

function required(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Variavel obrigatoria ausente: ${name}`);
  }
  return value.trim();
}

async function run() {
  if (process.env.ALLOW_ADMIN_BOOTSTRAP !== 'true') {
    throw new Error('Defina ALLOW_ADMIN_BOOTSTRAP=true para executar o bootstrap do primeiro administrador.');
  }

  const name = required('BOOTSTRAP_ADMIN_NAME');
  const email = required('BOOTSTRAP_ADMIN_EMAIL').toLowerCase();
  const password = required('BOOTSTRAP_ADMIN_PASSWORD');

  assertStrongPassword(password, 'BOOTSTRAP_ADMIN_PASSWORD');

  const existingAdmin = await serviceQuery("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (existingAdmin.rowCount > 0) {
    throw new Error('Bootstrap bloqueado: ja existe um administrador cadastrado.');
  }

  const existingUser = await serviceQuery('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
  if (existingUser.rowCount > 0) {
    throw new Error('Ja existe um usuario com este email.');
  }

  const hash = await bcrypt.hash(password, env.bcryptRounds);
  const result = await serviceQuery(
    `INSERT INTO users (name, email, password, role, is_active, email_verified_at, must_change_password)
     VALUES ($1, $2, $3, 'admin', true, NOW(), true)
     RETURNING id, email`,
    [name, email, hash]
  );

  console.log(`Administrador inicial criado com sucesso: ${result.rows[0].email}`);
  await pool.end();
}

run().catch(async (error) => {
  console.error('Falha no bootstrap do administrador:', error.message);
  try {
    await pool.end();
  } catch {}
  process.exit(1);
});
