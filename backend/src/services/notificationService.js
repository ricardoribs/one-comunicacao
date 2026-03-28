const logger = require('../config/logger');
const notificationModel = require('../models/notificationModel');

async function notify({ userId, type, title, body, entityType, entityId }) {
  if (!userId || !type || !title) {
    return null;
  }

  try {
    return await notificationModel.create({
      userId,
      type,
      title,
      body,
      entityType,
      entityId,
    });
  } catch (error) {
    logger.error({ err: error, user_id: userId, type, entity_type: entityType, entity_id: entityId }, 'Falha ao criar notificação');
    return null;
  }
}

async function notifyTaskAssigned({ task, assignedTo }) {
  return notify({
    userId: assignedTo.id,
    type: 'task_assigned',
    title: 'Nova tarefa atribuída',
    body: `"${task.title}" foi atribuída a você.`,
    entityType: 'task',
    entityId: task.id,
  });
}

async function notifyTaskCompleted({ task, completedBy, notifyUserId }) {
  return notify({
    userId: notifyUserId,
    type: 'task_completed',
    title: 'Tarefa concluída',
    body: `"${task.title}" foi concluída por ${completedBy.name}.`,
    entityType: 'task',
    entityId: task.id,
  });
}

module.exports = {
  notify,
  notifyTaskAssigned,
  notifyTaskCompleted,
};
