exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS user_daily_checklists (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      checklist_date DATE NOT NULL,
      items JSONB NOT NULL DEFAULT '[]'::jsonb,
      completed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_user_daily_checklists_user_date UNIQUE (user_id, checklist_date)
    );

    CREATE INDEX IF NOT EXISTS idx_user_daily_checklists_user_date
      ON user_daily_checklists(user_id, checklist_date DESC);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_user_daily_checklists_user_date;
    DROP TABLE IF EXISTS user_daily_checklists CASCADE;
  `);
};
