exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE clients
      ALTER COLUMN plan TYPE VARCHAR(120),
      ALTER COLUMN plan SET DEFAULT 'One Start';

    UPDATE clients
       SET plan = CASE
         WHEN LOWER(TRIM(plan)) = 'starter' THEN 'One Ideal'
         WHEN LOWER(TRIM(plan)) = 'growth' THEN 'One Start'
         WHEN LOWER(TRIM(plan)) = 'scale' THEN 'One Master'
         WHEN LOWER(TRIM(plan)) IN ('one start', 'one star') THEN 'One Start'
         WHEN LOWER(TRIM(plan)) = 'one ideal' THEN 'One Ideal'
         WHEN LOWER(TRIM(plan)) = 'one master' THEN 'One Master'
         WHEN LOWER(TRIM(plan)) = 'cobertura de eventos' THEN 'Sob demanda · Cobertura de Eventos'
         WHEN LOWER(TRIM(plan)) IN ('releases', 'releases (imprensa)') THEN 'Sob demanda · Releases (Imprensa)'
         WHEN LOWER(TRIM(plan)) = 'newsletter' THEN 'Sob demanda · Newsletter'
         WHEN LOWER(TRIM(plan)) = 'fotografia' THEN 'Sob demanda · Fotografia'
         WHEN LOWER(TRIM(plan)) IN ('trafego pago', 'tráfego pago', 'tráfego pago (como serviço isolado)') THEN 'Sob demanda · Tráfego Pago (como serviço isolado)'
         ELSE plan
       END;

    ALTER TABLE tasks
      ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_tasks_created_by
      ON tasks(created_by);

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(60) NOT NULL,
      title VARCHAR(160) NOT NULL,
      body TEXT,
      entity_type VARCHAR(40),
      entity_id INTEGER,
      read_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_user_id
      ON notifications(user_id);

    CREATE INDEX IF NOT EXISTS idx_notifications_user_read_at
      ON notifications(user_id, read_at, created_at DESC);

    CREATE OR REPLACE FUNCTION app.can_access_task(task_client_id INTEGER, assigned_user_id INTEGER, created_user_id INTEGER)
    RETURNS BOOLEAN
    LANGUAGE SQL
    STABLE
    SET search_path = public
    AS $$
      SELECT
        app.is_admin()
        OR (app.is_client() AND task_client_id = app.current_client_id() AND assigned_user_id IS NOT NULL)
        OR (
          app.is_internal()
          AND (
            assigned_user_id = app.current_user_id()
            OR created_user_id = app.current_user_id()
            OR assigned_user_id IS NULL
            OR app.can_access_client(task_client_id)
          )
        );
    $$;

    DROP POLICY IF EXISTS tasks_tenant_isolation ON tasks;
    CREATE POLICY tasks_tenant_isolation ON tasks
      USING (app.can_access_task(client_id, assigned_to, created_by))
      WITH CHECK (app.can_access_task(client_id, assigned_to, created_by));
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP POLICY IF EXISTS tasks_tenant_isolation ON tasks;
    CREATE POLICY tasks_tenant_isolation ON tasks
      USING (app.can_access_task(client_id, assigned_to))
      WITH CHECK (app.can_access_task(client_id, assigned_to));

    DROP FUNCTION IF EXISTS app.can_access_task(INTEGER, INTEGER, INTEGER);

    DROP INDEX IF EXISTS idx_notifications_user_read_at;
    DROP INDEX IF EXISTS idx_notifications_user_id;
    DROP TABLE IF EXISTS notifications;

    DROP INDEX IF EXISTS idx_tasks_created_by;
    ALTER TABLE tasks
      DROP COLUMN IF EXISTS created_by;

    ALTER TABLE clients
      ALTER COLUMN plan SET DEFAULT 'growth';
  `);
};
