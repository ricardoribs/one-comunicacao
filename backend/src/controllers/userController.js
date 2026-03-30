const path = require('path');
const bcrypt = require('bcryptjs');
const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');
const userModel = require('../models/userModel');
const authService = require('../services/authService');
const fileModel = require('../models/fileModel');
const uploadService = require('../services/uploadService');
const { buildFileAccessPath } = require('../utils/fileAccess');
const { sendPaginated } = require('../utils/response');
const AppError = require('../utils/AppError');

function stripPassword(user) {
  if (!user) {
    return null;
  }

  const { password: _password, ...safeUser } = user;
  return safeUser;
}

function serializeUserProfile(user) {
  const safeUser = stripPassword(user);
  if (!safeUser) {
    return null;
  }

  return {
    id: safeUser.id,
    client_id: safeUser.client_id,
    name: safeUser.name,
    email: safeUser.email,
    phone: safeUser.phone || null,
    job_title: safeUser.job_title || null,
    avatar_url: safeUser.avatar_url || null,
    role: safeUser.role,
    is_active: safeUser.is_active,
    email_verified_at: safeUser.email_verified_at || null,
    last_login_at: safeUser.last_login_at || null,
    last_seen_at: safeUser.last_seen_at || null,
    last_seen_location: safeUser.last_seen_location || null,
    is_online: Boolean(safeUser.is_online),
    created_at: safeUser.created_at || null,
    client_name: safeUser.client_name || null,
    client_company: safeUser.client_company || null,
    notification_preferences: userModel.extractNotificationPreferences(safeUser),
  };
}

function serializeNotificationPreferences(record) {
  return userModel.extractNotificationPreferences(record);
}

function translateUserWriteError(error) {
  if (error?.code === '23505') {
    throw new AppError('Este e-mail já está em uso.', 409);
  }

  throw error;
}

function extractAvatarFileId(avatarUrl) {
  const match = String(avatarUrl || '').match(/\/api\/files\/(\d+)\/access-url/i);
  return match ? Number(match[1]) : null;
}

async function removeStoredAvatar(user) {
  const avatarFileId = extractAvatarFileId(user?.avatar_url);
  if (!avatarFileId) {
    return;
  }

  const file = await fileModel.findById(avatarFileId, user);
  if (!file) {
    return;
  }

  file.path = path.resolve(__dirname, '../../uploads', file.stored_name);
  await uploadService.deleteUploadedFile(file);
  await fileModel.remove(file.id, user);
}

exports.list = asyncHandler(async (req, res) => {
  const users = await userModel.list(req.query);
  res.setHeader('Cache-Control', 'no-store');
  return sendPaginated(res, req, users.map(stripPassword));
});

exports.listAccessOverview = asyncHandler(async (req, res) => {
  const users = await userModel.listAccessOverview(req.query);
  res.setHeader('Cache-Control', 'no-store');
  return sendPaginated(res, req, users);
});

exports.listInternalTeam = asyncHandler(async (req, res) => {
  const users = await userModel.listActiveInternalTeam(req.user);
  res.setHeader('Cache-Control', 'no-store');
  res.json(users);
});

exports.listAssignableInternal = asyncHandler(async (req, res) => {
  const users = await userModel.listAssignableInternalUsers(req.user);
  res.setHeader('Cache-Control', 'no-store');
  res.json(users);
});

exports.getMyProfile = asyncHandler(async (req, res) => {
  const user = await userModel.findById(req.user.id);

  if (!user) {
    throw new AppError('Usuário não encontrado.', 404);
  }

  res.setHeader('Cache-Control', 'no-store');
  res.json({ user: serializeUserProfile(user) });
});

exports.updateMyProfile = asyncHandler(async (req, res) => {
  try {
    const user = await userModel.update(req.user.id, req.body);
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      message: 'Perfil atualizado com sucesso.',
      user: serializeUserProfile(user),
    });
  } catch (error) {
    translateUserWriteError(error);
  }
});

exports.updateMyNotificationPreferences = asyncHandler(async (req, res) => {
  const currentPreferences = serializeNotificationPreferences(await userModel.findNotificationPreferencesById(req.user.id));
  const nextPreferences = {
    ...currentPreferences,
    ...req.body,
  };
  const updatedPreferences = await userModel.updateNotificationPreferences(req.user.id, nextPreferences);

  res.setHeader('Cache-Control', 'no-store');
  res.json({
    message: 'Preferências de notificação atualizadas com sucesso.',
    preferences: serializeNotificationPreferences(updatedPreferences),
  });
});

