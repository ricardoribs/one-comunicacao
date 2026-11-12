exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS oauth_states (
      id SERIAL PRIMARY KEY,
      state_hash TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider VARCHAR(50) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      consumed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_oauth_states_user_id
      ON oauth_states(user_id);

    CREATE INDEX IF NOT EXISTS idx_oauth_states_provider_expires
      ON oauth_states(provider, expires_at)
      WHERE consumed_at IS NULL;

    ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;
    ALTER TABLE oauth_states FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS oauth_states_owner_isolation ON oauth_states;
    CREATE POLICY oauth_states_owner_isolation ON oauth_states
      USING (
        app.is_admin()
        OR user_id = app.current_user_id()
      )
      WITH CHECK (
        app.is_admin()
        OR user_id = app.current_user_id()
      );

    DROP POLICY IF EXISTS calendar_integrations_tenant_isolation ON calendar_integrations;
    DROP POLICY IF EXISTS calendar_integrations_owner_only ON calendar_integrations;
    DROP POLICY IF EXISTS calendar_integrations_owner_isolation ON calendar_integrations;

    ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;
    ALTER TABLE calendar_integrations FORCE ROW LEVEL SECURITY;

    CREATE POLICY calendar_integrations_owner_isolation ON calendar_integrations
      USING (
        app.is_admin()
        OR user_id = app.current_user_id()
      )
      WITH CHECK (
        app.is_admin()
        OR user_id = app.current_user_id()
      );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP POLICY IF EXISTS calendar_integrations_owner_isolation ON calendar_integrations;

    ALTER TABLE calendar_integrations NO FORCE ROW LEVEL SECURITY;

    CREATE POLICY calendar_integrations_owner_only ON calendar_integrations
      USING (user_id = current_setting('app.current_user_id')::INTEGER);

    DROP POLICY IF EXISTS oauth_states_owner_isolation ON oauth_states;
    ALTER TABLE oauth_states NO FORCE ROW LEVEL SECURITY;
    ALTER TABLE oauth_states DISABLE ROW LEVEL SECURITY;
    DROP TABLE IF EXISTS oauth_states CASCADE;
  `);
};
