exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id SERIAL PRIMARY KEY,
      title VARCHAR(160) NOT NULL,
      description TEXT,
      starts_at TIMESTAMP NOT NULL,
      ends_at TIMESTAMP NOT NULL,
      location VARCHAR(160),
      color VARCHAR(24) NOT NULL DEFAULT 'pink',
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_calendar_events_starts_at
      ON calendar_events(starts_at ASC, ends_at ASC);

    CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by
      ON calendar_events(created_by);

    CREATE TABLE IF NOT EXISTS calendar_event_reminders (
      id SERIAL PRIMARY KEY,
      event_id INTEGER NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reminder_type VARCHAR(40) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (event_id, user_id, reminder_type)
    );

    CREATE INDEX IF NOT EXISTS idx_calendar_event_reminders_user_id
      ON calendar_event_reminders(user_id, created_at DESC);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_calendar_event_reminders_user_id;
    DROP TABLE IF EXISTS calendar_event_reminders;

    DROP INDEX IF EXISTS idx_calendar_events_created_by;
    DROP INDEX IF EXISTS idx_calendar_events_starts_at;
    DROP TABLE IF EXISTS calendar_events;
  `);
};
