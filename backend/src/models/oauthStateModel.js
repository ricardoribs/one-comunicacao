const crypto = require('crypto');
const { runWithTenantContext } = require('../db/tenantDb');
const { hashToken } = require('../utils/tokenHash');

const SERVICE_ACTOR = Object.freeze({ role: 'admin' });
const DEFAULT_TTL_MS = 10 * 60 * 1000;

function createStateToken() {
  return crypto
    .randomBytes(32)
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function serviceQuery(sql, params = []) {
  return runWithTenantContext(SERVICE_ACTOR, (client) => client.query(sql, params));
}

async function create(user, provider, ttlMs = DEFAULT_TTL_MS) {
  const state = createStateToken();
  const stateHash = hashToken(state);
  const expiresAt = new Date(Date.now() + ttlMs);

  await serviceQuery(
    `INSERT INTO oauth_states (state_hash, user_id, provider, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [stateHash, user.id, provider, expiresAt]
  );

  return state;
}

async function consume(state, provider) {
  const stateHash = hashToken(state);
  const { rows } = await serviceQuery(
    `UPDATE oauth_states
     SET consumed_at = NOW()
     WHERE state_hash = $1
       AND provider = $2
       AND consumed_at IS NULL
       AND expires_at > CURRENT_TIMESTAMP::timestamp
     RETURNING id, user_id, provider, expires_at, consumed_at`,
    [stateHash, provider]
  );

  return rows[0] || null;
}

async function cleanupExpired() {
  await serviceQuery(
    `DELETE FROM oauth_states
     WHERE expires_at < CURRENT_TIMESTAMP::timestamp - INTERVAL '1 day'
        OR consumed_at < CURRENT_TIMESTAMP::timestamp - INTERVAL '1 day'`
  );
}

module.exports = {
  create,
  consume,
  cleanupExpired,
};
