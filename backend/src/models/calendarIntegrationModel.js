const tenantDb = require('../db/tenantDb');
const AppError = require('../utils/AppError');

const TABLE = 'calendar_integrations';
const OWNER_SCOPE = Object.freeze({
  internal: 'user_id = $TENANT',
  client: '1 = 0',
});
const OWNER_SCOPE_ALIAS = Object.freeze({
  internal: 'ci.user_id = $TENANT',
  client: '1 = 0',
});

function scopedQuery(user, sql, params = [], options = {}) {
  return tenantDb.query(user, {
    table: TABLE,
    sql,
    params,
    scopeConfig: options.scopeConfig || OWNER_SCOPE,
    prefix: options.prefix || 'AND',
    startIndex: options.startIndex || params.length + 1,
  });
}

async function getByUser(user, provider = 'google_calendar') {
  const result = await scopedQuery(
    user,
    `
      SELECT
        id,
        user_id,
        provider,
        access_token,
        refresh_token,
        token_expires_at,
        calendar_id,
        sync_enabled,
        last_sync_at,
        created_at,
        updated_at
      FROM calendar_integrations
      WHERE user_id = $1 AND provider = $2
      __TENANT_SCOPE__
      LIMIT 1
    `,
    [user.id, provider]
  );

  return result.rows[0] || null;
}

async function getById(user, integrationId) {
  const result = await scopedQuery(
    user,
    `
      SELECT
        id,
        user_id,
        provider,
        access_token,
        refresh_token,
        token_expires_at,
        calendar_id,
        sync_enabled,
        last_sync_at,
        created_at,
        updated_at
      FROM calendar_integrations
      WHERE id = $1
      __TENANT_SCOPE__
      LIMIT 1
    `,
    [integrationId]
  );

  if (!result.rows[0]) {
    throw new AppError('Integracao nao encontrada', 404);
  }

  return result.rows[0];
}

async function create(user, data) {
  const result = await tenantDb.query(user, {
    table: TABLE,
    sql: `
      INSERT INTO calendar_integrations (
        user_id,
        provider,
        access_token,
        refresh_token,
        token_expires_at,
        calendar_id,
        sync_enabled,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING
        id,
        user_id,
        provider,
        access_token,
        refresh_token,
        token_expires_at,
        calendar_id,
        sync_enabled,
        last_sync_at,
        created_at,
        updated_at
    `,
    params: [
      user.id,
      data.provider || 'google_calendar',
      data.accessToken,
      data.refreshToken,
      data.expiresAt,
      data.calendarId || 'primary',
      data.syncEnabled !== false,
    ],
    scopeConfig: OWNER_SCOPE,
  });

  return result.rows[0];
}

async function updateTokens(user, integrationId, data) {
  const result = await scopedQuery(
    user,
    `
      UPDATE calendar_integrations
      SET
        access_token = $2,
        token_expires_at = $3,
        updated_at = NOW()
      WHERE id = $1
      __TENANT_SCOPE__
      RETURNING
        id,
        user_id,
        provider,
        access_token,
        refresh_token,
        token_expires_at,
        calendar_id,
        sync_enabled,
        last_sync_at,
        created_at,
        updated_at
    `,
    [integrationId, data.accessToken, data.expiresAt]
  );

  if (!result.rows[0]) {
    throw new AppError('Integracao nao encontrada', 404);
  }

  return result.rows[0];
}

async function updateLastSync(user, integrationId) {
  const result = await scopedQuery(
    user,
    `
      UPDATE calendar_integrations
      SET
        last_sync_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      __TENANT_SCOPE__
      RETURNING id, last_sync_at
    `,
    [integrationId]
  );

  if (!result.rows[0]) {
    throw new AppError('Integracao nao encontrada', 404);
  }

  return result.rows[0];
}

async function toggleSync(user, integrationId, syncEnabled) {
  const result = await scopedQuery(
    user,
    `
      UPDATE calendar_integrations
      SET
        sync_enabled = $2,
        updated_at = NOW()
      WHERE id = $1
      __TENANT_SCOPE__
      RETURNING
        id,
        user_id,
        provider,
        calendar_id,
        sync_enabled,
        last_sync_at,
        created_at,
        updated_at
    `,
    [integrationId, syncEnabled]
  );

  if (!result.rows[0]) {
    throw new AppError('Integracao nao encontrada', 404);
  }

  return result.rows[0];
}

async function deleteIntegration(user, integrationId) {
  const result = await scopedQuery(
    user,
    `
      DELETE FROM calendar_integrations
      WHERE id = $1
      __TENANT_SCOPE__
      RETURNING id
    `,
    [integrationId]
  );

  if (!result.rows[0]) {
    throw new AppError('Integracao nao encontrada', 404);
  }

  return result.rows[0];
}

function isTokenExpired(integration) {
  if (!integration || !integration.token_expires_at) {
    return true;
  }

  const expiresAt = new Date(integration.token_expires_at);
  const bufferMs = 5 * 60 * 1000;
  return expiresAt.getTime() - Date.now() < bufferMs;
}

async function listActive(user) {
  const result = await scopedQuery(
    user,
    `
      SELECT
        ci.id,
        ci.user_id,
        ci.provider,
        ci.calendar_id,
        ci.sync_enabled,
        ci.last_sync_at,
        ci.created_at,
        u.name AS user_name,
        u.email AS user_email
      FROM calendar_integrations ci
      INNER JOIN users u ON u.id = ci.user_id
      WHERE ci.sync_enabled = true
      __TENANT_SCOPE__
      ORDER BY ci.created_at DESC
    `,
    [],
    { scopeConfig: OWNER_SCOPE_ALIAS, startIndex: 1 }
  );

  return result.rows;
}

module.exports = {
  getByUser,
  getById,
  create,
  updateTokens,
  updateLastSync,
  toggleSync,
  deleteIntegration,
  isTokenExpired,
  listActive,
};
