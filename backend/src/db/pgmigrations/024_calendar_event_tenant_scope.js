exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE calendar_events
      ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS visibility VARCHAR(20);

    UPDATE calendar_events
       SET visibility = CASE
         WHEN client_id IS NULL THEN 'team'
         ELSE 'client'
       END
     WHERE visibility IS NULL
        OR visibility NOT IN ('team', 'client');

    ALTER TABLE calendar_events
      ALTER COLUMN visibility SET DEFAULT 'team',
      ALTER COLUMN visibility SET NOT NULL;

    ALTER TABLE calendar_events
      DROP CONSTRAINT IF EXISTS calendar_events_visibility_check;

    ALTER TABLE calendar_events
      ADD CONSTRAINT calendar_events_visibility_check
      CHECK (visibility IN ('team', 'client'));

    ALTER TABLE calendar_events
      DROP CONSTRAINT IF EXISTS calendar_events_visibility_client_check;

    ALTER TABLE calendar_events
      ADD CONSTRAINT calendar_events_visibility_client_check
      CHECK (
        (visibility = 'team' AND client_id IS NULL)
        OR (visibility = 'client' AND client_id IS NOT NULL)
      );

    CREATE INDEX IF NOT EXISTS idx_calendar_events_client_id_starts_at
      ON calendar_events(client_id, starts_at ASC, ends_at ASC);

    CREATE INDEX IF NOT EXISTS idx_calendar_events_visibility_starts_at
      ON calendar_events(visibility, starts_at ASC, ends_at ASC);

    CREATE OR REPLACE FUNCTION app.can_read_calendar_event_row(
      target_client_id INTEGER,
      event_visibility TEXT,
      created_by_user_id INTEGER
    )
    RETURNS BOOLEAN
    LANGUAGE SQL
    STABLE
    SET search_path = public
    AS $$
      SELECT
        app.is_admin()
        OR (
          app.is_client()
          AND event_visibility = 'client'
          AND target_client_id = app.current_client_id()
        )
        OR (
          app.is_internal()
          AND (
            (event_visibility = 'team' AND target_client_id IS NULL)
            OR created_by_user_id = app.current_user_id()
            OR (event_visibility = 'client' AND app.can_access_client(target_client_id))
          )
        );
    $$;

    CREATE OR REPLACE FUNCTION app.can_write_calendar_event_row(
      target_client_id INTEGER,
      event_visibility TEXT
    )
    RETURNS BOOLEAN
    LANGUAGE SQL
    STABLE
    SET search_path = public
    AS $$
      SELECT
        app.is_admin()
        OR (
          app.is_client()
          AND event_visibility = 'client'
          AND target_client_id = app.current_client_id()
        )
        OR (
          app.is_internal()
          AND (
            (event_visibility = 'team' AND target_client_id IS NULL)
            OR (event_visibility = 'client' AND app.can_access_client(target_client_id))
          )
        );
    $$;

    ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
    ALTER TABLE calendar_events FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS calendar_events_tenant_isolation ON calendar_events;
    CREATE POLICY calendar_events_tenant_isolation ON calendar_events
      FOR ALL
      USING (app.can_read_calendar_event_row(client_id, visibility, created_by))
      WITH CHECK (app.can_write_calendar_event_row(client_id, visibility));
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP POLICY IF EXISTS calendar_events_tenant_isolation ON calendar_events;
    ALTER TABLE calendar_events NO FORCE ROW LEVEL SECURITY;
    ALTER TABLE calendar_events DISABLE ROW LEVEL SECURITY;

    DROP FUNCTION IF EXISTS app.can_write_calendar_event_row(INTEGER, TEXT);
    DROP FUNCTION IF EXISTS app.can_read_calendar_event_row(INTEGER, TEXT, INTEGER);

    DROP INDEX IF EXISTS idx_calendar_events_visibility_starts_at;
    DROP INDEX IF EXISTS idx_calendar_events_client_id_starts_at;

    ALTER TABLE calendar_events
      DROP CONSTRAINT IF EXISTS calendar_events_visibility_client_check;

    ALTER TABLE calendar_events
      DROP CONSTRAINT IF EXISTS calendar_events_visibility_check;

    ALTER TABLE calendar_events
      DROP COLUMN IF EXISTS visibility,
      DROP COLUMN IF EXISTS client_id;
  `);
};
