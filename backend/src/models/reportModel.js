const tenantDb = require('../db/tenantDb');
const { normalizePagination, paginationClause } = require('../utils/pagination');
const createScopedQuery = require('../utils/scopedQuery');
const { getInternalClientAccessScope } = require('../utils/internalClientScope');

const scopeConfig = {
  client: 'r.client_id = $TENANT',
  internal: getInternalClientAccessScope('r.client_id'),
};

const selectColumns = `
  r.id,
  r.client_id,
  r.title,
  r.report_month,
  r.summary,
  r.file_url
`;

async function list(user, query = {}) {
  const { limit, offset } = normalizePagination(query);
  const scope = createScopedQuery(user).build(scopeConfig, { prefix: 'WHERE', startIndex: 1 });
  const page = paginationClause(limit, offset, scope.nextIndex);
  const { rows } = await tenantDb.query(user, {
    table: 'reports',
    scopeConfig,
    prefix: 'WHERE',
    startIndex: 1,
    sql: `SELECT ${selectColumns}, c.name AS client_name
     FROM reports r
     INNER JOIN clients c ON c.id = r.client_id
     __TENANT_SCOPE__
     ORDER BY r.report_month DESC${page.clause}`,
    suffixParams: page.values,
  });
  return rows;
}

async function findByFilePath(filePath, user = null) {
  const { rows } = await tenantDb.query(user, {
    table: 'reports',
    scopeConfig,
    prefix: 'AND',
    startIndex: 2,
    sql: `SELECT ${selectColumns}, c.name AS client_name
     FROM reports r
     INNER JOIN clients c ON c.id = r.client_id
     WHERE r.file_url = $1
     __TENANT_SCOPE__`,
    params: [filePath],
  });
  return rows[0] || null;
}

module.exports = {
  list,
  findByFilePath,
};
