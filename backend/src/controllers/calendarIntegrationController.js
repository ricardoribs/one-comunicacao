const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const calendarIntegrationModel = require('../models/calendarIntegrationModel');
const calendarEventModel = require('../models/calendarEventModel');
const googleCalendarService = require('../services/googleCalendarService');
const oauthStateModel = require('../models/oauthStateModel');
const logger = require('../config/logger');
const userModel = require('../models/userModel');

const OAUTH_PROVIDER = 'google_calendar';
const CALLBACK_BASE_PATH = '/app/io?tab=agenda';

function callbackRedirect(res, params = {}) {
  const search = new URLSearchParams(params);
  const suffix = search.toString() ? `&${search.toString()}` : '';
  return res.redirect(`${CALLBACK_BASE_PATH}${suffix}`);
}

exports.initiateAuth = asyncHandler(async (req, res) => {
  const state = await oauthStateModel.create(req.user, OAUTH_PROVIDER);
  const authUrl = googleCalendarService.getAuthUrl(state);

  res.json({ auth_url: authUrl });
});

exports.handleCallback = asyncHandler(async (req, res) => {
  const { code, error, state } = req.query;

  if (error) {
    logger.warn({ error }, 'Google Calendar OAuth negado pelo provedor.');
    return callbackRedirect(res, { error: 'auth_denied' });
  }

  if (!code) {
    return callbackRedirect(res, { error: 'missing_code' });
  }

  if (!state) {
    return callbackRedirect(res, { error: 'invalid_state' });
  }

  const stateRecord = await oauthStateModel.consume(state, OAUTH_PROVIDER);
  if (!stateRecord) {
    return callbackRedirect(res, { error: 'invalid_state' });
  }

  const user = await userModel.findById(stateRecord.user_id);
  if (!user || !user.is_active || user.role === 'client') {
    return callbackRedirect(res, { error: 'invalid_user' });
  }

  try {
    const tokens = await googleCalendarService.exchangeCodeForTokens(code);
    const existing = await calendarIntegrationModel.getByUser(user);

    if (existing) {
      await calendarIntegrationModel.updateTokens(user, existing.id, {
        accessToken: tokens.accessToken,
        expiresAt: tokens.expiresAt,
      });
    } else {
      await calendarIntegrationModel.create(user, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        calendarId: 'primary',
        syncEnabled: true,
      });
    }

    logger.info({ user_id: user.id }, 'Google Calendar conectado.');
    return callbackRedirect(res, { success: 'connected' });
  } catch (callbackError) {
    logger.error({ err: callbackError, user_id: user.id }, 'Erro ao processar callback OAuth.');
    return callbackRedirect(res, { error: 'connection_failed' });
  }
});

exports.getStatus = asyncHandler(async (req, res) => {
  const integration = await calendarIntegrationModel.getByUser(req.user);

  if (!integration) {
    return res.json({
      connected: false,
      sync_enabled: false,
      last_sync_at: null,
    });
  }

  return res.json({
    connected: true,
    sync_enabled: integration.sync_enabled,
    last_sync_at: integration.last_sync_at,
    calendar_id: integration.calendar_id,
    created_at: integration.created_at,
  });
});

exports.toggleSync = asyncHandler(async (req, res) => {
  const { sync_enabled } = req.body;

  if (typeof sync_enabled !== 'boolean') {
    throw new AppError('Parametro sync_enabled deve ser booleano', 400);
  }

  const integration = await calendarIntegrationModel.getByUser(req.user);
  if (!integration) {
    throw new AppError('Nenhuma integracao encontrada', 404);
  }

  const updated = await calendarIntegrationModel.toggleSync(req.user, integration.id, sync_enabled);

  return res.json({
    connected: true,
    sync_enabled: updated.sync_enabled,
    last_sync_at: updated.last_sync_at,
  });
});

exports.syncFromGoogle = asyncHandler(async (req, res) => {
  const integration = await calendarIntegrationModel.getByUser(req.user);

  if (!integration) {
    throw new AppError('Nenhuma integracao encontrada', 404);
  }

  if (!integration.sync_enabled) {
    throw new AppError('Sincronizacao esta desabilitada', 400);
  }

  try {
    let activeIntegration = integration;
    if (calendarIntegrationModel.isTokenExpired(integration)) {
      const newTokens = await googleCalendarService.refreshAccessToken(integration);
      activeIntegration = await calendarIntegrationModel.updateTokens(req.user, integration.id, newTokens);
    }

    const since = integration.last_sync_at || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const googleEvents = await googleCalendarService.listEvents(activeIntegration, since);

    let created = 0;
    let skipped = 0;

    for (const googleEvent of googleEvents) {
      const exists = await calendarEventModel.findByGoogleId(req.user, googleEvent.id);

      if (!exists && googleEvent.start?.dateTime && googleEvent.end?.dateTime) {
        await calendarEventModel.create(
          {
            title: googleEvent.summary || 'Sem titulo',
            description: googleEvent.description || null,
            starts_at: googleEvent.start.dateTime,
            ends_at: googleEvent.end.dateTime,
            location: googleEvent.location || null,
            color: googleCalendarService.mapGoogleIdToColor(googleEvent.colorId),
            google_event_id: googleEvent.id,
            synced_from_google: true,
            client_id: null,
            visibility: 'team',
          },
          req.user
        );

        created += 1;
      } else {
        skipped += 1;
      }
    }

    await calendarIntegrationModel.updateLastSync(req.user, integration.id);

    logger.info({ created, skipped, total: googleEvents.length }, 'Sincronizacao Google Calendar concluida.');

    return res.json({
      success: true,
      created,
      skipped,
      total: googleEvents.length,
    });
  } catch (syncError) {
    logger.error({ err: syncError }, 'Erro ao sincronizar do Google Calendar.');

    if (syncError.statusCode === 401) {
      throw new AppError('Token expirado. Reconecte sua conta Google.', 401);
    }

    throw new AppError('Falha ao sincronizar eventos', 500);
  }
});

exports.disconnect = asyncHandler(async (req, res) => {
  const integration = await calendarIntegrationModel.getByUser(req.user);

  if (!integration) {
    throw new AppError('Nenhuma integracao encontrada', 404);
  }

  try {
    await googleCalendarService.revokeAccess(integration);
  } catch (revokeError) {
    logger.warn({ err: revokeError }, 'Erro ao revogar acesso no Google.');
  }

  await calendarIntegrationModel.deleteIntegration(req.user, integration.id);

  logger.info({ user_id: req.user.id }, 'Google Calendar desconectado.');

  return res.json({
    success: true,
    message: 'Integracao desconectada com sucesso',
  });
});

exports.refreshToken = asyncHandler(async (req, res) => {
  const integration = await calendarIntegrationModel.getByUser(req.user);

  if (!integration) {
    throw new AppError('Nenhuma integracao encontrada', 404);
  }

  try {
    const newTokens = await googleCalendarService.refreshAccessToken(integration);
    const updated = await calendarIntegrationModel.updateTokens(req.user, integration.id, newTokens);

    return res.json({
      success: true,
      expires_at: updated.token_expires_at,
    });
  } catch (refreshError) {
    logger.error({ err: refreshError }, 'Erro ao renovar token.');
    throw new AppError('Falha ao renovar token. Reconecte sua conta Google.', 500);
  }
});

module.exports = exports;
