const tenantDb = require('../db/tenantDb');
const { normalizePagination, paginationClause } = require('../utils/pagination');
const createScopedQuery = require('../utils/scopedQuery');

const scopeConfig = {
  client: 'c.id = $TENANT',
  internal: 'c.manager_id = $TENANT',
};

const baseSelect = `
  SELECT
    c.id,
    c.name,
    c.company,
    c.plan,
    c.mrr,
    c.segment,
    c.manager_id,
    c.started_at,
    c.legal_document,
    c.contact_name,
    c.contact_email,
    c.contact_phone,
    c.billing_email,
    c.address_line1,
    c.address_line2,
    c.neighborhood,
    c.city,
    c.state,
    c.zip_code,
    c.country,
    c.notes,
    c.asaas_customer_id,
    c.created_at
  FROM clients c
`;

async function list(user, query = {}) {
  const { limit, offset } = normalizePagination(query);
  const scope = createScopedQuery(user).build(scopeConfig, { prefix: 'WHERE', startIndex: 1 });
  const page = paginationClause(limit, offset, scope.nextIndex);

  const { rows } = await tenantDb.query(user, {
    table: 'clients',
    scopeConfig,
    prefix: 'WHERE',
    startIndex: 1,
    sql: `
      SELECT
        c.id,
        c.name,
        c.company,
        c.plan,
        c.mrr,
        c.segment,
        c.manager_id,
        c.started_at,
        c.legal_document,
        c.contact_name,
        c.contact_email,
        c.contact_phone,
        c.billing_email,
        c.address_line1,
        c.address_line2,
        c.neighborhood,
        c.city,
        c.state,
        c.zip_code,
        c.country,
        c.notes,
        c.asaas_customer_id,
        c.created_at,
        COUNT(DISTINCT cam.id) AS campaigns_count,
        COALESCE(SUM(m.leads), 0) AS total_leads,
        COALESCE(SUM(m.revenue), 0) AS total_revenue
      FROM clients c
      LEFT JOIN campaigns cam ON cam.client_id = c.id
      LEFT JOIN metrics m ON m.campaign_id = cam.id
      __TENANT_SCOPE__
      GROUP BY c.id
      ORDER BY c.created_at DESC${page.clause}`,
    suffixParams: page.values,
  });

  return rows;
}

async function findById(id, user = null) {
  const { rows } = await tenantDb.query(user, {
    table: 'clients',
    scopeConfig,
    prefix: 'AND',
    startIndex: 2,
    sql: `${baseSelect} WHERE c.id = $1 __TENANT_SCOPE__`,
    params: [id],
  });

  return rows[0] || null;
}

async function create(data, user = null) {
  const { rows } = await tenantDb.query(user || { role: 'admin' }, {
    table: 'clients',
    scopeConfig: { internal: '1 = 1' },
    sql: `INSERT INTO clients (
      name, company, plan, mrr, segment, manager_id, started_at, legal_document, contact_name, contact_email,
      contact_phone, billing_email, address_line1, address_line2, neighborhood, city, state, zip_code, country, notes
    )
    VALUES (
      $1, $2, COALESCE($3, 'growth'), COALESCE($4, 0), $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
    )
    RETURNING id`,
    params: [
      data.name,
      data.company,
      data.plan,
      data.mrr,
      data.segment || null,
      data.manager_id || null,
      data.started_at || null,
      data.legal_document || null,
      data.contact_name || null,
      data.contact_email || null,
      data.contact_phone || null,
      data.billing_email || null,
      data.address_line1 || null,
      data.address_line2 || null,
      data.neighborhood || null,
      data.city || null,
      data.state || null,
      data.zip_code || null,
      data.country || null,
      data.notes || null,
    ],
  });

  return findById(rows[0].id, user);
}

async function createWithClient(client, data, user) {
  const { rows } = await tenantDb.queryWithClient(user, client, {
    table: 'clients',
    bypassScope: true,
    sql: `INSERT INTO clients (
      name, company, plan, mrr, segment, manager_id, started_at, legal_document, contact_name, contact_email,
      contact_phone, billing_email, address_line1, address_line2, neighborhood, city, state, zip_code, country, notes
    )
    VALUES (
      $1, $2, COALESCE($3, 'growth'), COALESCE($4, 0), $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
    )
    RETURNING id`,
    params: [
      data.name,
      data.company,
      data.plan,
      data.mrr,
      data.segment || null,
      data.manager_id || null,
      data.started_at || null,
      data.legal_document || null,
      data.contact_name || null,
      data.contact_email || null,
      data.contact_phone || null,
      data.billing_email || null,
      data.address_line1 || null,
      data.address_line2 || null,
      data.neighborhood || null,
      data.city || null,
      data.state || null,
      data.zip_code || null,
      data.country || null,
      data.notes || null,
    ],
  });

  return rows[0]?.id || null;
}

async function update(id, data, user = null) {
  const { rows } = await tenantDb.query(user, {
    table: 'clients',
    scopeConfig: {
      client: 'id = $TENANT',
      internal: 'manager_id = $TENANT',
    },
    prefix: 'AND',
    startIndex: 23,
    sql: `UPDATE clients
     SET name = COALESCE($2, name),
         company = COALESCE($3, company),
         plan = COALESCE($4, plan),
         mrr = COALESCE($5, mrr),
         segment = COALESCE($6, segment),
         manager_id = COALESCE($7, manager_id),
         started_at = COALESCE($8, started_at),
         legal_document = COALESCE($9, legal_document),
         contact_name = COALESCE($10, contact_name),
         contact_email = COALESCE($11, contact_email),
         contact_phone = COALESCE($12, contact_phone),
         billing_email = COALESCE($13, billing_email),
         address_line1 = COALESCE($14, address_line1),
         address_line2 = COALESCE($15, address_line2),
         neighborhood = COALESCE($16, neighborhood),
         city = COALESCE($17, city),
         state = COALESCE($18, state),
         zip_code = COALESCE($19, zip_code),
         country = COALESCE($20, country),
         notes = COALESCE($21, notes),
         asaas_customer_id = COALESCE($22, asaas_customer_id)
     WHERE id = $1
     __TENANT_SCOPE__
     RETURNING id`,
    params: [
      id,
      data.name || null,
      data.company || null,
      data.plan || null,
      data.mrr ?? null,
      data.segment || null,
      data.manager_id || null,
      data.started_at || null,
      data.legal_document || null,
      data.contact_name || null,
      data.contact_email || null,
      data.contact_phone || null,
      data.billing_email || null,
      data.address_line1 || null,
      data.address_line2 || null,
      data.neighborhood || null,
      data.city || null,
      data.state || null,
      data.zip_code || null,
      data.country || null,
      data.notes || null,
      data.asaas_customer_id || null,
    ],
  });

  return rows[0] ? findById(rows[0].id, user) : null;
}

async function remove(id, user = null) {
  await tenantDb.query(user, {
    table: 'clients',
    scopeConfig: {
      client: 'id = $TENANT',
      internal: 'manager_id = $TENANT',
    },
    prefix: 'AND',
    startIndex: 2,
    sql: 'DELETE FROM clients WHERE id = $1 __TENANT_SCOPE__',
    params: [id],
  });
}

module.exports = {
  list,
  findById,
  create,
  createWithClient,
  update,
  remove,
};
