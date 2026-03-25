const tenantDb = require('../db/tenantDb');
const { normalizePagination, paginationClause } = require('../utils/pagination');
const createScopedQuery = require('../utils/scopedQuery');

function baseQuery() {
  return `
    SELECT
      cam.id,
      cam.client_id,
      cam.name,
      cam.channel,
      cam.audience,
      cam.objective,
      cam.pipeline_stage,
      cam.budget,
      cam.start_date,
      cam.end_date,
      cam.status,
      cam.created_at,
      c.name AS client_name,
      c.company AS client_company,
      COALESCE(SUM(m.leads), 0) AS leads,
      COALESCE(SUM(m.revenue), 0) AS revenue
    FROM campaigns cam
    INNER JOIN clients c ON c.id = cam.client_id
    LEFT JOIN metrics m ON m.campaign_id = cam.id
  `;
}

function withRoi(record) {
  const revenue = Number(record?.revenue || 0);
  const budget = Number(record?.budget || 0);
  const roi = budget > 0 ? Number((((revenue - budget) / budget) * 100).toFixed(2)) : 0;

  return {
    ...record,
    revenue,
    leads: Number(record?.leads || 0),
    budget,
    roi,
  };
}

async function list(user, query = {}) {
  const { limit, offset } = normalizePagination(query);
  const scopeConfig = {
    client: 'cam.client_id = $TENANT',
    internal:
      'EXISTS (SELECT 1 FROM clients scoped_clients WHERE scoped_clients.id = cam.client_id AND scoped_clients.manager_id = $TENANT)',
  };
  const scope = createScopedQuery(user).build(scopeConfig, { prefix: 'WHERE', startIndex: 1 });
  const page = paginationClause(limit, offset, scope.nextIndex);
  const { rows } = await tenantDb.query(user, {
    table: 'campaigns',
    scopeConfig,
    prefix: 'WHERE',
    startIndex: 1,
    sql: `${baseQuery()} __TENANT_SCOPE__
      GROUP BY cam.id, cam.client_id, cam.name, cam.channel, cam.audience, cam.objective, cam.pipeline_stage, cam.budget, cam.start_date, cam.end_date, cam.status, cam.created_at, c.id, c.name, c.company
      ORDER BY cam.created_at DESC${page.clause}`,
    suffixParams: page.values,
  });
  return rows.map(withRoi);
}

async function findById(id, user = null) {
  const { rows } = await tenantDb.query(user, {
    table: 'campaigns',
    scopeConfig: {
      client: 'cam.client_id = $TENANT',
      internal:
        'EXISTS (SELECT 1 FROM clients scoped_clients WHERE scoped_clients.id = cam.client_id AND scoped_clients.manager_id = $TENANT)',
    },
    prefix: 'AND',
    startIndex: 2,
    sql: `${baseQuery()} WHERE cam.id = $1 __TENANT_SCOPE__
      GROUP BY cam.id, cam.client_id, cam.name, cam.channel, cam.audience, cam.objective, cam.pipeline_stage, cam.budget, cam.start_date, cam.end_date, cam.status, cam.created_at, c.id, c.name, c.company`,
    params: [id],
  });
  return rows[0] ? withRoi(rows[0]) : null;
}

async function create(data, user = null) {
  const { rows } = await tenantDb.query(user || { role: 'admin' }, {
    table: 'campaigns',
    scopeConfig: { internal: '1 = 1' },
    sql: `INSERT INTO campaigns
      (client_id, name, channel, audience, objective, pipeline_stage, budget, start_date, end_date, status)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'planejamento'), $7, $8, $9, COALESCE($10, 'Ativa'))
     RETURNING id`,
    params: [
      data.client_id,
      data.name,
      data.channel,
      data.audience,
      data.objective,
      data.pipeline_stage,
      data.budget,
      data.start_date || null,
      data.end_date || null,
      data.status,
    ],
  });
  return findById(rows[0].id, user);
}

async function update(id, data, user = null) {
  const { rows } = await tenantDb.query(user, {
    table: 'campaigns',
    scopeConfig: {
      client: 'cam.client_id = $TENANT',
      internal:
        'EXISTS (SELECT 1 FROM clients scoped_clients WHERE scoped_clients.id = cam.client_id AND scoped_clients.manager_id = $TENANT)',
    },
    prefix: 'AND',
    startIndex: 11,
    sql: `UPDATE campaigns cam
     SET client_id = COALESCE($2, client_id),
         name = COALESCE($3, name),
         channel = COALESCE($4, channel),
         audience = COALESCE($5, audience),
         objective = COALESCE($6, objective),
         pipeline_stage = COALESCE($7, pipeline_stage),
         budget = COALESCE($8, budget),
         start_date = COALESCE($9, start_date),
         end_date = COALESCE($10, end_date),
         status = COALESCE($11, status)
     WHERE cam.id = $1
     __TENANT_SCOPE__
     RETURNING cam.id`,
    params: [
      id,
      data.client_id || null,
      data.name || null,
      data.channel || null,
      data.audience || null,
      data.objective || null,
      data.pipeline_stage || null,
      data.budget ?? null,
      data.start_date || null,
      data.end_date || null,
      data.status || null,
    ],
  });
  return rows[0] ? findById(rows[0].id, user) : null;
}

async function remove(id, user = null) {
  await tenantDb.query(user, {
    table: 'campaigns',
    scopeConfig: {
      client: 'client_id = $TENANT',
      internal:
        'EXISTS (SELECT 1 FROM clients scoped_clients WHERE scoped_clients.id = campaigns.client_id AND scoped_clients.manager_id = $TENANT)',
    },
    prefix: 'AND',
    startIndex: 2,
    sql: 'DELETE FROM campaigns WHERE id = $1 __TENANT_SCOPE__',
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
