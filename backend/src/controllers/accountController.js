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
const accountPrivacyService = require('../services/accountPrivacyService');
const { decorateFileCollection } = require('../utils/fileAccess');

exports.exportData = asyncHandler(async (req, res) => {
  const user = await userModel.findById(req.user.id);

  const [messages, campaigns, tasks, invoices, reports, materials, files, charges] = await Promise.all([
    accountPrivacyService.loadAllRecords((pagination) => messageModel.listForUser(req.user, pagination)),
    accountPrivacyService.loadAllRecords((pagination) => campaignModel.list(req.user, pagination)),
    accountPrivacyService.loadAllRecords((pagination) => taskModel.list(req.user, pagination)),
    accountPrivacyService.loadAllRecords((pagination) => invoiceModel.list(req.user, pagination)),
    accountPrivacyService.loadAllRecords((pagination) => reportModel.list(req.user, pagination)),
    accountPrivacyService.loadAllRecords((pagination) => materialModel.list(req.user, pagination)),
    accountPrivacyService.loadAllRecords((pagination) => fileModel.list(req.user, pagination)),
    ['admin', 'gestor', 'comercial', 'client'].includes(req.user.role)
      ? accountPrivacyService.loadAllRecords((pagination) => chargeModel.list(req.user, pagination))
      : Promise.resolve([]),
  ]);

  res.json({
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
      mfa_enabled_at: user.mfa_enabled_at || null,
    },
    messages,
    campaigns,
    tasks,
    invoices,
    reports,
    materials,
    files: decorateFileCollection(files),
    charges,
  });
});

exports.deleteAccount = asyncHandler(async (req, res) => {
  const hashedPassword = await bcrypt.hash(`deleted-${Date.now()}-${req.user.id}`, env.bcryptRounds);
  await authService.logoutAll(req.user.id, req.ip);
  await accountPrivacyService.anonymizeAccount(req.user.id, hashedPassword);
  res.status(204).send();
});
