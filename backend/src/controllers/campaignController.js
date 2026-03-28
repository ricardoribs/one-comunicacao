const asyncHandler = require('../utils/asyncHandler');
const logger = require('../config/logger');
const campaignModel = require('../models/campaignModel');
const { ensureClientAccess, sanitizeCampaignForUser } = require('../utils/access');
const { sendPaginated } = require('../utils/response');
const isRecoverableSchemaError = require('../utils/isRecoverableSchemaError');

exports.list = asyncHandler(async (req, res) => {
  let campaigns = [];

  try {
    campaigns = await campaignModel.list(req.user, req.query);
  } catch (error) {
    if (!isRecoverableSchemaError(error)) {
      throw error;
    }

    logger.warn(
      {
        err: error,
        user_id: req.user?.id || null,
        route: req.originalUrl,
      },
      'Falha recuperavel ao listar campanhas. Retornando lista vazia.'
    );
  }

  return sendPaginated(
    res,
    req,
    campaigns.map((campaign) => sanitizeCampaignForUser(campaign, req.user))
  );
});

exports.create = asyncHandler(async (req, res) => {
  await ensureClientAccess(req.user, req.body.client_id);
  res.status(201).json(await campaignModel.create(req.body, req.user));
});

exports.update = asyncHandler(async (req, res) => {
  if (req.body.client_id) {
    await ensureClientAccess(req.user, req.body.client_id);
  }
  res.json(await campaignModel.update(req.params.id, req.body, req.user));
});

exports.remove = asyncHandler(async (req, res) => {
  await campaignModel.remove(req.params.id, req.user);
  res.status(204).send();
});
