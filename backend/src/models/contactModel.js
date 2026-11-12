const tenantDb = require('../db/tenantDb');
const { normalizePagination, paginationClause } = require('../utils/pagination');
const createScopedQuery = require('../utils/scopedQuery');

const baseSelect = `
  SELECT
    ct.*,
    owner_user.name AS owner_name,
    assigned_user.name AS assigned_to_name,
    client.name AS converted_client_name
  FROM contacts ct
  LEFT JOIN users owner_user ON owner_user.id = ct.owner_id
  LEFT JOIN users assigned_user ON assigned_user.id = ct.assigned_to
  LEFT JOIN clients client ON client.id = ct.converted_client_id
`;

async function create(data, user = null) {
  const { rows } = await tenantDb.query(
    user,
    {
      table: 'contacts',
      scopeConfig: contactScope(),
      sql: `INSERT INTO contacts (
      name, phone, whatsapp, email, company, service, source, document, lead_stage, estimated_value,
      message, notes, owner_id, assigned_to, birth_date, address_line1, address_line2, neighborhood,
      city, state, zip_code, country, last_contact_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, 'Prospeccao'), COALESCE($10, 0),
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
    )
    RETURNING id`,
      params: [
        data.name,
        data.phone,
        data.whatsapp || null,
        data.email,
        data.company || null,
        data.service || null,
        data.source || null,
        data.document || null,
        data.lead_stage || null,
        data.estimated_value ?? null,
        data.message || null,
        data.notes || null,
        data.owner_id || null,
        data.assigned_to || null,
        data.birth_date || null,
        data.address_line1 || null,
        data.address_line2 || null,
        data.neighborhood || null,
        data.city || null,
        data.state || null,
        data.zip_code || null,
        data.country || null,
        data.last_contact_at || null,
      ],
    }
  );
  return findById(rows[0].id, user);
}

async function createWithClient(client, data, user) {
  const { rows } = await tenantDb.queryWithClient(user, client, {
    table: 'contacts',
    bypassScope: true,
    sql: `INSERT INTO contacts (
      name, phone, whatsapp, email, company, service, source, document, lead_stage, estimated_value,
      message, notes, owner_id, assigned_to, birth_date, address_line1, address_line2, neighborhood,
      city, state, zip_code, country, last_contact_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, 'Prospeccao'), COALESCE($10, 0),
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
    )
    RETURNING id`,
    params: [
      data.name,
      data.phone,
      data.whatsapp || null,
      data.email,
      data.company || null,
      data.service || null,
      data.source || null,
      data.document || null,
      data.lead_stage || null,
      data.estimated_value ?? null,
      data.message || null,
      data.notes || null,
      data.owner_id || null,
      data.assigned_to || null,
      data.birth_date || null,
      data.address_line1 || null,
      data.address_line2 || null,
      data.neighborhood || null,
      data.city || null,
      data.state || null,
      data.zip_code || null,
      data.country || null,
      data.last_contact_at || null,
    ],
  });
  return rows[0]?.id || null;
}

function contactScope() {
  return {
    client: '1 = 0',
    internal: ['ct.owner_id = $TENANT', 'ct.assigned_to = $TENANT'],
  };
}

async function list(user, query = {}) {
  const { limit, offset } = normalizePagination(query);
  const scope = createScopedQuery(user).build(contactScope(), { prefix: 'WHERE', startIndex: 1 });
  const page = paginationClause(limit, offset, scope.nextIndex);
  const { rows } = await tenantDb.query(user, {
    table: 'contacts',
    scopeConfig: contactScope(),
    prefix: 'WHERE',
    startIndex: 1,
    sql: `${baseSelect} __TENANT_SCOPE__ ORDER BY ct.created_at DESC${page.clause}`,
    suffixParams: page.values,
  });
  return rows;
}

async function findById(id, user = null) {
  const { rows } = await tenantDb.query(user, {
    table: 'contacts',
    scopeConfig: contactScope(),
    prefix: 'AND',
    startIndex: 2,
    sql: `${baseSelect} WHERE ct.id = $1 __TENANT_SCOPE__`,
    params: [id],
  });
  return rows[0] || null;
}

