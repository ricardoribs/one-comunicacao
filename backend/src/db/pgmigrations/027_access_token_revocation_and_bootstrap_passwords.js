exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

    CREATE TABLE IF NOT EXISTS revoked_access_tokens (
      id SERIAL PRIMARY KEY,
      token_hash VARCHAR(128) NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMP NOT NULL,
      revoked_at TIMESTAMP NOT NULL DEFAULT NOW(),
      revoked_by_ip VARCHAR(80)
    );

    CREATE INDEX IF NOT EXISTS idx_revoked_access_tokens_user_id
      ON revoked_access_tokens(user_id);

    CREATE INDEX IF NOT EXISTS idx_revoked_access_tokens_expires_at
      ON revoked_access_tokens(expires_at);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_revoked_access_tokens_expires_at;
    DROP INDEX IF EXISTS idx_revoked_access_tokens_user_id;
    DROP TABLE IF EXISTS revoked_access_tokens CASCADE;

    ALTER TABLE users
      DROP COLUMN IF EXISTS must_change_password,
      DROP COLUMN IF EXISTS session_version;
  `);
};
