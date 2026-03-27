const tenantDb = require('../db/tenantDb');
const { normalizePagination, paginationClause } = require('../utils/pagination');
const createScopedQuery = require('../utils/scopedQuery');
const { getInternalClientAccessScope } = require('../utils/internalClientScope');

const selectColumns = `
  m.id,
  m.client_id,
  m.campaign_id,
  m.uploaded_by,
  m.title,
  m.filename,
  m.url,
  m.status,
  m.feedback,
  m.created_at
`;

async function list(user, query = {}) {
  const { limit, offset } = normalizePagination(query);
  const scopeConfig = {
    client: 'm.client_id = $TENANT',
    internal: [
      'm.uploaded_by = $TENANT',
      ...getInternalClientAccessScope('m.client_id'),
    ],
  };
  const scope = createScopedQuery(user).build(scopeConfig, { prefix: 'WHERE', startIndex: 1 });
  const page = paginationClause(limit, offset, scope.nextIndex);
  const { rows } = await tenantDb.query(user, {
    table: 'materials',
    scopeConfig,
    prefix: 'WHERE',
    startIndex: 1,
    sql: `SELECT ${selectColumns}, c.name AS client_name
     FROM materials m
     INNER JOIN clients c ON c.id = m.client_id
     __TENANT_SCOPE__
     ORDER BY m.created_at DESC${page.clause}`,
    suffixParams: page.values,
  });
  return rows;
}

async function create(data, user = null) {
  const { rows } = await tenantDb.query(user || { role: 'admin' }, {
    table: 'materials',
    scopeConfig: { internal: '1 = 1' },
    sql: `INSERT INTO materials (client_id, campaign_id, uploaded_by, title, filename, url, status, feedback)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    params: [
      data.client_id,
      data.campaign_id || null,
      data.uploaded_by || null,
      data.title,
      data.filename || null,
      data.url || null,
      data.status,
      data.feedback || null,
    ],
  });
  return findById(rows[0].id, user);
}

async function update(id, data, user = null) {
  const { rows } = await tenantDb.query(user, {
    table: 'materials',
    scopeConfig: {
      client: 'client_id = $TENANT',
      internal: [
        'uploaded_by = $TENANT',
        ...getInternalClientAccessScope('materials.client_id'),
      ],
    },
    prefix: 'AND',
    startIndex: 9,
    sql: `UPDATE materials
     SET campaign_id = COALESCE($2, campaign_id),
         uploaded_by = COALESCE($3, uploaded_by),
         title = COALESCE($4, title),
         filename = COALESCE($5, filename),
         url = COALESCE($6, url),
         status = COALESCE($7, status),
         feedback = COALESCE($8, feedback)
     WHERE id = $1
     __TENANT_SCOPE__
     RETURNING id`,
    params: [
      id,
      data.campaign_id || null,
      data.uploaded_by || null,
      data.title || null,
      data.filename || null,
      data.url || null,
      data.status || null,
      data.feedback || null,
    ],
  });
  return rows[0] ? findById(rows[0].id, user) : null;
}

async function findById(id, user = null) {
  const { rows } = await tenantDb.query(user, {
    table: 'materials',
    scopeConfig: {
      client: 'm.client_id = $TENANT',
      internal: [
        'm.uploaded_by = $TENANT',
        ...getInternalClientAccessScope('m.client_id'),
      ],
    },
    prefix: 'AND',
    startIndex: 2,
    sql: `SELECT ${selectColumns}, c.manager_id, c.name AS client_name
     FROM materials m
     INNER JOIN clients c ON c.id = m.client_id
     WHERE m.id = $1
     __TENANT_SCOPE__`,
    params: [id],
  });
  return rows[0] || null;
}

async function remove(id, user = null) {
  await tenantDb.query(user, {
    table: 'materials',
    scopeConfig: {
      client: 'client_id = $TENANT',
      internal: [
        'uploaded_by = $TENANT',
        ...getInternalClientAccessScope('materials.client_id'),
      ],
    },
    prefix: 'AND',
    startIndex: 2,
    sql: 'DELETE FROM materials WHERE id = $1 __TENANT_SCOPE__',
    params: [id],
  });
}

module.exports = {
  list,
  create,
  update,
  findById,
  remove,
};
