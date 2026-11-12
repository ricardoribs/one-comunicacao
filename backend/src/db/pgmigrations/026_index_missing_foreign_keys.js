exports.up = (pgm) => {
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_calendar_events_updated_by
      ON calendar_events(updated_by);

    CREATE INDEX IF NOT EXISTS idx_client_integrations_created_by
      ON client_integrations(created_by);

    CREATE INDEX IF NOT EXISTS idx_client_integrations_updated_by
      ON client_integrations(updated_by);

    CREATE INDEX IF NOT EXISTS idx_cost_entries_created_by
      ON cost_entries(created_by);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_cost_entries_created_by;
    DROP INDEX IF EXISTS idx_client_integrations_updated_by;
    DROP INDEX IF EXISTS idx_client_integrations_created_by;
    DROP INDEX IF EXISTS idx_calendar_events_updated_by;
  `);
};
