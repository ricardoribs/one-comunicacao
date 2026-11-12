const asyncHandler = require('../utils/asyncHandler');
const checklistModel = require('../models/checklistModel');

exports.getDailyChecklist = asyncHandler(async (req, res) => {
  res.json(await checklistModel.getSnapshot(req.user.id));
});

exports.clearDailyChecklistHistory = asyncHandler(async (req, res) => {
  res.json(await checklistModel.clearHistory(req.user.id));
});

exports.updateDailyChecklist = asyncHandler(async (req, res) => {
  res.json(await checklistModel.replaceToday(req.user.id, req.body.items));
});
