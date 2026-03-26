exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS client_integrations (
      id SERIAL PRIMARY KEY,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      provider_key VARCHAR(50) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'configuring',
      external_account_id VARCHAR(160),
      external_property_id VARCHAR(160),
      connected_at TIMESTAMP,
      last_sync_at TIMESTAMP,
      last_success_at TIMESTAMP,
      last_error TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_client_integrations_client_provider UNIQUE (client_id, provider_key)
    );

    CREATE INDEX IF NOT EXISTS idx_client_integrations_client_status
      ON client_integrations(client_id, status, updated_at DESC);

    CREATE INDEX IF NOT EXISTS idx_client_integrations_provider_status
      ON client_integrations(provider_key, status, updated_at DESC);

    ALTER TABLE client_integrations ENABLE ROW LEVEL SECURITY;
    ALTER TABLE client_integrations FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS client_integrations_tenant_isolation ON client_integrations;
    CREATE POLICY client_integrations_tenant_isolation ON client_integrations
      FOR ALL
      USING (app.can_access_client(client_id))
      WITH CHECK (app.can_access_client(client_id));
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP POLICY IF EXISTS client_integrations_tenant_isolation ON client_integrations;
    ALTER TABLE client_integrations NO FORCE ROW LEVEL SECURITY;
    ALTER TABLE client_integrations DISABLE ROW LEVEL SECURITY;

    DROP INDEX IF EXISTS idx_client_integrations_provider_status;
    DROP INDEX IF EXISTS idx_client_integrations_client_status;

    DROP TABLE IF EXISTS client_integrations CASCADE;
  `);
};
