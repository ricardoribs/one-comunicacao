exports.up = (pgm) => {
  pgm.sql(`
    -- Tabela para armazenar integrações com Google Calendar
    CREATE TABLE IF NOT EXISTS calendar_integrations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider VARCHAR(50) NOT NULL DEFAULT 'google_calendar',
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      token_expires_at TIMESTAMP NOT NULL,
      calendar_id VARCHAR(255) DEFAULT 'primary',
      sync_enabled BOOLEAN NOT NULL DEFAULT true,
      last_sync_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, provider)
    );

    CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user_id
      ON calendar_integrations(user_id);

    CREATE INDEX IF NOT EXISTS idx_calendar_integrations_sync_enabled
      ON calendar_integrations(sync_enabled)
      WHERE sync_enabled = true;

    -- Adicionar coluna para rastrear eventos do Google Calendar
    ALTER TABLE calendar_events
      ADD COLUMN IF NOT EXISTS google_event_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS synced_from_google BOOLEAN NOT NULL DEFAULT false;

    CREATE INDEX IF NOT EXISTS idx_calendar_events_google_event_id
      ON calendar_events(google_event_id)
      WHERE google_event_id IS NOT NULL;

    -- RLS policies para calendar_integrations
    ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS calendar_integrations_tenant_isolation ON calendar_integrations;
    CREATE POLICY calendar_integrations_tenant_isolation ON calendar_integrations
      USING (user_id IN (
        SELECT id FROM users WHERE client_id = current_setting('app.current_tenant')::INTEGER
      ));

    DROP POLICY IF EXISTS calendar_integrations_owner_only ON calendar_integrations;
    CREATE POLICY calendar_integrations_owner_only ON calendar_integrations
      USING (user_id = current_setting('app.current_user_id')::INTEGER);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP POLICY IF EXISTS calendar_integrations_owner_only ON calendar_integrations;
    DROP POLICY IF EXISTS calendar_integrations_tenant_isolation ON calendar_integrations;

    DROP INDEX IF EXISTS idx_calendar_events_google_event_id;

    ALTER TABLE calendar_events
      DROP COLUMN IF EXISTS synced_from_google,
      DROP COLUMN IF EXISTS google_event_id;

    DROP INDEX IF EXISTS idx_calendar_integrations_sync_enabled;
    DROP INDEX IF EXISTS idx_calendar_integrations_user_id;
    DROP TABLE IF EXISTS calendar_integrations CASCADE;
  `);
};
