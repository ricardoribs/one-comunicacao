const tenantDb = require('../db/tenantDb');
const env = require('../config/env');
const { normalizePagination, paginationClause } = require('../utils/pagination');
const createScopedQuery = require('../utils/scopedQuery');
const { encryptString, decryptString } = require('../utils/fieldCrypto');

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

function encryptFinancialValue(value) {
  return encryptString(value, env.financialEncryptionKey, 'FINANCIAL_ENCRYPTION_KEY');
}

function decryptFinancialValue(value) {
  return decryptString(value, env.financialEncryptionKey, 'FINANCIAL_ENCRYPTION_KEY');
}

function minimizeExternalPayload(payload) {
  if (!payload) {
    return null;
  }

  if (payload.mode === 'manual') {
    return { mode: 'manual' };
  }

  return {
    provider: payload.provider || 'asaas',
    payment_id: payload.payment_id || payload.payment?.id || null,
    status: payload.status || payload.payment?.status || null,
    billing_type: payload.billing_type || payload.payment?.billingType || null,
    has_pix_payload: Boolean(payload.has_pix_payload || payload.pix?.payload),
  };
}

function prepareStoragePayload(data = {}) {
  return {
    ...data,
    boleto_barcode: encryptFinancialValue(data.boleto_barcode),
    pix_copy_paste: encryptFinancialValue(data.pix_copy_paste),
    pix_qr_base64: null,
    external_payload: minimizeExternalPayload(data.external_payload),
  };
}

function decryptChargeRow(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    boleto_barcode: decryptFinancialValue(row.boleto_barcode),
    pix_copy_paste: decryptFinancialValue(row.pix_copy_paste),
    pix_qr_base64: null,
  };
}

function maskChargeRow(row) {
  const decrypted = decryptChargeRow(row);
  if (!decrypted) {
    return null;
  }

  return {
    ...decrypted,
    boleto_barcode_available: Boolean(decrypted.boleto_barcode),
    pix_copy_paste_available: Boolean(decrypted.pix_copy_paste),
    external_payload_available: Boolean(decrypted.external_payload),
    boleto_barcode: null,
    pix_copy_paste: null,
    pix_qr_base64: null,
    external_payload: null,
  };
}

function revealChargePaymentData(row) {
  const decrypted = decryptChargeRow(row);
  if (!decrypted) {
    return null;
  }

  return {
    id: decrypted.id,
    payment_link: decrypted.payment_link || null,
    boleto_url: decrypted.boleto_url || null,
    boleto_barcode: decrypted.boleto_barcode || null,
    pix_copy_paste: decrypted.pix_copy_paste || null,
  };
}

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
  return rows.map(maskChargeRow);
}

async function findById(id, user = null, options = {}) {
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
    return options.revealSensitive ? revealChargePaymentData(rows[0]) : maskChargeRow(rows[0]);
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
    return options.revealSensitive ? revealChargePaymentData(rows[0]) : maskChargeRow(rows[0]);
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
  return options.revealSensitive ? revealChargePaymentData(rows[0]) : maskChargeRow(rows[0]);
}

async function create(data, user = null) {
  const prepared = prepareStoragePayload(data);
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
      prepared.provider,
      prepared.provider_customer_id || null,
      prepared.provider_charge_id || null,
      prepared.payment_method,
      prepared.description,
      prepared.amount,
      prepared.due_date || null,
      prepared.status || 'pending',
      prepared.payment_link || null,
      prepared.boleto_url || null,
      prepared.boleto_barcode || null,
      prepared.pix_copy_paste || null,
      prepared.pix_qr_base64 || null,
      prepared.external_reference || null,
      prepared.idempotency_key || null,
      prepared.external_payload || null,
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

    return maskChargeRow(rows[0]);
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

  return maskChargeRow(rows[0]);
}

async function findPaymentData(id, user = null) {
  return findById(id, user, { revealSensitive: true });
}

async function update(id, data, user = null) {
  const existing = await findById(id, user);
  if (!existing) {
    return null;
  }

  const prepared = prepareStoragePayload(data);
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
      prepared.status || null,
      prepared.payment_link || null,
      prepared.boleto_url || null,
      prepared.boleto_barcode || null,
      prepared.pix_copy_paste || null,
      prepared.pix_qr_base64 || null,
      prepared.external_payload || null,
    ],
  });
  return rows[0] ? findById(rows[0].id, user) : null;
}

module.exports = {
  list,
  findById,
  findPaymentData,
  findByIdempotencyKey,
  create,
  update,
};
