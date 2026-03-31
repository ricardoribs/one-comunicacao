exports.up = (pgm) => {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION app.can_access_cost_entry_row(target_client_id INTEGER, created_by_user_id INTEGER)
    RETURNS BOOLEAN
    LANGUAGE SQL
    STABLE
    AS $$
      SELECT
        app.is_admin()
        OR (
          app.is_internal()
          AND (
            target_client_id IS NULL
            OR created_by_user_id = app.current_user_id()
            OR app.can_access_client(target_client_id)
          )
        );
    $$;

    ALTER TABLE cost_entries
      ALTER COLUMN client_id DROP NOT NULL;

    DROP POLICY IF EXISTS cost_entries_tenant_isolation ON cost_entries;
    CREATE POLICY cost_entries_tenant_isolation ON cost_entries
      FOR ALL
      USING (app.can_access_cost_entry_row(client_id, created_by))
      WITH CHECK (app.can_access_cost_entry_row(client_id, created_by));
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP POLICY IF EXISTS cost_entries_tenant_isolation ON cost_entries;
    CREATE POLICY cost_entries_tenant_isolation ON cost_entries
      FOR ALL
      USING (app.can_access_client(client_id))
      WITH CHECK (app.can_access_client(client_id));

    ALTER TABLE cost_entries
      ALTER COLUMN client_id SET NOT NULL;

    DROP FUNCTION IF EXISTS app.can_access_cost_entry_row(INTEGER, INTEGER);
  `);
};
