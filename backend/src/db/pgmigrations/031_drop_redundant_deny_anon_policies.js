exports.up = (pgm) => {
  pgm.sql(`
    DROP POLICY IF EXISTS deny_anon ON calendar_event_reminders;
    DROP POLICY IF EXISTS deny_anon ON email_verification_tokens;
    DROP POLICY IF EXISTS deny_anon ON notifications;
    DROP POLICY IF EXISTS deny_anon ON password_reset_tokens;
    DROP POLICY IF EXISTS deny_anon ON refresh_tokens;
    DROP POLICY IF EXISTS deny_anon ON task_assignees;
    DROP POLICY IF EXISTS deny_anon ON user_daily_checklists;
    DROP POLICY IF EXISTS deny_anon ON users;

    DROP POLICY IF EXISTS revoked_tokens_internal_only ON revoked_access_tokens;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    CREATE POLICY revoked_tokens_internal_only ON revoked_access_tokens
      FOR ALL
      USING (app.is_admin());

    CREATE POLICY deny_anon ON users FOR ALL USING (false);
    CREATE POLICY deny_anon ON task_assignees FOR ALL USING (false);
    CREATE POLICY deny_anon ON user_daily_checklists FOR ALL USING (false);
    CREATE POLICY deny_anon ON refresh_tokens FOR ALL USING (false);
    CREATE POLICY deny_anon ON password_reset_tokens FOR ALL USING (false);
    CREATE POLICY deny_anon ON notifications FOR ALL USING (false);
    CREATE POLICY deny_anon ON email_verification_tokens FOR ALL USING (false);
    CREATE POLICY deny_anon ON calendar_event_reminders FOR ALL USING (false);
  `);
};
