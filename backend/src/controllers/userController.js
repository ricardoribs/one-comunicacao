const asyncHandler = require('../utils/asyncHandler');
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const userModel = require('../models/userModel');
const authService = require('../services/authService');
const { sendPaginated } = require('../utils/response');
const AppError = require('../utils/AppError');

exports.list = asyncHandler(async (req, res) => {
  const users = await userModel.list(req.query);
  res.setHeader('Cache-Control', 'no-store');
  return sendPaginated(
    res,
    req,
    users.map(({ password: _password, ...user }) => user)
  );
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

exports.getSecurityInfo = asyncHandler(async (req, res) => {
  const user = await userModel.findSecurityById(req.params.id);

  if (!user) {
    throw new AppError('Usuario nao encontrado.', 404);
  }

  res.json({
    failed_login_attempts: user.failed_login_attempts,
    locked_until: user.locked_until,
    last_login_at: user.last_login_at,
  });
});

exports.create = asyncHandler(async (req, res) => {
  await authService.register(req.body);
  const user = await userModel.findByEmail(req.body.email);
  const { password: _password, ...safeUser } = user;
  res.status(201).json({
    ...safeUser,
    message: 'Usuário criado. Verifique o e-mail para ativar o acesso.',
  });
});

exports.update = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  if (payload.password) {
    payload.password = await bcrypt.hash(payload.password, env.bcryptRounds);
  }
  const user = await userModel.update(req.params.id, payload);
  const { password: _password, ...safeUser } = user;
  res.json(safeUser);
});

exports.remove = asyncHandler(async (req, res) => {
  await userModel.remove(req.params.id);
  res.status(204).send();
});
