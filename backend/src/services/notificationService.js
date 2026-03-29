const logger = require('../config/logger');
const notificationModel = require('../models/notificationModel');
const taskModel = require('../models/taskModel');

function buildTaskAssignedBody(task, assignedByName = '') {
  const taskTitle = String(task?.title || 'Nova tarefa').trim();
  const actorName = String(assignedByName || '').trim();
  const clientName = String(task?.client_name || '').trim();
  const contextBits = [clientName].filter(Boolean).join(' · ');

  if (actorName && contextBits) {
    return `${actorName} atribuiu "${taskTitle}" a você em ${contextBits}.`;
  }

  if (actorName) {
    return `${actorName} atribuiu "${taskTitle}" a você.`;
  }

  if (contextBits) {
    return `"${taskTitle}" foi atribuída a você em ${contextBits}.`;
  }

  return `"${taskTitle}" foi atribuída a você.`;
}

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
    logger.error(
      { err: error, user_id: userId, type, entity_type: entityType, entity_id: entityId },
      'Falha ao criar notificação'
    );
    return null;
  }
}

async function notifyTaskAssigned({ task, assignedTo, assignedByName = '' }) {
  return notify({
    userId: assignedTo.id,
    type: 'task_assigned',
    title: 'Nova tarefa atribuída',
    body: buildTaskAssignedBody(task, assignedByName),
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

async function backfillPendingTaskAssignments(userId) {
  if (!userId) {
    return [];
  }

  const pendingAssignments = await taskModel.listPendingAssignmentsWithoutNotification(userId);
  if (!pendingAssignments.length) {
    return [];
  }

  const createdNotifications = [];
  for (const task of pendingAssignments) {
    const notification = await notifyTaskAssigned({
      task,
      assignedTo: { id: userId },
      assignedByName: task.created_by_name,
    });

    if (notification) {
      createdNotifications.push(notification);
    }
  }

  return createdNotifications;
}

module.exports = {
  notify,
  notifyTaskAssigned,
  notifyTaskCompleted,
  backfillPendingTaskAssignments,
};
