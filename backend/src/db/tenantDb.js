const pool = require('../config/db');
const createScopedQuery = require('../utils/scopedQuery');
const { applyTenantContext } = require('./tenantContext');

const TENANT_TABLES = new Set([
  'clients',
  'campaigns',
  'tasks',
  'messages',
  'contacts',
  'materials',
  'files',
  'invoices',
  'metrics',
  'charges',
  'reports',
]);

async function runWithTenantContext(user, handler) {
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

function assertTenantActor(user, table) {
  if (!user || !user.role) {
    throw new Error(`[TENANT GUARD] Contexto do ator ausente para a tabela ${table}.`);
  }

  if (user.role === 'client' && user.client_id == null) {
    throw new Error(`[TENANT GUARD] client_id ausente no contexto da tabela ${table}.`);
  }

  if (user.role !== 'admin' && user.role !== 'client' && user.id == null) {
    throw new Error(`[TENANT GUARD] tenant_id ausente no contexto da tabela ${table}.`);
  }
}

function buildScopedStatement(
  user,
  { table, sql, params = [], suffixParams = [], scopeConfig = null, prefix = 'WHERE', startIndex = 1, bypassScope = false },
  { allowBypassScope = false } = {}
) {
  if (!TENANT_TABLES.has(table)) {
    return {
      sql,
      params: [...params, ...suffixParams],
    };
  }

  assertTenantActor(user, table);

  if (bypassScope) {
    if (!allowBypassScope) {
      throw new Error(`[TENANT GUARD] bypassScope nao permitido sem transacao existente para ${table}.`);
    }

    return {
      sql,
      params: [...params, ...suffixParams],
    };
  }

  if (!scopeConfig) {
    throw new Error(`[TENANT GUARD] Escopo ausente para a tabela ${table}.`);
  }

  const scope = createScopedQuery(user).build(scopeConfig, { prefix, startIndex });

  if (scope.clause && !sql.includes('__TENANT_SCOPE__')) {
    throw new Error(`[TENANT GUARD] Placeholder __TENANT_SCOPE__ ausente na query de ${table}.`);
  }

  return {
    sql: scope.clause ? sql.replaceAll('__TENANT_SCOPE__', scope.clause) : sql.replaceAll('__TENANT_SCOPE__', ''),
    params: scope.clause ? [...params, ...scope.values, ...suffixParams] : [...params, ...suffixParams],
  };
}

function query(
  user,
  options
) {
  const statement = buildScopedStatement(user, options);

  if (!TENANT_TABLES.has(options.table)) {
    return pool.query(statement.sql, statement.params);
  }

  return runWithTenantContext(user, (client) => client.query(statement.sql, statement.params));
}

function queryWithClient(user, client, options) {
  if (!client?.query) {
    throw new Error('[TENANT GUARD] Cliente de transacao invalido.');
  }

  const statement = buildScopedStatement(user, options, { allowBypassScope: true });
  return client.query(statement.sql, statement.params);
}

module.exports = {
  query,
  queryWithClient,
  TENANT_TABLES,
  runWithTenantContext,
};
