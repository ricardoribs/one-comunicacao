exports.up = (pgm) => {
  pgm.sql(`
    -- Dropar policies antigas com múltiplas permissivas
    DROP POLICY IF EXISTS calendar_integrations_tenant_isolation ON calendar_integrations;
    DROP POLICY IF EXISTS calendar_integrations_owner_only ON calendar_integrations;

    -- Policy única: owner dentro do tenant (com initplan otimizado)
    CREATE POLICY calendar_integrations_owner_isolation ON calendar_integrations
      USING (
        user_id = (select current_setting('app.current_user_id')::INTEGER)
        AND user_id IN (
          SELECT id FROM users
          WHERE client_id = (select current_setting('app.current_tenant'))::INTEGER
        )
      );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP POLICY IF EXISTS calendar_integrations_owner_isolation ON calendar_integrations;

    CREATE POLICY calendar_integrations_tenant_isolation ON calendar_integrations
      USING (user_id IN (
        SELECT id FROM users WHERE client_id = current_setting('app.current_tenant')::INTEGER
      ));

    CREATE POLICY calendar_integrations_owner_only ON calendar_integrations
      USING (user_id = current_setting('app.current_user_id')::INTEGER);
  `);
};
