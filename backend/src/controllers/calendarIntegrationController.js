const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const calendarIntegrationModel = require('../models/calendarIntegrationModel');
const calendarEventModel = require('../models/calendarEventModel');
const googleCalendarService = require('../services/googleCalendarService');
const logger = require('../config/logger');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');
const userModel = require('../models/userModel');

/**
 * Verifica JWT manualmente (usado em rotas OAuth que não passam pelo middleware)
 */
async function verifyTokenFromQuery(token) {
  if (!token) {
    throw new AppError('Token de autenticacao nao informado.', 401);
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, {
      algorithms: [env.jwtAlgorithm],
    });
  } catch {
    throw new AppError('Token invalido ou expirado.', 401);
  }

  if (!payload?.jti || payload.sessionVersion === undefined) {
    throw new AppError('Token invalido ou expirado.', 401);
  }

  const user = await userModel.findById(payload.userId);
  if (!user || !user.is_active) {
    throw new AppError('Usuario invalido ou inativo.', 401);
  }

  if (Number(payload.sessionVersion) !== Number(user.session_version || 0)) {
    throw new AppError('Sessao revogada. Faca login novamente.', 401);
  }

  return user;
}

/**
 * Inicia fluxo OAuth - redireciona usuário para autorização Google
 * Token é enviado via query param pois redirect do browser não envia headers
 */
exports.initiateAuth = asyncHandler(async (req, res) => {
  const token = req.query.token;
  const user = await verifyTokenFromQuery(token);

  const authUrl = googleCalendarService.getAuthUrl(user.id);
  res.redirect(authUrl);
});

/**
 * Callback OAuth - recebe código e salva tokens
 * userId é extraído do state param que o Google retorna
 */
exports.handleCallback = asyncHandler(async (req, res) => {
  const { code, error, state } = req.query;
  
  if (error) {
    logger.error('Erro no callback OAuth:', error);
    return res.redirect('/painel-interno?tab=agenda&error=auth_denied');
  }
  
  if (!code) {
    throw new AppError('Código de autorização não fornecido', 400);
  }

  if (!state) {
    return res.redirect('/painel-interno?tab=agenda&error=invalid_state');
  }

  let userId;
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
    userId = decoded.userId;
    if (!userId) throw new Error('missing userId');
  } catch {
    return res.redirect('/painel-interno?tab=agenda&error=invalid_state');
  }

  const user = await userModel.findById(userId);
  if (!user || !user.is_active) {
    return res.redirect('/painel-interno?tab=agenda&error=invalid_user');
  }

  // Criar objeto user-like para o model
  const actor = { id: user.id, role: user.role };
  
  try {
    // Trocar código por tokens
    const tokens = await googleCalendarService.exchangeCodeForTokens(code);
    
    // Verificar se já existe integração
    const existing = await calendarIntegrationModel.getByUser(actor);
    
    if (existing) {
      // Atualizar tokens existentes
      await calendarIntegrationModel.updateTokens(actor, existing.id, {
        accessToken: tokens.accessToken,
        expiresAt: tokens.expiresAt,
      });
    } else {
      // Criar nova integração
      await calendarIntegrationModel.create(actor, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        calendarId: 'primary',
        syncEnabled: true,
      });
    }
    
    logger.info(`Google Calendar conectado para usuário ${userId}`);
    res.redirect('/painel-interno?tab=agenda&success=connected');
  } catch (error) {
    logger.error('Erro ao processar callback OAuth:', error);
    res.redirect('/painel-interno?tab=agenda&error=connection_failed');
  }
});

/**
 * Busca status da integração do usuário
 */
exports.getStatus = asyncHandler(async (req, res) => {
  const integration = await calendarIntegrationModel.getByUser(req.user);
  
  if (!integration) {
    return res.json({
      connected: false,
      sync_enabled: false,
      last_sync_at: null,
    });
  }
  
  res.json({
    connected: true,
    sync_enabled: integration.sync_enabled,
    last_sync_at: integration.last_sync_at,
    calendar_id: integration.calendar_id,
    created_at: integration.created_at,
  });
});

/**
 * Habilita ou desabilita sincronização
 */
