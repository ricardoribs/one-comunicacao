const tenantDb = require('../db/tenantDb');
const { normalizePagination, paginationClause } = require('../utils/pagination');
const createScopedQuery = require('../utils/scopedQuery');

async function list(user, filters = {}) {
  const { limit, offset } = normalizePagination(filters);
  const values = [];
  const where = [];
  let index = 1;

  if (filters.campaign_id) {
    where.push(`cam.id = $${index++}`);
    values.push(Number(filters.campaign_id));
  }

  if (filters.period) {
    where.push(`m.period = $${index++}`);
    values.push(filters.period);
  }

  const scope = createScopedQuery(user).build(
    {
      client: 'cam.client_id = $TENANT',
      internal: 'c.manager_id = $TENANT',
    },
    { prefix: 'WHERE', startIndex: index }
  );
  const page = paginationClause(limit, offset, scope.nextIndex);

  const { rows } = await tenantDb.query(user, {
    table: 'metrics',
    scopeConfig: {
      client: 'cam.client_id = $TENANT',
      internal: 'c.manager_id = $TENANT',
    },
    prefix: where.length ? 'AND' : 'WHERE',
    startIndex: index,
    sql: `SELECT
      m.*,
      cam.name AS campaign_name,
      c.id AS client_id,
      c.name AS client_name
     FROM metrics m
     INNER JOIN campaigns cam ON cam.id = m.campaign_id
     INNER JOIN clients c ON c.id = cam.client_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     __TENANT_SCOPE__
     ORDER BY m.period DESC, cam.name ASC${page.clause}`,
    params: values,
    suffixParams: page.values,
  });

  return rows;
}

module.exports = {
  list,
};
