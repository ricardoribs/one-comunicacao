exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS last_seen_ip VARCHAR(64),
      ADD COLUMN IF NOT EXISTS last_seen_location VARCHAR(160);

    CREATE INDEX IF NOT EXISTS idx_users_last_seen_at
      ON users(last_seen_at DESC);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_users_last_seen_at;

    ALTER TABLE users
      DROP COLUMN IF EXISTS last_seen_location,
      DROP COLUMN IF EXISTS last_seen_ip,
      DROP COLUMN IF EXISTS last_seen_at;
  `);
};
