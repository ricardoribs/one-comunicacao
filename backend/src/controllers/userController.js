const asyncHandler = require('../utils/asyncHandler');
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const userModel = require('../models/userModel');
const authService = require('../services/authService');
const { sendPaginated } = require('../utils/response');

exports.list = asyncHandler(async (req, res) => {
  const users = await userModel.list(req.query);
  return sendPaginated(
    res,
    req,
    users.map(({ password: _password, ...user }) => user)
  );
});

exports.listInternalTeam = asyncHandler(async (_req, res) => {
  const users = await userModel.listActiveInternalTeam();
  res.setHeader('Cache-Control', 'no-store');
  res.json(users);
});

exports.listAssignableInternal = asyncHandler(async (_req, res) => {
  const users = await userModel.listAssignableInternalUsers();
  res.setHeader('Cache-Control', 'no-store');
  res.json(users);
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
