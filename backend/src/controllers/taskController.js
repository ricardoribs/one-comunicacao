const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const taskModel = require('../models/taskModel');
const userModel = require('../models/userModel');
const notificationService = require('../services/notificationService');
const { ensureClientAccess } = require('../utils/access');
const { normalizeTaskTypeValue } = require('../utils/taskTypes');
const { sendPaginated } = require('../utils/response');
const { normalizeAssignedUserIds } = require('../utils/taskAssignments');

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
  const hasAssignedToIds = Object.prototype.hasOwnProperty.call(input, 'assigned_to_ids');
  const hasAssignedTo = Object.prototype.hasOwnProperty.call(input, 'assigned_to');
  const assignedToIds = hasAssignedToIds || hasAssignedTo
    ? normalizeAssignedUserIds(hasAssignedToIds ? input.assigned_to_ids : undefined, hasAssignedTo ? input.assigned_to : null)
    : normalizeAssignedUserIds(fallback.assigned_user_ids || fallback.assigned_to_ids, fallback.assigned_to);

  return {
    ...input,
    assigned_to: assignedToIds[0] || null,
    assigned_to_ids: assignedToIds,
    type: normalizeTaskTypeValue(input.type ?? fallback.type),
    column_name: nextColumnName,
    status: nextStatus,
  };
}

function getAssignedUserIds(task) {
  return normalizeAssignedUserIds(task?.assigned_user_ids || task?.assigned_to_ids, task?.assigned_to);
}

async function ensureValidTaskAssignees(userIds = []) {
  if (!userIds.length) {
    return [];
  }

  const assignees = await Promise.all(userIds.map((userId) => userModel.findById(userId)));
  const invalidIndex = assignees.findIndex(
    (user) => !user || user.role === 'client' || user.is_active === false
  );

  if (invalidIndex >= 0) {
    throw new AppError('Selecione apenas responsáveis internos ativos para a tarefa.', 400);
  }

  return assignees;
}

async function notifyTaskAssignment(task, previousTask, actor) {
  const nextAssignedToIds = getAssignedUserIds(task);
  const previousAssignedToIds = getAssignedUserIds(previousTask);
  const actorId = Number(actor?.id || 0);
  const newAssigneeIds = nextAssignedToIds.filter(
    (userId) => userId !== actorId && !previousAssignedToIds.includes(userId)
  );

  if (!newAssigneeIds.length) {
    return;
  }

  const assignees = await Promise.all(newAssigneeIds.map((userId) => userModel.findById(userId)));
  await Promise.all(
    assignees
      .filter(Boolean)
      .map((assignedTo) =>
        notificationService.notifyTaskAssigned({
          task,
          assignedTo,
          assignedByName: actor?.name || '',
        })
      )
  );
}

async function notifyTaskCompletion(task, previousTask, actor) {
  const previousStatus = normalizeTaskStatus(previousTask?.status, previousTask?.column_name);
  const nextStatus = normalizeTaskStatus(task?.status, task?.column_name);
  const notifyUserId = Number(task?.created_by || previousTask?.created_by || 0);

  if (nextStatus !== 'Concluido' || previousStatus === 'Concluido' || !notifyUserId || notifyUserId === Number(actor?.id || 0)) {
    return;
  }

  await notificationService.notifyTaskCompleted({
    task,
    completedBy: actor,
    notifyUserId,
  });
}

exports.list = asyncHandler(async (req, res) => {
  return sendPaginated(res, req, await taskModel.list(req.user, req.query));
});

exports.create = asyncHandler(async (req, res) => {
  if (req.body.client_id) {
    await ensureClientAccess(req.user, req.body.client_id);
  }

  const payload = buildTaskPayload(req.body);
  await ensureValidTaskAssignees(payload.assigned_to_ids);
  payload.created_by = req.user.id;
  const task = await taskModel.create(payload, req.user);
  await notifyTaskAssignment(task, null, req.user);
  res.status(201).json(task);
});

exports.update = asyncHandler(async (req, res) => {
  if (req.body.client_id) {
    await ensureClientAccess(req.user, req.body.client_id);
  }

  const previousTask = await taskModel.findById(req.params.id, req.user);
  if (!previousTask) {
    throw new AppError('Tarefa nao encontrada.', 404);
  }
  const payload = buildTaskPayload(req.body, previousTask || {});
  await ensureValidTaskAssignees(payload.assigned_to_ids);
  const task = await taskModel.update(req.params.id, payload, req.user);
  await notifyTaskAssignment(task, previousTask, req.user);
  await notifyTaskCompletion(task, previousTask, req.user);
  res.json(task);
});

exports.remove = asyncHandler(async (req, res) => {
  const removed = await taskModel.remove(req.params.id, req.user);
  if (!removed) {
    throw new AppError('Tarefa nao encontrada.', 404);
  }
  res.status(204).send();
});
