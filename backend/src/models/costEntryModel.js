const tenantDb = require('../db/tenantDb');
const { normalizePagination, paginationClause } = require('../utils/pagination');

const selectColumns = `
  ce.id,
  ce.client_id,
  ce.created_by,
  ce.category,
  ce.description,
  ce.amount,
  ce.incurred_on,
  ce.created_at
`;

const scopeConfig = {
  client: 'ce.client_id = $TENANT',
  internal:
    'EXISTS (SELECT 1 FROM clients scoped_clients WHERE scoped_clients.id = ce.client_id AND scoped_clients.manager_id = $TENANT)',
};

async function list(user, query = {}) {
  const { limit, offset } = normalizePagination(query);
  const page = paginationClause(limit, offset, 1);
  const { rows } = await tenantDb.query(user, {
    table: 'cost_entries',
    scopeConfig,
    prefix: 'WHERE',
    startIndex: 1,
    sql: `SELECT ${selectColumns},
             c.name AS client_name,
             u.name AS created_by_name
          FROM cost_entries ce
          INNER JOIN clients c ON c.id = ce.client_id
          LEFT JOIN users u ON u.id = ce.created_by
          __TENANT_SCOPE__
          ORDER BY COALESCE(ce.incurred_on, ce.created_at::date) DESC, ce.created_at DESC${page.clause}`,
    suffixParams: page.values,
  });
  return rows;
}

async function findById(id, user) {
  const { rows } = await tenantDb.query(user, {
    table: 'cost_entries',
    scopeConfig,
    prefix: 'AND',
    startIndex: 2,
    sql: `SELECT ${selectColumns},
             c.name AS client_name,
             u.name AS created_by_name
          FROM cost_entries ce
          INNER JOIN clients c ON c.id = ce.client_id
          LEFT JOIN users u ON u.id = ce.created_by
          WHERE ce.id = $1
          __TENANT_SCOPE__`,
    params: [id],
  });
  return rows[0] || null;
}

async function create(data, user) {
  const { rows } = await tenantDb.runWithTenantContext(user, async (client) =>
    tenantDb.queryWithClient(user, client, {
      table: 'cost_entries',
      bypassScope: true,
      sql: `INSERT INTO cost_entries (client_id, created_by, category, description, amount, incurred_on)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id`,
      params: [data.client_id, user.id, data.category, data.description, data.amount, data.incurred_on || null],
    })
  );

  return findById(rows[0].id, user);
}

module.exports = {
  list,
  findById,
  create,
};
