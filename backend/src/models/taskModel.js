const pool = require('../config/db');
const tenantDb = require('../db/tenantDb');
const { normalizePagination, paginationClause } = require('../utils/pagination');
const createScopedQuery = require('../utils/scopedQuery');
const { getInternalClientAccessScope } = require('../utils/internalClientScope');
const {
  normalizeAssignedUserIds,
  taskAssigneeExistsSql,
  taskHasAnyAssigneeSql,
  taskHasNoAssigneeSql,
} = require('../utils/taskAssignments');

const selectColumns = `
  t.id,
  t.client_id,
  t.created_by,
  t.assigned_to,
  t.status,
  t.type,
  t.column_name,
  t.title,
  t.description,
  t.deadline,
  t.created_at
`;

function taskClientScope(alias = 't') {
  return `${alias}.client_id = $TENANT AND ${taskHasAnyAssigneeSql(alias)}`;
}

function taskInternalScope(alias = 't') {
  return [
    `${alias}.assigned_to = $TENANT`,
    taskAssigneeExistsSql(alias),
    `${alias}.created_by = $TENANT`,
    taskHasNoAssigneeSql(alias),
    ...getInternalClientAccessScope(`${alias}.client_id`),
  ];
}

function taskScopeConfig(alias = 't') {
  return {
    client: taskClientScope(alias),
    internal: taskInternalScope(alias),
  };
}

function selectSql(whereClause = '', pagination = { clause: '' }) {
  return `SELECT
      ${selectColumns},
      u.name AS assigned_to_name,
      c.name AS client_name,
      t.deadline AS due_date
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assigned_to
    LEFT JOIN clients c ON c.id = t.client_id
    ${whereClause}
    ORDER BY t.created_at DESC${pagination.clause}`;
}

async function loadTaskAssigneeMap(rows, client = null) {
  const taskIds = [...new Set(rows.map((row) => Number(row?.id)).filter((id) => Number.isInteger(id) && id > 0))];

  if (!taskIds.length) {
    return new Map();
  }

  const placeholders = taskIds.map((_, index) => `$${index + 1}`).join(', ');
  const executor = client || pool;
  const { rows: assigneeRows } = await executor.query(
    `SELECT
       task_assignee.task_id,
       task_assignee.user_id,
       assignee.name
     FROM task_assignees task_assignee
     INNER JOIN users assignee ON assignee.id = task_assignee.user_id
     WHERE task_assignee.task_id IN (${placeholders})
     ORDER BY task_assignee.id ASC`,
    taskIds
  );

  return assigneeRows.reduce((map, row) => {
    const taskId = Number(row.task_id);
    if (!map.has(taskId)) {
      map.set(taskId, {
        ids: [],
        names: [],
      });
    }

    const bucket = map.get(taskId);
    bucket.ids.push(Number(row.user_id));
    bucket.names.push(String(row.name || '').trim());
    return map;
  }, new Map());
}

function normalizeTaskRow(row, assigneeMap = new Map()) {
  if (!row) {
    return null;
  }

  const taskId = Number(row.id);
  const assignees = assigneeMap.get(taskId);

  return {
    ...row,
    assigned_user_ids: assignees?.ids?.length
      ? assignees.ids
      : normalizeAssignedUserIds(undefined, row.assigned_to),
    assigned_user_names: assignees?.names?.length
      ? assignees.names
      : String(row.assigned_to_name || '').trim()
        ? [String(row.assigned_to_name).trim()]
        : [],
  };
}

async function hydrateTaskRows(rows, client = null) {
  const assigneeMap = await loadTaskAssigneeMap(rows, client);
  return rows.map((row) => normalizeTaskRow(row, assigneeMap));
}

async function syncTaskAssignees(user, client, taskId, assignedUserIds = []) {
  await tenantDb.queryWithClient(user, client, {
    table: 'task_assignees',
    sql: 'DELETE FROM task_assignees WHERE task_id = $1',
    params: [taskId],
  });

  if (!assignedUserIds.length) {
    return;
  }

  const placeholders = assignedUserIds.map((_, index) => `($1, $${index + 2})`).join(', ');
  await tenantDb.queryWithClient(user, client, {
    table: 'task_assignees',
    sql: `INSERT INTO task_assignees (task_id, user_id) VALUES ${placeholders}`,
    params: [taskId, ...assignedUserIds],
  });
}

async function findById(id, user = null, client = null) {
  const queryOptions = {
    table: 'tasks',
    scopeConfig: taskScopeConfig('t'),
    prefix: 'AND',
    startIndex: 2,
    sql: selectSql('WHERE t.id = $1 __TENANT_SCOPE__'),
    params: [id],
  };

  const { rows } = client
    ? await tenantDb.queryWithClient(user, client, queryOptions)
    : await tenantDb.query(user, queryOptions);

  const [task] = await hydrateTaskRows(rows, client);
  return task || null;
}

