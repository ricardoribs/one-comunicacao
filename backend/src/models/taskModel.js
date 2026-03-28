const tenantDb = require('../db/tenantDb');
const { normalizePagination, paginationClause } = require('../utils/pagination');
const createScopedQuery = require('../utils/scopedQuery');
const { getInternalClientAccessScope } = require('../utils/internalClientScope');

const selectColumns = `
  t.id,
  t.client_id,
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
  return `${alias}.client_id = $TENANT AND ${alias}.assigned_to IS NOT NULL`;
}

function taskInternalScope(alias = 't') {
  return [
    `${alias}.assigned_to = $TENANT`,
    `${alias}.assigned_to IS NULL`,
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
  return rows;
}

async function findById(id, user = null) {
  const { rows } = await tenantDb.query(user, {
    table: 'tasks',
    scopeConfig: taskScopeConfig('t'),
    prefix: 'AND',
    startIndex: 2,
    sql: selectSql('WHERE t.id = $1 __TENANT_SCOPE__'),
    params: [id],
  });

  return rows[0] || null;
}

async function create(data, user = null) {
  const { rows } = await tenantDb.query(user || { role: 'admin' }, {
    table: 'tasks',
    scopeConfig: { internal: '1 = 1' },
    sql: `INSERT INTO tasks (client_id, assigned_to, status, type, column_name, description, deadline, title)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    params: [
      data.client_id || null,
      data.assigned_to || null,
      data.status,
      data.type || 'geral',
      data.column_name || 'backlog',
      data.description,
      data.deadline || null,
      data.title,
    ],
  });
  return findById(rows[0].id, user);
}

async function update(id, data, user = null) {
  const updates = [];
  const params = [id];
  let index = 2;
  const appendField = (key, column = key) => {
    if (!Object.prototype.hasOwnProperty.call(data, key)) {
      return;
    }

    updates.push(`${column} = $${index++}`);
    params.push(data[key] ?? null);
  };

  appendField('client_id');
  appendField('assigned_to');
  appendField('status');
  appendField('type');
  appendField('column_name');
  appendField('description');
  appendField('deadline');
  appendField('title');

  if (!updates.length) {
    return findById(id, user);
  }

  const { rows } = await tenantDb.query(user, {
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
  return findById(rows[0].id, user);
}

async function remove(id, user = null) {
  await tenantDb.query(user, {
    table: 'tasks',
    scopeConfig: {
      client: 'client_id = $TENANT',
      internal: [
        'assigned_to = $TENANT',
        ...getInternalClientAccessScope('tasks.client_id'),
      ],
    },
    prefix: 'AND',
    startIndex: 2,
    sql: 'DELETE FROM tasks WHERE id = $1 __TENANT_SCOPE__',
    params: [id],
  });
}

module.exports = {
  list,
  findById,
  create,
  update,
  remove,
};
