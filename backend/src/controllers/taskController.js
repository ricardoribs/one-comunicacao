const asyncHandler = require('../utils/asyncHandler');
const taskModel = require('../models/taskModel');
const messageModel = require('../models/messageModel');
const { ensureClientAccess } = require('../utils/access');
const { sendPaginated } = require('../utils/response');

const TASK_COLUMN_STATUS_MAP = {
  backlog: 'Backlog',
  todo: 'A Fazer',
  doing: 'Em progresso',
  done: 'Concluido',
};

function normalizeLooseText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function normalizeTaskColumnName(columnName, status) {
  const rawColumn = String(columnName || '').trim().toLowerCase();

  if (TASK_COLUMN_STATUS_MAP[rawColumn]) {
    return rawColumn;
  }

  const normalizedStatus = normalizeLooseText(status);
  if (normalizedStatus === 'a fazer') {
    return 'todo';
  }
  if (normalizedStatus === 'em progresso' || normalizedStatus === 'em andamento') {
    return 'doing';
  }
  if (normalizedStatus === 'concluido') {
    return 'done';
  }

  return 'backlog';
}

function normalizeTaskStatus(status, columnName) {
  const normalizedColumn = normalizeTaskColumnName(columnName, status);
  return TASK_COLUMN_STATUS_MAP[normalizedColumn] || 'Backlog';
}

function buildTaskPayload(input = {}, fallback = {}) {
  const nextColumnName = normalizeTaskColumnName(input.column_name ?? fallback.column_name, input.status ?? fallback.status);
  const nextStatus = normalizeTaskStatus(input.status ?? fallback.status, nextColumnName);

  return {
    ...input,
    column_name: nextColumnName,
    status: nextStatus,
  };
}

async function notifyTaskAssignment(task, previousAssignedTo, actor) {
  const nextAssignedTo = Number(task?.assigned_to || 0);
  const lastAssignedTo = Number(previousAssignedTo || 0);

  if (!nextAssignedTo || nextAssignedTo === Number(actor?.id || 0) || nextAssignedTo === lastAssignedTo) {
    return;
  }

  await messageModel.create(
    {
      sender_id: actor.id,
      receiver_id: nextAssignedTo,
      context_type: 'task_assignment',
      context_id: task.id,
      content: `Uma nova tarefa foi atribuida a voce: "${task.title}" por ${actor.name || 'Equipe ONE'}.`,
    },
    actor
  );
}

async function notifyTaskCompletion(task, previousTask, actor) {
  const previousStatus = normalizeTaskStatus(previousTask?.status, previousTask?.column_name);
  const nextStatus = normalizeTaskStatus(task?.status, task?.column_name);

  if (nextStatus !== 'Concluido' || previousStatus === 'Concluido') {
    return;
  }

  const recipients = await messageModel.listAssignmentSendersForTask(task.id, actor);
  const uniqueRecipients = [...new Set(recipients)].filter((receiverId) => receiverId && receiverId !== Number(actor?.id || 0));

  await Promise.all(
    uniqueRecipients.map((receiverId) =>
      messageModel.create(
        {
          sender_id: actor.id,
          receiver_id: receiverId,
          context_type: 'task_completed',
          context_id: task.id,
          content: `${actor.name || 'Alguem da equipe'} concluiu a tarefa "${task.title}".`,
        },
        actor
      )
    )
  );
}

exports.list = asyncHandler(async (req, res) => {
  return sendPaginated(res, req, await taskModel.list(req.user, req.query));
});

exports.create = asyncHandler(async (req, res) => {
  if (req.body.client_id) {
    await ensureClientAccess(req.user, req.body.client_id);
  }

  const payload = buildTaskPayload(req.body);
  const task = await taskModel.create(payload, req.user);
  await notifyTaskAssignment(task, null, req.user);
  res.status(201).json(task);
});

exports.update = asyncHandler(async (req, res) => {
  if (req.body.client_id) {
    await ensureClientAccess(req.user, req.body.client_id);
  }

  const previousTask = await taskModel.findById(req.params.id, req.user);
  const payload = buildTaskPayload(req.body, previousTask || {});
  const task = await taskModel.update(req.params.id, payload, req.user);
  await notifyTaskAssignment(task, previousTask?.assigned_to, req.user);
  await notifyTaskCompletion(task, previousTask, req.user);
  res.json(task);
});

exports.remove = asyncHandler(async (req, res) => {
  await taskModel.remove(req.params.id, req.user);
  res.status(204).send();
});