async function update(id, data, user = null) {
  const { rows } = await tenantDb.query(user, {
    table: 'contacts',
    scopeConfig: contactScope(),
    prefix: 'AND',
    startIndex: 25,
    sql: `UPDATE contacts ct
     SET name = COALESCE($2, name),
         phone = COALESCE($3, phone),
         whatsapp = COALESCE($4, whatsapp),
         email = COALESCE($5, email),
         company = COALESCE($6, company),
         service = COALESCE($7, service),
         source = COALESCE($8, source),
         document = COALESCE($9, document),
         lead_stage = COALESCE($10, lead_stage),
         estimated_value = COALESCE($11, estimated_value),
         message = COALESCE($12, message),
         notes = COALESCE($13, notes),
         owner_id = COALESCE($14, owner_id),
         assigned_to = COALESCE($15, assigned_to),
         birth_date = COALESCE($16, birth_date),
         address_line1 = COALESCE($17, address_line1),
         address_line2 = COALESCE($18, address_line2),
         neighborhood = COALESCE($19, neighborhood),
         city = COALESCE($20, city),
         state = COALESCE($21, state),
         zip_code = COALESCE($22, zip_code),
         country = COALESCE($23, country),
         last_contact_at = COALESCE($24, last_contact_at),
         updated_at = NOW()
     WHERE ct.id = $1
     __TENANT_SCOPE__
     RETURNING ct.id`,
    params: [
      id,
      data.name || null,
      data.phone || null,
      data.whatsapp || null,
      data.email || null,
      data.company || null,
      data.service || null,
      data.source || null,
      data.document || null,
      data.lead_stage || null,
      data.estimated_value ?? null,
      data.message || null,
      data.notes || null,
      data.owner_id || null,
      data.assigned_to || null,
      data.birth_date || null,
      data.address_line1 || null,
      data.address_line2 || null,
      data.neighborhood || null,
      data.city || null,
      data.state || null,
      data.zip_code || null,
      data.country || null,
      data.last_contact_at || null,
    ],
  });
  return rows[0] ? findById(rows[0].id, user) : null;
}

async function remove(id, user = null) {
  const result = await tenantDb.query(user, {
    table: 'contacts',
    scopeConfig: contactScope(),
    prefix: 'AND',
    startIndex: 2,
    sql: 'DELETE FROM contacts ct WHERE ct.id = $1 __TENANT_SCOPE__',
    params: [id],
  });
  return result.rowCount > 0;
}

async function markConverted(id, clientId, user = null) {
  const { rows } = await tenantDb.query(user, {
    table: 'contacts',
    scopeConfig: contactScope(),
    prefix: 'AND',
    startIndex: 3,
    sql: `UPDATE contacts ct
     SET converted_client_id = $2,
         lead_stage = 'Fechado',
         updated_at = NOW()
     WHERE ct.id = $1
     __TENANT_SCOPE__
     RETURNING ct.id`,
    params: [id, clientId],
  });
  return rows[0] ? findById(rows[0].id, user) : null;
}

async function markConvertedWithClient(client, id, clientId, user) {
  const { rows } = await tenantDb.queryWithClient(user, client, {
    table: 'contacts',
    bypassScope: true,
    sql: `UPDATE contacts
     SET converted_client_id = $2,
         lead_stage = 'Fechado',
         updated_at = NOW()
     WHERE id = $1
     RETURNING id`,
    params: [id, clientId],
  });
  return rows[0]?.id || null;
}

async function saveAsaasCustomerId(id, customerId, user = null) {
  const { rows } = await tenantDb.query(user, {
    table: 'contacts',
    scopeConfig: contactScope(),
    prefix: 'AND',
    startIndex: 3,
    sql: `UPDATE contacts ct
     SET asaas_customer_id = $2,
         updated_at = NOW()
     WHERE ct.id = $1
     __TENANT_SCOPE__
     RETURNING ct.id`,
    params: [id, customerId],
  });
  return rows[0] ? findById(rows[0].id, user) : null;
}

module.exports = {
  create,
  createWithClient,
  list,
  findById,
  update,
  remove,
  markConverted,
  markConvertedWithClient,
  saveAsaasCustomerId,
};
