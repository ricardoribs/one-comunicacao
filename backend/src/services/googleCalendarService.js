const { google } = require('googleapis');
const crypto = require('crypto');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');

/**
 * Criptografa tokens sensíveis antes de armazenar no banco
 */
function encryptToken(token) {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(env.jwtSecret, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Descriptografa tokens do banco
 */
function decryptToken(encryptedToken) {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(env.jwtSecret, 'salt', 32);
  const [ivHex, encrypted] = encryptedToken.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Cria cliente OAuth2 configurado
 */
function createOAuth2Client() {
  return new google.auth.OAuth2(
    env.googleClientId,
    env.googleClientSecret,
    env.googleRedirectUri
  );
}

/**
 * Configura credenciais no cliente OAuth2
 */
function setOAuth2Credentials(oauth2Client, integration) {
  oauth2Client.setCredentials({
    access_token: decryptToken(integration.access_token),
    refresh_token: decryptToken(integration.refresh_token),
    expiry_date: new Date(integration.token_expires_at).getTime(),
  });
  
  return oauth2Client;
}

/**
 * Gera URL de autorização para o usuário
 */
function getAuthUrl() {
  const oauth2Client = createOAuth2Client();
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
  });
}

/**
 * Troca código de autorização por tokens
 */
async function exchangeCodeForTokens(code) {
  const oauth2Client = createOAuth2Client();
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new AppError('Tokens incompletos retornados pelo Google', 500);
    }
    
    return {
      accessToken: encryptToken(tokens.access_token),
      refreshToken: encryptToken(tokens.refresh_token),
      expiresAt: new Date(tokens.expiry_date),
    };
  } catch (error) {
    logger.error('Erro ao trocar código por tokens:', error);
    throw new AppError('Falha ao autenticar com Google Calendar', 500);
  }
}

/**
 * Renova access token usando refresh token
 */
async function refreshAccessToken(integration) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: decryptToken(integration.refresh_token),
  });
  
  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    return {
      accessToken: encryptToken(credentials.access_token),
      expiresAt: new Date(credentials.expiry_date),
    };
  } catch (error) {
    logger.error('Erro ao renovar access token:', error);
    throw new AppError('Falha ao renovar token do Google Calendar', 500);
  }
}

/**
 * Cria evento no Google Calendar
 */
async function createEvent(integration, eventData) {
  const oauth2Client = setOAuth2Credentials(createOAuth2Client(), integration);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  try {
    const event = {
      summary: eventData.title,
      description: eventData.description || '',
      location: eventData.location || '',
      start: {
        dateTime: new Date(eventData.starts_at).toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: new Date(eventData.ends_at).toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      colorId: mapColorToGoogleId(eventData.color),
    };
    
    const response = await calendar.events.insert({
      calendarId: integration.calendar_id || 'primary',
      requestBody: event,
    });
    
    logger.info(`Evento criado no Google Calendar: ${response.data.id}`);
    return response.data.id;
  } catch (error) {
    logger.error('Erro ao criar evento no Google Calendar:', error);
    
    if (error.code === 401) {
      throw new AppError('Token do Google Calendar expirado', 401);
    }
    
    throw new AppError('Falha ao criar evento no Google Calendar', 500);
  }
}

/**
 * Atualiza evento no Google Calendar
 */
async function updateEvent(integration, googleEventId, eventData) {
  const oauth2Client = setOAuth2Credentials(createOAuth2Client(), integration);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  try {
    const event = {
      summary: eventData.title,
      description: eventData.description || '',
      location: eventData.location || '',
      start: {
        dateTime: new Date(eventData.starts_at).toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: new Date(eventData.ends_at).toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      colorId: mapColorToGoogleId(eventData.color),
    };
    
    await calendar.events.update({
      calendarId: integration.calendar_id || 'primary',
      eventId: googleEventId,
      requestBody: event,
    });
    
    logger.info(`Evento atualizado no Google Calendar: ${googleEventId}`);
  } catch (error) {
    logger.error('Erro ao atualizar evento no Google Calendar:', error);
    
    if (error.code === 401) {
      throw new AppError('Token do Google Calendar expirado', 401);
    }
    
    throw new AppError('Falha ao atualizar evento no Google Calendar', 500);
  }
}

/**
 * Deleta evento no Google Calendar
 */
async function deleteEvent(integration, googleEventId) {
  const oauth2Client = setOAuth2Credentials(createOAuth2Client(), integration);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  try {
    await calendar.events.delete({
      calendarId: integration.calendar_id || 'primary',
      eventId: googleEventId,
    });
    
    logger.info(`Evento deletado no Google Calendar: ${googleEventId}`);
  } catch (error) {
    if (error.code === 404) {
      logger.warn(`Evento ${googleEventId} não encontrado no Google Calendar`);
      return;
    }
    
    logger.error('Erro ao deletar evento no Google Calendar:', error);
    
    if (error.code === 401) {
      throw new AppError('Token do Google Calendar expirado', 401);
    }
    
    throw new AppError('Falha ao deletar evento no Google Calendar', 500);
  }
}

/**
 * Busca eventos do Google Calendar a partir de uma data
 */
async function listEvents(integration, since) {
  const oauth2Client = setOAuth2Credentials(createOAuth2Client(), integration);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  try {
    const response = await calendar.events.list({
      calendarId: integration.calendar_id || 'primary',
      timeMin: since ? new Date(since).toISOString() : new Date().toISOString(),
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    return response.data.items || [];
  } catch (error) {
    logger.error('Erro ao listar eventos do Google Calendar:', error);
    
    if (error.code === 401) {
      throw new AppError('Token do Google Calendar expirado', 401);
    }
    
    throw new AppError('Falha ao buscar eventos do Google Calendar', 500);
  }
}

/**
 * Mapeia cor do app para ID de cor do Google
 */
function mapColorToGoogleId(color) {
  const colorMap = {
    pink: '4',
    red: '11',
    orange: '6',
    yellow: '5',
    green: '10',
    blue: '9',
    purple: '3',
    gray: '8',
  };
  
  return colorMap[color] || '4';
}

/**
 * Mapeia ID de cor do Google para cor do app
 */
function mapGoogleIdToColor(colorId) {
  const colorMap = {
    '1': 'blue',
    '2': 'green',
    '3': 'purple',
    '4': 'pink',
    '5': 'yellow',
    '6': 'orange',
    '7': 'blue',
    '8': 'gray',
    '9': 'blue',
    '10': 'green',
    '11': 'red',
  };
  
  return colorMap[colorId] || 'pink';
}

/**
 * Revoga acesso do app ao Google Calendar
 */
async function revokeAccess(integration) {
  const oauth2Client = createOAuth2Client();
  
  try {
    const accessToken = decryptToken(integration.access_token);
    await oauth2Client.revokeToken(accessToken);
    
    logger.info(`Acesso revogado para integração ${integration.id}`);
  } catch (error) {
    logger.error('Erro ao revogar acesso do Google Calendar:', error);
  }
}

module.exports = {
  encryptToken,
  decryptToken,
  getAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  createEvent,
  updateEvent,
  deleteEvent,
  listEvents,
  mapColorToGoogleId,
  mapGoogleIdToColor,
  revokeAccess,
};
