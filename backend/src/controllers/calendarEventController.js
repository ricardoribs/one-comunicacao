const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const calendarEventModel = require('../models/calendarEventModel');
const calendarIntegrationModel = require('../models/calendarIntegrationModel');
const googleCalendarService = require('../services/googleCalendarService');
const { ensureClientAccess } = require('../utils/access');
const logger = require('../config/logger');

/**
 * Sincroniza evento com Google Calendar se integração estiver ativa
 */
async function syncEventToGoogle(user, event, action = 'create') {
  try {
    // Verificar se usuário tem integração ativa
    const integration = await calendarIntegrationModel.getByUser(user);
    
    if (!integration || !integration.sync_enabled) {
      return; // Sem integração ou sync desabilitado
    }
    
    // Não sincronizar eventos que vieram do Google
    if (event.synced_from_google) {
      return;
    }
    
    // Verificar e renovar token se necessário
    let activeIntegration = integration;
    if (calendarIntegrationModel.isTokenExpired(integration)) {
      const newTokens = await googleCalendarService.refreshAccessToken(integration);
      activeIntegration = await calendarIntegrationModel.updateTokens(user, integration.id, newTokens);
    }
    
    if (action === 'create') {
      const googleEventId = await googleCalendarService.createEvent(activeIntegration, event);
      
      // Atualizar evento local com ID do Google
      await calendarEventModel.update(event.id, { google_event_id: googleEventId }, user);
      
      logger.info(`Evento ${event.id} criado no Google Calendar: ${googleEventId}`);
    } else if (action === 'update' && event.google_event_id) {
      await googleCalendarService.updateEvent(activeIntegration, event.google_event_id, event);
      logger.info(`Evento ${event.id} atualizado no Google Calendar`);
    } else if (action === 'delete' && event.google_event_id) {
      await googleCalendarService.deleteEvent(activeIntegration, event.google_event_id);
      logger.info(`Evento ${event.id} deletado no Google Calendar`);
    }
  } catch (error) {
    // Não falhar a operação local se sincronização falhar
    logger.error(`Erro ao sincronizar evento ${event.id} com Google Calendar:`, error);
  }
}

function normalizeEventPayload(input = {}, fallback = {}) {
  const payload = {};

  if (Object.prototype.hasOwnProperty.call(input, 'title') || Object.prototype.hasOwnProperty.call(fallback, 'title')) {
    payload.title = String(input.title ?? fallback.title ?? '').trim();
  }

  if (Object.prototype.hasOwnProperty.call(input, 'description') || Object.prototype.hasOwnProperty.call(fallback, 'description')) {
    const nextValue = Object.prototype.hasOwnProperty.call(input, 'description') ? input.description : fallback.description;
    payload.description = nextValue == null ? null : String(nextValue).trim() || null;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'starts_at') || Object.prototype.hasOwnProperty.call(fallback, 'starts_at')) {
    payload.starts_at = input.starts_at ?? fallback.starts_at ?? null;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'ends_at') || Object.prototype.hasOwnProperty.call(fallback, 'ends_at')) {
    payload.ends_at = input.ends_at ?? fallback.ends_at ?? null;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'location') || Object.prototype.hasOwnProperty.call(fallback, 'location')) {
    const nextValue = Object.prototype.hasOwnProperty.call(input, 'location') ? input.location : fallback.location;
    payload.location = nextValue == null ? null : String(nextValue).trim() || null;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'color') || Object.prototype.hasOwnProperty.call(fallback, 'color')) {
    payload.color = String(input.color ?? fallback.color ?? 'pink').trim() || 'pink';
  }

  if (Object.prototype.hasOwnProperty.call(input, 'client_id') || Object.prototype.hasOwnProperty.call(fallback, 'client_id')) {
    const nextValue = Object.prototype.hasOwnProperty.call(input, 'client_id') ? input.client_id : fallback.client_id;
    payload.client_id = nextValue == null || nextValue === '' ? null : Number(nextValue);
  }

  payload.visibility = payload.client_id ? 'client' : 'team';

  return payload;
}

function ensureValidEventRange(startsAt, endsAt) {
  const startDate = new Date(startsAt);
  const endDate = new Date(endsAt);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new AppError('Informe uma data e hora validas para o evento.', 400);
  }

  if (endDate.getTime() <= startDate.getTime()) {
    throw new AppError('O fim do evento deve acontecer depois do inicio.', 400);
  }
}

exports.list = asyncHandler(async (req, res) => {
  const events = await calendarEventModel.listRange(req.user, {
    from: req.query.from,
    to: req.query.to,
  });

  res.json(events);
});

exports.getById = asyncHandler(async (req, res) => {
  const event = await calendarEventModel.findById(req.params.id, req.user);

  if (!event) {
    throw new AppError('Evento não encontrado.', 404);
  }

  res.json(event);
});

exports.create = asyncHandler(async (req, res) => {
  const payload = normalizeEventPayload(req.body);
  ensureValidEventRange(payload.starts_at, payload.ends_at);
  if (payload.client_id) {
    await ensureClientAccess(req.user, payload.client_id);
  }

  const event = await calendarEventModel.create(payload, req.user);
  
  // Sincronizar com Google Calendar (não bloqueia resposta)
  syncEventToGoogle(req.user, event, 'create').catch(() => {});
  
  res.status(201).json(event);
});

exports.update = asyncHandler(async (req, res) => {
  const current = await calendarEventModel.findById(req.params.id, req.user);
  if (!current) {
    throw new AppError('Evento não encontrado.', 404);
  }

  const payload = normalizeEventPayload(req.body, current);
  ensureValidEventRange(payload.starts_at, payload.ends_at);
  if (payload.client_id) {
    await ensureClientAccess(req.user, payload.client_id);
  }

  const event = await calendarEventModel.update(req.params.id, payload, req.user);
  
  // Sincronizar com Google Calendar (não bloqueia resposta)
  syncEventToGoogle(req.user, event, 'update').catch(() => {});
  
  res.json(event);
});

exports.remove = asyncHandler(async (req, res) => {
  const event = await calendarEventModel.findById(req.params.id, req.user);
  if (!event) {
    throw new AppError('Evento não encontrado.', 404);
  }
  
  const removed = await calendarEventModel.remove(req.params.id, req.user);
  if (!removed) {
    throw new AppError('Evento não encontrado.', 404);
  }
  
  // Sincronizar com Google Calendar (não bloqueia resposta)
  syncEventToGoogle(req.user, event, 'delete').catch(() => {});

  res.status(204).send();
});