exports.toggleSync = asyncHandler(async (req, res) => {
  const { sync_enabled } = req.body;
  
  if (typeof sync_enabled !== 'boolean') {
    throw new AppError('Parâmetro sync_enabled deve ser booleano', 400);
  }
  
  const integration = await calendarIntegrationModel.getByUser(req.user);
  
  if (!integration) {
    throw new AppError('Nenhuma integração encontrada', 404);
  }
  
  const updated = await calendarIntegrationModel.toggleSync(
    req.user,
    integration.id,
    sync_enabled
  );
  
  res.json({
    connected: true,
    sync_enabled: updated.sync_enabled,
    last_sync_at: updated.last_sync_at,
  });
});

/**
 * Sincroniza eventos do Google Calendar para o app
 */
exports.syncFromGoogle = asyncHandler(async (req, res) => {
  const integration = await calendarIntegrationModel.getByUser(req.user);
  
  if (!integration) {
    throw new AppError('Nenhuma integração encontrada', 404);
  }
  
  if (!integration.sync_enabled) {
    throw new AppError('Sincronização está desabilitada', 400);
  }
  
  try {
    // Verificar se token expirou e renovar se necessário
    let activeIntegration = integration;
    if (calendarIntegrationModel.isTokenExpired(integration)) {
      const newTokens = await googleCalendarService.refreshAccessToken(integration);
      activeIntegration = await calendarIntegrationModel.updateTokens(
        req.user,
        integration.id,
        newTokens
      );
    }
    
    // Buscar eventos do Google desde a última sincronização
    const since = integration.last_sync_at || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 dias
    const googleEvents = await googleCalendarService.listEvents(activeIntegration, since);
    
    let created = 0;
    let skipped = 0;
    
    for (const googleEvent of googleEvents) {
      // Verificar se já existe
      const exists = await calendarEventModel.findByGoogleId(req.user, googleEvent.id);
      
      if (!exists && googleEvent.start?.dateTime && googleEvent.end?.dateTime) {
        // Criar novo evento no app
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
        }, req.user);
        
        created++;
      } else {
        skipped++;
      }
    }
    
    // Atualizar timestamp de última sincronização
    await calendarIntegrationModel.updateLastSync(req.user, integration.id);
    
    logger.info(`Sincronização concluída: ${created} criados, ${skipped} ignorados`);
    
    res.json({
      success: true,
      created,
      skipped,
      total: googleEvents.length,
    });
  } catch (error) {
    logger.error('Erro ao sincronizar do Google Calendar:', error);
    
    if (error.statusCode === 401) {
      throw new AppError('Token expirado. Reconecte sua conta Google.', 401);
    }
    
    throw new AppError('Falha ao sincronizar eventos', 500);
  }
});

/**
 * Desconecta integração e revoga acesso
 */
exports.disconnect = asyncHandler(async (req, res) => {
  const integration = await calendarIntegrationModel.getByUser(req.user);
  
  if (!integration) {
    throw new AppError('Nenhuma integração encontrada', 404);
  }
  
  try {
    // Tentar revogar acesso no Google (best effort)
    await googleCalendarService.revokeAccess(integration);
  } catch (error) {
    logger.warn('Erro ao revogar acesso no Google:', error);
  }
  
  // Deletar integração do banco
  await calendarIntegrationModel.deleteIntegration(req.user, integration.id);
  
  logger.info(`Google Calendar desconectado para usuário ${req.user.id}`);
  
  res.json({
    success: true,
    message: 'Integração desconectada com sucesso',
  });
});

/**
 * Força refresh do access token
 */
exports.refreshToken = asyncHandler(async (req, res) => {
  const integration = await calendarIntegrationModel.getByUser(req.user);
  
  if (!integration) {
    throw new AppError('Nenhuma integração encontrada', 404);
  }
  
  try {
    const newTokens = await googleCalendarService.refreshAccessToken(integration);
    const updated = await calendarIntegrationModel.updateTokens(
      req.user,
      integration.id,
      newTokens
    );
    
    res.json({
      success: true,
      expires_at: updated.token_expires_at,
    });
  } catch (error) {
    logger.error('Erro ao renovar token:', error);
    throw new AppError('Falha ao renovar token. Reconecte sua conta Google.', 500);
  }
});

module.exports = exports;
