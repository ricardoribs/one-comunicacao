const tenantDb = require('../db/tenantDb');
const { normalizePagination, paginationClause } = require('../utils/pagination');
const createScopedQuery = require('../utils/scopedQuery');

const selectColumns = `
  ch.id,
  ch.client_id,
  ch.contact_id,
  ch.created_by,
  ch.provider,
  ch.provider_customer_id,
  ch.provider_charge_id,
  ch.payment_method,
  ch.description,
  ch.amount,
  ch.due_date,
  ch.status,
  ch.payment_link,
  ch.boleto_url,
  ch.boleto_barcode,
  ch.pix_copy_paste,
  ch.pix_qr_base64,
  ch.external_reference,
  ch.idempotency_key,
  ch.external_payload,
  ch.created_at,
  ch.updated_at
`;

async function list(user, query = {}) {
  const { limit, offset } = normalizePagination(query);
  const scopeConfig = {
    client: 'ch.client_id = $TENANT',
    internal: [
      'ch.created_by = $TENANT',
      'EXISTS (SELECT 1 FROM clients scoped_clients WHERE scoped_clients.id = ch.client_id AND scoped_clients.manager_id = $TENANT)',
    ],
  };
  const scope = createScopedQuery(user).build(scopeConfig, { prefix: 'WHERE', startIndex: 1 });
  const page = paginationClause(limit, offset, scope.nextIndex);
  const { rows } = await tenantDb.query(user, {
    table: 'charges',
    scopeConfig,
    prefix: 'WHERE',
    startIndex: 1,
    sql: `SELECT ${selectColumns}, c.name AS client_name, ct.name AS contact_name, u.name AS created_by_name
     FROM charges ch
     LEFT JOIN clients c ON c.id = ch.client_id
     LEFT JOIN contacts ct ON ct.id = ch.contact_id
     INNER JOIN users u ON u.id = ch.created_by
     __TENANT_SCOPE__
     ORDER BY ch.created_at DESC${page.clause}`,
    suffixParams: page.values,
  });
  return rows;
}

async function findById(id, user = null) {
  if (!user || user.role === 'admin') {
    const { rows } = await tenantDb.query(user || { role: 'admin' }, {
      table: 'charges',
      scopeConfig: { internal: '1 = 1' },
      sql: `SELECT ${selectColumns}, c.name AS client_name, ct.name AS contact_name
       FROM charges ch
       LEFT JOIN clients c ON c.id = ch.client_id
       LEFT JOIN contacts ct ON ct.id = ch.contact_id
       WHERE ch.id = $1`,
      params: [id],
    });
    return rows[0] || null;
  }

  if (user.role !== 'client') {
    const { rows } = await tenantDb.query(user, {
      table: 'charges',
      scopeConfig: { internal: '$TENANT = $TENANT' },
      prefix: 'AND',
      startIndex: 3,
      sql: `SELECT ${selectColumns}, c.name AS client_name, ct.name AS contact_name
       FROM charges ch
       LEFT JOIN clients c ON c.id = ch.client_id
       LEFT JOIN contacts ct ON ct.id = ch.contact_id
       WHERE ch.id = $1
         AND (ch.created_by = $2 OR c.manager_id = $2)
       __TENANT_SCOPE__`,
      params: [id, user.id],
    });
    return rows[0] || null;
  }

  const { rows } = await tenantDb.query(user, {
    table: 'charges',
    scopeConfig: {
      client: 'ch.client_id = $TENANT',
    },
    prefix: 'AND',
    startIndex: 2,
    sql: `SELECT ${selectColumns}, c.name AS client_name, ct.name AS contact_name
     FROM charges ch
     LEFT JOIN clients c ON c.id = ch.client_id
     LEFT JOIN contacts ct ON ct.id = ch.contact_id
     WHERE ch.id = $1
     __TENANT_SCOPE__`,
    params: [id],
  });
  return rows[0] || null;
}

