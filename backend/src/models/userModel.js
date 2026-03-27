const pool = require('../config/db');
const { normalizePagination, paginationClause } = require('../utils/pagination');

const USER_UPDATE_COLUMNS = new Set([
  'client_id',
  'name',
  'email',
  'password',
  'role',
  'is_active',
  'email_verified_at',
  'failed_login_attempts',
  'locked_until',
  'last_login_at',
]);

function getExecutor(executor = pool) {
  return executor;
}

const baseSelect = `
  SELECT
    u.id,
    u.client_id,
    u.name,
    u.email,
    u.password,
    u.role,
    u.is_active,
    u.email_verified_at,
    u.failed_login_attempts,
    u.locked_until,
    u.last_login_at,
    u.created_at,
    c.name AS client_name,
    c.company AS client_company
  FROM users u
  LEFT JOIN clients c ON c.id = u.client_id
`;

const INTERNAL_ROLE_FILTER = "LOWER(u.role) IN ('admin', 'gestor', 'designer', 'comercial', 'dev')";
const ACTIVE_INTERNAL_FILTER = 'COALESCE(u.is_active, true) = true';

async function findByEmail(email, executor = pool) {
  const { rows } = await getExecutor(executor).query(`${baseSelect} WHERE LOWER(u.email) = LOWER($1)`, [email]);
  return rows[0] || null;
}

async function findById(id, executor = pool) {
  const { rows } = await getExecutor(executor).query(`${baseSelect} WHERE u.id = $1`, [id]);
  return rows[0] || null;
}

async function list(query = {}) {
  const { limit, offset } = normalizePagination(query);
  const page = paginationClause(limit, offset, 1);
  const { rows } = await pool.query(`${baseSelect} ORDER BY u.created_at DESC${page.clause}`, page.values);
  return rows;
}

async function listActiveInternalTeam(actor = null) {
  if (actor?.role === 'client' && actor.client_id) {
    const { rows } = await pool.query(
      `SELECT DISTINCT
         u.id,
         u.name,
         u.role,
         u.is_active,
         u.last_login_at
       FROM users u
       INNER JOIN clients c ON c.id = $1
       WHERE ${INTERNAL_ROLE_FILTER}
         AND ${ACTIVE_INTERNAL_FILTER}
         AND (
           u.id = c.manager_id
           OR u.client_id = c.id
         )
       ORDER BY u.role, u.name`,
      [actor.client_id]
    );
    return rows;
  }

  const { rows } = await pool.query(
    `SELECT
       u.id,
       u.name,
       u.role,
       u.is_active,
       u.last_login_at
     FROM users u
     WHERE ${INTERNAL_ROLE_FILTER}
       AND ${ACTIVE_INTERNAL_FILTER}
     ORDER BY u.role, u.name`
  );
  return rows;
}

async function listAssignableInternalUsers(actor = null) {
  return listActiveInternalTeam(actor);
}

async function create(data, executor = pool) {
  const { rows } = await getExecutor(executor).query(
    `INSERT INTO users (client_id, name, email, password, role, is_active, email_verified_at)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, true), $7)
     RETURNING id`,
    [
      data.client_id || null,
      data.name,
      data.email,
      data.password,
      data.role,
      data.is_active,
      data.email_verified_at || null,
    ]
  );
  return findById(rows[0].id, executor);
}

async function update(id, data, executor = pool) {
  const fields = [];
  const values = [];
  let index = 1;

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && USER_UPDATE_COLUMNS.has(key)) {
      fields.push(`${key} = $${index++}`);
      values.push(value);
    }
  });

  if (!fields.length) {
    return findById(id, executor);
  }

  values.push(id);
  await getExecutor(executor).query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${index}`, values);
  return findById(id, executor);
}

async function remove(id) {
  await pool.query('DELETE FROM users WHERE id = $1', [id]);
}

async function recordFailedLogin(id, lockThreshold, lockMinutes) {
  const { rows } = await pool.query(
    `UPDATE users
     SET failed_login_attempts = failed_login_attempts + 1,
         locked_until = CASE
           WHEN failed_login_attempts + 1 >= $2 THEN CURRENT_TIMESTAMP::timestamp + ($3 || ' minutes')::INTERVAL
           ELSE locked_until
         END
     WHERE id = $1
     RETURNING failed_login_attempts, locked_until`,
    [id, lockThreshold, String(lockMinutes)]
  );
  return rows[0] || null;
}

async function resetLoginFailures(id) {
  await pool.query(
    `UPDATE users
     SET failed_login_attempts = 0,
         locked_until = NULL,
         last_login_at = NOW()
     WHERE id = $1`,
    [id]
  );
}

async function createRefreshToken(data, executor = pool) {
  const { rows } = await getExecutor(executor).query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, created_by_ip, user_agent)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, token_hash, expires_at, created_at, revoked_at, replaced_by_token_hash, created_by_ip, revoked_by_ip, user_agent`,
    [data.user_id, data.token_hash, data.expires_at, data.created_by_ip || null, data.user_agent || null]
  );
  return rows[0];
}