exports.uploadMyAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('Envie uma imagem para o perfil.', 400);
  }

  const uploaded = await uploadService.uploadFile(req.file);
  if (!String(uploaded?.mimeType || '').startsWith('image/')) {
    await uploadService.deleteUploadedFile({
      path: req.file.path,
      stored_name: uploaded?.storedName,
    });
    throw new AppError('Envie uma imagem em JPG, PNG, WEBP ou GIF.', 400);
  }

  const currentUser = await userModel.findById(req.user.id);
  if (!currentUser) {
    await uploadService.deleteUploadedFile({
      path: req.file.path,
      stored_name: uploaded?.storedName,
    });
    throw new AppError('Usuário não encontrado.', 404);
  }

  await removeStoredAvatar(currentUser);

  const file = await fileModel.create(
    {
      client_id: currentUser.client_id || null,
      uploaded_by: currentUser.id,
      original_name: req.file.originalname,
      stored_name: uploaded.storedName,
      mime_type: uploaded.mimeType || req.file.mimetype,
      size: req.file.size,
      url: uploaded.url,
    },
    currentUser
  );

  const avatarUrl = buildFileAccessPath(file.id);
  const user = await userModel.update(req.user.id, { avatar_url: avatarUrl });

  res.status(201).json({
    message: 'Foto atualizada com sucesso.',
    user: serializeUserProfile(user),
    file: {
      id: file.id,
      access_url: avatarUrl,
      url: avatarUrl,
    },
  });
});

exports.removeMyAvatar = asyncHandler(async (req, res) => {
  const currentUser = await userModel.findById(req.user.id);
  if (!currentUser) {
    throw new AppError('Usuário não encontrado.', 404);
  }

  await removeStoredAvatar(currentUser);
  const user = await userModel.update(req.user.id, { avatar_url: null });

  res.setHeader('Cache-Control', 'no-store');
  res.json({
    message: 'Foto removida com sucesso.',
    user: serializeUserProfile(user),
  });
});

exports.updateMyPassword = asyncHandler(async (req, res) => {
  const user = await userModel.findById(req.user.id);

  if (!user) {
    throw new AppError('Usuário não encontrado.', 404);
  }

  const currentPassword = String(req.body.current_password || '');
  const nextPassword = String(req.body.new_password || '');
  const isBcryptHash = typeof user.password === 'string' && /^\$2[aby]\$\d{2}\$/.test(user.password);

  if (!isBcryptHash) {
    throw new AppError('Não foi possível validar a senha atual.', 400);
  }

  const isValidPassword = await bcrypt.compare(currentPassword, user.password);
  if (!isValidPassword) {
    throw new AppError('Senha atual incorreta.', 401);
  }

  const passwordHash = await bcrypt.hash(nextPassword, env.bcryptRounds);
  await userModel.update(req.user.id, { password: passwordHash });
  await userModel.revokeAllRefreshTokensForUser(req.user.id, req.ip || null);

  res.json({
    message: 'Senha atualizada com sucesso.',
  });
});

exports.getSecurityInfo = asyncHandler(async (req, res) => {
  const user = await userModel.findSecurityById(req.params.id);

  if (!user) {
    throw new AppError('Usuário não encontrado.', 404);
  }

  res.json({
    failed_login_attempts: user.failed_login_attempts,
    locked_until: user.locked_until,
    last_login_at: user.last_login_at,
  });
});

exports.create = asyncHandler(async (req, res) => {
  try {
    await authService.register(req.body);
    const user = await userModel.findByEmail(req.body.email);
    res.status(201).json({
      ...stripPassword(user),
      message: 'Usuário criado. Verifique o e-mail para ativar o acesso.',
    });
  } catch (error) {
    translateUserWriteError(error);
  }
});

exports.update = asyncHandler(async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.password) {
      payload.password = await bcrypt.hash(payload.password, env.bcryptRounds);
    }

    const user = await userModel.update(req.params.id, payload);
    res.json(stripPassword(user));
  } catch (error) {
    translateUserWriteError(error);
  }
});

exports.remove = asyncHandler(async (req, res) => {
  await userModel.remove(req.params.id);
  res.status(204).send();
});
