const tenantDb = require('../db/tenantDb');
const { normalizePagination, paginationClause } = require('../utils/pagination');
const createScopedQuery = require('../utils/scopedQuery');

const selectColumns = `
  m.id,
  m.sender_id,
  m.receiver_id,
  m.context_type,
  m.context_id,
  m.content,
  m.read_at,
  m.created_at
`;

const scopeConfig = {
  client: ['sender_client.id = $TENANT', 'receiver_client.id = $TENANT'],
  internal: [
    'm.sender_id = $TENANT',
    'm.receiver_id = $TENANT',
    'sender_client.manager_id = $TENANT',
    'receiver_client.manager_id = $TENANT',
  ],
};

function buildContextClause(query = {}, startIndex = 1) {
  const filters = [];
  const values = [];
  let index = startIndex;

  if (query.context_type) {
    filters.push(`m.context_type = $${index++}`);
    values.push(query.context_type);
  }

  if (query.context_id) {
    filters.push(`m.context_id = $${index++}`);
    values.push(Number(query.context_id));
  }

  return {
    clause: filters.length ? ` AND ${filters.join(' AND ')}` : '',
    values,
  };
}

async function listForUser(user, query = {}) {
  const { limit, offset } = normalizePagination(query);
  if (user.role === 'client') {
    const context = buildContextClause(query, 2);
    const scope = createScopedQuery(user).build(scopeConfig, { prefix: 'AND', startIndex: 2 + context.values.length });
    const page = paginationClause(limit, offset, scope.nextIndex);
    const { rows } = await tenantDb.query(user, {
      table: 'messages',
      scopeConfig,
      prefix: 'AND',
      startIndex: 2 + context.values.length,
      sql: `SELECT ${selectColumns}, sender.name AS sender_name, receiver.name AS receiver_name
       FROM messages m
       INNER JOIN users sender ON sender.id = m.sender_id
       INNER JOIN users receiver ON receiver.id = m.receiver_id
       LEFT JOIN clients sender_client ON sender_client.id = sender.client_id
       LEFT JOIN clients receiver_client ON receiver_client.id = receiver.client_id
       WHERE (m.sender_id = $1 OR m.receiver_id = $1)${context.clause}
       __TENANT_SCOPE__
       ORDER BY m.created_at DESC${page.clause}`,
      params: [user.id, ...context.values],
      suffixParams: page.values,
    });
    return rows;
  }

  if (user.role === 'admin') {
    const context = buildContextClause(query, 1);
    const scope = createScopedQuery(user).build(scopeConfig, {
      prefix: context.clause ? 'AND' : 'WHERE',
      startIndex: 1 + context.values.length,
    });
    const page = paginationClause(limit, offset, scope.nextIndex);
    const { rows } = await tenantDb.query(user, {
      table: 'messages',
      scopeConfig,
      prefix: context.clause ? 'AND' : 'WHERE',
      startIndex: 1 + context.values.length,
      sql: `SELECT ${selectColumns}, sender.name AS sender_name, receiver.name AS receiver_name
       FROM messages m
       INNER JOIN users sender ON sender.id = m.sender_id
       INNER JOIN users receiver ON receiver.id = m.receiver_id
       LEFT JOIN clients sender_client ON sender_client.id = sender.client_id
       LEFT JOIN clients receiver_client ON receiver_client.id = receiver.client_id
       ${context.clause ? `WHERE ${context.clause.slice(5)}` : ''}
       __TENANT_SCOPE__
       ORDER BY m.created_at DESC${page.clause}`,
      params: [...context.values],
      suffixParams: page.values,
    });
    return rows;
  }

  const context = buildContextClause(query, 2);
  const scope = createScopedQuery(user).build(scopeConfig, { prefix: 'AND', startIndex: 2 + context.values.length });
  const page = paginationClause(limit, offset, scope.nextIndex);
  const { rows } = await tenantDb.query(user, {
    table: 'messages',
    scopeConfig,
    prefix: 'AND',
    startIndex: 2 + context.values.length,
    sql: `SELECT ${selectColumns}, sender.name AS sender_name, receiver.name AS receiver_name
     FROM messages m
     INNER JOIN users sender ON sender.id = m.sender_id
     INNER JOIN users receiver ON receiver.id = m.receiver_id
     LEFT JOIN clients sender_client ON sender_client.id = sender.client_id
     LEFT JOIN clients receiver_client ON receiver_client.id = receiver.client_id
     WHERE (
       m.sender_id = $1 OR
       m.receiver_id = $1 OR
       sender_client.manager_id = $1 OR
       receiver_client.manager_id = $1
     )${context.clause}
     __TENANT_SCOPE__
     ORDER BY m.created_at DESC${page.clause}`,
    params: [user.id, ...context.values],
    suffixParams: page.values,
  });
  return rows;
}