async function list(user, query = {}) {
  const { limit, offset } = normalizePagination(query);
  const scope = createScopedQuery(user).build(taskScopeConfig('t'), { prefix: 'WHERE', startIndex: 1 });
  const page = paginationClause(limit, offset, scope.nextIndex);
  const { rows } = await tenantDb.query(user, {
    table: 'tasks',
    scopeConfig: taskScopeConfig('t'),
    prefix: 'WHERE',
    startIndex: 1,
    sql: selectSql('__TENANT_SCOPE__', page),
    suffixParams: page.values,
  });
  return hydrateTaskRows(rows);
}

async function create(data, user = null) {
  const actor = user || { role: 'admin' };
  const assignedUserIds = normalizeAssignedUserIds(data.assigned_to_ids, data.assigned_to);
  const primaryAssignedTo = assignedUserIds[0] || null;

  return tenantDb.runWithTenantContext(actor, async (client) => {
    const { rows } = await tenantDb.queryWithClient(actor, client, {
      table: 'tasks',
      scopeConfig: { internal: '1 = 1' },
      bypassScope: true,
      sql: `INSERT INTO tasks (client_id, created_by, assigned_to, status, type, column_name, description, deadline, title)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      params: [
        data.client_id || null,
        data.created_by || actor?.id || null,
        primaryAssignedTo,
        data.status,
        data.type || 'geral',
        data.column_name || 'backlog',
        data.description,
        data.deadline || null,
        data.title,
      ],
    });

    await syncTaskAssignees(actor, client, rows[0].id, assignedUserIds);
    return findById(rows[0].id, actor, client);
  });
}

async function update(id, data, user = null) {
  const updates = [];
  const params = [id];
  let index = 2;

  const hasAssignedField =
    Object.prototype.hasOwnProperty.call(data, 'assigned_to_ids') || Object.prototype.hasOwnProperty.call(data, 'assigned_to');
  const assignedUserIds = hasAssignedField ? normalizeAssignedUserIds(data.assigned_to_ids, data.assigned_to) : null;

  if (hasAssignedField) {
    updates.push(`assigned_to = $${index++}`);
    params.push(assignedUserIds[0] || null);
  }

  const appendField = (key, column = key) => {
    if (!Object.prototype.hasOwnProperty.call(data, key)) {
      return;
    }

    updates.push(`${column} = $${index++}`);
    params.push(data[key] ?? null);
  };

  appendField('client_id');
  appendField('status');
  appendField('type');
  appendField('column_name');
  appendField('description');
  appendField('deadline');
  appendField('title');

  if (!updates.length) {
    return findById(id, user);
  }

  return tenantDb.runWithTenantContext(user, async (client) => {
    const { rows } = await tenantDb.queryWithClient(user, client, {
      table: 'tasks',
      scopeConfig: taskScopeConfig('tasks'),
      prefix: 'AND',
      startIndex: index,
      sql: `UPDATE tasks
       SET ${updates.join(',\n         ')}
       WHERE id = $1
       __TENANT_SCOPE__
       RETURNING id`,
      params,
    });

    if (!rows[0]) {
      return null;
    }

    if (hasAssignedField) {
      await syncTaskAssignees(user, client, rows[0].id, assignedUserIds);
    }

    return findById(rows[0].id, user, client);
  });
}

async function remove(id, user = null) {
  const result = await tenantDb.query(user, {
    table: 'tasks',
    scopeConfig: taskScopeConfig('tasks'),
    prefix: 'AND',
    startIndex: 2,
    sql: 'DELETE FROM tasks WHERE id = $1 __TENANT_SCOPE__',
    params: [id],
  });
  return result.rowCount > 0;
}

async function listPendingAssignmentsWithoutNotification(userId, limit = 20) {
  const actor = {
    id: userId,
    role: 'designer',
  };

  const { rows } = await tenantDb.query(actor, {
    table: 'tasks',
    scopeConfig: {
      internal: ['t.assigned_to = $TENANT', taskAssigneeExistsSql('t')],
    },
    prefix: 'WHERE',
    startIndex: 2,
    sql: `SELECT
       t.id,
       t.client_id,
       t.created_by,
       t.assigned_to,
       legacy_assignee.name AS assigned_to_name,
       t.status,
       t.type,
       t.column_name,
       t.title,
       t.description,
       t.deadline,
       t.created_at,
       creator.name AS created_by_name,
       c.name AS client_name
     FROM tasks t
     LEFT JOIN users creator ON creator.id = t.created_by
     LEFT JOIN users legacy_assignee ON legacy_assignee.id = t.assigned_to
     LEFT JOIN clients c ON c.id = t.client_id
     LEFT JOIN notifications n
       ON n.user_id = $1
      AND n.entity_type = 'task'
      AND n.entity_id = t.id
      AND n.type = 'task_assigned'
     __TENANT_SCOPE__
       AND COALESCE(t.column_name, '') <> 'done'
       AND LOWER(COALESCE(t.status, '')) NOT IN ('concluido', 'concluído', 'done')
       AND n.id IS NULL
     ORDER BY t.created_at DESC
     LIMIT $3`,
    params: [userId],
    suffixParams: [limit],
  });

  return hydrateTaskRows(rows);
}

module.exports = {
  list,
  findById,
  create,
  update,
  remove,
  listPendingAssignmentsWithoutNotification,
};
