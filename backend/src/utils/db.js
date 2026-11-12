const pool = require('../config/db');
const { applyTenantContext } = require('../db/tenantContext');

async function withTransaction(userOrHandler, maybeHandler) {
  const user = typeof userOrHandler === 'function' ? null : userOrHandler;
  const handler = typeof userOrHandler === 'function' ? userOrHandler : maybeHandler;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await applyTenantContext(client, user);
    const result = await handler(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  withTransaction,
};
