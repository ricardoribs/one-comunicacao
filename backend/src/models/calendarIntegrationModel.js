const tenantDb = require('../db/tenantDb');
const AppError = require('../utils/AppError');

/**
 * Busca integração do Google Calendar por usuário
 */
async function getByUser(user, provider = 'google_calendar') {
  const query = `
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
    LIMIT 1
  `;
  
  const result = await tenantDb.query(user, {
    text: query,
    values: [user.id, provider],
  });
  
  return result.rows[0] || null;
}

/**
 * Busca integração por ID
 */
async function getById(user, integrationId) {
  const query = `
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
    LIMIT 1
  `;
  
  const result = await tenantDb.query(user, {
    text: query,
    values: [integrationId],
  });
  
  if (!result.rows[0]) {
    throw new AppError('Integração não encontrada', 404);
  }
  
  return result.rows[0];
}

/**
 * Cria nova integração
 */
async function create(user, data) {
  const query = `
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
  `;
  
  const result = await tenantDb.query(user, {
    text: query,
    values: [
      user.id,
      data.provider || 'google_calendar',
      data.accessToken,
      data.refreshToken,
      data.expiresAt,
      data.calendarId || 'primary',
      data.syncEnabled !== false,
    ],
  });
  
  return result.rows[0];
}

/**
 * Atualiza tokens da integração
 */
async function updateTokens(user, integrationId, data) {
  const query = `
    UPDATE calendar_integrations
    SET
      access_token = $2,
      token_expires_at = $3,
      updated_at = NOW()
    WHERE id = $1
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
  `;
  
  const result = await tenantDb.query(user, {
    text: query,
    values: [integrationId, data.accessToken, data.expiresAt],
  });
  
  if (!result.rows[0]) {
    throw new AppError('Integração não encontrada', 404);
  }
  
  return result.rows[0];
}

/**
 * Atualiza timestamp da última sincronização
 */
async function updateLastSync(user, integrationId) {
  const query = `
    UPDATE calendar_integrations
    SET
      last_sync_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
    RETURNING id, last_sync_at
  `;
  
  const result = await tenantDb.query(user, {
    text: query,
    values: [integrationId],
  });
  
  if (!result.rows[0]) {
    throw new AppError('Integração não encontrada', 404);
  }
  
  return result.rows[0];
}

/**
 * Habilita ou desabilita sincronização
 */
async function toggleSync(user, integrationId, syncEnabled) {
  const query = `
    UPDATE calendar_integrations
    SET
      sync_enabled = $2,
      updated_at = NOW()
    WHERE id = $1
    RETURNING
      id,
      user_id,
      provider,
      calendar_id,
      sync_enabled,
      last_sync_at,
      created_at,
      updated_at
  `;
  
  const result = await tenantDb.query(user, {
    text: query,
    values: [integrationId, syncEnabled],
  });
  
  if (!result.rows[0]) {
    throw new AppError('Integração não encontrada', 404);
  }
  
  return result.rows[0];
}

/**
 * Deleta integração
 */
async function deleteIntegration(user, integrationId) {
  const query = `
    DELETE FROM calendar_integrations
    WHERE id = $1
    RETURNING id
  `;
  
  const result = await tenantDb.query(user, {
    text: query,
    values: [integrationId],
  });
  
  if (!result.rows[0]) {
    throw new AppError('Integração não encontrada', 404);
  }
  
  return result.rows[0];
}

/**
 * Verifica se token expirou
 */
function isTokenExpired(integration) {
  if (!integration || !integration.token_expires_at) {
    return true;
  }
  
  const expiresAt = new Date(integration.token_expires_at);
  const now = new Date();
  
  // Considera expirado se faltar menos de 5 minutos
  const bufferMs = 5 * 60 * 1000;
  return expiresAt.getTime() - now.getTime() < bufferMs;
}

/**
 * Lista todas as integrações ativas do tenant
 */
async function listActive(user) {
  const query = `
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
    ORDER BY ci.created_at DESC
  `;
  
  const result = await tenantDb.query(user, {
    text: query,
    values: [],
  });
  
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
