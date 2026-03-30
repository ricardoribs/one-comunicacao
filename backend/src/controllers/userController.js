const asyncHandler = require('../utils/asyncHandler');
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const userModel = require('../models/userModel');
const authService = require('../services/authService');
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
  };
}

function translateUserWriteError(error) {
  if (error?.code === '23505') {
    throw new AppError('Este e-mail já está em uso.', 409);
  }

  throw error;
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
