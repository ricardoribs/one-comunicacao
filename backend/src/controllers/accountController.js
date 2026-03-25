const bcrypt = require('bcryptjs');
const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');
const userModel = require('../models/userModel');
const messageModel = require('../models/messageModel');
const invoiceModel = require('../models/invoiceModel');
const campaignModel = require('../models/campaignModel');
const taskModel = require('../models/taskModel');
const reportModel = require('../models/reportModel');
const materialModel = require('../models/materialModel');
const fileModel = require('../models/fileModel');
const chargeModel = require('../models/chargeModel');
const authService = require('../services/authService');
const { decorateFileCollection } = require('../utils/fileAccess');

exports.exportData = asyncHandler(async (req, res) => {
  const user = await userModel.findById(req.user.id);

  const data = {
    generated_at: new Date().toISOString(),
    user: {
      id: user.id,
      client_id: user.client_id,
      name: user.name,
      email: user.email,
      role: user.role,
      client_name: user.client_name,
      client_company: user.client_company,
      email_verified_at: user.email_verified_at,
    },
    messages: await messageModel.listForUser(req.user, { limit: 100, offset: 0 }),
    campaigns: await campaignModel.list(req.user, { limit: 100, offset: 0 }),
    tasks: await taskModel.list(req.user, { limit: 100, offset: 0 }),
    invoices: await invoiceModel.list(req.user, { limit: 100, offset: 0 }),
    reports: await reportModel.list(req.user, { limit: 100, offset: 0 }),
    materials: await materialModel.list(req.user, { limit: 100, offset: 0 }),
    files: decorateFileCollection(await fileModel.list(req.user, { limit: 100, offset: 0 })),
    charges: ['admin', 'gestor', 'comercial', 'client'].includes(req.user.role)
      ? await chargeModel.list(req.user, { limit: 100, offset: 0 })
      : [],
  };

  res.json(data);
});

exports.deleteAccount = asyncHandler(async (req, res) => {
  const hashedPassword = await bcrypt.hash(`deleted-${Date.now()}-${req.user.id}`, env.bcryptRounds);
  await authService.logoutAll(req.user.id, req.ip);
  await userModel.anonymizeUser(req.user.id, hashedPassword);
  res.status(204).send();
});
