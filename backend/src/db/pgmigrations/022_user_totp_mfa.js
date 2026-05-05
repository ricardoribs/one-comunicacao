exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS mfa_totp_secret_encrypted TEXT,
      ADD COLUMN IF NOT EXISTS mfa_totp_pending_secret_encrypted TEXT,
      ADD COLUMN IF NOT EXISTS mfa_enabled_at TIMESTAMP NULL;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE users
      DROP COLUMN IF EXISTS mfa_enabled_at,
      DROP COLUMN IF EXISTS mfa_totp_pending_secret_encrypted,
      DROP COLUMN IF EXISTS mfa_totp_secret_encrypted;
  `);
};
