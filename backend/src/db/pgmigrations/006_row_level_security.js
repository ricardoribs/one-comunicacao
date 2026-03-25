exports.up = (pgm) => {
  pgm.sql(`
    CREATE SCHEMA IF NOT EXISTS app;

    CREATE OR REPLACE FUNCTION app.current_role()
    RETURNS TEXT
    LANGUAGE SQL
    STABLE
    AS $$
      SELECT NULLIF(current_setting('app.current_role', true), '');
    $$;

    CREATE OR REPLACE FUNCTION app.current_user_id()
    RETURNS INTEGER
    LANGUAGE SQL
    STABLE
    AS $$
      SELECT NULLIF(current_setting('app.current_user_id', true), '')::INTEGER;
    $$;

    CREATE OR REPLACE FUNCTION app.current_client_id()
    RETURNS INTEGER
    LANGUAGE SQL
    STABLE
    AS $$
      SELECT NULLIF(current_setting('app.current_client_id', true), '')::INTEGER;
    $$;

    CREATE OR REPLACE FUNCTION app.is_admin()
    RETURNS BOOLEAN
    LANGUAGE SQL
    STABLE
    AS $$
      SELECT app.current_role() = 'admin';
    $$;

    CREATE OR REPLACE FUNCTION app.is_client()
    RETURNS BOOLEAN
    LANGUAGE SQL
    STABLE
    AS $$
      SELECT app.current_role() = 'client';
    $$;

    CREATE OR REPLACE FUNCTION app.is_internal()
    RETURNS BOOLEAN
    LANGUAGE SQL
    STABLE
    AS $$
      SELECT app.current_role() IN ('designer', 'gestor', 'comercial', 'dev');
    $$;

    CREATE OR REPLACE FUNCTION app.can_access_client(target_client_id INTEGER)
    RETURNS BOOLEAN
    LANGUAGE SQL
    STABLE
    AS $$
      SELECT
        app.is_admin()
        OR (app.is_client() AND target_client_id = app.current_client_id())
        OR (
          app.is_internal()
          AND EXISTS (
            SELECT 1
            FROM clients c
            WHERE c.id = target_client_id
              AND c.manager_id = app.current_user_id()
          )
        );
    $$;

    CREATE OR REPLACE FUNCTION app.can_access_contact(owner_user_id INTEGER, assigned_user_id INTEGER)
    RETURNS BOOLEAN
    LANGUAGE SQL
    STABLE
    AS $$
      SELECT
        app.is_admin()
        OR (
          app.is_internal()
          AND (
            owner_user_id = app.current_user_id()
            OR assigned_user_id = app.current_user_id()
          )
        );
    $$;

    CREATE OR REPLACE FUNCTION app.can_write_contact(owner_user_id INTEGER, assigned_user_id INTEGER)
    RETURNS BOOLEAN
    LANGUAGE SQL
    STABLE
    AS $$
      SELECT
        app.is_admin()
        OR (
          app.is_internal()
          AND (
            owner_user_id = app.current_user_id()
            OR assigned_user_id = app.current_user_id()
            OR (owner_user_id IS NULL AND assigned_user_id IS NULL)
          )
        );
    $$;

    CREATE OR REPLACE FUNCTION app.can_access_task(task_client_id INTEGER, assigned_user_id INTEGER)
    RETURNS BOOLEAN
    LANGUAGE SQL
    STABLE
    AS $$
      SELECT
        app.is_admin()
        OR (app.is_client() AND task_client_id = app.current_client_id())
        OR (
          app.is_internal()
          AND (
            assigned_user_id = app.current_user_id()
            OR app.can_access_client(task_client_id)
          )
        );
    $$;

    CREATE OR REPLACE FUNCTION app.can_access_upload_row(target_client_id INTEGER, actor_user_id INTEGER)
    RETURNS BOOLEAN
    LANGUAGE SQL
    STABLE
    AS $$
      SELECT
        app.is_admin()
        OR (app.is_client() AND target_client_id = app.current_client_id())
        OR (
          app.is_internal()
          AND (
            actor_user_id = app.current_user_id()
            OR app.can_access_client(target_client_id)
          )
        );
    $$;

    CREATE OR REPLACE FUNCTION app.can_access_charge_row(target_client_id INTEGER, created_by_user_id INTEGER)
    RETURNS BOOLEAN
    LANGUAGE SQL
    STABLE
    AS $$
      SELECT
        app.is_admin()
        OR (app.is_client() AND target_client_id = app.current_client_id())
        OR (
          app.is_internal()
          AND (
            created_by_user_id = app.current_user_id()
            OR app.can_access_client(target_client_id)
          )
        );
    $$;

    CREATE OR REPLACE FUNCTION app.can_access_message(sender_user_id INTEGER, receiver_user_id INTEGER)
    RETURNS BOOLEAN
    LANGUAGE SQL
    STABLE
    AS $$
      SELECT
        app.is_admin()
        OR (
          app.is_client()
          AND (
            sender_user_id = app.current_user_id()
            OR receiver_user_id = app.current_user_id()
          )
        )
        OR (
          app.is_internal()
          AND (
            sender_user_id = app.current_user_id()
            OR receiver_user_id = app.current_user_id()
            OR EXISTS (
              SELECT 1
              FROM users sender
              LEFT JOIN clients sender_client ON sender_client.id = sender.client_id
              WHERE sender.id = sender_user_id
                AND sender_client.manager_id = app.current_user_id()
            )
            OR EXISTS (
              SELECT 1
              FROM users receiver
              LEFT JOIN clients receiver_client ON receiver_client.id = receiver.client_id
              WHERE receiver.id = receiver_user_id
                AND receiver_client.manager_id = app.current_user_id()
            )
          )
        );
    $$;

    ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
    ALTER TABLE clients FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS clients_tenant_isolation ON clients;
    CREATE POLICY clients_tenant_isolation ON clients
      FOR ALL
      USING (
        app.is_admin()
        OR (app.is_client() AND id = app.current_client_id())
        OR (app.is_internal() AND manager_id = app.current_user_id())
      )
      WITH CHECK (
        app.is_admin()
        OR (app.is_client() AND id = app.current_client_id())
        OR (app.is_internal() AND manager_id = app.current_user_id())
      );

    ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
    ALTER TABLE campaigns FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS campaigns_tenant_isolation ON campaigns;
    CREATE POLICY campaigns_tenant_isolation ON campaigns
      FOR ALL
      USING (app.can_access_client(client_id))
      WITH CHECK (app.can_access_client(client_id));

    ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
    ALTER TABLE tasks FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS tasks_tenant_isolation ON tasks;
    CREATE POLICY tasks_tenant_isolation ON tasks
      FOR ALL
      USING (app.can_access_task(client_id, assigned_to))
      WITH CHECK (app.can_access_task(client_id, assigned_to));

    ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
    ALTER TABLE messages FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS messages_tenant_isolation ON messages;
    CREATE POLICY messages_tenant_isolation ON messages
      FOR ALL
      USING (app.can_access_message(sender_id, receiver_id))
      WITH CHECK (app.can_access_message(sender_id, receiver_id));

    ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE contacts FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS contacts_tenant_isolation ON contacts;
    CREATE POLICY contacts_tenant_isolation ON contacts
      FOR ALL
      USING (app.can_access_contact(owner_id, assigned_to))
      WITH CHECK (app.can_write_contact(owner_id, assigned_to));

    ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
    ALTER TABLE materials FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS materials_tenant_isolation ON materials;
    CREATE POLICY materials_tenant_isolation ON materials
      FOR ALL
      USING (app.can_access_upload_row(client_id, uploaded_by))
      WITH CHECK (app.can_access_upload_row(client_id, uploaded_by));

    ALTER TABLE files ENABLE ROW LEVEL SECURITY;
    ALTER TABLE files FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS files_tenant_isolation ON files;
    CREATE POLICY files_tenant_isolation ON files
      FOR ALL
      USING (app.can_access_upload_row(client_id, uploaded_by))
      WITH CHECK (app.can_access_upload_row(client_id, uploaded_by));

    ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
    ALTER TABLE invoices FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS invoices_tenant_isolation ON invoices;
    CREATE POLICY invoices_tenant_isolation ON invoices
      FOR ALL
      USING (app.can_access_client(client_id))
      WITH CHECK (app.can_access_client(client_id));

    ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
    ALTER TABLE metrics FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS metrics_tenant_isolation ON metrics;
    CREATE POLICY metrics_tenant_isolation ON metrics
      FOR ALL
      USING (
        app.is_admin()
        OR EXISTS (
          SELECT 1
          FROM campaigns cam
          WHERE cam.id = metrics.campaign_id
            AND app.can_access_client(cam.client_id)
        )
      )
      WITH CHECK (
        app.is_admin()
        OR EXISTS (
          SELECT 1
          FROM campaigns cam
          WHERE cam.id = metrics.campaign_id
            AND app.can_access_client(cam.client_id)
        )
      );

    ALTER TABLE charges ENABLE ROW LEVEL SECURITY;
    ALTER TABLE charges FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS charges_tenant_isolation ON charges;
    CREATE POLICY charges_tenant_isolation ON charges
      FOR ALL
      USING (app.can_access_charge_row(client_id, created_by))
      WITH CHECK (app.can_access_charge_row(client_id, created_by));

    ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
    ALTER TABLE reports FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS reports_tenant_isolation ON reports;
    CREATE POLICY reports_tenant_isolation ON reports
      FOR ALL
      USING (app.can_access_client(client_id))
      WITH CHECK (app.can_access_client(client_id));
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP POLICY IF EXISTS reports_tenant_isolation ON reports;
    ALTER TABLE reports NO FORCE ROW LEVEL SECURITY;
    ALTER TABLE reports DISABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS charges_tenant_isolation ON charges;
    ALTER TABLE charges NO FORCE ROW LEVEL SECURITY;
    ALTER TABLE charges DISABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS metrics_tenant_isolation ON metrics;
    ALTER TABLE metrics NO FORCE ROW LEVEL SECURITY;
    ALTER TABLE metrics DISABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS invoices_tenant_isolation ON invoices;
    ALTER TABLE invoices NO FORCE ROW LEVEL SECURITY;
    ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS files_tenant_isolation ON files;
    ALTER TABLE files NO FORCE ROW LEVEL SECURITY;
    ALTER TABLE files DISABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS materials_tenant_isolation ON materials;
    ALTER TABLE materials NO FORCE ROW LEVEL SECURITY;
    ALTER TABLE materials DISABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS contacts_tenant_isolation ON contacts;
    ALTER TABLE contacts NO FORCE ROW LEVEL SECURITY;
    ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS messages_tenant_isolation ON messages;
    ALTER TABLE messages NO FORCE ROW LEVEL SECURITY;
    ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS tasks_tenant_isolation ON tasks;
    ALTER TABLE tasks NO FORCE ROW LEVEL SECURITY;
    ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS campaigns_tenant_isolation ON campaigns;
    ALTER TABLE campaigns NO FORCE ROW LEVEL SECURITY;
    ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS clients_tenant_isolation ON clients;
    ALTER TABLE clients NO FORCE ROW LEVEL SECURITY;
    ALTER TABLE clients DISABLE ROW LEVEL SECURITY;

    DROP FUNCTION IF EXISTS app.can_access_message(INTEGER, INTEGER);
    DROP FUNCTION IF EXISTS app.can_access_charge_row(INTEGER, INTEGER);
    DROP FUNCTION IF EXISTS app.can_access_upload_row(INTEGER, INTEGER);
    DROP FUNCTION IF EXISTS app.can_access_task(INTEGER, INTEGER);
    DROP FUNCTION IF EXISTS app.can_write_contact(INTEGER, INTEGER);
    DROP FUNCTION IF EXISTS app.can_access_contact(INTEGER, INTEGER);
    DROP FUNCTION IF EXISTS app.can_access_client(INTEGER);
    DROP FUNCTION IF EXISTS app.is_internal();
    DROP FUNCTION IF EXISTS app.is_client();
    DROP FUNCTION IF EXISTS app.is_admin();
    DROP FUNCTION IF EXISTS app.current_client_id();
    DROP FUNCTION IF EXISTS app.current_user_id();
    DROP FUNCTION IF EXISTS app.current_role();
  `);
};
