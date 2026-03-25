function resolveTenantContext(user) {
  const effectiveUser = user || { role: 'admin' };

  return {
    role: effectiveUser.role || 'admin',
    userId: effectiveUser.id ?? null,
    clientId: effectiveUser.client_id ?? null,
  };
}

async function applyTenantContext(client, user) {
  const context = resolveTenantContext(user);

  await client.query(
    `SELECT
      set_config('app.current_role', COALESCE($1, ''), true),
      set_config('app.current_user_id', COALESCE($2::text, ''), true),
      set_config('app.current_client_id', COALESCE($3::text, ''), true)`,
    [context.role, context.userId, context.clientId]
  );

  return context;
}

module.exports = {
  resolveTenantContext,
  applyTenantContext,
};
