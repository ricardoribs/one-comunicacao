const asyncHandler = require('../utils/asyncHandler');
const taskModel = require('../models/taskModel');
const messageModel = require('../models/messageModel');
const { ensureClientAccess } = require('../utils/access');
const { sendPaginated } = require('../utils/response');

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
      content: `Uma nova tarefa foi atribuída a você: "${task.title}" por ${actor.name || 'Equipe ONE'}.`,
    },
    actor
  );
}

exports.list = asyncHandler(async (req, res) => {
  return sendPaginated(res, req, await taskModel.list(req.user, req.query));
});

exports.create = asyncHandler(async (req, res) => {
  if (req.body.client_id) {
    await ensureClientAccess(req.user, req.body.client_id);
  }
  const task = await taskModel.create(req.body, req.user);
  await notifyTaskAssignment(task, null, req.user);
  res.status(201).json(task);
});

exports.update = asyncHandler(async (req, res) => {
  if (req.body.client_id) {
    await ensureClientAccess(req.user, req.body.client_id);
  }
  const previousTask = await taskModel.findById(req.params.id, req.user);
  const task = await taskModel.update(req.params.id, req.body, req.user);
  await notifyTaskAssignment(task, previousTask?.assigned_to, req.user);
  res.json(task);
});

exports.remove = asyncHandler(async (req, res) => {
  await taskModel.remove(req.params.id, req.user);
  res.status(204).send();
});
