const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const env = require('../config/env');

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

  if (password.length < 12) {
    throw new Error('BOOTSTRAP_ADMIN_PASSWORD deve ter pelo menos 12 caracteres.');
  }

  const existing = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
  if (existing.rowCount > 0) {
    throw new Error('Ja existe um usuario com este email.');
  }

  const hash = await bcrypt.hash(password, env.bcryptRounds);
  const result = await pool.query(
    `INSERT INTO users (name, email, password, role, is_active, email_verified_at)
     VALUES ($1, $2, $3, 'admin', true, NOW())
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
