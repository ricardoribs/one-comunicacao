const pool = require('../config/db');
const tenantDb = require('../db/tenantDb');
const { normalizePagination, paginationClause } = require('../utils/pagination');

const scopeConfig = {
  client: 'c.id = $TENANT',
  internal: 'c.manager_id = $TENANT',
};

const baseSelect = `
  SELECT
    ci.id,
    ci.client_id,
    ci.provider_key,
    ci.status,
    ci.external_account_id,
    ci.external_property_id,
    ci.connected_at,
    ci.last_sync_at,
    ci.last_success_at,
    ci.last_error,
    ci.metadata,
    ci.created_by,
    ci.updated_by,
    ci.created_at,
    ci.updated_at,
    c.name AS client_name,
    c.company AS client_company,
    cu.name AS created_by_name,
    uu.name AS updated_by_name
  FROM client_integrations ci
  INNER JOIN clients c ON c.id = ci.client_id
  LEFT JOIN users cu ON cu.id = ci.created_by
  LEFT JOIN users uu ON uu.id = ci.updated_by
`;

function normalizeRecord(record) {
  if (!record) {
    return null;
  }

  return {
    ...record,
    metadata: record.metadata || {},
  };
}

async function list(user, query = {}) {
  const { limit, offset } = normalizePagination(query);
  const values = [];
  const where = [];
  let index = 1;

  if (query.client_id) {
    where.push(`c.id = $${index++}`);
    values.push(Number(query.client_id));
  }

  if (query.provider_key) {
    where.push(`ci.provider_key = $${index++}`);
    values.push(query.provider_key);
  }

  if (query.status) {
    where.push(`ci.status = $${index++}`);
    values.push(query.status);
  }

  const page = paginationClause(limit, offset, index);

  const { rows } = await tenantDb.query(user, {
    table: 'client_integrations',
    scopeConfig,
    prefix: where.length ? 'AND' : 'WHERE',
    startIndex: index,
    sql: `${baseSelect}
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      __TENANT_SCOPE__
      ORDER BY c.name ASC, ci.provider_key ASC${page.clause}`,
    params: values,
    suffixParams: page.values,
  });

  return rows.map(normalizeRecord);
}

async function findById(id, user) {
  const { rows } = await tenantDb.query(user, {
    table: 'client_integrations',
    scopeConfig,
    prefix: 'AND',
    startIndex: 2,
    sql: `${baseSelect}
      WHERE ci.id = $1
      __TENANT_SCOPE__`,
    params: [id],
  });

  return normalizeRecord(rows[0]);
}

async function create(data, user) {
  const actorId = user?.id || null;
  const status = data.status || 'configuring';
  const connectedAt = status === 'connected' ? data.connected_at || new Date().toISOString() : null;

  const id = await tenantDb.runWithTenantContext(user, async (client) => {
    const { rows } = await client.query(
      `INSERT INTO client_integrations (
         client_id,
         provider_key,
         status,
         external_account_id,
         external_property_id,
         connected_at,
         last_sync_at,
         last_success_at,
         last_error,
         metadata,
         created_by,
         updated_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $3 = 'connected' THEN COALESCE($7, $6) ELSE NULL END, $8, COALESCE($9, '{}'::jsonb), $10, $10)
       ON CONFLICT (client_id, provider_key)
       DO UPDATE SET
         status = EXCLUDED.status,
         external_account_id = EXCLUDED.external_account_id,
         external_property_id = EXCLUDED.external_property_id,
         connected_at = CASE
           WHEN EXCLUDED.status = 'connected' THEN COALESCE(client_integrations.connected_at, EXCLUDED.connected_at, NOW())
           WHEN EXCLUDED.status = 'disconnected' THEN NULL
           ELSE client_integrations.connected_at
         END,
         last_sync_at = EXCLUDED.last_sync_at,
         last_success_at = CASE
           WHEN EXCLUDED.status = 'connected' AND EXCLUDED.last_sync_at IS NOT NULL THEN EXCLUDED.last_sync_at
           ELSE client_integrations.last_success_at
         END,
         last_error = EXCLUDED.last_error,
         metadata = COALESCE(EXCLUDED.metadata, client_integrations.metadata),
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING id`,
      [
        data.client_id,
        data.provider_key,
        status,
        data.external_account_id || null,
        data.external_property_id || null,
        connectedAt,
        data.last_sync_at || null,
        data.last_error || null,
        data.metadata ? JSON.stringify(data.metadata) : null,
        actorId,
      ]
    );

    return rows[0].id;
  });

  return findById(id, user);
}

async function update(id, data, user) {
  const actorId = user?.id || null;
  const existing = await findById(id, user);
  if (!existing) {
    return null;
  }

  const nextStatus = data.status || existing.status;
  const nextConnectedAt =
    nextStatus === 'connected'
      ? data.connected_at || existing.connected_at || new Date().toISOString()
      : nextStatus === 'disconnected'
        ? null
        : existing.connected_at;

  await tenantDb.runWithTenantContext(user, async (client) => {
    await client.query(
      `UPDATE client_integrations
       SET client_id = COALESCE($2, client_id),
           provider_key = COALESCE($3, provider_key),
           status = COALESCE($4, status),
           external_account_id = COALESCE($5, external_account_id),
           external_property_id = COALESCE($6, external_property_id),
           connected_at = $7,
           last_sync_at = COALESCE($8, last_sync_at),
           last_success_at = CASE
             WHEN COALESCE($4, status) = 'connected' AND COALESCE($8, last_sync_at) IS NOT NULL THEN COALESCE($8, last_sync_at)
             ELSE last_success_at
           END,
           last_error = $9,
           metadata = COALESCE($10, metadata),
           updated_by = $11,
           updated_at = NOW()
       WHERE id = $1`,
      [
        id,
        data.client_id || null,
        data.provider_key || null,
        data.status || null,
        data.external_account_id ?? null,
        data.external_property_id ?? null,
        nextConnectedAt,
        data.last_sync_at || null,
        data.last_error ?? null,
        data.metadata ? JSON.stringify(data.metadata) : null,
        actorId,
      ]
    );
  });

  return findById(id, user);
}

async function remove(id, user) {
  await tenantDb.runWithTenantContext(user, async (client) => {
    await client.query('DELETE FROM client_integrations WHERE id = $1', [id]);
  });
}

module.exports = {
  list,
  findById,
  create,
  update,
  remove,
};
