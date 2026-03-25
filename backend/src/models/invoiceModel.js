const tenantDb = require('../db/tenantDb');
const { normalizePagination, paginationClause } = require('../utils/pagination');
const createScopedQuery = require('../utils/scopedQuery');

const selectColumns = `
  i.id,
  i.client_id,
  i.amount,
  i.status,
  i.due_date,
  i.created_at
`;

async function list(user, query = {}) {
  const { limit, offset } = normalizePagination(query);
  const scopeConfig = {
    client: 'i.client_id = $TENANT',
    internal:
      'EXISTS (SELECT 1 FROM clients scoped_clients WHERE scoped_clients.id = i.client_id AND scoped_clients.manager_id = $TENANT)',
  };
  const scope = createScopedQuery(user).build(scopeConfig, { prefix: 'WHERE', startIndex: 1 });
  const page = paginationClause(limit, offset, scope.nextIndex);
  const { rows } = await tenantDb.query(user, {
    table: 'invoices',
    scopeConfig,
    prefix: 'WHERE',
    startIndex: 1,
    sql: `SELECT ${selectColumns}, c.name AS client_name
     FROM invoices i
     INNER JOIN clients c ON c.id = i.client_id
     __TENANT_SCOPE__
     ORDER BY i.created_at DESC${page.clause}`,
    suffixParams: page.values,
  });
  return rows;
}

async function create(data, user = null) {
  const { rows } = await tenantDb.query(user || { role: 'admin' }, {
    table: 'invoices',
    scopeConfig: { internal: '1 = 1' },
    sql: `INSERT INTO invoices (client_id, amount, status, due_date)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    params: [data.client_id, data.amount, data.status, data.due_date || null],
  });
  return findById(rows[0].id, user);
}

async function update(id, data, user = null) {
  const { rows } = await tenantDb.query(user, {
    table: 'invoices',
    scopeConfig: {
      client: 'client_id = $TENANT',
      internal:
        'EXISTS (SELECT 1 FROM clients scoped_clients WHERE scoped_clients.id = invoices.client_id AND scoped_clients.manager_id = $TENANT)',
    },
    prefix: 'AND',
    startIndex: 6,
    sql: `UPDATE invoices
     SET client_id = COALESCE($2, client_id),
         amount = COALESCE($3, amount),
         status = COALESCE($4, status),
         due_date = COALESCE($5, due_date)
     WHERE id = $1
     __TENANT_SCOPE__
     RETURNING id`,
    params: [id, data.client_id || null, data.amount ?? null, data.status || null, data.due_date || null],
  });
  return rows[0] ? findById(rows[0].id, user) : null;
}

async function findById(id, user = null) {
  const { rows } = await tenantDb.query(user, {
    table: 'invoices',
    scopeConfig: {
      client: 'i.client_id = $TENANT',
      internal:
        'EXISTS (SELECT 1 FROM clients scoped_clients WHERE scoped_clients.id = i.client_id AND scoped_clients.manager_id = $TENANT)',
    },
    prefix: 'AND',
    startIndex: 2,
    sql: `SELECT ${selectColumns}, c.name AS client_name
     FROM invoices i
     INNER JOIN clients c ON c.id = i.client_id
     WHERE i.id = $1
     __TENANT_SCOPE__`,
    params: [id],
  });
  return rows[0] || null;
}

module.exports = {
  list,
  create,
  update,
  findById,
};
