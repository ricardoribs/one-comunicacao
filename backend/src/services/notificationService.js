const logger = require('../config/logger');
const calendarEventModel = require('../models/calendarEventModel');
const notificationModel = require('../models/notificationModel');
const taskModel = require('../models/taskModel');

const CALENDAR_REMINDER_WINDOWS = [
  {
    reminderType: '24h',
    notificationType: 'calendar_event_reminder_24h',
    title: 'Evento se aproximando',
    offsetFromNowMs: 60 * 60 * 1000,
    offsetToNowMs: 24 * 60 * 60 * 1000,
  },
  {
    reminderType: '1h',
    notificationType: 'calendar_event_reminder_1h',
    title: 'Evento em breve',
    offsetFromNowMs: 0,
    offsetToNowMs: 60 * 60 * 1000,
  },
];

function formatCalendarEventMoment(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return 'em breve';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(date);
}

function buildCalendarReminderBody(event, reminderWindow) {
  const title = String(event?.title || 'Evento').trim();
  const location = String(event?.location || '').trim();
  const when = formatCalendarEventMoment(event?.starts_at);
  const suffix = location ? ` · ${location}` : '';

  if (reminderWindow.reminderType === '1h') {
    return `"${title}" começa ${when}.${suffix ? ` Local: ${location}.` : ''}`;
  }

  return `"${title}" está agendado para ${when}.${suffix ? ` Local: ${location}.` : ''}`;
}

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

async function syncUpcomingCalendarReminders(user) {
  if (!user?.id || user.role === 'client') {
    return [];
  }

  try {
    const now = Date.now();
    const createdNotifications = [];

    for (const reminderWindow of CALENDAR_REMINDER_WINDOWS) {
      const events = await calendarEventModel.listDueReminderCandidates(user.id, {
        from: new Date(now + reminderWindow.offsetFromNowMs).toISOString(),
        to: new Date(now + reminderWindow.offsetToNowMs).toISOString(),
        reminderType: reminderWindow.reminderType,
      });

      for (const event of events) {
        const delivery = await calendarEventModel.registerReminderDelivery({
          eventId: event.id,
          userId: user.id,
          reminderType: reminderWindow.reminderType,
        });

        if (!delivery) {
          continue;
        }

        const notification = await notify({
          userId: user.id,
          type: reminderWindow.notificationType,
          title: reminderWindow.title,
          body: buildCalendarReminderBody(event, reminderWindow),
          entityType: 'calendar_event',
          entityId: event.id,
        });

        if (notification) {
          createdNotifications.push(notification);
        }
      }
    }

    return createdNotifications;
  } catch (error) {
    logger.error({ err: error, user_id: user.id }, 'Falha ao sincronizar lembretes do calendario');
    return [];
  }
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
  syncUpcomingCalendarReminders,
};
