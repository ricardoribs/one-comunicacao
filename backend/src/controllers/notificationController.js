const asyncHandler = require('../utils/asyncHandler');
const notificationModel = require('../models/notificationModel');
const notificationService = require('../services/notificationService');

exports.list = asyncHandler(async (req, res) => {
  await notificationService.backfillPendingTaskAssignments(req.user.id);
  await notificationService.syncUpcomingCalendarReminders(req.user);
  const notifications = await notificationModel.listForUser(req.user, {
    limit: Number(req.query.limit || 30),
    unreadOnly: req.query.unread === 'true',
  });

  res.json(notifications);
});

exports.countUnread = asyncHandler(async (req, res) => {
  await notificationService.backfillPendingTaskAssignments(req.user.id);
  await notificationService.syncUpcomingCalendarReminders(req.user);
  const total = await notificationModel.countUnread(req.user);
  res.json({ total });
});

exports.markAsRead = asyncHandler(async (req, res) => {
  await notificationModel.markAsRead(req.params.id, req.user);
  res.status(204).send();
});

exports.markAllAsRead = asyncHandler(async (req, res) => {
  await notificationModel.markAllAsRead(req.user);
  res.status(204).send();
});
