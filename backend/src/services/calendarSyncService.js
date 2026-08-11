const pool = require('../config/db');
const calendarIntegrationModel = require('../models/calendarIntegrationModel');
const calendarEventModel = require('../models/calendarEventModel');
const googleCalendarService = require('./googleCalendarService');
const logger = require('../config/logger');
const env = require('../config/env');

let syncIntervalHandle = null;

/**
 * Busca todas as integrações ativas diretamente do pool (sem RLS)
 */
async function listActiveIntegrations() {
  const query = `
    SELECT
      ci.id,
      ci.user_id,
      ci.provider,
      ci.calendar_id,
      ci.access_token,
      ci.refresh_token,
      ci.token_expires_at,
      ci.sync_enabled,
      ci.last_sync_at,
      ci.created_at,
      u.role AS user_role,
      u.name AS user_name,
      u.email AS user_email
    FROM calendar_integrations ci
    INNER JOIN users u ON u.id = ci.user_id
    WHERE ci.sync_enabled = true
    ORDER BY ci.created_at DESC
  `;

  const result = await pool.query(query);
  return result.rows;
}

/**
 * Sincroniza eventos do Google Calendar para um usuário específico
 */
async function syncForUser(integration) {
  const userContext = { id: integration.user_id, role: integration.user_role };

  try {
    let activeIntegration = {
      ...integration,
      access_token: integration.access_token,
      refresh_token: integration.refresh_token,
    };

    if (calendarIntegrationModel.isTokenExpired(integration)) {
      const newTokens = await googleCalendarService.refreshAccessToken(activeIntegration);
      activeIntegration = await calendarIntegrationModel.updateTokens(
        userContext,
        integration.id,
        newTokens
      );
    }

    const since = integration.last_sync_at || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const googleEvents = await googleCalendarService.listEvents(activeIntegration, since);

    let created = 0;
    let skipped = 0;

    for (const googleEvent of googleEvents) {
      const exists = await calendarEventModel.findByGoogleId(userContext, googleEvent.id);

      if (!exists && googleEvent.start?.dateTime && googleEvent.end?.dateTime) {
        await calendarEventModel.create({
          title: googleEvent.summary || 'Sem título',
          description: googleEvent.description || null,
          starts_at: googleEvent.start.dateTime,
          ends_at: googleEvent.end.dateTime,
          location: googleEvent.location || null,
          color: googleCalendarService.mapGoogleIdToColor(googleEvent.colorId),
          google_event_id: googleEvent.id,
          synced_from_google: true,
          client_id: null,
          visibility: 'team',
        }, userContext);

        created++;
      } else {
        skipped++;
      }
    }

    await calendarIntegrationModel.updateLastSync(userContext, integration.id);

    logger.info(`Sync periódico concluído para usuário ${integration.user_id}: ${created} criados, ${skipped} ignorados`);
    return { created, skipped, total: googleEvents.length };
  } catch (error) {
    logger.error(`Erro no sync periódico para usuário ${integration.user_id}:`, error);
    return { created: 0, skipped: 0, total: 0, error: error.message };
  }
}

/**
 * Sincroniza todos os usuários com sync habilitado
 */
async function syncAll() {
  try {
    const integrations = await listActiveIntegrations();

    if (!integrations.length) {
      return;
    }

    logger.info(`Iniciando sync periódico para ${integrations.length} integrações`);

    for (const integration of integrations) {
      await syncForUser(integration);
    }

    logger.info('Sync periódico concluído para todos os usuários');
  } catch (error) {
    logger.error('Erro no sync periódico em lote:', error);
  }
}

/**
 * Inicia o agendamento de sync periódico
 */
function startScheduledSync() {
  if (syncIntervalHandle) {
    return;
  }

  const intervalMs = env.googleCalendarSyncIntervalMs || 30 * 60 * 1000;

  syncIntervalHandle = setInterval(() => {
    syncAll().catch(() => {});
  }, intervalMs);

  logger.info(`Sync periódico do Google Calendar agendado a cada ${intervalMs / 1000}s`);
}

/**
 * Para o agendamento de sync periódico
 */
function stopScheduledSync() {
  if (syncIntervalHandle) {
    clearInterval(syncIntervalHandle);
    syncIntervalHandle = null;
    logger.info('Sync periódico do Google Calendar parado');
  }
}

module.exports = {
  syncForUser,
  syncAll,
  startScheduledSync,
  stopScheduledSync,
};
