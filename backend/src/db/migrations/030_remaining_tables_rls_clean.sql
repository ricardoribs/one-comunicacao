ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_anon ON users;
DROP POLICY IF EXISTS users_tenant_isolation ON users;
CREATE POLICY users_tenant_isolation ON users FOR ALL USING (app.is_admin() OR (app.is_client() AND client_id = app.current_client_id()) OR (app.is_internal() AND (id = app.current_user_id() OR client_id IN (SELECT c.id FROM clients c WHERE c.manager_id = app.current_user_id())))) WITH CHECK (app.is_admin() OR (app.is_client() AND client_id = app.current_client_id()) OR (app.is_internal() AND (id = app.current_user_id() OR client_id IN (SELECT c.id FROM clients c WHERE c.manager_id = app.current_user_id()))));

ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_anon ON task_assignees;
DROP POLICY IF EXISTS task_assignees_tenant_isolation ON task_assignees;
CREATE POLICY task_assignees_tenant_isolation ON task_assignees FOR ALL USING (app.is_admin() OR EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_assignees.task_id AND app.can_access_task(t.id, t.client_id, t.assigned_to, t.created_by))) WITH CHECK (app.is_admin() OR EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_assignees.task_id AND app.can_access_task(t.id, t.client_id, t.assigned_to, t.created_by)));

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_anon ON notifications;
DROP POLICY IF EXISTS notifications_tenant_isolation ON notifications;
CREATE POLICY notifications_tenant_isolation ON notifications FOR ALL USING (app.is_admin() OR user_id = app.current_user_id()) WITH CHECK (app.is_admin() OR user_id = app.current_user_id());

ALTER TABLE calendar_event_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_event_reminders FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_anon ON calendar_event_reminders;
DROP POLICY IF EXISTS calendar_event_reminders_tenant_isolation ON calendar_event_reminders;
CREATE POLICY calendar_event_reminders_tenant_isolation ON calendar_event_reminders FOR ALL USING (app.is_admin() OR EXISTS (SELECT 1 FROM calendar_events ce WHERE ce.id = calendar_event_reminders.event_id AND app.can_read_calendar_event_row(ce.client_id, ce.visibility, ce.created_by))) WITH CHECK (app.is_admin() OR EXISTS (SELECT 1 FROM calendar_events ce WHERE ce.id = calendar_event_reminders.event_id AND app.can_write_calendar_event_row(ce.client_id, ce.visibility)));

ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_anon ON refresh_tokens;
DROP POLICY IF EXISTS refresh_tokens_tenant_isolation ON refresh_tokens;
CREATE POLICY refresh_tokens_tenant_isolation ON refresh_tokens FOR ALL USING (app.is_admin() OR user_id = app.current_user_id()) WITH CHECK (app.is_admin() OR user_id = app.current_user_id());

ALTER TABLE revoked_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE revoked_access_tokens FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS revoked_tokens_internal_only ON revoked_access_tokens;
DROP POLICY IF EXISTS revoked_access_tokens_tenant_isolation ON revoked_access_tokens;
CREATE POLICY revoked_access_tokens_tenant_isolation ON revoked_access_tokens FOR ALL USING (app.is_admin() OR user_id = app.current_user_id()) WITH CHECK (app.is_admin() OR user_id = app.current_user_id());

ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verification_tokens FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_anon ON email_verification_tokens;
DROP POLICY IF EXISTS email_verification_tokens_tenant_isolation ON email_verification_tokens;
CREATE POLICY email_verification_tokens_tenant_isolation ON email_verification_tokens FOR ALL USING (app.is_admin() OR user_id = app.current_user_id()) WITH CHECK (app.is_admin() OR user_id = app.current_user_id());

ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_anon ON password_reset_tokens;
DROP POLICY IF EXISTS password_reset_tokens_tenant_isolation ON password_reset_tokens;
CREATE POLICY password_reset_tokens_tenant_isolation ON password_reset_tokens FOR ALL USING (app.is_admin() OR user_id = app.current_user_id()) WITH CHECK (app.is_admin() OR user_id = app.current_user_id());

ALTER TABLE user_daily_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_daily_checklists FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_anon ON user_daily_checklists;
DROP POLICY IF EXISTS user_daily_checklists_tenant_isolation ON user_daily_checklists;
CREATE POLICY user_daily_checklists_tenant_isolation ON user_daily_checklists FOR ALL USING (app.is_admin() OR user_id = app.current_user_id()) WITH CHECK (app.is_admin() OR user_id = app.current_user_id());
