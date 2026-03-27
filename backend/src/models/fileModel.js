const tenantDb = require('../db/tenantDb');
const { normalizePagination, paginationClause } = require('../utils/pagination');
const createScopedQuery = require('../utils/scopedQuery');
const { getInternalClientAccessScope } = require('../utils/internalClientScope');

const scopeConfig = {
  client: 'f.client_id = $TENANT',
  internal: [
    'f.uploaded_by = $TENANT',
    ...getInternalClientAccessScope('f.client_id'),
  ],
};

const selectColumns = `
  f.id,
  f.client_id,
  f.uploaded_by,
  f.original_name,
  f.stored_name,
  f.mime_type,
  f.size,
  f.url,
  f.created_at
`;

async function list(user, query = {}) {
  const { limit, offset } = normalizePagination(query);
  const scope = createScopedQuery(user).build(scopeConfig, { prefix: 'WHERE', startIndex: 1 });
  const page = paginationClause(limit, offset, scope.nextIndex);
  const { rows } = await tenantDb.query(user, {
    table: 'files',
    scopeConfig,
    prefix: 'WHERE',
    startIndex: 1,
    sql: `SELECT ${selectColumns}, c.name AS client_name, u.name AS uploaded_by_name
     FROM files f
     LEFT JOIN clients c ON c.id = f.client_id
     LEFT JOIN users u ON u.id = f.uploaded_by
     __TENANT_SCOPE__
     ORDER BY f.created_at DESC${page.clause}`,
    suffixParams: page.values,
  });
  return rows;
}

async function create(data, user = null) {
  const { rows } = await tenantDb.query(user || { role: 'admin' }, {
    table: 'files',
    scopeConfig: { internal: '1 = 1' },
    sql: `INSERT INTO files (client_id, uploaded_by, original_name, stored_name, mime_type, size, url)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    params: [
      data.client_id || null,
      data.uploaded_by,
      data.original_name,
      data.stored_name,
      data.mime_type,
      data.size,
      data.url,
    ],
  });
  return findById(rows[0].id, user);
}

async function findById(id, user = null) {
  const { rows } = await tenantDb.query(user, {
    table: 'files',
    scopeConfig,
    prefix: 'AND',
    startIndex: 2,
    sql: `SELECT ${selectColumns} FROM files f WHERE f.id = $1 __TENANT_SCOPE__`,
    params: [id],
  });
  return rows[0] || null;
}

async function remove(id, user = null) {
  await tenantDb.query(user, {
    table: 'files',
    scopeConfig: {
      client: 'client_id = $TENANT',
      internal: [
        'uploaded_by = $TENANT',
        ...getInternalClientAccessScope('files.client_id'),
      ],
    },
    prefix: 'AND',
    startIndex: 2,
    sql: `DELETE FROM files WHERE id = $1 __TENANT_SCOPE__`,
    params: [id],
  });
}

module.exports = {
  list,
  create,
  findById,
  remove,
};
