const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const env = require('../config/env');
const { runWithTenantContext } = require('./tenantDb');
const { assertStrongPassword } = require('../utils/passwordPolicy');

const ALLOWED_ROLES = new Set(['admin', 'gestor', 'designer', 'comercial', 'dev']);
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

function optional(name) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : null;
}

async function run() {
  if (process.env.ALLOW_USER_BOOTSTRAP !== 'true') {
    throw new Error('Defina ALLOW_USER_BOOTSTRAP=true para executar o bootstrap manual de usuario.');
  }

  const name = required('BOOTSTRAP_USER_NAME');
  const email = required('BOOTSTRAP_USER_EMAIL').toLowerCase();
  const password = required('BOOTSTRAP_USER_PASSWORD');
  const role = (required('BOOTSTRAP_USER_ROLE') || '').toLowerCase();
  const rawClientId = optional('BOOTSTRAP_USER_CLIENT_ID');
  const clientId = rawClientId ? Number(rawClientId) : null;

  if (!ALLOWED_ROLES.has(role)) {
    throw new Error(`BOOTSTRAP_USER_ROLE invalido. Use um destes valores: ${Array.from(ALLOWED_ROLES).join(', ')}`);
  }

  if (rawClientId && (!Number.isInteger(clientId) || clientId <= 0)) {
    throw new Error('BOOTSTRAP_USER_CLIENT_ID deve ser um inteiro positivo quando informado.');
  }

  assertStrongPassword(password, 'BOOTSTRAP_USER_PASSWORD');

  const existing = await serviceQuery('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
  if (existing.rowCount > 0) {
    throw new Error('Ja existe um usuario com este email.');
  }

  const hash = await bcrypt.hash(password, env.bcryptRounds);
  const result = await serviceQuery(
    `INSERT INTO users (client_id, name, email, password, role, is_active, email_verified_at, must_change_password)
     VALUES ($1, $2, $3, $4, $5, true, NOW(), true)
     RETURNING id, email, role`,
    [clientId, name, email, hash, role]
  );

  console.log(`Usuario criado com sucesso: ${result.rows[0].email} (${result.rows[0].role})`);
  await pool.end();
}

run().catch(async (error) => {
  console.error('Falha no bootstrap do usuario:', error.message);
  try {
    await pool.end();
  } catch {}
  process.exit(1);
});
