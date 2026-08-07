exports.up = (pgm) => {
  pgm.sql(`
    UPDATE refresh_tokens
       SET revoked_at = COALESCE(revoked_at, NOW())
     WHERE user_id IN (
       SELECT id
         FROM users
        WHERE role = 'client'
     );

    UPDATE users
       SET is_active = false,
           failed_login_attempts = 0,
           locked_until = NULL,
           mfa_totp_secret_encrypted = NULL,
           mfa_totp_pending_secret_encrypted = NULL,
           mfa_enabled_at = NULL
     WHERE role = 'client';
  `);
};

exports.down = () => {
  // Intentionally irreversible: client portal logins were removed from the product.
};