async function findRefreshToken(tokenHash, executor = pool) {
  const { rows } = await getExecutor(executor).query(
    `SELECT
       rt.id,
       rt.user_id,
       rt.token_hash,
       rt.expires_at,
       rt.created_at,
       rt.revoked_at,
       rt.replaced_by_token_hash,
       rt.created_by_ip,
       rt.revoked_by_ip,
       rt.user_agent,
       u.is_active
     FROM refresh_tokens rt
     INNER JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = $1`,
    [tokenHash]
  );
  return rows[0] || null;
}

async function findRefreshTokenForUpdate(tokenHash, executor = pool) {
  const { rows } = await getExecutor(executor).query(
    `SELECT
       rt.id,
       rt.user_id,
       rt.token_hash,
       rt.expires_at,
       rt.created_at,
       rt.revoked_at,
       rt.replaced_by_token_hash,
       rt.created_by_ip,
       rt.revoked_by_ip,
       rt.user_agent,
       u.is_active
     FROM refresh_tokens rt
     INNER JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = $1
     FOR UPDATE`,
    [tokenHash]
  );
  return rows[0] || null;
}

async function revokeRefreshToken(tokenHash, data = {}, executor = pool) {
  const { rows } = await getExecutor(executor).query(
    `UPDATE refresh_tokens
     SET revoked_at = NOW(),
         revoked_by_ip = COALESCE($2, revoked_by_ip),
         replaced_by_token_hash = COALESCE($3, replaced_by_token_hash)
     WHERE token_hash = $1 AND revoked_at IS NULL
     RETURNING id, user_id, token_hash, expires_at, created_at, revoked_at, replaced_by_token_hash, created_by_ip, revoked_by_ip, user_agent`,
    [tokenHash, data.revoked_by_ip || null, data.replaced_by_token_hash || null]
  );
  return rows[0] || null;
}

async function revokeAllRefreshTokensForUser(userId, ip, executor = pool) {
  await getExecutor(executor).query(
    `UPDATE refresh_tokens
     SET revoked_at = NOW(),
         revoked_by_ip = COALESCE($2, revoked_by_ip)
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId, ip || null]
  );
}

async function createEmailVerificationToken(data) {
  const { rows } = await pool.query(
    `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, token_hash, expires_at, used_at, created_at`,
    [data.user_id, data.token_hash, data.expires_at]
  );
  return rows[0];
}

async function findEmailVerificationToken(tokenHash) {
  const { rows } = await pool.query(
    `SELECT
       evt.id,
       evt.user_id,
       evt.token_hash,
       evt.expires_at,
       evt.used_at,
       evt.created_at,
       u.is_active
     FROM email_verification_tokens evt
     INNER JOIN users u ON u.id = evt.user_id
     WHERE evt.token_hash = $1`,
    [tokenHash]
  );
  return rows[0] || null;
}

async function consumeEmailVerificationToken(tokenHash) {
  const { rows } = await pool.query(
    `UPDATE email_verification_tokens
     SET used_at = NOW()
     WHERE token_hash = $1 AND used_at IS NULL
     RETURNING id, user_id, token_hash, expires_at, used_at, created_at`,
    [tokenHash]
  );
  return rows[0] || null;
}

async function markEmailVerified(userId) {
  await pool.query(
    `UPDATE users
     SET email_verified_at = NOW()
     WHERE id = $1`,
    [userId]
  );
}

async function createPasswordResetToken(data) {
  const { rows } = await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, token_hash, expires_at, used_at, created_at`,
    [data.user_id, data.token_hash, data.expires_at]
  );
  return rows[0];
}

async function findPasswordResetToken(tokenHash) {
  const { rows } = await pool.query(
    `SELECT
       prt.id,
       prt.user_id,
       prt.token_hash,
       prt.expires_at,
       prt.used_at,
       prt.created_at,
       u.is_active
     FROM password_reset_tokens prt
     INNER JOIN users u ON u.id = prt.user_id
     WHERE prt.token_hash = $1`,
    [tokenHash]
  );
  return rows[0] || null;
}

async function consumePasswordResetToken(tokenHash) {
  const { rows } = await pool.query(
    `UPDATE password_reset_tokens
     SET used_at = NOW()
     WHERE token_hash = $1 AND used_at IS NULL
     RETURNING id, user_id, token_hash, expires_at, used_at, created_at`,
    [tokenHash]
  );
  return rows[0] || null;
}

async function anonymizeUser(id, hashedPassword) {
  const anonymizedEmail = `deleted-user-${id}-${Date.now()}@anon.invalid`;
  await pool.query(
    `UPDATE users
     SET name = 'Conta removida',
         email = $2,
         password = $3,
         client_id = NULL,
         is_active = false,
         email_verified_at = NULL,
         failed_login_attempts = 0,
         locked_until = NULL
     WHERE id = $1`,
    [id, anonymizedEmail, hashedPassword]
  );
}

module.exports = {
  findByEmail,
  findById,
  list,
  listActiveInternalTeam,
  listAssignableInternalUsers,
  create,
  update,
  remove,
  recordFailedLogin,
  resetLoginFailures,
  createRefreshToken,
  findRefreshToken,
  findRefreshTokenForUpdate,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
  createEmailVerificationToken,
  findEmailVerificationToken,
  consumeEmailVerificationToken,
  markEmailVerified,
  createPasswordResetToken,
  findPasswordResetToken,
  consumePasswordResetToken,
  anonymizeUser,
};