async function create(data, user = null) {
  const { rows } = await tenantDb.query(user || { role: 'admin' }, {
    table: 'charges',
    scopeConfig: { internal: '1 = 1' },
    sql: `INSERT INTO charges (
      client_id, contact_id, created_by, provider, provider_customer_id, provider_charge_id,
      payment_method, description, amount, due_date, status, payment_link, boleto_url, boleto_barcode,
      pix_copy_paste, pix_qr_base64, external_reference, idempotency_key, external_payload
    )
    VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11, $12, $13, $14,
      $15, $16, $17, $18, $19
    )
    RETURNING id`,
    params: [
      data.client_id || null,
      data.contact_id || null,
      data.created_by,
      data.provider,
      data.provider_customer_id || null,
      data.provider_charge_id || null,
      data.payment_method,
      data.description,
      data.amount,
      data.due_date || null,
      data.status || 'pending',
      data.payment_link || null,
      data.boleto_url || null,
      data.boleto_barcode || null,
      data.pix_copy_paste || null,
      data.pix_qr_base64 || null,
      data.external_reference || null,
      data.idempotency_key || null,
      data.external_payload || null,
    ],
  });
  return findById(rows[0].id, user);
}

async function findByIdempotencyKey(createdBy, idempotencyKey, user = null) {
  if (!createdBy || !idempotencyKey) {
    return null;
  }

  if (user && user.role !== 'admin' && user.role !== 'client') {
    const { rows } = await tenantDb.query(user, {
      table: 'charges',
      scopeConfig: { internal: '$TENANT = $TENANT' },
      prefix: 'AND',
      startIndex: 4,
      sql: `SELECT ${selectColumns}, c.name AS client_name, ct.name AS contact_name
       FROM charges ch
       LEFT JOIN clients c ON c.id = ch.client_id
       LEFT JOIN contacts ct ON ct.id = ch.contact_id
       WHERE ch.created_by = $1
         AND ch.idempotency_key = $2
         AND (ch.created_by = $3 OR c.manager_id = $3)
       __TENANT_SCOPE__`,
      params: [createdBy, idempotencyKey, user.id],
    });

    return rows[0] || null;
  }

  const { rows } = await tenantDb.query(user, {
    table: 'charges',
    scopeConfig: {
      client: 'ch.client_id = $TENANT',
    },
    prefix: 'AND',
    startIndex: 3,
    sql: `SELECT ${selectColumns}, c.name AS client_name, ct.name AS contact_name
     FROM charges ch
     LEFT JOIN clients c ON c.id = ch.client_id
     LEFT JOIN contacts ct ON ct.id = ch.contact_id
     WHERE ch.created_by = $1 AND ch.idempotency_key = $2
     __TENANT_SCOPE__`,
    params: [createdBy, idempotencyKey],
  });

  return rows[0] || null;
}

async function update(id, data, user = null) {
  const existing = await findById(id, user);
  if (!existing) {
    return null;
  }

  const { rows } = await tenantDb.query(user, {
    table: 'charges',
    scopeConfig: {
      client: '$TENANT = $TENANT',
      internal: '$TENANT = $TENANT',
    },
    prefix: 'AND',
    startIndex: 9,
    sql: `UPDATE charges
     SET status = COALESCE($2, status),
         payment_link = COALESCE($3, payment_link),
         boleto_url = COALESCE($4, boleto_url),
         boleto_barcode = COALESCE($5, boleto_barcode),
         pix_copy_paste = COALESCE($6, pix_copy_paste),
         pix_qr_base64 = COALESCE($7, pix_qr_base64),
         external_payload = COALESCE($8, external_payload),
         updated_at = NOW()
     WHERE id = $1
     __TENANT_SCOPE__
     RETURNING id`,
    params: [
      id,
      data.status || null,
      data.payment_link || null,
      data.boleto_url || null,
      data.boleto_barcode || null,
      data.pix_copy_paste || null,
      data.pix_qr_base64 || null,
      data.external_payload || null,
    ],
  });
  return rows[0] ? findById(rows[0].id, user) : null;
}

module.exports = {
  list,
  findById,
  findByIdempotencyKey,
  create,
  update,
};
