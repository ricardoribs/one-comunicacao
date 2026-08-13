DROP POLICY IF EXISTS deny_anon ON calendar_event_reminders;
DROP POLICY IF EXISTS deny_anon ON email_verification_tokens;
DROP POLICY IF EXISTS deny_anon ON notifications;
DROP POLICY IF EXISTS deny_anon ON password_reset_tokens;
DROP POLICY IF EXISTS deny_anon ON refresh_tokens;
DROP POLICY IF EXISTS deny_anon ON task_assignees;
DROP POLICY IF EXISTS deny_anon ON user_daily_checklists;
DROP POLICY IF EXISTS deny_anon ON users;

DROP POLICY IF EXISTS revoked_tokens_internal_only ON revoked_access_tokens;