async function create(data, user) {
  const id = await tenantDb.runWithTenantContext(user, async (client) => {
    const { rows } = await tenantDb.queryWithClient(user, client, {
      table: 'messages',
      sql: `
        INSERT INTO messages (sender_id, receiver_id, context_type, context_id, content)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      params: [data.sender_id, data.receiver_id, data.context_type || 'general', data.context_id || null, data.content],
      bypassScope: true,
    });

    return rows[0]?.id || null;
  });

  if (!id) {
    return null;
  }

  const { rows: createdRows } = await tenantDb.query(user, {
    table: 'messages',
    scopeConfig: {
      client: ['sender_client.id = $TENANT', 'receiver_client.id = $TENANT'],
      internal: [
        'sender.id = $TENANT',
        'receiver.id = $TENANT',
        'sender_client.manager_id = $TENANT',
        'receiver_client.manager_id = $TENANT',
      ],
    },
    prefix: 'AND',
    startIndex: 2,
    sql: `SELECT ${selectColumns}, sender.name AS sender_name, receiver.name AS receiver_name
     FROM messages m
     INNER JOIN users sender ON sender.id = m.sender_id
     INNER JOIN users receiver ON receiver.id = m.receiver_id
     LEFT JOIN clients sender_client ON sender_client.id = sender.client_id
     LEFT JOIN clients receiver_client ON receiver_client.id = receiver.client_id
     WHERE m.id = $1
     __TENANT_SCOPE__`,
    params: [id],
  });
  return createdRows[0] || null;
}

async function markRead(user, data = {}) {
  const values = [user.id];
  const filters = [];
  let index = 2;

  if (Array.isArray(data.ids) && data.ids.length) {
    filters.push(`id = ANY($${index++}::int[])`);
    values.push(data.ids.map((item) => Number(item)).filter(Boolean));
  }

  if (data.context_type) {
    filters.push(`context_type = $${index++}`);
    values.push(data.context_type);
  }

  if (data.context_id) {
    filters.push(`context_id = $${index++}`);
    values.push(Number(data.context_id));
  }

  return tenantDb.runWithTenantContext(user, async (client) => {
    const { rows } = await tenantDb.queryWithClient(user, client, {
      table: 'messages',
      sql: `
        UPDATE messages
           SET read_at = COALESCE(read_at, NOW())
         WHERE receiver_id = $1
           AND read_at IS NULL
           ${filters.length ? `AND ${filters.join(' AND ')}` : ''}
        RETURNING id
      `,
      params: values,
      bypassScope: true,
    });

    return {
      updated: rows.length,
      ids: rows.map((row) => row.id),
    };
  });
}

async function listAssignmentSendersForTask(taskId, user) {
  const { rows } = await tenantDb.query(user, {
    table: 'messages',
    scopeConfig,
    prefix: 'AND',
    startIndex: 3,
    sql: `SELECT DISTINCT m.sender_id
     FROM messages m
     INNER JOIN users sender ON sender.id = m.sender_id
     INNER JOIN users receiver ON receiver.id = m.receiver_id
     LEFT JOIN clients sender_client ON sender_client.id = sender.client_id
     LEFT JOIN clients receiver_client ON receiver_client.id = receiver.client_id
     WHERE m.context_type = $1
       AND m.context_id = $2
     __TENANT_SCOPE__`,
    params: ['task_assignment', Number(taskId)],
  });

  return rows.map((row) => Number(row.sender_id)).filter(Boolean);
}

module.exports = {
  listForUser,
  create,
  markRead,
  listAssignmentSendersForTask,
};
